from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import (
    Portfolio, Watchlist, Goal, SIPLog, SIPSettings,
    DailyTrackerEntry, WalletTransaction, UserProfile,
)


# ── Auth ──────────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'password', 'password2')

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        # NOTE: We intentionally do NOT return a distinct "Email already registered"
        # error here. Doing so would let an attacker enumerate which emails have
        # accounts (a user-enumeration oracle). Instead we return a generic message
        # that is indistinguishable from other registration failures.  A real
        # implementation should silently accept the request and email the existing
        # address ("looks like you already have an account"), but for this app a
        # generic error is the safe minimum.
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError(
                {'email': 'Unable to create an account with these details. '
                          'Please check your information and try again.'}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            password=validated_data['password'],
        )
        UserProfile.objects.create(user=user)
        return user


class UserSerializer(serializers.ModelSerializer):
    budget = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'name', 'budget')

    def get_budget(self, obj):
        try:
            return float(obj.profile.budget)
        except UserProfile.DoesNotExist:
            return 0.0

    def get_name(self, obj):
        return obj.first_name or obj.email.split('@')[0]


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])


class UpdateProfileSerializer(serializers.Serializer):
    # allow_blank=False rejects empty strings and whitespace-only strings
    # (trim_whitespace=True is the DRF default, but we make it explicit).
    first_name = serializers.CharField(max_length=60, allow_blank=False, trim_whitespace=True)


# ── UserProfile (budget) ──────────────────────────────────────────────────────

class BudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ('budget',)


# ── Portfolio ─────────────────────────────────────────────────────────────────

class PortfolioSerializer(serializers.ModelSerializer):
    # notes is a TextField on the model (unlimited storage), so we enforce a
    # reasonable max here to prevent the API being used as a free blob store.
    notes = serializers.CharField(max_length=2000, default='', allow_blank=True)

    class Meta:
        model = Portfolio
        fields = (
            'id', 'ticker', 'stock_name', 'qty', 'buy_price',
            'sector', 'risk', 'roi1y', 'date', 'notes', 'created_at',
        )
        read_only_fields = ('id', 'created_at')

    def validate_qty(self, value):
        if value <= 0:
            raise serializers.ValidationError('Quantity must be positive.')
        return value

    def validate_buy_price(self, value):
        if value <= 0:
            raise serializers.ValidationError('Buy price must be positive.')
        return value

    def validate_roi1y(self, value):
        # Realistic 1-year ROI range: a stock cannot lose more than 100 % of
        # its value, and a 500 % gain in one year is an extremely generous upper
        # bound even for the most volatile small-caps.  Values outside this range
        # are almost certainly data-entry errors or manipulation attempts.
        if not (-100.0 <= value <= 500.0):
            raise serializers.ValidationError('roi1y must be between -100 and 500.')
        return value


# ── Watchlist ─────────────────────────────────────────────────────────────────

class WatchlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Watchlist
        fields = ('id', 'ticker', 'stock_name', 'sector', 'risk', 'alert_price', 'alert_type', 'added_at')
        read_only_fields = ('id', 'added_at')


# ── Goals ─────────────────────────────────────────────────────────────────────

class GoalSerializer(serializers.ModelSerializer):
    progress_pct = serializers.SerializerMethodField()

    class Meta:
        model = Goal
        fields = (
            'id', 'name', 'icon', 'target_amount', 'current_saved',
            'months', 'expected_return', 'progress_pct', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'progress_pct')

    def get_progress_pct(self, obj):
        if obj.target_amount <= 0:
            return 0
        return min(100, round(float(obj.current_saved) / float(obj.target_amount) * 100))


# ── SIP ───────────────────────────────────────────────────────────────────────

class SIPLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SIPLog
        fields = ('id', 'year', 'month', 'amount', 'note', 'logged_at')
        read_only_fields = ('id', 'logged_at')

    def validate_month(self, value):
        if not (0 <= value <= 11):
            raise serializers.ValidationError('Month must be 0–11.')
        return value


class SIPSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SIPSettings
        fields = ('sip_amount', 'sip_day')

    def validate_sip_day(self, value):
        if not (1 <= value <= 28):
            raise serializers.ValidationError('SIP day must be between 1 and 28.')
        return value


# ── Daily Tracker ─────────────────────────────────────────────────────────────

class DailyTrackerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyTrackerEntry
        fields = ('id', 'date', 'type', 'category', 'description', 'amount', 'created_at')
        read_only_fields = ('id', 'created_at')

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be positive.')
        return value


# ── Wallet ────────────────────────────────────────────────────────────────────

class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = ('id', 'type', 'amount', 'description', 'method', 'timestamp')
        read_only_fields = ('id', 'timestamp')
