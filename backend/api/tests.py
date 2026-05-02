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
