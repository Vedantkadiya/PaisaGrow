# PaisaGrow v4 — Fix Changelog

All issues raised in the v3 critique have been resolved.
Files changed: `backend/api/views.py`, `backend/api/models.py`,
`backend/api/migrations/0005_userprofile_password_changed_at.py`,
`backend/paisagrow/settings.py`,
`frontend/src/hooks/useServerSync.js`,
`frontend/src/auth/ProfilePage.js`

---

## 🔴 Critical Security (were unfixed from round 1)

### SEC-H1 — Sell price capped server-side
**File:** `backend/api/views.py — PortfolioDetailView.destroy()`

The client may submit a `price` param (so the frontend can show realistic
P&L), but it is now capped to `buy_price × 4` on the server.  Any submitted
price above that multiplier is silently clamped — the holding sells at the
cap, not at the spoofed value.  This eliminates the money-creation exploit
(`sell 1 share for ₹9,99,999`) while remaining forgiving for legitimate
large-gainer positions.

Production hardening path: replace the multiplier cap with a trusted
server-side price feed (Yahoo Finance via a background cache).

```python
MAX_SELL_PRICE_MULTIPLIER = Decimal('4')
...
max_allowed_price = Decimal(str(holding.buy_price)) * MAX_SELL_PRICE_MULTIPLIER
if sell_price > max_allowed_price:
    sell_price = max_allowed_price   # cap, not reject
```

### SEC-H2 — Direct budget set restricted to staff
**File:** `backend/api/views.py — BudgetView.patch()`

`PATCH /api/budget/` now returns `403 Forbidden` for non-staff users.
Regular users can only move their balance via deposit / withdraw / invest /
sell.  Staff can still use the endpoint for administrative corrections.

```python
if not request.user.is_staff:
    return Response({'error': '...'}, status=403)
```

### SEC-H3 — Reset token is now single-use
**Files:** `backend/api/models.py`, `backend/api/views.py`,
`backend/api/migrations/0005_userprofile_password_changed_at.py`

`UserProfile` gains a `password_changed_at` DateTimeField (nullable).

`ForgotPasswordView` now embeds `iat` (issued-at epoch) in the signed token:
```python
signing.dumps({'uid': user.pk, 'iat': int(time.time())}, ...)
```

`ResetPasswordView` and `ChangePasswordView` both stamp `password_changed_at`
on success.  `ResetPasswordView` rejects any token whose `iat` is older than
`profile.password_changed_at`, making each link single-use in practice.
The 1-hour max_age expiry is unchanged as a second layer.

---

## 🔴 Bugs (regressions introduced in v3)

### BUG-1 — `@transaction.atomic` moved to `create()`, not `perform_create()`
**File:** `backend/api/views.py — PortfolioListCreateView`

Previously `perform_create` was decorated with `@transaction.atomic` but
`create()` was not.  A process crash between `serializer.save()` (holding
created) and `profile.save()` (budget deducted) would leave an orphaned
holding with no corresponding wallet debit — free stock.

`@transaction.atomic` is now on `create()`, which wraps the entire
request-handling path including `perform_create`.

### BUG-2 — `SELECT FOR UPDATE` no longer called outside a transaction
**File:** `backend/api/views.py — BudgetView.patch()`

`_get_or_create_profile_locked` (which calls `select_for_update()`) was
being invoked in `BudgetView.patch()` without a surrounding
`@transaction.atomic` block.  In autocommit mode `SELECT FOR UPDATE` is
a silent no-op — the call incurred the overhead of the hint with none of
the protection.

`BudgetView.patch()` now uses `_get_or_create_profile` (no lock).
A direct budget assignment does not require serialisation because there
is no concurrent arithmetic — it is a plain `SET budget = X`.

### BUG-3 — Post-buy budget read is no longer a separate DB query
**File:** `backend/api/views.py — PortfolioListCreateView`

`create()` previously called `_get_or_create_profile(request.user)` after
`perform_create()` to get the updated budget for the response — an extra DB
round-trip that was unnecessary because `perform_create` already had the
updated `profile` object in scope.

`perform_create` now stashes the post-deduction budget on `self._buy_budget`,
and `create()` reads it directly.

### BUG-4 — Spurious `refresh_from_db()` removed from `MeView.patch()`
**File:** `backend/api/views.py — MeView.patch()`

The comment claimed `refresh_from_db()` was needed to clear the cached
`profile` reverse-relation.  This is incorrect: `refresh_from_db()` without
`fields` re-fetches all columns from `auth_user` but does **not** clear
reverse OneToOne accessor caches stored in `instance.__dict__`.  The call
was both wrong and wasteful (extra DB round-trip for a first-name update).

Removed.  `UserSerializer.get_budget` accesses `obj.profile.budget` via a
fresh DB lookup on first access anyway (the profile is not pre-fetched on
the `request.user` instance after a `save(update_fields=...)`).

---

## 🟠 Performance

### PERF-B6 — O(1) ticker lookup in `useServerSync.js`
**File:** `frontend/src/hooks/useServerSync.js`

`serverHoldingToApp` and `serverWatchToApp` previously called
`STOCKS.find(s => s.ticker === h.ticker)` — an O(N) linear scan of ~200
stocks — for every holding on every server sync.  For a portfolio of 50
holdings this was 10,000 string comparisons per sync cycle.

Replaced with a pre-built `Object.fromEntries` map (`_stocksByTicker`)
built lazily on first use and memo-ised for the page lifetime.  Lookups
are now O(1).

