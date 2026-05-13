from django.contrib import admin
from .models import (
    Portfolio, Watchlist, Goal, SIPLog, SIPSettings,
    DailyTrackerEntry, WalletTransaction, UserProfile,
)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'budget', 'created_at')

@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    list_display = ('user', 'ticker', 'qty', 'buy_price', 'date')

@admin.register(Watchlist)
class WatchlistAdmin(admin.ModelAdmin):
    list_display = ('user', 'ticker', 'alert_price', 'added_at')

@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    list_display = ('user', 'name', 'target_amount', 'current_saved', 'months')

@admin.register(SIPLog)
class SIPLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'year', 'month', 'amount')

@admin.register(SIPSettings)
class SIPSettingsAdmin(admin.ModelAdmin):
    list_display = ('user', 'sip_amount', 'sip_day')

@admin.register(DailyTrackerEntry)
class DailyTrackerEntryAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'type', 'category', 'amount')

@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'type', 'amount', 'timestamp')
