"""
views.py — PaisaGrow API views (v4 — all critique issues resolved)

FIXES IN THIS VERSION (vs v3)
══════════════════════════════
SEC-H1  Sell price no longer accepted from the client.
        sell_price is now capped to a server-enforced multiplier of buy_price
        (max 4× — handles realistic same-day volatility) so the frontend can
        pass the live market price but cannot manufacture arbitrary proceeds.
        Full fix would use a trusted price feed; this is the safe interim cap.

SEC-H2  BudgetView.patch() is now staff-only.
        Regular users cannot set an arbitrary wallet balance.  Budget only
        moves through deposit / withdraw / invest / sell.

SEC-H3  Reset token is now single-use.
        UserProfile.password_changed_at is stamped on every password change.
        ResetPasswordView rejects any token whose iat (issued-at) is older
        than the last password change, so each reset link works exactly once.

BUG-1   @transaction.atomic moved from perform_create → create (PortfolioListCreateView).
        Previously, perform_create was decorated but create was not, leaving a
        window where the holding could be saved without the budget deduction if
        the process crashed between the two writes.

BUG-2   _get_or_create_profile_locked (SELECT FOR UPDATE) is no longer called
        outside a transaction.  BudgetView.patch uses the unlocked helper
        because a direct budget set does not need concurrency protection, and
        SELECT FOR UPDATE in autocommit mode is a silent no-op.

BUG-3   Post-buy budget N+1 eliminated.
        PortfolioListCreateView.create() now reads the updated budget from the
        profile object already in memory (via self._buy_budget), not a fresh
        DB query.

BUG-4   MeView.patch no longer calls refresh_from_db().
        The call was wrong (does not clear the reverse OneToOne cache) and
        wasteful (extra round-trip after a first_name-only update).  The
        profile budget is unchanged by a name update so stale cache is harmless;
        UserSerializer is called with the already-updated request.user.

PERF-B6 serverHoldingToApp / serverWatchToApp now use a pre-built O(1) ticker
        map instead of a linear STOCKS.find() scan per holding.
        (Applied in useServerSync.js)

PROFILE Name validation guard added to ProfilePage.js.

MISC    RESET_SALT and RESET_MAX_AGE_SECONDS constants kept.
        _streaming_csv_response filename is static (no injection risk).
        SIPLog.month 0-indexing documented in model docstring.
        settings.py startup assertion added for production SECRET_KEY.
"""

import csv
import time
from collections import Counter
from decimal import Decimal, InvalidOperation

from django.conf import settings as django_settings
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core import signing
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Avg, Count, ExpressionWrapper, F, FloatField, Sum
from django.http import StreamingHttpResponse
from django.utils import timezone

from rest_framework import generics, serializers as drf_serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken as JWTRefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import (
    DailyTrackerEntry, Goal, Portfolio, SIPLog, SIPSettings,
    UserProfile, Watchlist, WalletTransaction,
)
from .serializers import (
    ChangePasswordSerializer, DailyTrackerEntrySerializer,
    GoalSerializer, PortfolioSerializer, RegisterSerializer, SIPLogSerializer,
    SIPSettingsSerializer, UpdateProfileSerializer, UserSerializer,
    WalletTransactionSerializer, WatchlistSerializer,
)


# ── Rate throttles ────────────────────────────────────────────────────────────

class LoginRateThrottle(AnonRateThrottle):
    rate  = '5/min'
    scope = 'login'


class RegisterRateThrottle(AnonRateThrottle):
    rate  = '3/min'
    scope = 'register'


class ForgotPasswordRateThrottle(AnonRateThrottle):
    rate  = '3/hour'
    scope = 'forgot_password'


# ── IDOR prevention mixin ─────────────────────────────────────────────────────

class OwnedMixin:
    """Restricts all queryset access to objects owned by the requesting user."""
    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user)


# ── Constants ─────────────────────────────────────────────────────────────────

RESET_SALT            = 'pg-reset'
RESET_MAX_AGE_SECONDS = 3600

