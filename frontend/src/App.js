import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { STOCKS } from './data/stocks';
import { useLivePrices } from './hooks/useLivePrices';
import { clearAllData } from './hooks/useLocalStorage';
import LiveTicker from './components/LiveTicker';
import { useAuth } from './auth/AuthContext';
import AuthPage from './auth/AuthPage';
import ProfilePage from './auth/ProfilePage';
import {
  useWallet,
  usePortfolio,
  useWatchlist,
  useGoals,
  useSIP,
} from './hooks/useServerSync';

// Code-split all pages
const Home            = lazy(() => import('./pages/Home'));
const StockFinder     = lazy(() => import('./pages/StockFinder'));
const Portfolio       = lazy(() => import('./pages/Portfolio'));
const GrowthSimulator = lazy(() => import('./pages/GrowthSimulator'));
const Learn           = lazy(() => import('./pages/Learn'));
const BudgetLevelUp   = lazy(() => import('./pages/BudgetLevelUp'));
const GoalPlanner     = lazy(() => import('./pages/GoalPlanner'));
const SipTracker      = lazy(() => import('./pages/SipTracker'));
const DailyTracker    = lazy(() => import('./pages/DailyTracker'));
const TradingSignals  = lazy(() => import('./pages/TradingSignals'));
const TaxCalculator   = lazy(() => import('./pages/TaxCalculator'));
const Watchlist       = lazy(() => import('./pages/Watchlist'));
const StockCompare    = lazy(() => import('./pages/StockCompare'));
const Wallet          = lazy(() => import('./pages/Wallet'));
const Leaderboard     = lazy(() => import('./pages/Leaderboard'));
// FIX: lazy() must be at module scope — inside a function it re-creates on every render,
// which causes React to throw a new Promise every time and stay stuck in Suspense forever.
const ResetPasswordScreen = lazy(() => import('./auth/ResetPasswordScreen'));

const ALL_PAGES = [
  { id: 'home',        icon: '🏠', label: 'Dashboard'       },
  { id: 'signals',     icon: '🤖', label: 'AI Signals',      badge: 'LIVE' },
  { id: 'compare',     icon: '⚖️',  label: 'Compare Stocks',  badge: 'NEW'  },
  { id: 'tracker',     icon: '📊', label: 'Daily Tracker'    },
  { id: 'stocks',      icon: '📈', label: 'Buy Stocks'       },
  { id: 'portfolio',   icon: '💼', label: 'My Portfolio'     },
  { id: 'watchlist',   icon: '👁',  label: 'Watchlist'        },
  { id: 'levelup',     icon: '🔓', label: 'Budget Level-Up'  },
  { id: 'goals',       icon: '🎯', label: 'Goal Planner'     },
  { id: 'sip',         icon: '📅', label: 'SIP Tracker'      },
  { id: 'tax',         icon: '🏛',  label: 'Tax Calculator'   },
  { id: 'growth',      icon: '🌱', label: 'Growth Simulator' },
  { id: 'learn',       icon: '📚', label: 'Learn Basics'     },
  { id: 'wallet',      icon: '💳', label: 'Wallet',          badge: 'NEW' },
  { id: 'leaderboard', icon: '🏆', label: 'Leaderboard',     badge: 'NEW' },
  { id: 'profile',     icon: '👤', label: 'Profile'          },
];

const MOBILE_NAV = [
  { id: 'home',      icon: '🏠', label: 'Home'     },
  { id: 'signals',   icon: '🤖', label: 'Signals'  },
  { id: 'stocks',    icon: '📈', label: 'Buy'       },
  { id: 'portfolio', icon: '💼', label: 'Portfolio' },
  { id: 'more',      icon: '☰',  label: 'More'      },
];

function PageLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:320, flexDirection:'column', gap:12 }}>
      <div style={{ width:32, height:32, border:'3px solid var(--border)', borderTopColor:'var(--teal)', borderRadius:'50%', animation:'spin .7s linear infinite' }} />
      <span style={{ color:'var(--text3)', fontSize:13 }}>Loading…</span>
    </div>
  );
}

