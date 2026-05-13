# 🌿 PaisaGrow v2.0 — Smart Investing for Beginners

A full-featured Indian stock market investing simulator with authentication, live NSE prices, portfolio tracking, tax calculation, and more.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Auth** | Sign up / login with PBKDF2-hashed passwords, 7-day sessions, account lockout |
| 📈 **Live Prices** | NSE stock prices via Yahoo Finance proxy, auto-refresh every 15s |
| 💼 **Portfolio** | Buy/sell stocks, track P&L in real time |
| 🤖 **AI Signals** | BUY/SELL/HOLD signals with RSI, volume, momentum analysis |
| ⚖️ **Stock Compare** | Side-by-side comparison of up to 4 stocks |
| 📊 **Daily Tracker** | Day-trade simulation with candlestick charts |
| 🎯 **Goal Planner** | Financial goals with SIP calculation |
| 📅 **SIP Tracker** | Log and track Systematic Investment Plans |
| 🏛 **Tax Calculator** | STCG (20%) / LTCG (12.5%) for India FY 2024-25 |
| 🌱 **Growth Simulator** | Compound interest projections |
| 📚 **Learn Basics** | Beginner investing lessons |
| 👁 **Watchlist** | Price alerts for tracked stocks |
| 🔓 **Budget Level-Up** | Gamified investing levels |

---

## 🔐 Security

- **PBKDF2** password hashing (100,000 iterations, SHA-256) — never stored in plaintext
- **Account lockout** after 5 failed login attempts (15-minute cooldown)
- **Session expiry** — sessions expire after 7 days of inactivity
- **Input sanitization** — all user inputs stripped of XSS vectors (`<>"'&`)
- **Schema validation** — localStorage data validated and sanitized on every load
- **Per-user data isolation** — all data keyed as `pg_{userId}_{key}` so accounts never share data
- **No server** — 100% client-side; no data ever leaves the browser

---

## 🐛 Bugs Fixed (v1 → v2)

| # | Bug | Fix |
|---|---|---|
| 1 | `new Date(toLocaleString())` → Invalid Date in Safari/Firefox | `Intl.DateTimeFormat.formatToParts()` |
| 2 | `live?.live` wrong field name | Corrected to `live?.isLive` |
| 3 | Tracker investments not persisted across navigation | `useLocalStorage` instead of `useState` |
| 4 | `fmtK(-150000)` → `₹-1.5L` | Fixed sign placement: `-₹1.5L` |
| 5 | `AbortSignal.timeout()` not in Safari < 17 | Manual `AbortController + setTimeout` |
| 6 | `maxQty` used before declaration (TDZ crash) | Moved declaration before `useEffect` |
| 7 | Float precision: `42.35 * 5 = 211.7499...` | `roundMoney()` helper (2dp rounding) |
| 8 | Portfolio values recomputed on every 15s price tick | `useMemo` with `[portfolio, prices]` deps |
| 9 | Budget lost on tab close < 500ms after buy | `beforeunload` flush for debounced writes |
| 10 | `toISOString()` returns UTC → wrong date after 6:30 PM IST | `today()` utility using local time |
| 11 | localStorage injection attack vector | Schema validators on all keys |
| 12 | Multiple accounts sharing same data keys | User-scoped keys: `pg_{userId}_{suffix}` |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm 9+

### Install & Run
```bash
git clone https://github.com/YOUR_USERNAME/budget-investor.git
cd budget-investor
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) — you'll be prompted to create an account.

### Build for Production
```bash
npm run build
```
Output goes to `build/` — ready to deploy as a static site.

### Run Tests
```bash
npm test
```
48 tests across: money utils, format utils, auth validation, lockout, localStorage scoping, portfolio math, session management, tax calculation, market hours, XSS protection.

---

## 📦 Deploy to GitHub Pages

```bash
# 1. Install gh-pages
npm install --save-dev gh-pages

# 2. Add to package.json:
#    "homepage": "https://YOUR_USERNAME.github.io/budget-investor"
#    "scripts": { "predeploy": "npm run build", "deploy": "gh-pages -d build" }

# 3. Deploy
npm run deploy
```

## 📦 Deploy to Vercel (recommended)

```bash
npm install -g vercel
vercel login
vercel --prod
```

## 📦 Deploy to Netlify

```bash
npm install -g netlify-cli
netlify login
npm run build
netlify deploy --prod --dir=build
```

---

## 📤 Push to GitHub

```bash
# First time setup
git init
git add .
git commit -m "feat: PaisaGrow v2.0 — auth, security, bug fixes"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/budget-investor.git
git push -u origin main

# Subsequent updates
git add .
git commit -m "your message"
git push
```

---

## 📁 Project Structure

```
src/
├── auth/
│   ├── AuthContext.js    — PBKDF2 auth, sessions, lockout
│   ├── AuthPage.js       — Login & Sign-up UI
│   ├── AuthPage.css
│   └── ProfilePage.js    — Profile, password change, account deletion
├── components/
│   ├── LiveTicker.js     — Scrolling price ticker
│   └── LivePriceTag.js   — Inline live price badge
├── hooks/
│   ├── useLocalStorage.js — User-scoped persistent state
│   └── useLivePrices.js   — Yahoo Finance price fetcher
├── pages/
│   ├── Home.js            — Dashboard
│   ├── StockFinder.js     — Buy stocks
│   ├── Portfolio.js       — Holdings & P&L
│   ├── DailyTracker.js    — Day trading simulator
│   ├── TradingSignals.js  — AI BUY/SELL/HOLD signals
│   ├── StockCompare.js    — Side-by-side comparison
│   ├── Watchlist.js       — Price alerts
│   ├── GoalPlanner.js     — Financial goals
│   ├── SipTracker.js      — SIP logs
│   ├── TaxCalculator.js   — Capital gains tax
│   ├── GrowthSimulator.js — Compound interest
│   ├── BudgetLevelUp.js   — Gamification
│   └── Learn.js           — Investing basics
├── utils/
│   ├── format.js          — fmt(), fmtK(), today()
│   └── money.js           — roundMoney(), moneyCost(), sanitizeBudget()
├── data/stocks.js         — NSE stock data (33 stocks)
└── __tests__/
    └── app.test.js        — 48 unit tests
```

---

## ⚠️ Disclaimer

PaisaGrow is an **educational simulator only**. It does not constitute financial advice. Stock prices are sourced from Yahoo Finance and may be delayed. Do not make real investment decisions based on this app.

---

## 📄 License

MIT © 2024 PaisaGrow
