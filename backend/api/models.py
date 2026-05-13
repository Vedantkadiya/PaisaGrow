from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator


class Portfolio(models.Model):
    """Tracks stock holdings for a user."""
<<<<<<< HEAD
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='portfolio')
    ticker     = models.CharField(max_length=20)
    stock_name = models.CharField(max_length=100)
    qty        = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    buy_price  = models.DecimalField(max_digits=12, decimal_places=2)
    sector     = models.CharField(max_length=50, default='')
    risk       = models.CharField(max_length=10, default='medium')
    roi1y      = models.FloatField(default=0)
    date       = models.DateField()
    notes      = models.TextField(blank=True, default='')
=======
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='portfolio')
    ticker = models.CharField(max_length=20)
    stock_name = models.CharField(max_length=100)
    qty = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    buy_price = models.DecimalField(max_digits=12, decimal_places=2)
    sector = models.CharField(max_length=50, default='')
    risk = models.CharField(max_length=10, default='medium')
    roi1y = models.FloatField(default=0)
    date = models.DateField()
    notes = models.TextField(blank=True, default='')
>>>>>>> ace6b61d9320d878df83eb2a802dda8224d77448
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} — {self.ticker} x{self.qty}"


class Watchlist(models.Model):
    """Saved watchlist of tickers per user."""
<<<<<<< HEAD
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='watchlist')
    ticker     = models.CharField(max_length=20)
    stock_name = models.CharField(max_length=100)
    sector     = models.CharField(max_length=50, default='')
    risk       = models.CharField(max_length=10, default='medium')
    alert_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    alert_type  = models.CharField(max_length=10, blank=True, default='above')  # 'above' or 'below'
    added_at   = models.DateTimeField(auto_now_add=True)
=======
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='watchlist')
    ticker = models.CharField(max_length=20)
    stock_name = models.CharField(max_length=100)
    sector = models.CharField(max_length=50, default='')
    risk = models.CharField(max_length=10, default='medium')
    alert_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    alert_type = models.CharField(max_length=10, blank=True, default='above')  # 'above' or 'below'
    added_at = models.DateTimeField(auto_now_add=True)
>>>>>>> ace6b61d9320d878df83eb2a802dda8224d77448

    class Meta:
        unique_together = ('user', 'ticker')
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.user.username} watching {self.ticker}"


class Goal(models.Model):
    """Financial goals for the goal planner."""
    RETURN_CHOICES = [
        (7,  'FD (7%)'),
        (14, 'Nifty ETF (14%)'),
        (20, 'Growth stocks (20%)'),
    ]
<<<<<<< HEAD
    user           = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    name           = models.CharField(max_length=100)
    icon           = models.CharField(max_length=10, default='🎯')
    target_amount  = models.DecimalField(max_digits=14, decimal_places=2)
    current_saved  = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    months         = models.PositiveIntegerField()
    expected_return = models.IntegerField(choices=RETURN_CHOICES, default=14)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)
=======
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goals')
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, default='🎯')
    target_amount = models.DecimalField(max_digits=14, decimal_places=2)
    current_saved = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    months = models.PositiveIntegerField()
    expected_return = models.IntegerField(choices=RETURN_CHOICES, default=14)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
>>>>>>> ace6b61d9320d878df83eb2a802dda8224d77448

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} — {self.name}"


class SIPLog(models.Model):
<<<<<<< HEAD
    """Monthly SIP (Systematic Investment Plan) logs.

    NOTE: `month` is 0-indexed (0=Jan … 11=Dec) to mirror JS Date.getMonth().
    API consumers on other platforms should subtract 1 from calendar month
    before sending, and add 1 when displaying.
    """
    user      = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sip_logs')
    year      = models.PositiveIntegerField()
    month     = models.PositiveIntegerField()  # 0-indexed: 0=Jan, 11=Dec
    amount    = models.DecimalField(max_digits=12, decimal_places=2)
    note      = models.CharField(max_length=200, blank=True, default='')
