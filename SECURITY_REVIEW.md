# PaisaGrow — Security Review Report
**Reviewer:** Security-aware Application Engineer  
**Environment:** Public-facing web app (React SPA + Django REST backend)  
**Scope:** Full-stack code review — auth, authz, input handling, secrets, data exposure

---

## 🔴 HIGH-RISK ISSUES

### H1 — Client-controlled sell price enables fake money creation
**File:** `backend/api/views.py` — `PortfolioDetailView.destroy()`  
**Line:** `raw_price = request.query_params.get('price', holding.buy_price)`

The sell price comes directly from the client as a query param (`DELETE /portfolio/42/?qty=10&price=999999`). The server accepts any value up to ₹10,00,000 per share. Any authenticated user can "sell" a ₹100 stock for ₹9,99,999 and credit that to their wallet — unlimited money generation.

**Fix:**
```python
# Remove the price param. Use a real market price source, or fall back to buy_price.
# At minimum, cap the gain:
sell_price = holding.buy_price  # use recorded buy price only
# OR: fetch current price from a trusted internal source, never from client input
```
If the intent is to let users record at-market prices, validate against a server-side price feed, not the client.

---

### H2 — `PATCH /budget/` lets a user set an arbitrary wallet balance
**File:** `backend/api/views.py` — `BudgetView.patch()`  
**Line:** `profile.budget = Decimal(str(new_budget))`

Any authenticated user can `PATCH /api/budget/ {"budget": 9999999}` and set their balance to any value directly, bypassing the deposit/withdraw flow entirely. This makes the entire wallet ledger meaningless.

**Fix:**
```python
# Delete or restrict this endpoint. Budget should only change via deposit/withdraw/invest/sell.
# If admin adjustment is needed, require staff permission:
if not request.user.is_staff:
    return Response({'error': 'Forbidden'}, status=403)
```

---

### H3 — Password reset token is not invalidated after use (reusable)
**File:** `backend/api/views.py` — `ResetPasswordView.post()`

The reset token is a Django `signing.dumps` HMAC — it is **stateless** and has no server-side tracking. After a user resets their password, the same token remains valid for the full 1-hour window. An attacker who captures the reset link (e.g., via email forwarding, logs, or referrer headers) can reset the password again.

**Fix:**
```python
# After successful reset, store a "last_reset" timestamp on the user profile
# and reject tokens issued before it:
from django.utils import timezone

# In ResetPasswordView.post(), after validating the token:
token_issued_at = data.get('iat', 0)  # add timestamp to signing.dumps payload
last_reset = user.profile.last_reset_at
if last_reset and last_reset.timestamp() > token_issued_at:
    return Response({'error': 'Reset link already used.'}, status=400)

# After set_password:
user.profile.last_reset_at = timezone.now()
user.profile.save()
```
Also add `iat` (issued-at epoch) to the `signing.dumps` payload.

---

### H4 — `DEBUG=True` is the default in production if env var is missing
**File:** `backend/paisagrow/settings.py`  
**Line:** `DEBUG = os.environ.get('DEBUG', 'True') == 'True'`

If `DEBUG` is not explicitly set in the environment (misconfigured deploy, env file not loaded), Django runs in debug mode — full stack traces including local variables, database queries, and environment values are exposed in HTTP error responses. Combined with the default `SECRET_KEY` fallback, this can reveal the signing key used for password reset tokens.

**Fix:**
```python
import sys
DEBUG = os.environ.get('DEBUG', 'False') == 'True'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'insecure-dev-only-key'
    else:
        print("ERROR: DJANGO_SECRET_KEY not set", file=sys.stderr)
        sys.exit(1)
```

---

## 🟡 MEDIUM-RISK ISSUES

### M1 — Leaderboard fetches and processes ALL users in Python (no pagination)
**File:** `backend/api/views.py` — `LeaderboardView.get()`  
**Line:** `profiles = UserProfile.objects.select_related('user').prefetch_related('user__portfolio').all()`

At scale, this loads every user + their entire portfolio into memory on every `/leaderboard/` request. Any authenticated user can trigger this. At even 10,000 users with 50 holdings each this is a large in-memory operation, making it a low-effort DoS vector.

Additionally, the leaderboard exposes other users' `first_name` values. If a user's first name is their real name, this is a PII disclosure. There's no consent mechanism.

