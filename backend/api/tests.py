from decimal import Decimal
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from .models import UserProfile, Portfolio


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'

    def test_register_creates_user_and_returns_tokens(self):
        res = self.client.post(self.register_url, {
            'first_name': 'Test User',
            'email': 'test@example.com',
            'password': 'Secure@123',
            'password2': 'Secure@123',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)
        self.assertTrue(User.objects.filter(email='test@example.com').exists())

    def test_register_duplicate_email_returns_400(self):
        data = {
            'first_name': 'Test', 'email': 'dup@example.com',
            'password': 'Secure@123', 'password2': 'Secure@123',
        }
        self.client.post(self.register_url, data, format='json')
        res = self.client.post(self.register_url, data, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_with_email(self):
        self.client.post(self.register_url, {
            'first_name': 'Login', 'email': 'login@example.com',
            'password': 'Secure@123', 'password2': 'Secure@123',
        }, format='json')
        res = self.client.post(self.login_url, {
            'username': 'login@example.com', 'password': 'Secure@123',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)

    def test_forgot_password_always_200(self):
        res = self.client.post('/api/auth/forgot-password/', {
            'email': 'nonexistent@example.com'
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('detail', res.data)


class WalletTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Register and get token
        res = self.client.post('/api/auth/register/', {
            'first_name': 'Wallet', 'email': 'wallet@example.com',
            'password': 'Secure@123', 'password2': 'Secure@123',
        }, format='json')
        self.token = res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
        self.user = User.objects.get(email='wallet@example.com')

    def test_deposit_increases_budget(self):
        self.client.post('/api/wallet/deposit/', {'amount': 5000, 'method': 'UPI'}, format='json')
        res = self.client.get('/api/budget/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(float(res.data['budget']), 5000.0)

    def test_withdraw_over_balance_returns_400(self):
        res = self.client.post('/api/wallet/withdraw/', {'amount': 1000}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Insufficient', str(res.data))

    def test_buy_stock_deducts_budget(self):
        self.client.post('/api/wallet/deposit/', {'amount': 10000, 'method': 'UPI'}, format='json')
        self.client.post('/api/portfolio/', {
            'ticker': 'TCS', 'stock_name': 'TCS', 'qty': 10,
            'buy_price': '500.00', 'sector': 'IT', 'risk': 'medium',
            'roi1y': 15.0, 'date': '2024-01-01',
        }, format='json')
        res = self.client.get('/api/budget/')
        self.assertEqual(float(res.data['budget']), 5000.0)


class SecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Create two users
        res1 = self.client.post('/api/auth/register/', {
            'first_name': 'User1', 'email': 'user1@example.com',
            'password': 'Secure@123', 'password2': 'Secure@123',
        }, format='json')
        self.token1 = res1.data['access']

        res2 = self.client.post('/api/auth/register/', {
            'first_name': 'User2', 'email': 'user2@example.com',
            'password': 'Secure@123', 'password2': 'Secure@123',
        }, format='json')
        self.token2 = res2.data['access']
        self.user1 = User.objects.get(email='user1@example.com')
        self.user2 = User.objects.get(email='user2@example.com')

    def test_cannot_access_other_users_portfolio_item(self):
        # user1 deposits and buys a stock
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token1}')
        self.client.post('/api/wallet/deposit/', {'amount': 10000, 'method': 'UPI'}, format='json')
        buy_res = self.client.post('/api/portfolio/', {
            'ticker': 'RELIANCE', 'stock_name': 'Reliance', 'qty': 1,
            'buy_price': '500.00', 'sector': 'Energy', 'risk': 'medium',
            'roi1y': 12.0, 'date': '2024-01-01',
        }, format='json')
        holding_id = buy_res.data['id']

        # user2 tries to delete user1's holding
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token2}')
        res = self.client.delete(f'/api/portfolio/{holding_id}/')
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
<<<<<<< HEAD


# ── v4 Security Regression Tests ─────────────────────────────────────────────
# These tests lock in the three critical v4 security fixes (H1–H3) and the
# ChangePasswordView stamp so future refactors cannot silently revert them.

class V4SecurityRegressionTests(TestCase):
    """Regression tests for all v4 security hardening."""

    def setUp(self):
        self.client = APIClient()
        res = self.client.post('/api/auth/register/', {
            'first_name': 'Sec', 'email': 'sec@example.com',
            'password': 'Secure@123', 'password2': 'Secure@123',
        }, format='json')
        self.access_token  = res.data['access']
        self.refresh_token = res.data['refresh']
        self.user = User.objects.get(email='sec@example.com')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        # Give the user some funds and a holding to sell
        self.client.post('/api/wallet/deposit/', {'amount': 50000, 'method': 'UPI'}, format='json')
        buy_res = self.client.post('/api/portfolio/', {
            'ticker': 'TCS', 'stock_name': 'TCS', 'qty': 10,
            'buy_price': '100.00', 'sector': 'IT', 'risk': 'medium',
            'roi1y': 15.0, 'date': '2024-01-01',
        }, format='json')
        self.holding_id = buy_res.data['id']

    # H1 — Sell price cap
    def test_sell_price_is_capped_at_4x_buy_price(self):
        """Client cannot manufacture money by submitting an astronomically high sell price."""
        budget_before = float(self.client.get('/api/budget/').data['budget'])
        # Try to sell 10 shares at 999999 each (buy_price was 100 → max allowed = 400)
        self.client.delete(f'/api/portfolio/{self.holding_id}/?qty=10&price=999999')
        budget_after = float(self.client.get('/api/budget/').data['budget'])
        proceeds = budget_after - budget_before
        # Max legitimate proceeds: 10 × (100 × 4) = 4000
        self.assertLessEqual(
            proceeds, 4000.01,
            f'Sell price cap bypassed: got proceeds of {proceeds}, expected ≤ 4000',
        )

    # H2 — Staff-only budget set
    def test_regular_user_cannot_set_budget_directly(self):
        """PATCH /api/budget/ must return 403 for non-staff users."""
        res = self.client.patch('/api/budget/', {'budget': 9_999_999}, format='json')
        self.assertEqual(
            res.status_code, status.HTTP_403_FORBIDDEN,
            'Regular user should not be able to set budget directly',
        )

    def test_staff_user_can_set_budget_directly(self):
        """PATCH /api/budget/ must succeed for staff users."""
        self.user.is_staff = True
        self.user.save(update_fields=['is_staff'])
        res = self.client.patch('/api/budget/', {'budget': 12345}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(float(res.data['budget']), 12345.0)

    # H3 — Single-use reset token
    def test_reset_token_is_single_use(self):
        """Re-using the same reset token after a successful reset must be rejected."""
        from django.core import signing
        from django.conf import settings as django_settings
        import time

        token = signing.dumps(
            {'uid': self.user.pk, 'iat': int(time.time())},
            salt='pg-reset',
            key=django_settings.SECRET_KEY,
        )
        # First use — should succeed
        res1 = self.client.post('/api/auth/reset-password/', {
            'token': token, 'new_password': 'NewPass@456',
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK, f'First reset failed: {res1.data}')

        # Second use — token is now stale (password_changed_at > iat)
        res2 = self.client.post('/api/auth/reset-password/', {
            'token': token, 'new_password': 'AnotherPass@789',
        }, format='json')
        self.assertEqual(
            res2.status_code, status.HTTP_400_BAD_REQUEST,
            'Reset token should be rejected on second use',
        )
        self.assertIn('already been used', str(res2.data).lower())

    # ChangePasswordView — stamps password_changed_at
    def test_change_password_stamps_password_changed_at(self):
        """After a password change, profile.password_changed_at must be set."""
        from .models import UserProfile
        res = self.client.post('/api/auth/change-password/', {
            'current_password': 'Secure@123',
            'new_password':     'Changed@456',
            'refresh':          self.refresh_token,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, f'Change password failed: {res.data}')
        profile = UserProfile.objects.get(user=self.user)
        self.assertIsNotNone(
            profile.password_changed_at,
            'password_changed_at should be set after a password change',
        )

=======
>>>>>>> ace6b61d9320d878df83eb2a802dda8224d77448
