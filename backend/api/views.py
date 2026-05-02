"""
views.py — PaisaGrow API views

Performance notes (from previous optimisation pass):
  - LeaderboardView uses DB-side aggregation (SUM/AVG via annotate) — O(1) Python.
  - PortfolioSummaryView uses a single aggregate query + one .only() fetch.
  - All list views use .only() to project only needed columns.
  - All profile saves use save(update_fields=[...]) to avoid full-row writes.
  - CSV exports use StreamingHttpResponse + values_list() + iterator() for constant memory.
  - ForgotPasswordView uses .only('id','email') to skip unused user columns.
"""

import csv
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


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_decimal(value, field_name='amount'):
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise drf_serializers.ValidationError({field_name: f'Invalid {field_name} value.'})


def _get_or_create_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def _get_or_create_profile_locked(user):
    """Like _get_or_create_profile but with SELECT FOR UPDATE for atomic balance operations."""
    profile, _ = UserProfile.objects.select_for_update().get_or_create(user=user)
    return profile


# ── Constants ─────────────────────────────────────────────────────────────────

RESET_SALT            = 'pg-reset'
RESET_MAX_AGE_SECONDS = 3600

PORTFOLIO_FIELDS = ('id', 'ticker', 'stock_name', 'qty', 'buy_price',
                    'sector', 'risk', 'roi1y', 'date', 'notes', 'created_at')

WATCHLIST_FIELDS = ('id', 'ticker', 'stock_name', 'sector', 'risk',
                    'alert_price', 'alert_type', 'added_at')

GOAL_FIELDS = ('id', 'name', 'icon', 'target_amount', 'current_saved',
               'months', 'expected_return', 'created_at', 'updated_at')

TRACKER_FIELDS = ('id', 'date', 'type', 'category', 'description', 'amount', 'created_at')


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
        request.user.save(update_fields=['first_name'])
        return Response(UserSerializer(request.user).data)

    def delete(self, request):
        if not request.user.check_password(request.data.get('password', '')):
            return Response({'error': 'Incorrect password.'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data['current_password']):
            return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password changed successfully.'})


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
        raw = request.data.get('budget')
        if raw is None:
            return Response({'error': 'budget field required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            new_budget = Decimal(str(raw))
        except (InvalidOperation, TypeError, ValueError):
            return Response({'error': 'Invalid budget value.'}, status=status.HTTP_400_BAD_REQUEST)

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

    @transaction.atomic
    def perform_create(self, serializer):
        buy_price = serializer.validated_data.get('buy_price')
        qty       = serializer.validated_data.get('qty')

        if not (1 <= qty <= 10000):
            raise drf_serializers.ValidationError('Quantity must be between 1 and 10,000.')
        if buy_price <= 0:
            raise drf_serializers.ValidationError('Buy price must be positive.')

        cost    = Decimal(str(buy_price)) * qty
        profile = _get_or_create_profile_locked(self.request.user)

        if profile.budget < cost:
            raise drf_serializers.ValidationError('Insufficient wallet balance.')

        holding         = serializer.save(user=self.request.user)
        profile.budget -= cost
        profile.save(update_fields=['budget'])

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
        try:
            sell_qty = int(request.query_params.get('qty', holding.qty))
        except (TypeError, ValueError):
            return Response({'error': 'Invalid sell quantity.'}, status=status.HTTP_400_BAD_REQUEST)

        if not (1 <= sell_qty <= holding.qty):
            return Response({'error': 'Invalid sell quantity.'}, status=status.HTTP_400_BAD_REQUEST)

        raw_price = request.query_params.get('price', holding.buy_price)
        try:
            sell_price = Decimal(str(raw_price))
            if not (Decimal('0') < sell_price <= Decimal('1000000')):
                raise ValueError
        except (InvalidOperation, TypeError, ValueError):
            return Response({'error': 'Invalid sell price.'}, status=status.HTTP_400_BAD_REQUEST)

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

        # Single Python pass: sector tally + worst holding at once
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

    # Constant response prevents email enumeration attacks.
    GENERIC_RESPONSE = 'If that email exists, a reset link has been sent.'

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        user  = User.objects.filter(email=email).only('id', 'email').first()

        if user:
            token      = signing.dumps({'uid': user.pk}, salt=RESET_SALT, key=django_settings.SECRET_KEY)
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
            return Response({'error': 'token and new_password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = signing.loads(token, salt=RESET_SALT, key=django_settings.SECRET_KEY, max_age=RESET_MAX_AGE_SECONDS)
        except signing.SignatureExpired:
            return Response({'error': 'This reset link has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
        except signing.BadSignature:
            return Response({'error': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(pk=data['uid'])
        except User.DoesNotExist:
            return Response({'error': 'Invalid reset link.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(new_password, user)
        except DjangoValidationError as e:
            return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'detail': 'Password reset successfully. You can now log in.'})


# ── Leaderboard ───────────────────────────────────────────────────────────────

class LeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
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