```js
// Before — O(N) per holding
const local = STOCKS.find(s => s.ticker === h.ticker) || {};

// After — O(1)
const local = getStocksByTicker()[h.ticker] || {};
```

---

## 🟡 Minor / Correctness

### PROFILE — Empty name guard in `ProfilePage.js`
**File:** `frontend/src/auth/ProfilePage.js`

The `required` attribute on the name input only fires the browser's native
validation on an unintercepted submit.  After `e.preventDefault()`, an empty
`name` string would reach `updateProfile()` and return a 400 from the API.
Added an explicit JS guard:

```js
if (!name.trim()) {
  setProfileMsg({ type: 'error', msg: 'Name cannot be empty.' });
  return;
}
```

The profile is also updated with `name.trim()` to strip leading/trailing
whitespace before sending.

### SETTINGS — Production SECRET_KEY assertion
**File:** `backend/paisagrow/settings.py`

Added a startup check that prints a clear error and calls `sys.exit(1)` if
`DJANGO_SECRET_KEY` is still the dev default in a non-DEBUG deployment.
Also added a `CORS_ALLOWED_ORIGINS` wildcard assertion to catch
misconfigured deployments before they go live.

### MODELS — SIPLog month indexing documented
**File:** `backend/api/models.py`

Added a class docstring to `SIPLog` explaining the 0-indexed `month` field
convention and how external API consumers should handle it.

---

## What still remains as a known limitation

- The sell-price cap (4×) is a pragmatic mitigation, not a full fix.  The
  correct fix is a server-side price feed.  The cap is documented in the
  `MAX_SELL_PRICE_MULTIPLIER` constant and in the `destroy()` docstring.

- The leaderboard ranks by simple average ROI, not position-weighted return.
  This is intentional for the gamified leaderboard but is documented as a
  known design decision in the `LeaderboardView` docstring.

---

## v4 Round-2 Fixes (critique response)

### 🔴 setManualBudget no longer calls the 403'd PATCH /budget/ endpoint
**File:** `frontend/src/hooks/useServerSync.js`

`setManualBudget` previously called `budgetApi.set(val)` → `PATCH /api/budget/`, which now returns 403 for all non-staff users (SEC-H2). Every first-time user who clicked "Let's Go!" saw "Failed to save budget" and had their input wiped. Fixed by routing through `walletApi.deposit` with `method='onboarding'`, matching the correct flow where starting balance = first deposit.

### 🔴 ChangePasswordView now invalidates the caller's active session
**File:** `backend/api/views.py — ChangePasswordView`

After a successful password change the caller's refresh token is blacklisted (same `RefreshToken(...).blacklist()` pattern used in LogoutView). A compromised-account victim who changes their password now immediately invalidates the attacker's session. The client should send its current `refresh` token in the request body; if absent, blacklisting is skipped (graceful degradation).

### 🟠 ResetPasswordView TOCTOU race eliminated
**File:** `backend/api/views.py — ResetPasswordView`

The read-then-stamp window (unlocked read → validate_password → atomic write) allowed two concurrent identical reset requests to both pass the `iat` check. Fixed by moving both the `iat` check and the stamp inside a single `transaction.atomic` block that uses `_get_or_create_profile_locked` (SELECT FOR UPDATE) for the initial read.

### 🟠 RegisterSerializer no longer leaks user existence
**File:** `backend/api/serializers.py — RegisterSerializer`

`'Email already registered.'` was a user-enumeration oracle. Replaced with a generic message indistinguishable from other registration failures.

### 🟠 PortfolioSerializer: notes capped at 2000 chars, roi1y bounded
**File:** `backend/api/serializers.py — PortfolioSerializer`

`notes` is a TextField (unlimited DB storage); a client could POST a 5MB blob that would be fetched on every portfolio list call. Added `max_length=2000`. `roi1y` had no bounds; values outside −100…500 are now rejected, preventing leaderboard manipulation via absurd stored ROI.

### 🟠 Tests added for all v4 security fixes
**File:** `backend/api/tests.py — V4SecurityRegressionTests`

Four new regression tests: sell price cap (H1), staff-only budget set (H2), single-use reset token (H3), and `password_changed_at` stamping on change-password. These prevent silent regressions during future refactors.

### 🟡 ChangePasswordView now uses _get_or_create_profile_locked
**File:** `backend/api/views.py — ChangePasswordView`

Was using the unlocked helper inside `@transaction.atomic`, inconsistent with every other profile-write site. Now uses the locked variant.

### 🟡 onDeleteEntry stale-closure / unstable ref fixed
**File:** `frontend/src/hooks/useServerSync.js`

`onDeleteEntry` closed over `entries` in its dep array, creating a new function reference on every state update and causing memoised child components to hold stale callbacks. Refactored to use a functional `setEntries` updater for the rollback so the dep array is `[]` (stable reference).

### 🟢 settings.py assert replaced with RuntimeError
**File:** `backend/paisagrow/settings.py`

`assert '*' not in CORS_ALLOWED_ORIGINS` is silenced by `python -O`. Replaced with an explicit `if … raise RuntimeError(…)`.

### 🟢 UpdateProfileSerializer rejects whitespace-only names
**File:** `backend/api/serializers.py — UpdateProfileSerializer`

Added `allow_blank=False` so `"   "` is rejected by the API regardless of what any client sends.
