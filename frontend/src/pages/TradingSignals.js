import React, { useState, useMemo } from 'react';
import { scanAllSignals, analyseStock, getExitSignal, STOCKS } from '../data/stocks';
import LivePriceTag from '../components/LivePriceTag';
import './TradingSignals.css';
import { fmt } from '../utils/format'; // FIX: shared util — was duplicated across 4 pages

// ── Small helpers ──────────────────────────────────────────────────────────

function ConfBar({ value }) {                         // 0-100
  const color = value >= 75 ? 'var(--green)' : value >= 55 ? 'var(--yellow)' : 'var(--red)';
  return (
    <div className="conf-bar-wrap">
      <div className="conf-bar-bg">
        <div className="conf-bar-fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="conf-pct" style={{ color }}>{value}%</span>
    </div>
  );
}

function ActionBadge({ action, size = 'sm' }) {
  const cfg = {
    BUY:  { c: 'var(--green)',  bg: 'rgba(34,211,165,0.1)',  b: 'rgba(34,211,165,0.3)',  icon: '▲' },
    SELL: { c: 'var(--red)',    bg: 'rgba(244,83,108,0.1)',   b: 'rgba(244,83,108,0.3)',  icon: '▼' },
    HOLD: { c: 'var(--yellow)', bg: 'rgba(251,191,36,0.1)',   b: 'rgba(251,191,36,0.3)',  icon: '◆' },
  }[action] || {};
  return (
    <span className={`action-badge ${size === 'lg' ? 'action-badge-lg' : ''}`}
      style={{ color: cfg.c, background: cfg.bg, border: `1px solid ${cfg.b}` }}>
      {cfg.icon} {action}
    </span>
  );
}

function UrgencyPill({ urgency }) {
  const cfg = {
    high:   { label: '🔴 Act Now',    color: 'var(--red)',    bg: 'var(--red-bg)'    },
    medium: { label: '🟡 This Week',  color: 'var(--yellow)', bg: 'var(--yellow-bg)' },
    low:    { label: '🟢 No Rush',    color: 'var(--green)',  bg: 'var(--green-bg)'  },
  }[urgency] || {};
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg,
                   border: `1px solid ${cfg.color}44`, borderRadius: 6, padding: '2px 8px' }}>
      {cfg.label}
    </span>
  );
}

// ── Signal card — one stock's full recommendation ─────────────────────────

