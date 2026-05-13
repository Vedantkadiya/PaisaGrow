import React, { useState, useMemo } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend
} from 'recharts';
import { STOCKS, simulateDailyPrices } from '../data/stocks';
import LivePriceTag from '../components/LivePriceTag';
import './StockCompare.css';
import { fmt, fmtK, today } from '../utils/format'; // FIX: shared util — was duplicated across 4 pages

// ── helpers ────────────────────────────────────────────────────────────────
const RADAR_ATTRS = [
  { key: 'safety',     label: 'Safety'      },
  { key: 'returns',    label: 'Returns'     },
  { key: 'momentum',  label: 'Momentum'    },
  { key: 'value',     label: 'Value'       },
  { key: 'liquidity', label: 'Liquidity'   },
];

function stockRadarScores(stock) {
  const riskScore  = stock.risk === 'low' ? 90 : stock.risk === 'medium' ? 55 : 25;
  const roiScore   = Math.min(100, Math.max(0, (stock.roi1y + 10) * 2.5));
  const momScore   = stock.trend === 'up' ? 80 : stock.trend === 'flat' ? 50 : 25;
  const valScore   = stock.price < 100 ? 85 : stock.price < 500 ? 70 : stock.price < 1000 ? 50 : 30;
  const liqScore   = ['Index Fund','Banking','IT','Energy'].includes(stock.sector) ? 80 : 55;
  return [
    { key: 'safety',    label: 'Safety',    value: riskScore  },
    { key: 'returns',   label: 'Returns',   value: roiScore   },
    { key: 'momentum',  label: 'Momentum',  value: momScore   },
    { key: 'value',     label: 'Value',     value: valScore   },
    { key: 'liquidity', label: 'Liquidity', value: liqScore   },
  ];
}

// ── Metric row ─────────────────────────────────────────────────────────────
function MetricRow({ label, valA, valB, higher = 'better', unit = '' }) {
  const numA = parseFloat(valA);
  const numB = parseFloat(valB);
  // FIX: Handle all four cases correctly:
  // 'better' → higher number wins (e.g. returns, momentum)
  // 'lower'  → lower number wins (e.g. price, risk)
  // 'higher' → alias for 'better' (higher is better)
  // 'none'   → no winner (e.g. sector name — subjective comparison)
  const aWins = higher === 'none' ? false
    : (higher === 'better' || higher === 'higher') ? numA > numB
    : numA < numB;
  const bWins = higher === 'none' ? false
    : (higher === 'better' || higher === 'higher') ? numB > numA
    : numB < numA;
  return (
    <div className="metric-row">
      <div className={`metric-val ${aWins ? 'metric-win' : ''}`}>
        {valA}{unit}
        {aWins && <span className="metric-crown">★</span>}
      </div>
      <div className="metric-label">{label}</div>
      <div className={`metric-val metric-val-r ${bWins ? 'metric-win' : ''}`}>
        {bWins && <span className="metric-crown">★</span>}
        {valB}{unit}
      </div>
    </div>
  );
}