// ── API Error Toast ────────────────────────────────────────────────────────────
function ApiErrorToast() {
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    const handler = (e) => {
      const id = Date.now();
      setMessages(prev => [...prev, { id, text: e.detail }]);
      setTimeout(() => setMessages(prev => prev.filter(m => m.id !== id)), 4500);
    };
    window.addEventListener('pg:apierror', handler);
    return () => window.removeEventListener('pg:apierror', handler);
  }, []);
  if (!messages.length) return null;
  return (
    {/* RESPONSIVE FIX: position above mobile bottom nav */}
    <div style={{ position:'fixed', bottom:'calc(72px + env(safe-area-inset-bottom, 0px))', right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8, maxWidth:'calc(100vw - 32px)' }}>
      {messages.map(m => (
        <div key={m.id} style={{ background:'var(--red)', color:'#fff', padding:'10px 16px', borderRadius:10, fontSize:13, fontFamily:'var(--font-head)', boxShadow:'0 4px 20px rgba(0,0,0,.4)', animation:'slideIn .25s ease' }}>
          ⚠️ {m.text}
        </div>
      ))}
    </div>
  );
}

// ── Success Toast (Item 16) ────────────────────────────────────────────────────
function SuccessToast() {
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    const handler = (e) => {
      const id = Date.now();
      setMessages(prev => [...prev, { id, text: e.detail }]);
      setTimeout(() => setMessages(prev => prev.filter(m => m.id !== id)), 3500);
    };
    window.addEventListener('pg:success', handler);
    return () => window.removeEventListener('pg:success', handler);
  }, []);
  if (!messages.length) return null;
  return (
    {/* RESPONSIVE FIX: position above mobile bottom nav */}
    <div style={{ position:'fixed', bottom:'calc(72px + env(safe-area-inset-bottom, 0px))', left:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8, maxWidth:'calc(100vw - 32px)' }}>
      {messages.map(m => (
        <div key={m.id} style={{ background:'#1a7f5a', color:'#fff', padding:'10px 16px', borderRadius:10, fontSize:13, fontFamily:'var(--font-head)', boxShadow:'0 4px 20px rgba(0,0,0,.4)', animation:'slideIn .25s ease' }}>
          ✅ {m.text}
        </div>
      ))}
    </div>
  );
}

