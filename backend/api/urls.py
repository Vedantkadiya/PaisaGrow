from django.urls import path
from . import views

urlpatterns = [
    # Auth
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/me/', views.MeView.as_view(), name='me'),
    path('auth/change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('auth/forgot-password/', views.ForgotPasswordView.as_view(), name='forgot-password'),
    path('auth/reset-password/', views.ResetPasswordView.as_view(), name='reset-password'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    # CHANGE: Google OAuth endpoint — verifies GIS ID token, returns JWT pair
    path('auth/google/', views.GoogleLoginView.as_view(), name='google-login'),

    # Budget / Wallet
    path('budget/', views.BudgetView.as_view(), name='budget'),
    path('wallet/deposit/', views.WalletDepositView.as_view(), name='wallet-deposit'),
    path('wallet/withdraw/', views.WalletWithdrawView.as_view(), name='wallet-withdraw'),
    path('wallet/transactions/', views.WalletTransactionListView.as_view(), name='wallet-transactions'),
    path('wallet/transactions/export/', views.WalletTransactionExportCsvView.as_view(), name='wallet-export'),

    # Portfolio
    path('portfolio/', views.PortfolioListCreateView.as_view(), name='portfolio-list'),
    path('portfolio/summary/', views.PortfolioSummaryView.as_view(), name='portfolio-summary'),
    path('portfolio/export/', views.PortfolioExportCsvView.as_view(), name='portfolio-export'),
    path('portfolio/<int:pk>/', views.PortfolioDetailView.as_view(), name='portfolio-detail'),

    # Watchlist
    path('watchlist/', views.WatchlistListCreateView.as_view(), name='watchlist-list'),
    path('watchlist/<int:pk>/', views.WatchlistDetailView.as_view(), name='watchlist-detail'),

    # Goals
    path('goals/', views.GoalListCreateView.as_view(), name='goals-list'),
    path('goals/<int:pk>/', views.GoalDetailView.as_view(), name='goals-detail'),

    # SIP
    path('sip/settings/', views.SIPSettingsView.as_view(), name='sip-settings'),
    path('sip/logs/', views.SIPLogListCreateView.as_view(), name='sip-logs-list'),
    path('sip/logs/<int:pk>/', views.SIPLogDetailView.as_view(), name='sip-logs-detail'),

    # Daily Tracker
    path('tracker/', views.DailyTrackerListCreateView.as_view(), name='tracker-list'),
    path('tracker/<int:pk>/', views.DailyTrackerDetailView.as_view(), name='tracker-detail'),

    # Leaderboard
    path('leaderboard/', views.LeaderboardView.as_view(), name='leaderboard'),
]
