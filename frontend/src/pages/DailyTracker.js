import React, { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage'; // FIX #3: persist tracker investments
import {
  ComposedChart, Line, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { STOCKS, simulateDailyPrices, getDailyRecommendation } from '../data/stocks';
import './DailyTracker.css';
import { fmt, today } from '../utils/format'; // FIX: shared utils — today() also fixes UTC midnight date bug
import { roundMoney, moneyCost } from '../utils/money';

// ── Helpers ────────────────────────────────────────────────────────────────

// ── Custom chart tooltip ───────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="dt-tooltip">
      <div className="dt-tt-date">{label}</div>
      {payload.filter(p => p.value != null).map(p => (
        <div key={p.name} className="dt-tt-row" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span>₹{Number(p.value).toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
};

// ── Signal badge ───────────────────────────────────────────────────────────

function SignalBadge({ signal, size = 'md' }) {
  const cfg = {
    BUY:  { color: 'var(--green)',  bg: 'var(--green-bg)',  icon: '▲', border: 'rgba(34,211,165,0.3)'  },
    SELL: { color: 'var(--red)',    bg: 'var(--red-bg)',    icon: '▼', border: 'rgba(244,83,108,0.3)'   },
    HOLD: { color: 'var(--yellow)', bg: 'var(--yellow-bg)', icon: '◆', border: 'rgba(251,191,36,0.3)'  },
  }[signal] || { color: 'var(--text2)', bg: 'var(--bg3)', icon: '—', border: 'var(--border)' };

  return (
    <span className={`signal-badge signal-${signal.toLowerCase()} ${size === 'lg' ? 'signal-lg' : ''}`}
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {cfg.icon} {signal}
    </span>
  );
}

// ── RSI Gauge ──────────────────────────────────────────────────────────────

function RsiGauge({ rsi }) {
  const pct   = Math.min(100, Math.max(0, rsi));
  const color = rsi < 30 ? 'var(--green)' : rsi > 70 ? 'var(--red)' : 'var(--yellow)';
  const label = rsi < 30 ? 'Oversold 🟢' : rsi > 70 ? 'Overbought 🔴' : 'Normal 🟡';
  return (
    <div className="rsi-gauge">
      <div className="rsi-track">
        <div className="rsi-zone rsi-low"  />
        <div className="rsi-zone rsi-mid"  />
        <div className="rsi-zone rsi-high" />
        <div className="rsi-needle" style={{ left: `${pct}%`, borderBottomColor: color }} />
      </div>
      <div className="rsi-labels">
        <span>0</span><span>30</span><span>70</span><span>100</span>
      </div>
      <div className="rsi-val" style={{ color }}>RSI: {rsi} — {label}</div>
    </div>
  );
}

// ── Day-by-day log row ─────────────────────────────────────────────────────

function DayRow({ rec, buyPrice, isToday }) {
  const pnl    = rec.price - buyPrice;
  const pnlPct = (pnl / buyPrice * 100).toFixed(2);
  return (
    <div className={`day-row ${isToday ? 'day-row-today' : ''}`}>
      <div className="dr-day">Day {rec.day}</div>
      <div className="dr-date">{rec.date}</div>
      <div className="dr-price">{fmt(rec.price)}</div>
      <div className={`dr-pnl ${pnl >= 0 ? 'pos' : 'neg'}`}>
        {pnl >= 0 ? '+' : ''}₹{Math.abs(pnl).toFixed(2)}
        <span className="dr-pct">({pnlPct}%)</span>
      </div>
      <SignalBadge signal={rec.signal} size="sm" />
      <div className="dr-reason">{rec.signalReason}</div>
    </div>
  );
}

// ── Add Investment Modal ───────────────────────────────────────────────────

// FIX #8: Added prices prop so modal uses live price for maxQty, not stale hardcoded price
function AddInvestmentModal({ budget, portfolio, onAdd, onClose, prices = {} }) {
  const [ticker,    setTicker]    = useState('');
  const [qty,       setQty]       = useState(1);
  const [customDate,setCustomDate]= useState(today());

  const stock    = STOCKS.find(s => s.ticker === ticker);
  // FIX #8: Use live price if available, fall back to hardcoded price
  const livePrice = stock ? (prices[stock.ticker]?.price || stock.price) : 0;
  const maxQty    = stock ? Math.floor(budget / livePrice) : 0;
  const cost      = stock ? livePrice * qty : 0;
  const canAdd   = stock && qty >= 1 && cost <= budget && livePrice > 0;

  // Already tracking?
  const alreadyTracking = portfolio.some(h => h.stock.ticker === ticker);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box animate-pop" onClick={e => e.stopPropagation()}>
        <div className="modal-title">📊 Start Tracking an Investment</div>
        <p className="modal-sub">Choose a stock, quantity, and investment date to begin daily tracking with AI predictions.</p>

        <div className="modal-fields">
          <div className="field">
            <label>Select Stock</label>
            <select value={ticker} onChange={e => { setTicker(e.target.value); setQty(1); }}>
              <option value="">— Pick a stock —</option>
              {STOCKS.map(s => (
                <option key={s.ticker} value={s.ticker}>
                  {s.ticker} — {s.name} (₹{s.price}) [{s.risk} risk]
                </option>
              ))}
            </select>
          </div>

          {stock && (
            <>
              <div className="modal-stock-info">
                <div className="msi-ticker">{stock.ticker}</div>
                <div className="msi-name">{stock.name}</div>
                <div className="msi-stats">
                  <span>₹{stock.price}/share</span>
                  <span className={`risk-badge risk-${stock.risk}`}>{stock.risk} risk</span>
                  <span className="pos">+{stock.roi1y}% /yr</span>
                </div>
              </div>

              <div className="field">
                <label>Number of Shares (max {maxQty} with your budget)</label>
                <div className="qty-row-modal">
                  <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                  <span className="qty-val">{qty}</span>
                  <button className="qty-btn" onClick={() => setQty(q => Math.min(maxQty || 999, q + 1))}>+</button>
                  <span className="qty-cost">= {fmt(cost)}</span>
                </div>
              </div>

              <div className="field">
                <label>Investment Date (Day 0)</label>
                <input type="date" value={customDate} max={today()}
                  onChange={e => setCustomDate(e.target.value)} />
                <div className="field-hint">
                  Days elapsed since investment:{' '}
                  <strong style={{ color: 'var(--green)' }}>
                    {Math.max(0, Math.floor((new Date() - new Date(customDate)) / 86400000))} days
                  </strong>
                </div>
              </div>

              {alreadyTracking && (
                <div className="error-msg">⚠️ Already tracking {ticker}. Remove it first.</div>
              )}
              {cost > budget && (
                <div className="error-msg">⚠️ Not enough budget. Need ₹{(cost - budget).toFixed(0)} more.</div>
              )}
              {livePrice !== stock?.price && livePrice > 0 && (
                <div style={{fontSize:11,color:"var(--text2)",marginTop:4}}>⚡ Using live price: ₹{livePrice.toFixed(2)}</div>
              )}
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={!canAdd || alreadyTracking}
            onClick={() => canAdd && !alreadyTracking && onAdd({ stock, qty, buyPrice: livePrice, buyDate: customDate })}
          >
            🚀 Start Tracking
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function DailyTracker({ prices = {}, userId }) {
  // trackedInvestments: local stock price simulation tracker (separate from server expense tracker)
  const [trackedInvestments, setTrackedInvestments] = useLocalStorage('tracker', [], userId);
  // BUDGET FIX: DailyTracker uses its own local simulation budget (default ₹1,00,000).
  // Previously it modified the shared server-backed wallet budget via setBudget(), which
  // caused deductions to vanish on the next page load (server re-fetches the real balance).
  // Keeping a separate local budget makes the simulation self-contained and consistent.
  const [budget, setBudget] = useLocalStorage('tracker_budget', 100000, userId);
  const [selected,    setSelected]    = useState(null); // id of selected investment
  const [showModal,   setShowModal]   = useState(false);
  const [simulDay,    setSimulDay]    = useState(null); // null = use real days elapsed
  const [activeTab,   setActiveTab]   = useState('chart'); // chart | log | indicators

  // BUG-E FIX: Pass trackedInvestments (not empty array) so the modal can warn
  // "Already tracking" when user picks a stock they're already watching.
  // Previously mockPortfolio=[] meant this warning NEVER showed.
  // Note: This is tracking-specific portfolio, not the main buy portfolio.

  const handleAdd = ({ stock, qty, buyPrice, buyDate }) => {
    const newInv = { id: Date.now(), stock, qty, buyPrice, buyDate };
    setTrackedInvestments(prev => [...prev, newInv]);
    setSelected(newInv.id);
    // FIX: moneyCost + roundMoney prevent paisa-level float errors from live prices
    setBudget(b => roundMoney(b - moneyCost(buyPrice, qty)));
    setShowModal(false);
    setSimulDay(null);
  };

  const handleRemove = (id) => {
    const inv = trackedInvestments.find(i => i.id === id);
    // FIX: roundMoney on refund matches rounding on original deduction
    if (inv) setBudget(b => roundMoney(b + moneyCost(inv.buyPrice, inv.qty)));
    setTrackedInvestments(prev => prev.filter(i => i.id !== id));
    if (selected === id) setSelected(null);
  };

  // Auto-select first investment
  useEffect(() => {
    if (!selected && trackedInvestments.length > 0) {
      setSelected(trackedInvestments[0].id);
    }
  }, [trackedInvestments, selected]);

  // FIX #10: Re-hydrate stock metadata from STOCKS master list.
  // Stock objects stored in localStorage have stale hardcoded prices and metadata.
  // Merging with STOCKS ensures roi1y, risk, desc etc. are always current.
  const activeInv = React.useMemo(() => {
    const inv = trackedInvestments.find(i => i.id === selected);
    if (!inv) return null;
    const freshStock = STOCKS.find(s => s.ticker === inv.stock.ticker);
    return freshStock ? { ...inv, stock: { ...freshStock } } : inv;
  }, [trackedInvestments, selected]);

  // Days elapsed since buy date (or simulated day)
  const daysElapsed = useMemo(() => {
    if (!activeInv) return 0;
    if (simulDay !== null) return simulDay;
    // FIX #3: Robust date parsing — new Date(string) can return NaN in edge cases
    let buyMs = Date.now();
    if (activeInv.buyDate) {
      const parsed = new Date(activeInv.buyDate);
      if (!isNaN(parsed.getTime())) buyMs = parsed.getTime();
    }
    const diff = Math.floor((Date.now() - buyMs) / 86400000);
    return Math.max(0, Math.min(diff, 90)); // cap at 90 days
  }, [activeInv, simulDay]);

  // Generate price history + predictions
  const records = useMemo(() => {
    if (!activeInv) return [];
    return simulateDailyPrices(activeInv.stock, activeInv.buyPrice, activeInv.buyDate, daysElapsed);
  }, [activeInv, daysElapsed]);

  const rec = useMemo(() => {
    if (!activeInv || !records.length) return null;
    return getDailyRecommendation(records, activeInv.buyPrice);
  }, [activeInv, records]);

  // Chart data: actual prices + predicted overlay
  const chartData = useMemo(() => {
    return records.map(r => ({
      date:      r.date,
      actual:    r.type === 'actual'    ? r.price : null,
      predicted: r.type === 'predicted' ? r.price : null,
      // overlap: show predicted value for last actual day too
      ...(r.type === 'actual' && r.day === daysElapsed ? { predicted: r.predicted } : {}),
      ma7:    r.type === 'actual' ? r.ma7  : null,
      ma14:   r.type === 'actual' ? r.ma14 : null,
      day:    r.day,
    }));
  }, [records, daysElapsed]);

  const actualRecords    = records.filter(r => r.type === 'actual');
  const todayRec         = actualRecords[actualRecords.length - 1];
  const totalValue       = todayRec ? todayRec.price * (activeInv?.qty || 0) : 0;
  const totalInvested    = activeInv ? activeInv.buyPrice * activeInv.qty : 0;
  const totalPnl         = totalValue - totalInvested;
  const totalPnlPct      = totalInvested > 0 ? (totalPnl / totalInvested * 100).toFixed(2) : '0.00';

  return (
    <div className="daily-tracker animate-in">
      {/* Header */}
      <div className="dt-header">
        <div>
          <h1 className="page-title">📊 Daily Investment Tracker</h1>
          <p className="page-sub">
            Invest in a stock, then watch daily price changes with AI predictions every step of the way.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Track New Investment
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <AddInvestmentModal
          budget={budget}
          portfolio={trackedInvestments}
          onAdd={handleAdd}
          onClose={() => setShowModal(false)}
          prices={prices}
        />
      )}

      {/* Empty state */}
      {trackedInvestments.length === 0 && (
        <div className="dt-empty card">
          <div className="dte-icon">📈</div>
          <div className="dte-title">No investments tracked yet</div>
          <div className="dte-sub">
            Click <strong>+ Track New Investment</strong> to pick a stock and see day-by-day price predictions.
          </div>
          <div className="dte-how">
            <div className="how-step"><span className="how-num">1</span> Pick a stock + enter how many shares</div>
            <div className="how-step"><span className="how-num">2</span> Set the investment date (or today)</div>
            <div className="how-step"><span className="how-num">3</span> See price history, ML predictions, and daily BUY/HOLD/SELL signals</div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => setShowModal(true)}>
            🚀 Start Tracking
          </button>
        </div>
      )}

      {/* Investment tabs */}
      {trackedInvestments.length > 0 && (
        <>
          <div className="inv-tabs">
            {trackedInvestments.map(inv => {
              const d     = Math.max(0, Math.floor((new Date() - new Date(inv.buyDate)) / 86400000));
              const recs  = simulateDailyPrices(inv.stock, inv.buyPrice, inv.buyDate, d);
              const cur   = recs.filter(r => r.type === 'actual').slice(-1)[0];
              const pnl   = cur ? ((cur.price - inv.buyPrice) / inv.buyPrice * 100).toFixed(1) : '0.0';
              const up    = parseFloat(pnl) >= 0;
              return (
                <div key={inv.id}
                  className={`inv-tab ${selected === inv.id ? 'active' : ''}`}
                  onClick={() => { setSelected(inv.id); setSimulDay(null); }}>
                  <div className="it-ticker">{inv.stock.ticker}</div>
                  <div className={`it-pnl ${up ? 'pos' : 'neg'}`}>{up ? '+' : ''}{pnl}%</div>
                  <button className="it-remove" onClick={e => { e.stopPropagation(); handleRemove(inv.id); }}>✕</button>
                </div>
              );
            })}
          </div>

          {activeInv && rec && todayRec && (
            <div className="dt-main">
              {/* ── Hero stats ── */}
              <div className="dt-hero card">
                <div className="dth-left">
                  <div className="dth-ticker">{activeInv.stock.ticker}</div>
                  <div className="dth-name">{activeInv.stock.name}</div>
                  <div className="dth-meta">
                    <span className={`risk-badge risk-${activeInv.stock.risk}`}>{activeInv.stock.risk} risk</span>
                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                      Day {daysElapsed} of tracking
                    </span>
                  </div>
                </div>

                <div className="dth-center">
                  <div className="dth-price-label">Current Price</div>
                  {/* BUG-F FIX: Show live NSE price, not simulated — simulated diverges from reality */}
                  <div className="dth-price">
                    {prices[activeInv.stock.ticker]?.price
                      ? `₹${prices[activeInv.stock.ticker]?.price.toFixed(2)}`
                      : fmt(todayRec.price)}
                    {prices[activeInv.stock.ticker]?.isLive && (
                      <span style={{fontSize:11,color:'var(--teal)',marginLeft:6,fontFamily:'var(--font-head)'}}>● LIVE</span>
                    )}
                  </div>
                  <div className={`dth-change ${totalPnl >= 0 ? 'pos' : 'neg'}`}>
                    {totalPnl >= 0 ? '▲' : '▼'} {fmt(Math.abs(totalPnl))} ({totalPnlPct}%)
                    <span className="dth-from"> from ₹{activeInv.buyPrice.toFixed(2)} buy</span>
                  </div>
                </div>

                <div className="dth-right">
                  <div className="dth-stat">
                    <div className="dth-stat-label">Shares</div>
                    <div className="dth-stat-val">{activeInv.qty}</div>
                  </div>
                  <div className="dth-stat">
                    <div className="dth-stat-label">Invested</div>
                    <div className="dth-stat-val">{fmt(totalInvested)}</div>
                  </div>
                  <div className="dth-stat">
                    <div className="dth-stat-label">Current Value</div>
                    <div className="dth-stat-val" style={{ color: 'var(--green)' }}>{fmt(totalValue)}</div>
                  </div>
                  <div className="dth-stat">
                    <div className="dth-stat-label">P&L</div>
                    <div className="dth-stat-val" style={{ color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {totalPnl >= 0 ? '+' : ''}{fmt(totalPnl)}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Today's AI recommendation ── */}
              <div className={`dt-signal-card card signal-card-${todayRec.signal.toLowerCase()}`}>
                <div className="dsc-left">
                  <div className="dsc-label">Today's AI Signal</div>
                  <SignalBadge signal={todayRec.signal} size="lg" />
                  <div className="dsc-reason">{todayRec.signalReason}</div>
                </div>
                <div className="dsc-targets">
                  <div className="dsc-target">
                    <div className="dsc-tl">7-Day Prediction</div>
                    <div className="dsc-tv" style={{ color: rec.target7d >= todayRec.price ? 'var(--green)' : 'var(--red)' }}>
                      {fmt(rec.target7d)}
                      <span className="dsc-pct">
                        ({rec.target7d >= todayRec.price ? '+' : ''}
                        {((rec.target7d - todayRec.price) / todayRec.price * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="dsc-target">
                    <div className="dsc-tl">30-Day Estimate</div>
                    <div className="dsc-tv" style={{ color: rec.target30d >= todayRec.price ? 'var(--green)' : 'var(--red)' }}>
                      {fmt(rec.target30d)}
                      <span className="dsc-pct">
                        ({rec.target30d >= todayRec.price ? '+' : ''}
                        {((rec.target30d - todayRec.price) / todayRec.price * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="dsc-advice">
                    💡 {rec.advice}
                  </div>
                </div>
              </div>

              {/* ── Day simulator ── */}
              <div className="dt-simulator card">
                <div className="sim-label">⏩ Simulate Days Elapsed</div>
                <div className="sim-controls">
                  {/* PERF FIX: debounce slider — simulateDailyPrices (O(90×indicators)) was
                      re-running on every pixel of drag. Now commits only on mouseup/touchend. */}
                  <input type="range" min="0" max="90" value={daysElapsed}
                    onChange={e => setSimulDay(Number(e.target.value))}
                    onMouseUp={e => setSimulDay(Number(e.target.value))}
                    onTouchEnd={e => setSimulDay(Number(e.target.value))} />
                  <div className="sim-val">Day {daysElapsed}</div>
                  <button className="btn btn-secondary sim-reset"
                    onClick={() => setSimulDay(null)}>
                    Reset to Today
                  </button>
                </div>
                <div className="sim-hint">
                  Drag the slider to see how your investment would look on any day from Day 0 to Day 90.
                  The prediction model updates automatically.
                </div>
              </div>

              {/* ── Tab switcher ── */}
              <div className="dt-tab-bar">
                {['chart','log','indicators'].map(t => (
                  <button key={t} className={`dt-tab ${activeTab === t ? 'active' : ''}`}
                    onClick={() => setActiveTab(t)}>
                    {t === 'chart' ? '📈 Price Chart' : t === 'log' ? '📋 Day Log' : '🔬 Indicators'}
                  </button>
                ))}
              </div>

              {/* ── Chart tab ── */}
              {activeTab === 'chart' && (
                <div className="card dt-chart-card">
                  <div className="dtc-header">
                    <div className="dtc-title">Price History + 7-Day Forecast</div>
                    <div className="dtc-legend">
                      <span className="dtcl-item"><span style={{ background: '#22d3a5' }} className="dtcl-dot"/>Actual</span>
                      <span className="dtcl-item"><span style={{ background: '#60a5fa' }} className="dtcl-dot"/>Predicted</span>
                      <span className="dtcl-item"><span style={{ background: '#fbbf24', borderStyle:'dashed' }} className="dtcl-line"/>MA-7</span>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#22d3a5" stopOpacity={0.18}/>
                          <stop offset="95%" stopColor="#22d3a5" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.18}/>
                          <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1e2334" strokeDasharray="4 4" vertical={false}/>
                      <XAxis dataKey="date" tick={{ fill:'#8b98c4', fontSize:10 }} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                      <YAxis tick={{ fill:'#8b98c4', fontSize:10 }} tickLine={false} axisLine={false}
                        tickFormatter={v => `₹${v.toFixed(0)}`} width={56} domain={['auto','auto']}/>
                      <Tooltip content={<ChartTooltip />}/>
                      <ReferenceLine y={activeInv.buyPrice} stroke="#fbbf2466" strokeDasharray="4 3" strokeWidth={1.5}
                        label={{ value:'Buy Price', fill:'#fbbf24', fontSize:9, position:'right' }}/>
                      <Area type="monotone" dataKey="actual" name="Actual Price"
                        stroke="#22d3a5" strokeWidth={2.5} fill="url(#actualGrad)" dot={false} connectNulls={false}/>
                      <Area type="monotone" dataKey="predicted" name="Predicted"
                        stroke="#60a5fa" strokeWidth={2} fill="url(#predGrad)"
                        strokeDasharray="5 3" dot={{ r:3, fill:'#60a5fa' }} connectNulls={false}/>
                      <Line type="monotone" dataKey="ma7" name="MA-7"
                        stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="3 2" dot={false} connectNulls={false}/>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ── Day Log tab ── */}
              {activeTab === 'log' && (
                <div className="card dt-log-card">
                  <div className="dtl-header">
                    <div className="dtl-title">Day-by-Day Record</div>
                    <div className="dtl-cols">
                      <span>Day</span><span>Date</span><span>Price</span>
                      <span>P&L</span><span>Signal</span><span>Reason</span>
                    </div>
                  </div>
                  <div className="dtl-list">
                    {actualRecords.slice().reverse().map(r => (
                      <DayRow key={r.day} rec={r} buyPrice={activeInv.buyPrice}
                        isToday={r.day === daysElapsed} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Indicators tab ── */}
              {activeTab === 'indicators' && (
                <div className="dt-indicators">
                  <div className="card indi-card">
                    <div className="indi-title">RSI — Relative Strength Index</div>
                    <RsiGauge rsi={todayRec.rsi} />
                    <div className="indi-explain">
                      RSI below 30 = oversold (good time to BUY) · RSI above 70 = overbought (consider SELL)
                    </div>
                  </div>

                  <div className="card indi-card">
                    <div className="indi-title">MACD — Momentum</div>
                    <div className="macd-bar">
                      <div className={`macd-fill ${todayRec.macd >= 0 ? 'macd-pos' : 'macd-neg'}`}
                        style={{ width: `${Math.min(100, Math.abs(todayRec.macd) * 200)}%` }}/>
                    </div>
                    <div className="indi-val" style={{ color: todayRec.macd >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      MACD: {todayRec.macd} — {todayRec.macd >= 0 ? 'Bullish momentum 🟢' : 'Bearish momentum 🔴'}
                    </div>
                    <div className="indi-explain">
                      Positive MACD = upward momentum (bullish) · Negative = downward (bearish)
                    </div>
                  </div>

                  <div className="card indi-card">
                    <div className="indi-title">Moving Averages</div>
                    <div className="ma-grid">
                      <div className="ma-row">
                        <span className="ma-label">Current Price</span>
                        <span className="ma-val">{fmt(todayRec.price)}</span>
                      </div>
                      <div className="ma-row">
                        <span className="ma-label">7-Day MA</span>
                        <span className="ma-val" style={{ color: todayRec.price > todayRec.ma7 ? 'var(--green)' : 'var(--red)' }}>
                          {fmt(todayRec.ma7)} {todayRec.price > todayRec.ma7 ? '↑ above' : '↓ below'}
                        </span>
                      </div>
                      <div className="ma-row">
                        <span className="ma-label">14-Day MA</span>
                        <span className="ma-val" style={{ color: todayRec.price > todayRec.ma14 ? 'var(--green)' : 'var(--red)' }}>
                          {fmt(todayRec.ma14)} {todayRec.price > todayRec.ma14 ? '↑ above' : '↓ below'}
                        </span>
                      </div>
                      <div className="ma-row">
                        <span className="ma-label">Buy Price</span>
                        <span className="ma-val" style={{ color: 'var(--yellow)' }}>{fmt(activeInv.buyPrice)}</span>
                      </div>
                    </div>
                    <div className="indi-explain">
                      Price above Moving Average = uptrend signal · Below = downtrend signal
                    </div>
                  </div>

                  <div className="card indi-card">
                    <div className="indi-title">7-Day Prediction Confidence</div>
                    <div className="pred-conf-row">
                      {rec.futureRecs.map((r, i) => {
                        const diff = r.price - todayRec.price;
                        const pct  = (diff / todayRec.price * 100);
                        const up   = diff >= 0;
                        return (
                          <div key={i} className="pconf-cell">
                            <div className="pconf-date">{r.date}</div>
                            <div className="pconf-bar-wrap">
                              <div className="pconf-bar"
                                style={{ height: `${Math.min(80, Math.abs(pct) * 8 + 10)}px`,
                                         background: up ? 'var(--green)' : 'var(--red)',
                                         opacity: 0.6 + i * 0.06 }}/>
                            </div>
                            <div className={`pconf-pct ${up ? 'pos' : 'neg'}`} style={{ fontSize: 10 }}>
                              {up ? '+' : ''}{pct.toFixed(1)}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="indi-explain">
                      Bar height = expected price movement magnitude · Green = predicted gain · Red = predicted drop
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