// ── Onboarding modal (Item 21) ─────────────────────────────────────────────────
function OnboardingModal({ onFinish, budget, onDeposit }) {
  const [step, setStep] = useState(1);
  const [welcomed, setWelcomed] = useState(false);

  useEffect(() => {
    if (step === 1 && !welcomed && budget === 0) {
      onDeposit({ amount: 10000, method: 'Welcome Bonus', description: 'Starter welcome cash' })
        .then(() => setWelcomed(true))
        .catch(() => setWelcomed(true));
    }
  }, [step, welcomed, budget, onDeposit]);

  const steps = [
    {
      title: 'Welcome to PaisaGrow! 🌿',
      body: "You've been credited ₹10,000 virtual cash to get started. No real money — just learning!",
      icon: '💰'
    },
    {
      title: 'Buy your first stock 📈',
      body: "Go to 'Buy Stocks', pick any company, and tap Buy. Your portfolio will update instantly.",
      icon: '📊'
    },
    {
      title: 'Track. Learn. Grow. 🎯',
      body: 'Use Portfolio to watch your P&L, Goals to plan savings, and Daily Tracker to log spending.',
      icon: '🌱'
    }
  ];

  const current = steps[step - 1];

  return (
    {/* RESPONSIVE FIX: mobile-friendly onboarding modal */}
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:10000, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:0 }}>
      <div style={{ background:'var(--card)', borderRadius:'20px 20px 0 0', padding:'32px 24px', maxWidth:480, width:'100%', boxShadow:'0 -8px 40px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize:56, textAlign:'center', marginBottom:16 }}>{current.icon}</div>
        <h2 style={{ textAlign:'center', color:'var(--text)', marginBottom:12, fontSize:20 }}>{current.title}</h2>
        <p style={{ textAlign:'center', color:'var(--text2)', lineHeight:1.6, marginBottom:32 }}>{current.body}</p>
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:32 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ width:10, height:10, borderRadius:'50%', background: i + 1 === step ? 'var(--teal)' : 'var(--border)' }}/>
          ))}
        </div>
        <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} style={{ padding:'10px 20px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text2)', cursor:'pointer', fontFamily:'var(--font-head)' }}>
              ‹ Back
            </button>
          )}
          {step < steps.length ? (
            <button onClick={() => setStep(s => s + 1)} style={{ padding:'10px 24px', background:'var(--teal)', border:'none', borderRadius:8, color:'#0a0f1a', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-head)' }}>
              Next ›
            </button>
          ) : (
            <button onClick={onFinish} style={{ padding:'10px 24px', background:'var(--teal)', border:'none', borderRadius:8, color:'#0a0f1a', fontWeight:700, cursor:'pointer', fontFamily:'var(--font-head)' }}>
              Get Started 🚀
            </button>
          )}
        </div>
        <div style={{ textAlign:'center', marginTop:16 }}>
          <button onClick={onFinish} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:12, fontFamily:'var(--font-head)' }}>
            Skip intro
          </button>
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const { user, logout } = useAuth();
  const userId = user?.id;

  const [page,        setPageRaw]   = useState('home');
  const [showMore,    setShowMore]  = useState(false);

  // Dark mode (Item 19)
  const [dark, setDark] = useState(() => localStorage.getItem('pg_theme') === 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('pg_theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Onboarding (Item 21)
  // User-scoped key prevents User A's completed onboarding from suppressing it for User B on the same device.
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(`pg_onboarded_${userId}`));

  const setPage = (id) => { setPageRaw(id); setShowMore(false); };

  // ── Server-backed state ────────────────────────────────────────────────────
  const { budget, setBudget, setManualBudget, txns, deposit, withdraw } = useWallet();
  const { portfolio, setPortfolio, buyStock, sellStock } = usePortfolio({ setBudget });
  const { watchlist, setWatchlist, addToWatchlist, removeFromWatchlist, setAlert } = useWatchlist();
  const { savedGoals, setSavedGoals, createGoal, deleteGoal } = useGoals();
  const { logs, setLogs, sipAmount, setSipAmount, sipDay, setSipDay, addLog, removeLog } = useSIP();
  // ── Live prices ────────────────────────────────────────────────────────────
  const { prices, status, lastFetch, refresh, marketStatus } = useLivePrices(STOCKS);

  const livePortfolio = useMemo(() => portfolio.map(h => ({
    ...h,
    stock: { ...h.stock, price: prices[h.stock.ticker]?.price || h.stock.price },
  })), [portfolio, prices]);

  const totalInvested = useMemo(() => livePortfolio.reduce((s, h) => s + h.qty * h.buyPrice, 0), [livePortfolio]);
  const currentValue  = useMemo(() => livePortfolio.reduce((s, h) => s + h.qty * h.stock.price, 0), [livePortfolio]);
  const profit        = currentValue - totalInvested;
  const totalWealth   = budget + currentValue;

  const handleReset = () => {
    if (window.confirm('Reset ALL local data? Your server data (portfolio, wallet, goals) is kept safe.')) {
      clearAllData(userId);
      setPage('home');
    }
  };

  const handleFinishOnboarding = () => {
    localStorage.setItem(`pg_onboarded_${userId}`, 'true');
    setShowOnboarding(false);
  };

  const renderPage = () => {
    const props = { budget, setBudget, portfolio, setPortfolio, prices, setPage };
    switch (page) {
      case 'home':        return <Home {...props} setManualBudget={setManualBudget} livePortfolio={livePortfolio} totalInvested={totalInvested} currentValue={currentValue} profit={profit}/>;
      case 'signals':     return <TradingSignals budget={budget} portfolio={livePortfolio} prices={prices} status={status} onRefresh={refresh} setPage={setPage}/>;
      case 'compare':     return <StockCompare prices={prices} budget={budget}/>;
      case 'tracker':     return <DailyTracker prices={prices} userId={userId}/>;
      case 'stocks':      return <StockFinder budget={budget} setBudget={setBudget} portfolio={portfolio} setPortfolio={setPortfolio} prices={prices} marketStatus={marketStatus} onBuy={buyStock}/>;
      case 'portfolio':   return <Portfolio portfolio={livePortfolio} setPortfolio={setPortfolio} budget={budget} setBudget={setBudget} totalInvested={totalInvested} currentValue={currentValue} profit={profit} prices={prices} onSell={sellStock} setPage={setPage}/>;
      case 'watchlist':   return <Watchlist prices={prices} budget={budget} setPage={setPage} userId={userId}
                                    watchlist={watchlist} setWatchlist={setWatchlist}
                                    onAdd={addToWatchlist} onRemove={removeFromWatchlist} onSetAlert={setAlert}/>;
      case 'levelup':     return <BudgetLevelUp budget={budget} portfolio={livePortfolio} totalInvested={totalInvested} currentValue={currentValue} profit={profit} setPage={setPage} prices={prices}/>;
      case 'goals':       return <GoalPlanner budget={budget} setPage={setPage} userId={userId}
                                    savedGoals={savedGoals} setSavedGoals={setSavedGoals}
                                    onCreateGoal={createGoal} onDeleteGoal={deleteGoal}/>;
      case 'sip':         return <SipTracker budget={budget} userId={userId}
                                    logs={logs} setLogs={setLogs}
                                    sipAmount={sipAmount} setSipAmount={setSipAmount}
                                    sipDay={sipDay} setSipDay={setSipDay}
                                    onAddLog={addLog} onRemoveLog={removeLog}/>;
      case 'tax':         return <TaxCalculator portfolio={livePortfolio} userId={userId}/>;
      case 'growth':      return <GrowthSimulator budget={budget} sipAmount={sipAmount}/>;
      case 'learn':       return <Learn userId={userId}/>;
      case 'wallet':      return <Wallet budget={budget} setBudget={setBudget} userId={userId} setPage={setPage}
                                    txns={txns} onDeposit={deposit} onWithdraw={withdraw}/>;
      case 'leaderboard': return <Leaderboard />;
      case 'profile':     return <ProfilePage onBack={() => setPage('home')} />;
      default:            return <Home {...props} setManualBudget={setManualBudget} livePortfolio={livePortfolio} totalInvested={totalInvested} currentValue={currentValue} profit={profit}/>;
    }
  };

  return (
    <div className="app">
      <ApiErrorToast />
      <SuccessToast />
      {showOnboarding && (
        <OnboardingModal onFinish={handleFinishOnboarding} budget={budget} onDeposit={deposit} />
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-name"><span>🌿</span> PaisaGrow</div>
          <div className="brand-sub">Smart Investing for Beginners</div>
        </div>

        <nav className="nav-links">
          {ALL_PAGES.map(p => (
            <div key={p.id}
              className={`nav-link ${page === p.id ? 'active' : ''}`}
              onClick={() => setPage(p.id)}>
              <span className="nav-icon">{p.icon}</span>
              <span>{p.label}</span>
              {p.badge && (
                <span className="nav-badge"
                  style={p.badge==='LIVE' ? { background:'var(--red)', animation:'liveBadge 1.5s ease infinite' } : {}}>
                  {p.badge}
                </span>
              )}
            </div>
          ))}
        </nav>

        {(budget > 0 || portfolio.length > 0) && (
          <div className="budget-bar">
            <div className="budget-bar-label">Total Wealth</div>
            <div className="budget-bar-amount">
              ₹{totalWealth.toLocaleString('en-IN', {minimumFractionDigits:0, maximumFractionDigits:0})}
            </div>
            {budget > 0 && (
              <div className="budget-bar-change" style={{color:'var(--text2)'}}>
                💰 ₹{budget.toFixed(0)} cash
              </div>
            )}
            {portfolio.length > 0 && (
              <div className="budget-bar-change" style={{color: profit>0?'var(--teal)':profit<0?'var(--red)':'var(--text2)'}}>
                {profit>0?'▲':profit<0?'▼':'—'} ₹{Math.abs(profit).toFixed(0)} {profit>0?'profit':profit<0?'loss':'break-even'}
              </div>
            )}
            <div style={{fontSize:9,color:status==='live'?'var(--teal)':status==='connecting'?'var(--gold)':status==='closed'?'var(--text2)':'var(--text3)',marginTop:5,display:'flex',alignItems:'center',gap:4,fontFamily:'var(--font-head)',textTransform:'uppercase',letterSpacing:'.08em'}}>
              <span style={{width:5,height:5,borderRadius:'50%',background:'currentColor',display:'inline-block',flexShrink:0}}/>
              {status==='live'?'Live prices':status==='connecting'?'Connecting…':status==='closed'?'Mkt closed':'Offline'}
            </div>
          </div>
        )}

        <div style={{padding:'0 10px 8px'}}>
          {/* Dark mode toggle (Item 19) */}
          <button
            onClick={() => setDark(d => !d)}
            style={{width:'100%',padding:'7px 14px',background:'none',border:'1px solid var(--border)',borderRadius:8,color:'var(--text2)',fontSize:12,cursor:'pointer',fontFamily:'var(--font-head)',marginBottom:6,transition:'all .18s'}}>
            {dark ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>

          <button
            onClick={() => setPage('profile')}
            style={{width:'100%',padding:'9px 14px',background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,color:'var(--text2)',fontSize:12,cursor:'pointer',fontFamily:'var(--font-head)',display:'flex',alignItems:'center',gap:8,marginBottom:6,transition:'all .18s'}}
            onMouseOver={e => { e.currentTarget.style.borderColor='var(--teal)'; e.currentTarget.style.color='var(--teal)'; }}
            onMouseOut={e  => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)'; }}>
            <div style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,var(--teal),var(--blue))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:'#0a0f1a',flexShrink:0}}>
              {(user?.name||'?')[0].toUpperCase()}
            </div>
            <span style={{flex:1,textAlign:'left',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name}</span>
            <span style={{fontSize:10}}>⚙</span>
          </button>

          <button onClick={logout}
            style={{width:'100%',padding:'7px 14px',background:'none',border:'1px solid var(--border)',borderRadius:8,color:'var(--text3)',fontSize:11,cursor:'pointer',fontFamily:'var(--font-head)',transition:'all .18s'}}
            onMouseOver={e => { e.currentTarget.style.borderColor='var(--red)'; e.currentTarget.style.color='var(--red)'; }}
            onMouseOut={e  => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text3)'; }}>
            🚪 Sign Out
          </button>
        </div>

        <button onClick={handleReset}
          style={{margin:'0 10px 14px',padding:'8px 14px',background:'none',border:'1px solid var(--border)',borderRadius:8,color:'var(--text3)',fontSize:11,cursor:'pointer',fontFamily:'var(--font-head)',transition:'all .18s'}}
          onMouseOver={e => { e.target.style.borderColor='var(--red)'; e.target.style.color='var(--red)'; }}
          onMouseOut={e  => { e.target.style.borderColor='var(--border)'; e.target.style.color='var(--text3)'; }}>
          🗑 Reset local data
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <div className="main-wrap">
        <LiveTicker prices={prices} stocks={STOCKS} status={status} lastFetch={lastFetch} marketStatus={marketStatus}/>
        {status === 'offline' && (
          <div style={{background:'rgba(255,194,58,.08)',borderBottom:'1px solid rgba(255,194,58,.2)',padding:'10px 24px',fontSize:12,color:'var(--gold)',display:'flex',alignItems:'center',gap:8}}>
            <span>⚠️</span>
            <strong>Offline mode</strong> — Live prices unavailable. Showing approximate prices.
            <button onClick={refresh} style={{marginLeft:'auto',background:'rgba(255,194,58,.15)',border:'1px solid rgba(255,194,58,.3)',borderRadius:6,padding:'4px 12px',color:'var(--gold)',fontSize:11,cursor:'pointer',fontFamily:'var(--font-head)'}}>
              Retry
            </button>
          </div>
        )}
        <main className="main">
          <Suspense fallback={<PageLoader />}>
            {renderPage()}
          </Suspense>
        </main>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-nav">
        {MOBILE_NAV.map(p => (
          <button key={p.id}
            className={`mn-item ${(p.id !== 'more' && page === p.id) || (p.id === 'more' && showMore) ? 'mn-active' : ''}`}
            onClick={() => p.id === 'more' ? setShowMore(!showMore) : setPage(p.id)}>
            <span className="mn-icon">{p.icon}</span>
            <span className="mn-label">{p.label}</span>
          </button>
        ))}
      </nav>

      {/* MOBILE "MORE" DRAWER */}
      {showMore && (
        <>
          <div className="more-overlay" onClick={() => setShowMore(false)}/>
          <div className="more-drawer animate-in">
            <div className="md-title">All Pages</div>
            <div className="md-grid">
              {ALL_PAGES.filter(p => !['home','signals','stocks','portfolio','profile'].includes(p.id)).map(p => (
                <button key={p.id} className={`md-item ${page === p.id ? 'md-active' : ''}`}
                  onClick={() => setPage(p.id)}>
                  <span className="md-icon">{p.icon}</span>
                  <span className="md-label">{p.label}</span>
                  {p.badge && <span className="nav-badge" style={{fontSize:8,padding:'1px 5px'}}>{p.badge}</span>}
                </button>
              ))}
              <button className={`md-item ${page === 'profile' ? 'md-active' : ''}`}
                onClick={() => setPage('profile')}>
                <span className="md-icon">👤</span>
                <span className="md-label">Profile</span>
              </button>
            </div>
            {(budget > 0 || portfolio.length > 0) && (
              <div className="md-wealth">
                <span>💰 Total Wealth</span>
                <span style={{fontFamily:'var(--font-mono)',fontWeight:700,color:'var(--teal)'}}>
                  ₹{totalWealth.toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:0})}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  // Reset password route
  if (window.location.pathname === '/reset-password') {
    return (
      <Suspense fallback={<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh'}}>Loading…</div>}>
        <ResetPasswordScreen />
      </Suspense>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16, background: 'var(--bg1)' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <span style={{ color: 'var(--text3)', fontSize: 14, fontFamily: 'var(--font-head)' }}>Loading PaisaGrow…</span>
      </div>
    );
  }
  if (!user) return <AuthPage />;
  return <AppShell />;
}
