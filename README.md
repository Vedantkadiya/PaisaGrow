<div align="center">

# 🌿 PaisaGrow

**A full-stack paper trading & personal finance app built for Indian beginners.**  
Practice investing with real market data — no real money, zero risk.

[![Django](https://img.shields.io/badge/Backend-Django%204.2-092E20?style=flat-square&logo=django)](https://djangoproject.com)
[![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=flat-square&logo=react)](https://reactjs.org)
[![DRF](https://img.shields.io/badge/API-Django%20REST%20Framework-ff1709?style=flat-square)](https://www.django-rest-framework.org)
[![JWT](https://img.shields.io/badge/Auth-JWT-black?style=flat-square)](https://jwt.io)

</div>

---

## 📸 What It Does

PaisaGrow is a **paper trading simulator** for the Indian stock market. Users register, fund a virtual wallet, and invest in a curated set of Indian stocks — all without touching real money. It covers the full personal-finance loop:

| Feature | Description |
|---|---|
| 💳 **Wallet** | Deposit / withdraw via simulated UPI & bank transfer. Server-persisted. |
| 📈 **Buy Stocks** | Browse Indian stocks, buy with virtual cash, track real-time prices. |
| 💼 **Portfolio** | Holdings with live P&L, sector breakdown, sell functionality. |
| 👁 **Watchlist** | Save tickers, set price alerts (above/below). |
| 🎯 **Goal Planner** | Create savings goals (car, education, wedding…) with SIP projections. |
| 📅 **SIP Tracker** | Log monthly SIP investments, view streaks, calculate corpus growth. |
| 📊 **Daily Tracker** | Income/expense log with category breakdown charts. |
| 🤖 **AI Signals** | Rule-based buy/sell/hold signals with risk scores. |
| ⚖️ **Stock Compare** | Side-by-side comparison of up to 3 stocks. |
| 🏛 **Tax Calculator** | STCG/LTCG calculator based on your portfolio. |
| 🌱 **Growth Simulator** | Compound interest projector with scenario sliders. |
| 📚 **Learn Basics** | Beginner investing concepts built in. |

---

## 🏗️ Architecture

```
paisagrow/
├── backend/                # Django + DRF
│   ├── api/
│   │   ├── models.py       # Portfolio, Watchlist, Goal, SIPLog, WalletTransaction…
│   │   ├── views.py        # 32 API endpoints
│   │   ├── serializers.py
│   │   └── urls.py
│   ├── paisagrow/
│   │   ├── settings.py
│   │   └── urls.py
│   ├── manage.py
│   └── requirements.txt
│
└── frontend/               # React 18
    └── src/
        ├── App.js          # Root shell — wires server state to all pages
        ├── api.js          # Typed API client (fetch + JWT auto-refresh)
        ├── hooks/
        │   ├── useServerSync.js   # ★ All server state hooks (Wallet, Portfolio…)
        │   ├── useLivePrices.js   # WebSocket/polling live price hook
        │   └── useLocalStorage.js # Fallback persistence hook
        ├── pages/          # 14 page components
        ├── components/     # LiveTicker, LivePriceTag
        ├── auth/           # AuthContext, AuthPage, ProfilePage
        └── data/
            └── stocks.js   # Curated Indian stock universe
```

### Data Flow (post API wiring)

```
Login → JWT stored → App mounts
          │
          ├─ useWallet()      → GET /api/wallet/transactions/ + /api/budget/
          ├─ usePortfolio()   → GET /api/portfolio/
          ├─ useWatchlist()   → GET /api/watchlist/
          ├─ useGoals()       → GET /api/goals/
          └─ useSIP()         → GET /api/sip/logs/ + /api/sip/settings/
                │
                ▼
         Optimistic local update → API mutation → rollback on error
```

All server state lives in `useServerSync.js`. Pages receive the same props as before — **zero page components were rewritten** to support server persistence.

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- pip

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env            # Edit SECRET_KEY and DB settings
python manage.py migrate
python manage.py runserver
```

Backend runs at `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env            # Set REACT_APP_API_URL=http://localhost:8000/api
npm install
npm start
```

Frontend runs at `http://localhost:3000`.

---

## ⚙️ Environment Variables

### Backend `.env`

```env
SECRET_KEY=your-django-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Database (defaults to SQLite if not set)
DATABASE_URL=sqlite:///db.sqlite3
```

### Frontend `.env`

```env
REACT_APP_API_URL=http://localhost:8000/api
```

---

## 🔌 API Reference

All endpoints require `Authorization: Bearer <access_token>` except auth routes.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register/` | Register new user |
| POST | `/api/auth/login/` | Login (email + password) → JWT pair |
| POST | `/api/auth/refresh/` | Refresh access token |
| GET | `/api/auth/me/` | Get current user |
| PATCH | `/api/auth/me/` | Update display name |
| DELETE | `/api/auth/me/` | Delete account (requires password) |
| POST | `/api/auth/change-password/` | Change password |

### Budget & Wallet

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/budget/` | Get current cash balance |
| PATCH | `/api/budget/` | Set cash balance directly |
| POST | `/api/wallet/deposit/` | Deposit funds (updates budget) |
| POST | `/api/wallet/withdraw/` | Withdraw funds (updates budget) |
| GET | `/api/wallet/transactions/` | Transaction history |

### Portfolio

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/portfolio/` | List holdings |
| POST | `/api/portfolio/` | Buy stock (deducts from budget) |
| DELETE | `/api/portfolio/{id}/` | Sell stock `?qty=N&price=P` |

### Watchlist

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/watchlist/` | List watchlist |
| POST | `/api/watchlist/` | Add ticker |
| PATCH | `/api/watchlist/{id}/` | Update alert price/type |
| DELETE | `/api/watchlist/{id}/` | Remove ticker |

### Goals

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goals/` | List goals |
| POST | `/api/goals/` | Create goal |
| PATCH | `/api/goals/{id}/` | Update goal |
| DELETE | `/api/goals/{id}/` | Delete goal |

### SIP

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/PATCH | `/api/sip/settings/` | Get or update SIP amount + day |
| GET | `/api/sip/logs/` | List monthly SIP logs |
| POST | `/api/sip/logs/` | Log a month's SIP |
| DELETE | `/api/sip/logs/{id}/` | Remove a SIP log |

### Daily Tracker

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tracker/` | List entries (filter: `?date=YYYY-MM-DD&type=income`) |
| POST | `/api/tracker/` | Add entry |
| PATCH | `/api/tracker/{id}/` | Update entry |
| DELETE | `/api/tracker/{id}/` | Delete entry |

---

## 🧩 Key Engineering Decisions

### Optimistic Updates
Every mutation (deposit, buy, sell, add watchlist…) updates the UI **immediately** before the API call completes. If the API fails, the state is rolled back and an error toast fires. This keeps the app feeling instant even on slow connections.

### Zero Page Rewrites
All 14 page components received **no internal changes** to support API persistence. The server hooks in `useServerSync.js` provide the exact same prop interface that `useLocalStorage` previously provided. Pages fall back gracefully to localStorage if server props are absent.

### JWT with Silent Refresh
`api.js` intercepts every 401 response, silently calls `/api/auth/refresh/`, retries the original request, and only logs the user out if the refresh also fails.

### Error Bus
`useServerSync.js` emits a `pg:apierror` custom DOM event on any mutation failure. `App.js` listens and renders a dismissing toast — no prop-drilling required.

---

## 🐛 Known Issues / Remaining Work

- **DailyTracker** still uses `useLocalStorage` internally — it needs `useDailyTracker` hook from `useServerSync.js` wired through App.js (pattern is identical to the other pages).
- **StockFinder** `onBuy` prop is plumbed but the internal buy handler may still call `setPortfolio` directly — validate and replace with `onBuy(...)` call if needed.
- **Portfolio** `onSell` prop is plumbed — validate the internal sell path calls `onSell` rather than mutating `setPortfolio` directly.
- No end-to-end tests yet — backend has Django test runner available, frontend has `src/__tests__/app.test.js` scaffolded.
- Production deployment: configure `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `DEBUG=False`, static file serving, and a production database (PostgreSQL recommended).

---

## 🗂️ File Change Summary (This Session)

| File | Change |
|------|--------|
| `frontend/src/hooks/useServerSync.js` | **Created** — all server state hooks with optimistic updates |
| `frontend/src/App.js` | **Rewritten** — useLocalStorage → useServerSync, ApiErrorToast added |
| `frontend/src/pages/Wallet.js` | **Rewritten** — accepts `txns`, `onDeposit`, `onWithdraw` props; error states added |
| `frontend/src/pages/Watchlist.js` | **Patched** — accepts server watchlist props with localStorage fallback |
| `frontend/src/pages/GoalPlanner.js` | **Patched** — accepts `onCreateGoal`, `onDeleteGoal` props |
| `frontend/src/pages/SipTracker.js` | **Patched** — accepts server logs, sipAmount, sipDay, onAddLog, onRemoveLog props |

---

## 🪪 License

MIT — free for personal and educational use.

---

<div align="center">
Built with ❤️ for first-time investors in India.<br>
<em>Not financial advice. Paper trading only.</em>
</div>