**Fix:**
```python
# Compute rankings in the DB, not Python, and paginate:
from django.db.models import Sum, Avg, F, ExpressionWrapper, FloatField
# Annotate and sort at DB level; limit to top 10 in SQL
profiles = (UserProfile.objects
    .annotate(total_invested=Sum(F('user__portfolio__buy_price') * F('user__portfolio__qty'), output_field=FloatField()))
    .filter(total_invested__gt=0)
    .order_by('-total_invested')[:10])
```
For PII, replace first names with a generated handle (e.g. `Trader #<id>`) unless users opt-in to display their name.

---

### M2 — `ResetPasswordView` has no rate limiting
**File:** `backend/api/views.py` — `ResetPasswordView`  
**Line:** `class ResetPasswordView(APIView): permission_classes = [AllowAny]`

`ForgotPasswordView` correctly throttles to 3/hour. But `ResetPasswordView` (which accepts the token + new password) has **no throttle** and is `AllowAny`. An attacker with a token can retry brute-force if the token were ever guessable, or probe error messages unlimited times.

**Fix:**
```python
class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ForgotPasswordRateThrottle]  # reuse same 3/hour scope
```

---

### M3 — JWT tokens stored in `localStorage` — XSS risk
**File:** `frontend/src/api.js`  
**Lines:** `localStorage.setItem('pg_access', access)` / `localStorage.getItem('pg_access')`

`localStorage` is accessible by any JavaScript running on the page. If any dependency or injected script has an XSS vector, both access and refresh tokens are stolen silently. Refresh tokens (7-day lifetime) are especially dangerous.

**Fix (preferred):** Store the refresh token in an `HttpOnly` cookie and keep the short-lived access token in memory only (React state). This requires backend support for cookie-based refresh.

**Fix (pragmatic):** At minimum, store only the 15-min access token in memory, not localStorage, and use a `SameSite=Strict` HttpOnly cookie for the refresh token.

---

### M4 — `description` and `method` fields on wallet transactions are unvalidated free-text
**File:** `backend/api/views.py` — `WalletDepositView`, `WalletWithdrawView`  
**Lines:** `description = request.data.get('description', 'Deposit')` / `method = request.data.get('method', '')`