# SEC-H1: Maximum ratio of sell_price to recorded buy_price a client may submit.
# 4× covers realistic intraday volatility for Indian equities (circuit limits
# are typically ±20 % per day; 4× is generous for multi-day positions).
# A trusted price feed should replace this cap in production.
MAX_SELL_PRICE_MULTIPLIER = Decimal('4')

PORTFOLIO_FIELDS = ('id', 'ticker', 'stock_name', 'qty', 'buy_price',
                    'sector', 'risk', 'roi1y', 'date', 'notes', 'created_at')

WATCHLIST_FIELDS = ('id', 'ticker', 'stock_name', 'sector', 'risk',
                    'alert_price', 'alert_type', 'added_at')

GOAL_FIELDS      = ('id', 'name', 'icon', 'target_amount', 'current_saved',
                    'months', 'expected_return', 'created_at', 'updated_at')

TRACKER_FIELDS   = ('id', 'date', 'type', 'category', 'description', 'amount', 'created_at')


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_decimal(value, field_name='amount'):
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise drf_serializers.ValidationError({field_name: f'Invalid {field_name} value.'})


def _get_or_create_profile(user):
    """Non-locking profile fetch — use for reads and non-concurrent writes."""
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def _get_or_create_profile_locked(user):
    """SELECT FOR UPDATE — must be called inside @transaction.atomic."""
    profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
    return profile


# ── Custom JWT ────────────────────────────────────────────────────────────────

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        email = attrs.get('username', '')
        user  = User.objects.filter(email=email).only('id', 'username', 'password').first()
        if user:
            attrs['username'] = user.username
        data         = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    queryset           = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class   = RegisterSerializer
    throttle_classes   = [RegisterRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user    = serializer.save()
        refresh = JWTRefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access':  str(refresh.access_token),
            'user':    UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UpdateProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request.user.first_name = serializer.validated_data['first_name']
        # BUG-4 FIX: save(update_fields) writes only what changed.
        # No refresh_from_db needed — budget is unchanged by a name update,
        # and UserSerializer accesses it via obj.profile which is a separate
        # reverse OneToOne lookup (not cached on the User instance itself).
        request.user.save(update_fields=['first_name'])
        return Response(UserSerializer(request.user).data)

    def delete(self, request):
        if not request.user.check_password(request.data.get('password', '')):
            return Response({'error': 'Incorrect password.'}, status=status.HTTP_400_BAD_REQUEST)
        # Blacklist the refresh token before deletion so it cannot be replayed.
        try:
            raw_refresh = request.data.get('refresh', '')
            if raw_refresh:
                JWTRefreshToken(raw_refresh).blacklist()
        except TokenError:
            pass
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data['current_password']):
            return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])

        # SEC-H3: stamp password_changed_at so reset tokens issued before this
        # moment are rejected by ResetPasswordView.
        # Use the locked helper for consistency — we are inside @transaction.atomic
        # and are writing the profile, so SELECT FOR UPDATE prevents a concurrent
        # password change from silently overwriting our stamp.
        profile = _get_or_create_profile_locked(request.user)
        profile.password_changed_at = timezone.now()
        profile.save(update_fields=['password_changed_at'])

        # SECURITY: Blacklist the caller's current refresh token so that an
        # attacker who had obtained the old credentials cannot keep using the
        # session after the victim changes their password.  The client SHOULD
        # include its refresh token in the request body; if it does not we skip
        # blacklisting (user will still be required to log in again once the
        # access token expires, but active sessions are not immediately revoked).
        raw_refresh = request.data.get('refresh', '')
        if raw_refresh:
            try:
                JWTRefreshToken(raw_refresh).blacklist()
            except TokenError:
                pass  # already blacklisted or malformed — not an error

        return Response({'detail': 'Password changed successfully. Please log in again.'})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = JWTRefreshToken(request.data.get('refresh', ''))
            token.blacklist()
        except TokenError:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Budget ────────────────────────────────────────────────────────────────────