// ── Verdict ────────────────────────────────────────────────────────────────
function Verdict({ stockA, stockB, scores }) {
  if (!stockA || !stockB) return null;

  const totalA = scores.a.reduce((s, r) => s + r.value, 0);
  const totalB = scores.b.reduce((s, r) => s + r.value, 0);
  const winner = totalA > totalB ? stockA : stockB;
  const loser  = totalA > totalB ? stockB : stockA;
  const diff   = Math.abs(totalA - totalB);

  const reasons = [];
  // FIX LOW: Handle equality case in return comparison
  if (stockA.roi1y > stockB.roi1y)
    reasons.push(`${stockA.ticker} has higher expected return (+${stockA.roi1y}% vs +${stockB.roi1y}%)`);
  else if (stockB.roi1y > stockA.roi1y)
    reasons.push(`${stockB.ticker} has higher expected return (+${stockB.roi1y}% vs +${stockA.roi1y}%)`);
  else
    reasons.push(`Both have equal expected return (+${stockA.roi1y}%)`);

  if (stockA.risk !== stockB.risk) {
    const safer = stockA.risk === 'low' ? stockA : stockB.risk === 'low' ? stockB : null;
    if (safer) reasons.push(`${safer.ticker} is lower risk (${safer.risk})`);
  }
  if (stockA.price < stockB.price) reasons.push(`${stockA.ticker} is more affordable at ${fmt(stockA.price)}`);
  else reasons.push(`${stockB.ticker} is more affordable at ${fmt(stockB.price)}`);

  return (
    <div className="verdict-card card-teal card animate-pop">
      <div className="verdict-emoji">🏆</div>
      <div className="verdict-winner">{winner.ticker} wins</div>
      <div className="verdict-score">
        Overall score: {winner.ticker} {Math.round(totalA > totalB ? totalA : totalB)} vs {loser.ticker} {Math.round(totalA > totalB ? totalB : totalA)}
        {diff < 30 && <span className="verdict-close"> — very close!</span>}
      </div>
      <ul className="verdict-reasons">
        {/* index key OK: reasons list is static per render, never reordered after initial build */}
  {reasons.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
      <div className="verdict-note">
        ⚠️ This is based on technical scoring only — always do your own research before investing real money.
      </div>
    </div>
  );
}

// ── Price chart ────────────────────────────────────────────────────────────
// FIX #11: Accept prices prop to use live price as baseline; fix today in useMemo deps
function PriceChart({ stockA, stockB, prices = {} }) {
  // FIX #11: Compute today inside useMemo so it's stable and correctly in deps
  const recsA = useMemo(() => {
    if (!stockA) return [];
    // FIX: use today() (local date) — toISOString() gives UTC, wrong date after 6:30pm IST
    const livePrice = prices[stockA.ticker]?.price || stockA.price;
    return simulateDailyPrices(stockA, livePrice, today(), 60).filter(r => r.type === 'actual');
  }, [stockA, prices]);

  const recsB = useMemo(() => {
    if (!stockB) return [];
    // FIX: use today() (local date) — toISOString() gives UTC, wrong date after 6:30pm IST
    const livePrice = prices[stockB.ticker]?.price || stockB.price;
    return simulateDailyPrices(stockB, livePrice, today(), 60).filter(r => r.type === 'actual');
  }, [stockB, prices]);

  // Normalize to % change from day 0
  const data = recsA.map((r, i) => ({
    day:  r.day,
    date: r.date,
    [stockA?.ticker]: parseFloat(((r.price / recsA[0]?.price - 1) * 100).toFixed(2)),
    ...(recsB[i] ? { [stockB?.ticker]: parseFloat(((recsB[i].price / recsB[0]?.price - 1) * 100).toFixed(2)) } : {}),
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:10, padding:'10px 14px', fontSize:12 }}>
        <div style={{ color:'var(--text2)', marginBottom:6, fontSize:10 }}>{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color:p.color, fontFamily:'var(--font-mono)', fontWeight:600, display:'flex', gap:14, justifyContent:'space-between' }}>
            <span>{p.name}</span><span>{p.value > 0 ? '+' : ''}{p.value}%</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="card compare-chart-card">
      <div className="ccc-title">60-Day Performance (% change from start)</div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top:8, right:8, left:0, bottom:0 }}>
          <defs>
            <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00f5c0" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#00f5c0" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#ffc23a" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#ffc23a" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#141f30" strokeDasharray="4 4" vertical={false}/>
          <XAxis dataKey="date" tick={{ fill:'#7a9cbf', fontSize:10 }} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
          <YAxis tick={{ fill:'#7a9cbf', fontSize:10 }} tickLine={false} axisLine={false}
            tickFormatter={v => `${v > 0 ? '+' : ''}${v}%`} width={48}/>
          <Tooltip content={<CustomTooltip />}/>
          <Legend wrapperStyle={{ fontSize:12, color:'#7a9cbf', paddingTop:10 }} iconType="circle" iconSize={8}/>
          {stockA && <Area type="monotone" dataKey={stockA.ticker} stroke="#00f5c0" strokeWidth={2.5} fill="url(#gradA)" dot={false}/>}
          {stockB && <Area type="monotone" dataKey={stockB.ticker} stroke="#ffc23a" strokeWidth={2.5} fill="url(#gradB)" dot={false}/>}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function StockCompare({ prices = {}, budget = 0 }) {
  const [tickerA, setTickerA] = useState('');
  const [tickerB, setTickerB] = useState('');

  const stockA = STOCKS.find(s => s.ticker === tickerA) || null;
  const stockB = STOCKS.find(s => s.ticker === tickerB) || null;

  const scoresA = stockA ? stockRadarScores(stockA) : [];
  const scoresB = stockB ? stockRadarScores(stockB) : [];

  // Merge for radar chart
  const radarData = RADAR_ATTRS.map(attr => ({
    subject: attr.label,
    [stockA?.ticker || 'A']: scoresA.find(s => s.key === attr.key)?.value || 0,
    [stockB?.ticker || 'B']: scoresB.find(s => s.key === attr.key)?.value || 0,
  }));

  const liveA = prices[tickerA];
  const liveB = prices[tickerB];

  const priceA = liveA?.price || stockA?.price || 0;
  const priceB = liveB?.price || stockB?.price || 0;

  const canAffordA = budget >= priceA;
  const canAffordB = budget >= priceB;

  return (
    <div className="stock-compare animate-in">
      <h1 className="page-title">⚖️ Stock Comparison</h1>
      <p className="page-sub">Compare two stocks side-by-side — price, risk, returns, indicators, and a final verdict.</p>

      {/* Stock pickers */}
      <div className="compare-pickers card">
        <div className="cp-side">
          <div className="cp-label" style={{ color:'var(--teal)' }}>Stock A</div>
          <select value={tickerA} onChange={e => setTickerA(e.target.value)} className="cp-select">
            <option value="">— Select a stock —</option>
            {STOCKS.filter(s => s.ticker !== tickerB).map(s => (
              <option key={s.ticker} value={s.ticker}>{s.ticker} — {s.name} (₹{s.price})</option>
            ))}
          </select>
          {stockA && (
            <div className="cp-preview">
              <div className="cpp-ticker" style={{ color:'var(--teal)' }}>{stockA.ticker}</div>
              <div className="cpp-name">{stockA.name}</div>
              {liveA && <LivePriceTag ticker={tickerA} prices={prices} size="md" showChange/>}
              <div style={{ marginTop:6, display:'flex', gap:7, flexWrap:'wrap' }}>
                <span className={`risk-badge risk-${stockA.risk}`}>{stockA.risk} risk</span>
                <span style={{ fontSize:11, color: canAffordA ? 'var(--teal)' : 'var(--text3)', fontWeight:600 }}>
                  {canAffordA ? '✓ Affordable' : `Need ₹${(priceA - budget).toFixed(0)} more`}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="cp-vs">VS</div>

        <div className="cp-side">
          <div className="cp-label" style={{ color:'var(--gold)' }}>Stock B</div>
          <select value={tickerB} onChange={e => setTickerB(e.target.value)} className="cp-select">
            <option value="">— Select a stock —</option>
            {STOCKS.filter(s => s.ticker !== tickerA).map(s => (
              <option key={s.ticker} value={s.ticker}>{s.ticker} — {s.name} (₹{s.price})</option>
            ))}
          </select>
          {stockB && (
            <div className="cp-preview">
              <div className="cpp-ticker" style={{ color:'var(--gold)' }}>{stockB.ticker}</div>
              <div className="cpp-name">{stockB.name}</div>
              {liveB && <LivePriceTag ticker={tickerB} prices={prices} size="md" showChange/>}
              <div style={{ marginTop:6, display:'flex', gap:7, flexWrap:'wrap' }}>
                <span className={`risk-badge risk-${stockB.risk}`}>{stockB.risk} risk</span>
                <span style={{ fontSize:11, color: canAffordB ? 'var(--teal)' : 'var(--text3)', fontWeight:600 }}>
                  {canAffordB ? '✓ Affordable' : `Need ₹${(priceB - budget).toFixed(0)} more`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick picks row */}
      {!stockA && !stockB && (
        <div className="quick-compare card">
          <div className="qc-title">⚡ Popular Comparisons</div>
          <div className="qc-list">
            {[
              ['NHPC','NTPC'],['SBIN','ICICIBANK'],['JUNIORBEES','NIFTYBEES'],
              ['TATAMOTORS','TATASTEEL'],['WIPRO','HCLTECH'],['COALINDIA','SAIL'],
            ].map(([a,b]) => (
              <button key={a+b} className="qc-item" onClick={() => { setTickerA(a); setTickerB(b); }}>
                {a} vs {b}
              </button>
            ))}
          </div>
        </div>
      )}

      {stockA && stockB && (
        <>
          {/* Verdict */}
          <Verdict stockA={stockA} stockB={stockB} scores={{ a: scoresA, b: scoresB }}/>

          {/* Metrics table */}
          <div className="card metrics-card">
            <div className="mc-header">
              <div className="mc-head-a" style={{ color:'var(--teal)' }}>{stockA.ticker}</div>
              <div className="mc-head-mid">Metric</div>
              <div className="mc-head-b" style={{ color:'var(--gold)' }}>{stockB.ticker}</div>
            </div>
            <div className="metrics-list">
              <MetricRow label="Current Price"    valA={fmt(priceA)}          valB={fmt(priceB)}          higher="lower"/>
              <MetricRow label="1Y Est. Return"   valA={stockA.roi1y}         valB={stockB.roi1y}         unit="%" />
              <MetricRow label="Risk Level"
                valA={stockA.risk === 'low' ? '1' : stockA.risk === 'medium' ? '2' : '3'}
                valB={stockB.risk === 'low' ? '1' : stockB.risk === 'medium' ? '2' : '3'}
                higher="lower"
              />
              <MetricRow label="Trend"
                valA={stockA.trend === 'up' ? '3' : stockA.trend === 'flat' ? '2' : '1'}
                valB={stockB.trend === 'up' ? '3' : stockB.trend === 'flat' ? '2' : '1'}
                higher="better"
              />
              <MetricRow label="Sector"           valA={stockA.sector}        valB={stockB.sector}        higher="none"/>
              <MetricRow label="Today Change"
                valA={`${(liveA?.changePct||0) > 0 ? '+' : ''}${(liveA?.changePct||0).toFixed(2)}%`}
                valB={`${(liveB?.changePct||0) > 0 ? '+' : ''}${(liveB?.changePct||0).toFixed(2)}%`}
                higher="better"/>
              <MetricRow label="Day High"         valA={fmt(liveA?.high||priceA)} valB={fmt(liveB?.high||priceB)} higher="better"/>
              <MetricRow label="Day Low"          valA={fmt(liveA?.low||priceA)}  valB={fmt(liveB?.low||priceB)}  higher="higher"/>
              <MetricRow label="Beginner Score"
                valA={scoresA.reduce((s,r) => s + r.value, 0).toFixed(0)}
                valB={scoresB.reduce((s,r) => s + r.value, 0).toFixed(0)}
                higher="better"/>
            </div>
          </div>

          {/* Charts row */}
          <div className="compare-charts">
            {/* Radar */}
            <div className="card radar-card">
              <div className="rc-title">Strength Radar</div>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} margin={{ top:10, right:30, bottom:10, left:30 }}>
                  <PolarGrid stroke="#141f30"/>
                  <PolarAngleAxis dataKey="subject" tick={{ fill:'#7a9cbf', fontSize:11, fontFamily:'var(--font-head)' }}/>
                  {stockA && (
                    <Radar name={stockA.ticker} dataKey={stockA.ticker}
                      stroke="#00f5c0" fill="#00f5c0" fillOpacity={0.12} strokeWidth={2}/>
                  )}
                  {stockB && (
                    <Radar name={stockB.ticker} dataKey={stockB.ticker}
                      stroke="#ffc23a" fill="#ffc23a" fillOpacity={0.12} strokeWidth={2}/>
                  )}
                  <Legend wrapperStyle={{ fontSize:12, color:'#7a9cbf' }} iconType="circle" iconSize={8}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Price chart */}
            {/* FIX #11: pass prices so chart uses live price as baseline */}
            <PriceChart stockA={stockA} stockB={stockB} prices={prices}/>
          </div>

          {/* Descriptions */}
          <div className="compare-descs">
            <div className="card cd-card">
              <div className="cdc-ticker" style={{ color:'var(--teal)' }}>{stockA.ticker}</div>
              <div className="cdc-name">{stockA.name}</div>
              <div className="cdc-desc">{stockA.desc}</div>
            </div>
            <div className="card cd-card">
              <div className="cdc-ticker" style={{ color:'var(--gold)' }}>{stockB.ticker}</div>
              <div className="cdc-name">{stockB.name}</div>
              <div className="cdc-desc">{stockB.desc}</div>
            </div>
          </div>
        </>
      )}

      {/* Show one selected */}
      {(stockA || stockB) && !(stockA && stockB) && (
        <div className="empty-state" style={{ padding:40 }}>
          <div className="e-icon">⚖️</div>
          <h3>Select the {stockA ? 'second' : 'first'} stock to compare</h3>
          <p>Pick both Stock A and Stock B above to see the full comparison.</p>
        </div>
      )}
    </div>
  );
}