These fields are written to the DB and returned in API responses and CSV exports without any length cap or content validation at the view level (the model's `max_length=200` is the only guard). A user can store arbitrary strings — including script tags — in the `description`. If any admin view or future template renders these without escaping, it becomes a stored XSS vector.

**Fix:**
```python
# In views, explicitly strip and cap:
description = str(request.data.get('description', 'Deposit'))[:200].strip()
method = str(request.data.get('method', ''))[:30].strip()
# In serializers, add explicit validators for these fields:
description = serializers.CharField(max_length=200, default='', allow_blank=True)
method = serializers.CharField(max_length=30, default='', allow_blank=True)
```

---

### M5 — `notes` field on Portfolio and `icon` on Goal are unvalidated
**File:** `backend/api/serializers.py` — `PortfolioSerializer`, `GoalSerializer`  
The `notes` (TextField, unlimited) and `icon` (CharField(10)) fields are accepted from clients with no sanitization. `notes` has no max_length at all in the serializer.

**Fix:**
```python
# In PortfolioSerializer:
notes = serializers.CharField(max_length=1000, default='', allow_blank=True)
# In GoalSerializer:
icon = serializers.CharField(max_length=10, default='🎯')
```

---

### M6 — Sell endpoint uses a DELETE with query params — CSRF-unfriendly design
**File:** `frontend/src/api.js`  
**Line:** `apiFetch(\`/portfolio/${id}/?qty=${qty}&price=${price}\`, { method: 'DELETE' })`

Passing financial parameters (qty, price) in a DELETE query string is semantically wrong and bypasses any future logging/audit middleware that only inspects request bodies. It also makes the price tamper-obvious in server logs but easy to overlook in code review.

**Fix:** Change the sell action to a dedicated `POST /portfolio/{id}/sell/` endpoint that reads qty and price from the request body, with full serializer validation.

---

## 🟢 LOW-RISK HARDENING SUGGESTIONS

### L1 — Add `Vary: Origin` and review CORS credentials scope
`CORS_ALLOW_CREDENTIALS = True` combined with `CORS_ALLOWED_ORIGINS` from an env var is fine, but make sure the production value of `CORS_ALLOWED_ORIGINS` does not accidentally include `*` or an overly broad wildcard. Add a startup assertion:
```python
assert '*' not in CORS_ALLOWED_ORIGINS, "Wildcard CORS with credentials is insecure"
```

### L2 — Throttle scope uses `AnonRateThrottle` for login — authenticated replays bypass it
`LoginRateThrottle` extends `AnonRateThrottle` (keyed by IP). If an attacker uses rotating IPs or a proxy, the 5/min limit is ineffective. Consider also keying on the target email/username.

### L3 — CSV exports have no `Content-Security-Policy` or download token
The CSV export endpoints return files with user data. They rely solely on JWT auth — fine for now — but add `X-Content-Type-Options: nosniff` to the response to prevent browsers from sniffing the content type.

### L4 — `roi1y` is a client-supplied float with no bounds check
**File:** `backend/api/serializers.py` — `PortfolioSerializer`  
`roi1y` accepts any float. A user could set `roi1y=999999` on a holding to appear first on the leaderboard with a fake 999999% return. Add a validator:
```python
def validate_roi1y(self, value):
    if not (-100 <= value <= 10000):
        raise serializers.ValidationError('roi1y out of realistic range.')
    return value
```

### L5 — `SIPLog.month` is 0-indexed (JS convention) — confusing and error-prone
The model stores months 0–11 and the serializer validates this. This is a footgun for any future developer or API consumer who expects 1–12. Document this explicitly in the API schema or migrate to 1–12.

### L6 — No account lockout after failed password change attempts
`ChangePasswordView` has no throttle class. A brute-force attack against a known user's current password (once logged in via a stolen access token) has no friction.

### L7 — `package-lock.json` should be audited for known CVEs
Run `npm audit` against the frontend dependencies before every deploy. Automate this in CI.

---

## 🔧 EXAMPLE FIXES SUMMARY

```python
# H1 — Remove client-controlled sell price
sell_price = holding.buy_price  # or fetch from trusted price source

# H2 — Restrict direct budget set
if not request.user.is_staff:
    return Response({'error': 'Forbidden.'}, status=403)

# H4 — Safe defaults
DEBUG = os.environ.get('DEBUG', 'False') == 'True'
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY') or (
    'dev-only' if DEBUG else (_ for _ in ()).throw(RuntimeError('SECRET_KEY not set'))
)

# M2 — Rate-limit reset password
class ResetPasswordView(APIView):
    throttle_classes = [ForgotPasswordRateThrottle]

# L4 — Bound roi1y
def validate_roi1y(self, value):
    if not (-100 <= value <= 10000):
        raise serializers.ValidationError('roi1y out of realistic range.')
    return value
```

---

## 🧪 WHAT TO TEST MANUALLY

1. **[H1] Sell price injection:** `DELETE /api/portfolio/<any_id>/?qty=1&price=999999` — confirm your wallet balance jumps by ₹9,99,999 without owning that stock at that price.

2. **[H2] Budget direct set:** `PATCH /api/budget/ {"budget": 9999999}` — confirm it either rejects non-staff users or that this endpoint does not exist in production.

3. **[H3] Reset token reuse:** Request a password reset, use the link to change password, then submit the same link again — confirm the server rejects it.

4. **[H4] Debug mode leak:** Hit a non-existent URL and confirm you get a generic 404 JSON response, not Django's HTML debug page with stack traces.

5. **[M1] Leaderboard DoS:** Measure response time on `/api/leaderboard/` as user count grows. Check if it's O(N) in Python.

6. **[M2] Reset brute-force:** POST to `/api/auth/reset-password/` 20 times rapidly — confirm you get throttled.

7. **[M3] Token exfiltration:** Open browser devtools → Application → LocalStorage. Confirm `pg_access` and `pg_refresh` are both visible (they are — this is the risk).

8. **[M4] Description injection:** Deposit with `description: "<script>alert(1)</script>"` — confirm it appears escaped in the transaction list and CSV export.

9. **[L4] roi1y leaderboard manipulation:** POST to `/api/portfolio/` with `roi1y: 999999` — confirm it appears at rank #1 on the leaderboard (it will, without the validator fix).

10. **[L6] Password change brute-force:** POST to `/api/auth/change-password/` 100 times rapidly with wrong `current_password` — confirm you are not throttled.