function SignalCard({ sig, onBuy, canBuy, prices = {} }) {
  const [expanded, setExpanded] = useState(false);
  const isBuy  = sig.action === 'BUY';
  const isSell = sig.action === 'SELL';

  return (
    <div className={`signal-card ${isBuy ? 'sc-buy' : isSell ? 'sc-sell' : 'sc-hold'}`}>
      {/* Top row */}
      <div className="sc-top">
        <div className="sc-left">
          <div className="sc-ticker">{sig.ticker}</div>
          <div className="sc-name">{sig.name}</div>
          <div className="sc-sector">{sig.sector}</div>
        </div>
        <div className="sc-center">
          <ActionBadge action={sig.action} size="lg" />
          <LivePriceTag ticker={sig.ticker} prices={prices} size="md" showChange={true}/>
          <span className={`risk-badge risk-${sig.risk}`}>{sig.risk} risk</span>
        </div>
        <div className="sc-right">
          <ConfBar value={sig.confidence} />
          <div className="sc-conf-label">AI Confidence</div>
        </div>
      </div>

      {/* The core advice box */}
      <div className={`sc-advice-box ${isBuy ? 'ab-buy' : isSell ? 'ab-sell' : 'ab-hold'}`}>
        {isBuy && (
          <>
            <div className="ab-headline">
              💡 <strong>Buy at {fmt(sig.entryPrice)}</strong>
              {sig.currentPrice > sig.entryPrice
                ? ` — wait for price to dip to this level`
                : ` — good entry right now`}
            </div>
            <div className="ab-targets">
              <div className="abt-item">
                <div className="abt-label">🎯 Sell Target</div>
                <div className="abt-val pos">{fmt(sig.targetPrice)}</div>
                <div className="abt-sub">+{sig.potentialGainPct}% gain</div>
              </div>
              <div className="abt-item">
                <div className="abt-label">⏱ Timeline</div>
                <div className="abt-val" style={{ color: 'var(--blue)' }}>~{sig.timelineDays} days</div>
                <div className="abt-sub">to reach target</div>
              </div>
              <div className="abt-item">
                <div className="abt-label">🛡 Stop Loss</div>
                <div className="abt-val neg">{fmt(sig.stopLoss)}</div>
                <div className="abt-sub">{sig.stopLossPct}% — exit if falls here</div>
              </div>
              <div className="abt-item">
                <div className="abt-label">📅 Best Time</div>
                <div className="abt-val" style={{ color: 'var(--yellow)' }}>
                  {new Date(Date.now() + (sig.currentPrice > sig.entryPrice ? 3 : 1) * 86400000)
                    .toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                </div>
                <div className="abt-sub">estimated entry date</div>
              </div>
            </div>
          </>
        )}

        {isSell && (
          <>
            <div className="ab-headline">
              ⚠️ <strong>Sell at {fmt(sig.entryPrice)}</strong> — correction likely in ~{sig.timelineDays} days
            </div>
            <div className="ab-targets">
              <div className="abt-item">
                <div className="abt-label">📉 Expected Drop</div>
                <div className="abt-val neg">{fmt(sig.targetPrice)}</div>
                <div className="abt-sub">{sig.potentialGainPct}% expected fall</div>
              </div>
              <div className="abt-item">
                <div className="abt-label">⏱ Sell By</div>
                <div className="abt-val" style={{ color: 'var(--red)' }}>~{sig.timelineDays} days</div>
                <div className="abt-sub">before drop</div>
              </div>
              <div className="abt-item">
                <div className="abt-label">📅 Sell Date</div>
                <div className="abt-val" style={{ color: 'var(--yellow)' }}>
                  {new Date(Date.now() + Math.min(3, sig.timelineDays) * 86400000)
                    .toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                </div>
                <div className="abt-sub">act soon</div>
              </div>
            </div>
          </>
        )}

        {!isBuy && !isSell && (
          <>
            <div className="ab-headline">
              ⏸ <strong>Hold position</strong> — No strong signal yet.
              Consider buying at {fmt(sig.entryPrice)} (3% dip from current)
            </div>
            <div className="ab-targets">
              <div className="abt-item">
                <div className="abt-label">📌 Buy on Dip</div>
                <div className="abt-val" style={{ color: 'var(--text)' }}>{fmt(sig.entryPrice)}</div>
                <div className="abt-sub">ideal entry on pullback</div>
              </div>
              <div className="abt-item">
                <div className="abt-label">🎯 Target</div>
                <div className="abt-val pos">{fmt(sig.targetPrice)}</div>
                <div className="abt-sub">+{sig.potentialGainPct}%</div>
              </div>
              <div className="abt-item">
                <div className="abt-label">⏱ Horizon</div>
                <div className="abt-val" style={{ color: 'var(--blue)' }}>{sig.timelineDays}+ days</div>
                <div className="abt-sub">long-term hold</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Reasons + expand */}
      <div className="sc-bottom">
        <div className="sc-reasons">
          {sig.reasons.map((r, i) => (
            <span key={i} className="sc-reason-chip">{r}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="sc-expand-btn" onClick={() => setExpanded(!expanded)}>
            {expanded ? '▲ Less' : '▼ Indicators'}
          </button>
          {isBuy && canBuy && (
            <button className="btn btn-primary sc-buy-btn"
              onClick={() => onBuy(sig)}>
              Buy Now
            </button>
          )}
          {!sig.canAfford && (
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              Need {fmt(sig.currentPrice - (canBuy || 0))} more
            </span>
          )}
        </div>
      </div>

      {/* Expanded indicators */}
      {expanded && (
        <div className="sc-indicators animate-in">
          <div className="sci-row">
            <span>RSI (14)</span>
            <span style={{ color: sig.indicators.rsi < 35 ? 'var(--green)' : sig.indicators.rsi > 68 ? 'var(--red)' : 'var(--yellow)' }}>
              {sig.indicators.rsi}
              {sig.indicators.rsi < 35 ? ' — Oversold 🟢' : sig.indicators.rsi > 68 ? ' — Overbought 🔴' : ' — Neutral 🟡'}
            </span>
          </div>
          <div className="sci-row">
            <span>MACD</span>
            <span style={{ color: sig.indicators.macd > 0 ? 'var(--green)' : 'var(--red)' }}>
              {sig.indicators.macd} ({sig.indicators.macd > 0 ? 'Bullish' : 'Bearish'})
            </span>
          </div>
          <div className="sci-row">
            <span>Trend (vs MA50)</span>
            <span style={{ color: sig.indicators.trend === 'up' ? 'var(--green)' : sig.indicators.trend === 'down' ? 'var(--red)' : 'var(--yellow)' }}>
              {sig.indicators.trend === 'up' ? '↑ Uptrend' : sig.indicators.trend === 'down' ? '↓ Downtrend' : '→ Sideways'}
            </span>
          </div>
          <div className="sci-row">
            <span>Bollinger Position</span>
            <span style={{ color: sig.indicators.bbPos < 20 ? 'var(--green)' : sig.indicators.bbPos > 80 ? 'var(--red)' : 'var(--text2)' }}>
              {sig.indicators.bbPos}% {sig.indicators.bbPos < 20 ? '(near lower band)' : sig.indicators.bbPos > 80 ? '(near upper band)' : '(mid range)'}
            </span>
          </div>
          <div className="sci-row">
            <span>Momentum vs MA20</span>
            <span className={sig.indicators.momentum > 0 ? 'pos' : 'neg'}>
              {sig.indicators.momentum > 0 ? '+' : ''}{sig.indicators.momentum}%
            </span>
          </div>
          <div className="sci-row">
            <span>Annual ROI Estimate</span>
            <span className="pos">+{sig.roi1y}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Exit signal card for held stocks ──────────────────────────────────────

// FIX #4: Wrapped in React.memo to prevent unnecessary re-renders
// FIX #2+#4: getExitSignal is expensive (60-day simulation). Moved into useMemo.
// FIX #2: Fixed broken date parse: split('/').reverse() produced Invalid Date in Safari.
const ExitCard = React.memo(function ExitCard({ holding }) {
  const { stock, qty, buyPrice } = holding;

  // FIX #2: Robust cross-browser date parsing for Indian DD/MM/YYYY format
  const daysHeld = useMemo(() => {
    let holdMs = Date.now();
    if (holding.date) {
      const parts = holding.date.split('/');
      if (parts.length === 3) {
        const parsed = new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`);
        if (!isNaN(parsed.getTime())) holdMs = parsed.getTime();
      }
    }
    return Math.max(1, Math.floor((Date.now() - holdMs) / 86400000));
  }, [holding.date]);

  // FIX #4: useMemo prevents 60-day simulation running on EVERY render.
  // Previously called directly in render body — caused CPU freeze with live price ticks.
  const exitSig = useMemo(() => {
    // FIX #10: Re-hydrate stock from STOCKS master list so we always use current metadata
    const freshStock = STOCKS.find(s => s.ticker === stock.ticker) || stock;
    return getExitSignal(freshStock, buyPrice, Math.min(daysHeld, 60));
  }, [stock.ticker, buyPrice, daysHeld]);

  if (!exitSig) return null;

  const totalValue    = exitSig.currentPrice * qty;
  const totalInvested = buyPrice * qty;
  const pnl           = totalValue - totalInvested;

  return (
    <div className={`exit-card ${exitSig.urgency === 'high' ? 'ec-urgent' : exitSig.urgency === 'medium' ? 'ec-medium' : 'ec-low'}`}>
      <div className="ec-header">
        <div>
          <div className="ec-ticker">{stock.ticker}</div>
          <div className="ec-name">{stock.name}</div>
          <div className="ec-meta">{qty} shares · Bought at {fmt(buyPrice)} · Day {daysHeld}</div>
        </div>
        <UrgencyPill urgency={exitSig.urgency} />
      </div>

      <div className="ec-recommendation">{exitSig.recommendation}</div>

      <div className="ec-grid">
        <div className="ec-stat">
          <div className="ec-stat-label">Current Price</div>
          <div className="ec-stat-val">{fmt(exitSig.currentPrice)}</div>
        </div>
        <div className="ec-stat">
          <div className="ec-stat-label">Current P&L</div>
          <div className={`ec-stat-val ${pnl >= 0 ? 'pos' : 'neg'}`}>
            {pnl >= 0 ? '+' : ''}{fmt(pnl)} ({exitSig.pnlPct > 0 ? '+' : ''}{exitSig.pnlPct}%)
          </div>
        </div>
        <div className="ec-stat">
          <div className="ec-stat-label">
            {exitSig.urgency === 'high' ? '🔴 Sell Now At' : '🎯 Target Sell Price'}
          </div>
          <div className="ec-stat-val" style={{ color: exitSig.urgency === 'high' ? 'var(--red)' : 'var(--green)' }}>
            {fmt(exitSig.sellTarget)}
          </div>
        </div>
        <div className="ec-stat">
          <div className="ec-stat-label">7-Day Forecast</div>
          <div className={`ec-stat-val ${parseFloat(exitSig.pred7dPct) >= 0 ? 'pos' : 'neg'}`}>
            {fmt(exitSig.predicted7d)} ({parseFloat(exitSig.pred7dPct) >= 0 ? '+' : ''}{exitSig.pred7dPct}%)
          </div>
        </div>
      </div>

      {exitSig.holdUntilDay > daysHeld && exitSig.urgency !== 'high' && (
        <div className="ec-holduntil">
          📅 Hold until approximately Day {exitSig.holdUntilDay}
          {' '}(~{exitSig.holdUntilDay - daysHeld} more days) to reach target of {fmt(exitSig.sellTarget)}
        </div>
      )}
    </div>
  );
}); // end React.memo ExitCard

// ── Main Page ──────────────────────────────────────────────────────────────

export default function TradingSignals({ budget, portfolio, prices = {}, status = 'simulated', onRefresh, setPage }) {
  const [riskFilter,  setRiskFilter]  = useState('All');
  // FIX #7: Replace window.alert (browser-blocking) with in-app toast notification
  const [buyToast, setBuyToast] = useState(null);
  const toastTimerRef = React.useRef(null);
  // FIX HIGH: Cleanup toast timer on unmount — prevents setState on unmounted component
  React.useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);
  const [actionFilter,setActionFilter]= useState('All');
  const [sectorFilter,setSectorFilter]= useState('All');
  const [search,      setSearch]      = useState('');
  const [activeTab,   setActiveTab]   = useState('signals'); // signals | exit | watchlist

  // FIX: pass live prices so signals are grounded in real market data, not stale static prices.
  // PERF FIX: signals themselves don't change when budget changes — only canAfford does.
  // Split into two memos: expensive signal scan only re-runs on price/filter changes;
  // affordability re-check is cheap and runs on budget changes.
  const rawSignals = useMemo(
    () => scanAllSignals(0, riskFilter, prices),  // budget=0 → canAfford always false here
    [riskFilter, prices]  // prices object changes every 15s tick with new ref, but that's correct
  );
  const signals = useMemo(
    () => rawSignals.map(s => ({ ...s, canAfford: budget >= s.currentPrice })),
    [rawSignals, budget]
  );

  const filtered = useMemo(() => signals.filter(s => {
    if (actionFilter !== 'All' && s.action !== actionFilter) return false;
    if (sectorFilter !== 'All' && s.sector !== sectorFilter) return false;
    if (search) {
      const q = search.toUpperCase();
      if (!s.ticker.includes(q) && !s.name.toUpperCase().includes(q)) return false;
    }
    return true;
  }), [signals, actionFilter, sectorFilter, search]);

  const buyCount  = signals.filter(s => s.action === 'BUY').length;
  const sellCount = signals.filter(s => s.action === 'SELL').length;
  const holdCount = signals.filter(s => s.action === 'HOLD').length;

  // Top 3 buy picks (affordable, high confidence)
  const topPicks = signals
    .filter(s => s.action === 'BUY' && s.canAfford)
    .slice(0, 3);

  // Sectors
  const sectors = ['All', ...new Set(STOCKS.map(s => s.sector))];

  // FIX #7: Use in-app toast instead of blocking window.alert()
  const handleBuy = (sig) => {
    setBuyToast(sig);
    // FIX #15: Clear previous timer before setting new one to prevent memory leak
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setBuyToast(null), 5000);
  };

  return (
    <div className="trading-signals animate-in">
      <div className="dt-header">
        <div>
          <h1 className="page-title">🤖 AI Trading Signals</h1>
          <p className="page-sub">
            Exact buy/sell recommendations — when to buy, at what price, when to sell, and your profit target.
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <div style={{ fontSize:12, color: status==='live'?'var(--teal)':status==='connecting'?'var(--gold)':status==='closed'?'var(--text2)':'var(--text3)', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background: status==='live'?'var(--teal)':status==='connecting'?'var(--gold)':status==='closed'?'var(--text2)':'var(--text3)', display:'inline-block', animation: status==='live'?'liveBadge 1.5s ease infinite':'' }}/>
            {status === 'live' ? 'Live prices' : status === 'connecting' ? 'Connecting…' : status === 'closed' ? 'NSE closed — last traded prices' : 'Offline — fallback prices'}
          </div>
          <button className="btn btn-secondary" style={{padding:'7px 14px',fontSize:12}} onClick={onRefresh}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* FIX #7: In-app buy action toast replaces blocking window.alert */}
      {buyToast && (
        <div className="buy-action-toast animate-pop">
          <div className="bat-main">
            <strong>📈 {buyToast.ticker}</strong> — AI Signal: {buyToast.action}
            {/* FIX: direct "Go Buy" button navigates to Buy Stocks page instead of
                requiring the user to manually find the stock */}
            {setPage && (
              <button className="btn btn-primary" style={{ marginLeft:12, padding:'4px 14px', fontSize:12 }}
                onClick={() => { setBuyToast(null); setPage('stocks'); }}>
                Go Buy →
              </button>
            )}
          </div>
          <div className="bat-details">
            Entry: {fmt(buyToast.entryPrice)} · Target: <span className="pos">{fmt(buyToast.targetPrice)} (+{buyToast.potentialGainPct}%)</span> · Stop: <span className="neg">{fmt(buyToast.stopLoss)}</span> · ~{buyToast.timelineDays} days
          </div>
          <button onClick={() => setBuyToast(null)} style={{background:'none',color:'inherit',fontSize:16,padding:'2px 8px',cursor:'pointer'}}>✕</button>
        </div>
      )}

      {/* Market overview strip */}
      <div className="market-strip">
        <div className={`ms-card ms-buy`}>
          <div className="ms-icon">▲</div>
          <div className="ms-count">{buyCount}</div>
          <div className="ms-label">Buy Signals</div>
        </div>
        <div className="ms-card ms-hold">
          <div className="ms-icon">◆</div>
          <div className="ms-count">{holdCount}</div>
          <div className="ms-label">Hold</div>
        </div>
        <div className="ms-card ms-sell">
          <div className="ms-icon">▼</div>
          <div className="ms-count">{sellCount}</div>
          <div className="ms-label">Sell Signals</div>
        </div>
        <div className="ms-card ms-budget">
          <div className="ms-icon">💰</div>
          <div className="ms-count">₹{budget > 0 ? budget.toLocaleString('en-IN') : '—'}</div>
          <div className="ms-label">Your Budget</div>
        </div>
      </div>

      {/* Top 3 picks banner */}
      {topPicks.length > 0 && (
        <div className="top-picks card">
          <div className="tp-title">⭐ Top Picks Right Now — Highest Confidence BUYs Within Your Budget</div>
          <div className="tp-grid">
            {topPicks.map((s, i) => (
              <div key={s.ticker} className="tp-card">
                <div className="tp-rank">#{i + 1}</div>
                <div>
                  <div className="tp-ticker">{s.ticker}</div>
                  <div className="tp-name">{s.name}</div>
                </div>
                <div>
                  <div className="tp-price">{fmt(s.entryPrice)}</div>
                  <div className="tp-target pos">Target: {fmt(s.targetPrice)} (+{s.potentialGainPct}%)</div>
                  <div className="tp-timeline">in ~{s.timelineDays} days</div>
                </div>
                <div className="tp-conf">
                  <ConfBar value={s.confidence} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="ts-tabs">
        {[
          { id: 'signals', label: '📊 All Signals'                      },
          { id: 'exit',    label: `📤 Exit Advice ${portfolio.length > 0 ? `(${portfolio.length})` : ''}` },
        ].map(t => (
          <button key={t.id} className={`ts-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Signals tab ── */}
      {activeTab === 'signals' && (
        <>
          {/* Filters */}
          <div className="card ts-filters">
            <div className="tsf-row">
              <div className="tsf-search">
                <span>🔍</span>
                <input placeholder="Search ticker or name…" value={search}
                  onChange={e => setSearch(e.target.value)} className="tsf-input"/>
              </div>
              <div className="tsf-group">
                <span className="tsf-label">Action</span>
                {['All','BUY','HOLD','SELL'].map(a => (
                  <button key={a} className={`chip ${actionFilter===a?'active':''}`}
                    onClick={() => setActionFilter(a)}>{a}</button>
                ))}
              </div>
              <div className="tsf-group">
                <span className="tsf-label">Risk</span>
                {['All','low','medium','high'].map(r => (
                  <button key={r} className={`chip ${riskFilter===r?'active':''}`}
                    onClick={() => setRiskFilter(r)}>
                    {r==='low'?'🟢 ':r==='medium'?'🟡 ':r==='high'?'🔴 ':''}{r}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>
              Showing {filtered.length} of {signals.length} stocks
            </div>
          </div>

          <div className="signals-list">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="e-icon">🔍</div>
                <h3>No signals match your filters</h3>
                <p>Try clearing the filters above.</p>
              </div>
            ) : (
              filtered.map(sig => (
                <SignalCard key={sig.ticker} sig={sig} onBuy={handleBuy} canBuy={budget} prices={prices} />
              ))
            )}
          </div>
        </>
      )}

      {/* ── Exit advice tab ── */}
      {activeTab === 'exit' && (
        <div className="exit-section">
          {portfolio.length === 0 ? (
            <div className="empty-state card" style={{ padding: 48 }}>
              <div className="e-icon">💼</div>
              <h3>No holdings to analyse</h3>
              <p>Buy stocks from the "Buy Stocks" page, then come back here for exit signals.</p>
            </div>
          ) : (
            <>
              <div className="exit-intro">
                Each card shows whether to hold, sell now, or wait for a target — based on your buy price and current market indicators.
              </div>
              <div className="exit-list">
                {portfolio.map(h => (
                  <ExitCard key={h.stock.ticker} holding={h} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="ts-disclaimer">
        ⚠️ These signals are generated by technical indicators (RSI, MACD, Bollinger Bands) on simulated data.
        They are for <strong>educational purposes only</strong> — not real financial advice.
        Always do your own research before investing real money.
      </div>
    </div>
  );
}