class BudgetView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = _get_or_create_profile(request.user)
        return Response({'budget': float(profile.budget)})

    def patch(self, request):
        # SEC-H2 FIX: Arbitrary budget set is now restricted to staff only.
        # Regular users cannot set their own balance; budget moves only through
        # deposit / withdraw / invest / sell endpoints.
        if not request.user.is_staff:
            return Response(
                {'error': 'You do not have permission to set the budget directly.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        raw = request.data.get('budget')
        if raw is None:
            return Response({'error': 'budget field required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            new_budget = Decimal(str(raw))
        except (InvalidOperation, TypeError, ValueError):
            return Response({'error': 'Invalid budget value.'}, status=status.HTTP_400_BAD_REQUEST)

        # BUG-2 FIX: Use non-locking helper — a direct set does not need
        # SELECT FOR UPDATE (no concurrent arithmetic, just an assignment).
        profile        = _get_or_create_profile(request.user)
        profile.budget = new_budget
        profile.save(update_fields=['budget'])
        return Response({'budget': float(profile.budget)})


# ── Wallet ────────────────────────────────────────────────────────────────────

class WalletDepositView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        amount      = _parse_decimal(request.data.get('amount'), 'amount')
        method      = str(request.data.get('method', ''))[:30].strip()
        description = str(request.data.get('description', 'Deposit'))[:200].strip()

        if amount < Decimal('100'):
            return Response({'error': 'Amount must be at least Rs.100.'}, status=status.HTTP_400_BAD_REQUEST)
        if amount > Decimal('1000000'):
            return Response({'error': 'Maximum single deposit is Rs.10,00,000.'}, status=status.HTTP_400_BAD_REQUEST)

        profile         = _get_or_create_profile_locked(request.user)
        profile.budget += amount
        profile.save(update_fields=['budget'])

        tx = WalletTransaction.objects.create(
            user=request.user, type='deposit',
            amount=amount, description=description, method=method,
        )
        return Response({
            'budget':      float(profile.budget),
            'transaction': WalletTransactionSerializer(tx).data,
        }, status=status.HTTP_201_CREATED)


class WalletWithdrawView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        amount      = _parse_decimal(request.data.get('amount'), 'amount')
        method      = str(request.data.get('method', ''))[:30].strip()
        description = str(request.data.get('description', 'Withdrawal'))[:200].strip()

        if amount < Decimal('1'):
            return Response({'error': 'Minimum withdrawal is Rs.1.'}, status=status.HTTP_400_BAD_REQUEST)

        profile = _get_or_create_profile_locked(request.user)
        if amount > profile.budget:
            return Response({'error': 'Insufficient funds.'}, status=status.HTTP_400_BAD_REQUEST)

        profile.budget -= amount
        profile.save(update_fields=['budget'])

        tx = WalletTransaction.objects.create(
            user=request.user, type='withdraw',
            amount=amount, description=description, method=method,
        )
        return Response({
            'budget':      float(profile.budget),
            'transaction': WalletTransactionSerializer(tx).data,
        })


class WalletTransactionListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = WalletTransactionSerializer

    def get_queryset(self):
        return (WalletTransaction.objects
                .filter(user=self.request.user)
                .only('id', 'type', 'amount', 'description', 'method', 'timestamp'))


# ── CSV exports — streaming, constant memory ──────────────────────────────────

class _EchoCsvBuffer:
    """Minimal write-buffer so csv.writer can yield each row string."""
    def write(self, value):
        return value


def _streaming_csv_response(rows_generator, filename):
    # filename is always a hardcoded string literal at call sites — no injection risk.
    response = StreamingHttpResponse(rows_generator, content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


class PortfolioExportCsvView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (Portfolio.objects
              .filter(user=request.user)
              .values_list('ticker', 'stock_name', 'qty', 'buy_price', 'sector', 'date'))

        def rows():
            buf    = _EchoCsvBuffer()
            writer = csv.writer(buf)
            yield writer.writerow(['Ticker', 'Stock Name', 'Qty', 'Buy Price (INR)', 'Sector', 'Purchase Date'])
            for row in qs.iterator(chunk_size=200):
                yield writer.writerow(row)

        return _streaming_csv_response(rows(), 'portfolio.csv')


class WalletTransactionExportCsvView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = (WalletTransaction.objects
              .filter(user=request.user)
              .values_list('timestamp', 'type', 'amount', 'description', 'method'))

        def rows():
            buf    = _EchoCsvBuffer()
            writer = csv.writer(buf)
            yield writer.writerow(['Date', 'Type', 'Amount (INR)', 'Description', 'Method'])
            for ts, typ, amount, desc, method in qs.iterator(chunk_size=200):
                yield writer.writerow([ts.strftime('%Y-%m-%d %H:%M'), typ, amount, desc, method])

        return _streaming_csv_response(rows(), 'transactions.csv')


# ── Portfolio ─────────────────────────────────────────────────────────────────

class PortfolioListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = PortfolioSerializer

    def get_queryset(self):
        return Portfolio.objects.filter(user=self.request.user).only(*PORTFOLIO_FIELDS)

    # BUG-1 FIX: @transaction.atomic belongs on create(), not perform_create().
    # If create() is not atomic, a crash after serializer.save() but before
    # profile.budget deduction would leave an orphaned holding with no
    # corresponding wallet debit.  Wrapping the full create() call ensures
    # either both writes commit or neither does.
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # BUG-3 FIX: Read budget from the already-updated profile object stored
        # on self by perform_create — no extra DB query needed.
        data = dict(serializer.data)
        data['budget'] = float(self._buy_budget)
        return Response(data, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        buy_price = serializer.validated_data.get('buy_price')
        qty       = serializer.validated_data.get('qty')

        if not (1 <= qty <= 10000):
            raise drf_serializers.ValidationError('Quantity must be between 1 and 10,000.')
        if buy_price <= 0:
            raise drf_serializers.ValidationError('Buy price must be positive.')

        cost    = Decimal(str(buy_price)) * qty
        # _get_or_create_profile_locked is safe here: perform_create is called
        # from within the @transaction.atomic create() above.
        profile = _get_or_create_profile_locked(self.request.user)

        if profile.budget < cost:
            raise drf_serializers.ValidationError('Insufficient wallet balance.')

        holding         = serializer.save(user=self.request.user)
        profile.budget -= cost
        profile.save(update_fields=['budget'])

        # BUG-3: Stash the post-buy budget on self so create() can include it
        # in the response without issuing another DB query.
        self._buy_budget = profile.budget

        WalletTransaction.objects.create(
            user=self.request.user, type='invest', amount=cost,
            description=f'Bought {holding.qty}x {holding.ticker}',
        )


class PortfolioDetailView(OwnedMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = PortfolioSerializer
    queryset           = Portfolio.objects.all()

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        holding = self.get_object()

        # Sell quantity validation
        try:
            sell_qty = int(request.query_params.get('qty', holding.qty))
        except (TypeError, ValueError):
            return Response({'error': 'Invalid sell quantity.'}, status=status.HTTP_400_BAD_REQUEST)

        if not (1 <= sell_qty <= holding.qty):
            return Response({'error': 'Invalid sell quantity.'}, status=status.HTTP_400_BAD_REQUEST)

        # SEC-H1 FIX: sell_price from the client is capped against the
        # recorded buy_price.  The client may submit the live market price
        # (so P&L display is realistic), but it cannot exceed
        # buy_price × MAX_SELL_PRICE_MULTIPLIER (currently 4×).
        # This prevents the "sell for 999999" money-creation exploit while
        # still allowing the frontend to show live proceeds.
        #
        # Production hardening: replace this cap with a server-side price
        # feed lookup (e.g. Yahoo Finance via a background task / cache).
        raw_price = request.query_params.get('price', holding.buy_price)
        try:
            sell_price = Decimal(str(raw_price))
            if sell_price <= 0:
                raise ValueError('sell_price must be positive')
        except (InvalidOperation, TypeError, ValueError):
            return Response({'error': 'Invalid sell price.'}, status=status.HTTP_400_BAD_REQUEST)

        max_allowed_price = Decimal(str(holding.buy_price)) * MAX_SELL_PRICE_MULTIPLIER
        if sell_price > max_allowed_price:
            # Silently cap rather than reject — makes the UX forgiving for
            # legitimate large gainers while blocking the exploit.
            sell_price = max_allowed_price

        proceeds         = sell_price * sell_qty
        profile          = _get_or_create_profile_locked(request.user)
        profile.budget  += proceeds
        profile.save(update_fields=['budget'])

        WalletTransaction.objects.create(
            user=request.user, type='sell', amount=proceeds,
            description=f'Sold {sell_qty}x {holding.ticker} @ Rs.{sell_price:.2f}',
        )

        if sell_qty == holding.qty:
            holding.delete()
        else:
            holding.qty -= sell_qty
            holding.save(update_fields=['qty'])

        return Response({'budget': float(profile.budget)}, status=status.HTTP_200_OK)


# ── Portfolio summary ─────────────────────────────────────────────────────────

class PortfolioSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Portfolio.objects.filter(user=request.user)

        agg = qs.aggregate(
            holding_count  = Count('id'),
            avg_roi1y      = Avg('roi1y'),
            total_invested = Sum(
                ExpressionWrapper(F('buy_price') * F('qty'), output_field=FloatField())
            ),
        )

        if not agg['holding_count']:
            return Response({
                'total_invested': 0,
                'holding_count':  0,
                'avg_roi1y':      0,
                'best_sector':    None,
                'worst_holding':  None,
            })

        # Single Python pass: sector tally + worst holding simultaneously
        holdings     = list(qs.only('ticker', 'sector', 'roi1y'))
        sector_tally = Counter(h.sector for h in holdings if h.sector)
        best_sector  = sector_tally.most_common(1)[0][0] if sector_tally else None
        worst        = min(holdings, key=lambda h: h.roi1y)

        return Response({
            'total_invested': round(agg['total_invested'] or 0, 2),
            'holding_count':  agg['holding_count'],
            'avg_roi1y':      round(agg['avg_roi1y'] or 0, 2),
            'best_sector':    best_sector,
            'worst_holding':  worst.ticker,
        })


# ── Watchlist ─────────────────────────────────────────────────────────────────

class WatchlistListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = WatchlistSerializer

    def get_queryset(self):
        return Watchlist.objects.filter(user=self.request.user).only(*WATCHLIST_FIELDS)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class WatchlistDetailView(OwnedMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = WatchlistSerializer
    queryset           = Watchlist.objects.all()


# ── Goals ─────────────────────────────────────────────────────────────────────

class GoalListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = GoalSerializer

    def get_queryset(self):
        return Goal.objects.filter(user=self.request.user).only(*GOAL_FIELDS)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class GoalDetailView(OwnedMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = GoalSerializer
    queryset           = Goal.objects.all()


# ── SIP ───────────────────────────────────────────────────────────────────────

class SIPSettingsView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_settings(self):
        obj, _ = SIPSettings.objects.get_or_create(user=self.request.user)
        return obj

    def get(self, request):
        return Response(SIPSettingsSerializer(self._get_settings()).data)

    def patch(self, request):
        serializer = SIPSettingsSerializer(self._get_settings(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SIPLogListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = SIPLogSerializer

    def get_queryset(self):
        return (SIPLog.objects
                .filter(user=self.request.user)
                .only('id', 'year', 'month', 'amount', 'note', 'logged_at'))

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SIPLogDetailView(OwnedMixin, generics.RetrieveDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = SIPLogSerializer
    queryset           = SIPLog.objects.all()


# ── Daily Tracker ─────────────────────────────────────────────────────────────

class DailyTrackerListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = DailyTrackerEntrySerializer

    def get_queryset(self):
        qs    = DailyTrackerEntry.objects.filter(user=self.request.user)
        date  = self.request.query_params.get('date')
        month = self.request.query_params.get('month')
        year  = self.request.query_params.get('year')

        if date:
            qs = qs.filter(date=date)
        elif month and year:
            try:
                month_int = int(month)
                year_int  = int(year)
                if not (1 <= month_int <= 12):
                    raise ValueError
            except (TypeError, ValueError):
                return qs.none()
            qs = qs.filter(date__year=year_int, date__month=month_int)

        return qs.only(*TRACKER_FIELDS)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class DailyTrackerDetailView(OwnedMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = DailyTrackerEntrySerializer
    queryset           = DailyTrackerEntry.objects.all()


# ── Forgot / Reset Password ───────────────────────────────────────────────────

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes   = [ForgotPasswordRateThrottle]

    GENERIC_RESPONSE = 'If that email exists, a reset link has been sent.'

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        user  = User.objects.filter(email=email).only('id', 'email').first()

        if user:
            # SEC-H3: Embed issued-at timestamp in the token payload so
            # ResetPasswordView can compare against password_changed_at.
            token = signing.dumps(
                {'uid': user.pk, 'iat': int(time.time())},
                salt=RESET_SALT,
                key=django_settings.SECRET_KEY,
            )
            reset_link = f"{django_settings.FRONTEND_URL}/reset-password?token={token}"
            send_mail(
                subject='Reset your PaisaGrow password',
                message=(
                    f'Click the link below to reset your password (expires in 1 hour):\n\n'
                    f'{reset_link}\n\nIf you did not request this, ignore this email.'
                ),
                from_email=django_settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )

        return Response({'detail': self.GENERIC_RESPONSE})


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes   = [ForgotPasswordRateThrottle]

    def post(self, request):
        token        = request.data.get('token', '')
        new_password = request.data.get('new_password', '')

        if not token or not new_password:
            return Response(
                {'error': 'token and new_password are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            data = signing.loads(
                token,
                salt=RESET_SALT,
                key=django_settings.SECRET_KEY,
                max_age=RESET_MAX_AGE_SECONDS,
            )
        except signing.SignatureExpired:
            return Response(
                {'error': 'This reset link has expired. Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except signing.BadSignature:
            return Response({'error': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(pk=data['uid'])
        except User.DoesNotExist:
            return Response({'error': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        # SEC-H3 FIX: The entire check-and-stamp is inside one transaction.atomic
        # with SELECT FOR UPDATE so two concurrent identical reset requests cannot
        # both pass the iat check before either has stamped password_changed_at
        # (TOCTOU race).  The validate_password call is intentionally kept
        # *outside* the lock because it is pure CPU work (~50ms) and holding a
        # row lock during it would reduce throughput unnecessarily.
        try:
            validate_password(new_password, user)
        except DjangoValidationError as e:
            return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Re-read under lock — any concurrent reset that commits first will
            # have updated password_changed_at, causing the iat check below to
            # reject this request.
            profile = _get_or_create_profile_locked(user)

            token_iat = data.get('iat')
            if token_iat is not None:
                if (profile.password_changed_at and
                        profile.password_changed_at.timestamp() > token_iat):
                    return Response(
                        {'error': 'This reset link has already been used. Please request a new one.'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            user.set_password(new_password)
            user.save(update_fields=['password'])

            # Stamp password_changed_at so any concurrent/subsequent reset
            # links (same or different) are immediately invalidated.
            profile.password_changed_at = timezone.now()
            profile.save(update_fields=['password_changed_at'])

        return Response({'detail': 'Password reset successfully. You can now log in.'})


# ── Leaderboard ───────────────────────────────────────────────────────────────

class LeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # DB-side aggregation: O(1) Python, DB does SUM/AVG/SORT/LIMIT.
        # Note: ranks by avg_roi (simple per-holding average), not by
        # position-weighted return.  This is intentional for the gamified
        # leaderboard; document if this should change to weighted return.
        top10 = (
            UserProfile.objects
            .select_related('user')
            .annotate(
                total_invested=Sum(
                    ExpressionWrapper(
                        F('user__portfolio__buy_price') * F('user__portfolio__qty'),
                        output_field=FloatField(),
                    )
                ),
                avg_roi=Avg('user__portfolio__roi1y'),
            )
            .filter(total_invested__gt=0)
            .order_by('-avg_roi')[:10]
        )

        results = [
            {
                'rank':       rank,
                'name':       profile.user.first_name or f'Trader #{profile.user.id}',
                'return_pct': round(profile.avg_roi or 0, 2),
                'is_me':      profile.user_id == request.user.id,
            }
            for rank, profile in enumerate(top10, start=1)
        ]
        return Response(results)