=======
    """Monthly SIP (Systematic Investment Plan) logs."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sip_logs')
    year = models.PositiveIntegerField()
    month = models.PositiveIntegerField()  # 0-indexed to match JS Date.getMonth()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.CharField(max_length=200, blank=True, default='')
>>>>>>> ace6b61d9320d878df83eb2a802dda8224d77448
    logged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'year', 'month')
        ordering = ['year', 'month']

    def __str__(self):
        return f"{self.user.username} SIP {self.year}/{self.month+1} ₹{self.amount}"


class SIPSettings(models.Model):
    """User's SIP configuration."""
<<<<<<< HEAD
    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='sip_settings')
    sip_amount = models.DecimalField(max_digits=12, decimal_places=2, default=500)
    sip_day    = models.PositiveIntegerField(default=1)
=======
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='sip_settings')
    sip_amount = models.DecimalField(max_digits=12, decimal_places=2, default=500)
    sip_day = models.PositiveIntegerField(default=1)
>>>>>>> ace6b61d9320d878df83eb2a802dda8224d77448

    def __str__(self):
        return f"{self.user.username} SIP ₹{self.sip_amount} on day {self.sip_day}"


class DailyTrackerEntry(models.Model):
    """Daily spending/income tracker entries."""
    CATEGORY_CHOICES = [
        ('income',    'Income'),
        ('food',      'Food'),
        ('transport', 'Transport'),
        ('shopping',  'Shopping'),
        ('bills',     'Bills'),
        ('invest',    'Investment'),
        ('other',     'Other'),
    ]
    TYPE_CHOICES = [
        ('income',  'Income'),
        ('expense', 'Expense'),
    ]
<<<<<<< HEAD
    user        = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tracker_entries')
    date        = models.DateField(db_index=True)   # indexed: filtered on every list query
    type        = models.CharField(max_length=10, choices=TYPE_CHOICES)
    category    = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    description = models.CharField(max_length=200)
    amount      = models.DecimalField(max_digits=12, decimal_places=2)
    created_at  = models.DateTimeField(auto_now_add=True)
=======
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tracker_entries')
    # FIX LOW: Add db_index=True — date is filtered on every query (date=x, date__year/month)
    date = models.DateField(db_index=True)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
>>>>>>> ace6b61d9320d878df83eb2a802dda8224d77448

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.user.username} {self.date} {self.type} ₹{self.amount}"


class WalletTransaction(models.Model):
    """Wallet deposit/withdraw history."""
    TYPE_CHOICES = [
        ('deposit',  'Deposit'),
        ('withdraw', 'Withdraw'),
        ('invest',   'Invested in stock'),
        ('sell',     'Sold stock'),
    ]
<<<<<<< HEAD
    user        = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wallet_transactions')
    type        = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount      = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=200, blank=True, default='')
    method      = models.CharField(max_length=30, blank=True, default='')
    timestamp   = models.DateTimeField(auto_now_add=True)
=======
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wallet_transactions')
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=200, blank=True, default='')
    method = models.CharField(max_length=30, blank=True, default='')
    timestamp = models.DateTimeField(auto_now_add=True)
>>>>>>> ace6b61d9320d878df83eb2a802dda8224d77448

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} {self.type} ₹{self.amount}"


class UserProfile(models.Model):
<<<<<<< HEAD
    """Extended user profile.

    `password_changed_at` is set whenever set_password() is called via the API.
    It is used by ResetPasswordView to invalidate password-reset tokens that
    were issued before the most recent password change, making reset links
    single-use in practice.
    """
    user               = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    budget             = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    password_changed_at = models.DateTimeField(null=True, blank=True)
    created_at         = models.DateTimeField(auto_now_add=True)
    updated_at         = models.DateTimeField(auto_now=True)
=======
    """Extended user profile."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    budget = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
>>>>>>> ace6b61d9320d878df83eb2a802dda8224d77448

    def __str__(self):
        return f"{self.user.username} profile (₹{self.budget})"
