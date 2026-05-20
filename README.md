<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=1a7f5a&height=200&section=header&text=PaisaGrow&fontSize=80&fontColor=ffffff&fontAlignY=38&desc=Paper%20Trading%20for%20India%20🇮🇳&descAlignY=58&descSize=20&animation=fadeIn" width="100%"/>

<br/>

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-paisagrow.netlify.app-1a7f5a?style=for-the-badge&logoColor=white)](https://paisagrow.netlify.app)
[![GitHub](https://img.shields.io/badge/GitHub-Vedantkadiya%2FPaisaGrow-181717?style=for-the-badge&logo=github)](https://github.com/Vedantkadiya/PaisaGrow)

<br/>

[![React](https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![Django](https://img.shields.io/badge/Django_4.2-092E20?style=flat-square&logo=django&logoColor=white)](https://djangoproject.com)
[![DRF](https://img.shields.io/badge/Django_REST_Framework-ff1709?style=flat-square&logo=django&logoColor=white)](https://www.django-rest-framework.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![JWT](https://img.shields.io/badge/JWT_Auth-000000?style=flat-square&logo=jsonwebtokens)](https://jwt.io)
[![Google OAuth](https://img.shields.io/badge/Google_OAuth-4285F4?style=flat-square&logo=google&logoColor=white)](https://developers.google.com)
[![Netlify](https://img.shields.io/badge/Netlify-00C7B7?style=flat-square&logo=netlify&logoColor=white)](https://netlify.com)
[![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=black)](https://render.com)

<br/>

> **A production-grade full-stack paper trading simulator for Indian beginners.**  
> Practice investing with real market data, virtual money, and zero risk.

<br/>

</div>

---

## ⚡ At a Glance

<div align="center">

| 🔢 32 REST Endpoints | 📄 14 Page Components | 🛠 12 App Features | 📱 100% Responsive |
|:---:|:---:|:---:|:---:|
| Fully documented API | Server-persisted state | End-to-end finance loop | Mobile-first CSS |

</div>

---

## 🌟 Features

<table>
<tr>
<td width="50%">

**💳 Virtual Wallet**
Deposit & withdraw via simulated UPI and bank transfer. Full transaction history, server-persisted.

**📈 Buy Stocks**
Browse a curated universe of Indian stocks. Buy with virtual cash, track live prices via polling.

**💼 Live Portfolio**
Holdings with real-time P&L, sector breakdown, and one-click sell with instant UI updates.

**👁 Watchlist & Alerts**
Save tickers, set price alerts above or below your target, get notified automatically.

**🎯 Goal Planner**
Create savings goals — car, education, wedding — with SIP projections and progress tracking.

**📅 SIP Tracker**
Log monthly investments, view streaks, and calculate corpus growth over time.

</td>
<td width="50%">

**📊 Daily Tracker**
Income and expense log with category breakdown charts for daily financial awareness.

**🤖 AI Signals**
Rule-based buy/sell/hold signals with risk scores to guide beginner investment decisions.

**⚖️ Stock Compare**
Side-by-side comparison of up to 3 stocks across key metrics, charts, and descriptions.

**🏛 Tax Calculator**
STCG/LTCG calculator based on your actual portfolio holdings and holding periods.

**🌱 Growth Simulator**
Compound interest projector with scenario sliders — visualise your wealth journey.

**📚 Learn Basics**
Built-in beginner concepts — mutual funds, SIP, P&L, risk — explained simply in-app.

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
PaisaGrow/
│
├── backend/                        # Django 4.2 + DRF
│   ├── api/
│   │   ├── models.py               # Portfolio, Watchlist, Goal, SIPLog, WalletTransaction…
│   │   ├── views.py                # 32 API endpoints  ← includes GoogleLoginView
│   │   ├── serializers.py
│   │   └── urls.py
│   └── paisagrow/
│       └── settings.py             # CORS, JWT, Google OAuth, PostgreSQL
│
└── frontend/                       # React 18
    └── src/
        ├── App.js                  # Root shell — wires server state to all pages
        ├── api.js                  # JWT auto-refresh client
        ├── hooks/
        │   ├── useServerSync.js    # ★ All server state (Wallet, Portfolio, Goals…)
        │   ├── useLivePrices.js    # WebSocket/polling live price hook
        │   └── useLocalStorage.js  # Graceful fallback
        ├── auth/
        │   ├── AuthContext.js      # Global auth state + Google OAuth
        │   ├── AuthPage.js         # Login / Register + Google Sign-In button
        │   └── ProfilePage.js      # Profile management
        ├── pages/                  # 14 page components
        └── components/             # LiveTicker, LivePriceTag, Skeleton
```

### Data Flow

```
User Action (e.g. Buy Stock)
        │
        ▼
Optimistic UI Update ──────────────── State updates instantly, no spinner
        │
        ▼
API Mutation (Django REST)
        │
   ┌────┴────┐
   ✅ Success  ❌ Failure
   │           │
   Confirm     Rollback state + fire pg:apierror event → Toast
```

> All server state lives in `useServerSync.js`. **Zero page components were rewritten** — they use the same prop interface as `useLocalStorage` previously provided.

---

## 🧩 Key Engineering Decisions

### ⚡ Optimistic UI Updates
Every mutation — deposit, buy, sell, watchlist add — updates the UI **immediately** before the API responds. If the API fails, state rolls back automatically. The app feels native even on slow connections.

### 🔄 Zero Page Rewrites
All 14 page components received zero internal changes to support server persistence. `useServerSync.js` provides the same prop interface as `useLocalStorage` — a clean abstraction layer with graceful fallback.

### 🔐 Silent JWT Refresh
`api.js` intercepts every `401`, silently calls `/api/auth/refresh/`, retries the original request, and only logs out if the refresh also fails. Users never see unexpected logouts.

### 🔵 Google OAuth
Full Google Sign-In via ID token verification on the backend using `google-auth`. The backend validates the token server-side, creates or fetches the user, and returns a JWT pair — no third-party OAuth library on the server.

### 📡 Event Bus Error Handling
`useServerSync.js` emits a `pg:apierror` custom DOM event on mutation failure. `App.js` listens globally and renders a toast — no prop-drilling required anywhere in the tree.

### 📱 Mobile-First CSS
Full responsive overhaul across all 14 pages — breakpoints at 480px, 768px, 1024px. All touch targets minimum 44px. iOS Safari zoom fixed on all inputs. Safe-area insets for notched devices.

---

## 🔌 API Reference

All endpoints require `Authorization: Bearer <access_token>` except auth routes.

<details>
<summary><b>🔐 Auth (7 endpoints)</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register/` | Register new user |
| `POST` | `/api/auth/login/` | Login → JWT pair |
| `POST` | `/api/auth/refresh/` | Refresh access token |
| `POST` | `/api/auth/google/` | Google OAuth login |
| `GET` | `/api/auth/me/` | Get current user |
| `PATCH` | `/api/auth/me/` | Update display name |
| `POST` | `/api/auth/change-password/` | Change password |

</details>

<details>
<summary><b>💳 Wallet (5 endpoints)</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/budget/` | Get current cash balance |
| `PATCH` | `/api/budget/` | Set cash balance |
| `POST` | `/api/wallet/deposit/` | Deposit funds |
| `POST` | `/api/wallet/withdraw/` | Withdraw funds |
| `GET` | `/api/wallet/transactions/` | Transaction history |

</details>

<details>
<summary><b>💼 Portfolio (3 endpoints)</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/portfolio/` | List holdings |
| `POST` | `/api/portfolio/` | Buy stock (deducts from budget) |
| `DELETE` | `/api/portfolio/{id}/` | Sell stock `?qty=N&price=P` |

</details>

<details>
<summary><b>👁 Watchlist (4 endpoints)</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/watchlist/` | List watchlist |
| `POST` | `/api/watchlist/` | Add ticker |
| `PATCH` | `/api/watchlist/{id}/` | Update alert price/type |
| `DELETE` | `/api/watchlist/{id}/` | Remove ticker |

</details>

<details>
<summary><b>🎯 Goals (4 endpoints)</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/goals/` | List goals |
| `POST` | `/api/goals/` | Create goal |
| `PATCH` | `/api/goals/{id}/` | Update goal |
| `DELETE` | `/api/goals/{id}/` | Delete goal |

</details>

<details>
<summary><b>📅 SIP (4 endpoints)</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/sip/settings/` | Get SIP amount + day |
| `PATCH` | `/api/sip/settings/` | Update settings |
| `GET` | `/api/sip/logs/` | List monthly SIP logs |
| `POST` | `/api/sip/logs/` | Log a month's SIP |

</details>

<details>
<summary><b>📊 Daily Tracker (4 endpoints)</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/tracker/` | List entries (`?date=YYYY-MM-DD&type=income`) |
| `POST` | `/api/tracker/` | Add entry |
| `PATCH` | `/api/tracker/{id}/` | Update entry |
| `DELETE` | `/api/tracker/{id}/` | Delete entry |

</details>

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Clone

```bash
git clone https://github.com/Vedantkadiya/PaisaGrow.git
cd PaisaGrow
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env            # Fill in SECRET_KEY, DATABASE_URL
python manage.py migrate
python manage.py runserver      # → http://localhost:8000
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env            # Set REACT_APP_API_URL=http://localhost:8000/api
npm install
npm start                       # → http://localhost:3000
```

---

## ⚙️ Environment Variables

### Backend `.env`

```env
DJANGO_SECRET_KEY=your-50-char-secret-key
DEBUG=False
ALLOWED_HOSTS=your-backend.onrender.com,localhost
CORS_ALLOWED_ORIGINS=https://paisagrow.netlify.app,http://localhost:3000
DATABASE_URL=postgresql://user:pass@host:5432/dbname
FRONTEND_URL=https://paisagrow.netlify.app

# Gmail SMTP (password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Frontend `.env`

```env
REACT_APP_API_URL=https://your-backend.onrender.com/api
REACT_APP_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

---

## 🌐 Deployment

| Layer | Platform | Trigger |
|-------|----------|---------|
| Frontend | Netlify | Auto-deploy on `git push` |
| Backend | Render | Auto-deploy on `git push` |
| Database | PostgreSQL (Render) | Managed |

Render runs on deploy:
```bash
python manage.py migrate --noinput && gunicorn paisagrow.wsgi:application --bind 0.0.0.0:$PORT
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, JavaScript ES2022, Custom CSS |
| Backend | Django 4.2, Django REST Framework 3.15 |
| Auth | SimpleJWT, Google OAuth 2.0 (`google-auth`) |
| Database | PostgreSQL (`psycopg2`, `dj-database-url`) |
| Server | Gunicorn, WhiteNoise |
| Hosting | Netlify (frontend) + Render (backend) |

---

## 📁 File Change Log (v6 — Latest)

| File | Change |
|------|--------|
| `backend/api/views.py` | Added `GoogleLoginView` — server-side token verification |
| `backend/api/urls.py` | New route `POST /api/auth/google/` |
| `backend/paisagrow/settings.py` | Added `GOOGLE_CLIENT_ID` config |
| `backend/requirements.txt` | Added `google-auth==2.29.0` |
| `frontend/src/auth/AuthPage.js` | Google Sign-In button + OAuth flow |
| `frontend/src/auth/AuthContext.js` | Google login handler |
| `frontend/public/index.html` | Google Identity Services script |
| All `*.css` files | Full mobile-first responsive overhaul |

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=1a7f5a&height=120&section=footer&animation=fadeIn" width="100%"/>

**Built by [Vedant Kadiya](https://github.com/Vedantkadiya)**

[![Live App](https://img.shields.io/badge/🚀_Live_App-paisagrow.netlify.app-1a7f5a?style=for-the-badge)](https://paisagrow.netlify.app)

*Not financial advice. Paper trading only.*

</div>

