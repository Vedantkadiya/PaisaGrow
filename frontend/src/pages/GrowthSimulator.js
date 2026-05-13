import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Legend
} from 'recharts';
import { simulateGrowth } from '../data/stocks';
import './GrowthSimulator.css';

const RETURN_PRESETS = [
  { label: 'Fixed Deposit', rate: 7,  color: '#60a5fa', icon: '🏦' },
  { label: 'Nifty 50 ETF',  rate: 14, color: '#22d3a5', icon: '📈' },
  { label: 'Growth Stocks', rate: 20, color: '#fb923c', icon: '🚀' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="ct-label">{label}</div>
      {payload.map(p => (
        <div key={p.name} className="ct-row" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span>₹{Number(p.value).toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
};

function lastOf(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[arr.length - 1];
}

export default function GrowthSimulator({ budget, sipAmount }) {
  const [principal,  setPrincipal]  = useState(budget > 0 ? budget : 0);
  const [monthly,    setMonthly]    = useState(sipAmount > 0 ? sipAmount : 0);
  const [years,      setYears]      = useState(5);
  const [returnRate, setReturnRate] = useState(14);

  const data      = useMemo(() => simulateGrowth(principal, monthly, years, returnRate),       [principal, monthly, years, returnRate]);
  // FIX LOW: Prevent data2yr/data5yr showing identical data to main when years is small
  // data2yr = 2 years shorter, min 1 year; data5yr = 5 years shorter, min 1 year
  // Only show comparison when they're meaningfully different from main chart (at least 1yr apart)
  const data2yr   = useMemo(() => years > 2 ? simulateGrowth(principal, monthly, years - 2, returnRate) : null, [principal, monthly, years, returnRate]);
  const data5yr   = useMemo(() => years > 5 ? simulateGrowth(principal, monthly, years - 5, returnRate) : null, [principal, monthly, years, returnRate]);

  const finalRow     = lastOf(data);
  const final2yr     = lastOf(data2yr);
  const final5yr     = lastOf(data5yr);

  const isEmpty = principal === 0 && monthly === 0;

  if (!finalRow || isEmpty) {
    return (
      <div className="growth-sim animate-in">
        <h1 className="page-title">🌱 Growth Simulator</h1>
        <p className="page-sub">See how your money grows over time with the power of compounding</p>
        <div className="card sim-controls">
          <div className="sim-grid">
            <div className="field">
              <label>Starting Amount (₹)</label>
              <input type="number" min="0" value={principal}
                onChange={e => setPrincipal(Math.max(0, Number(e.target.value) || 0))} />
              <div className="field-hint">Your initial investment</div>
            </div>
            <div className="field">
              <label>Monthly Addition (₹)</label>
              <input type="number" min="0" value={monthly}
                onChange={e => setMonthly(Math.max(0, Number(e.target.value) || 0))} />
              <div className="field-hint">Add this every month (SIP)</div>
            </div>
            <div className="field">
              <label>Years to Invest</label>
              <input type="range" min="1" max="30" value={years}
                onChange={e => setYears(Number(e.target.value))} />
              <div className="range-val">{years} years</div>
            </div>
            <div className="field">
              <label>Annual Return (%)</label>
              <input type="range" min="4" max="30" step="0.5" value={returnRate}
                onChange={e => setReturnRate(Number(e.target.value))} />
              <div className="range-val">{returnRate}% per year</div>
            </div>
          </div>
          <div className="preset-row">
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Quick presets:</span>
            {RETURN_PRESETS.map(p => (
              <button key={p.label}
                className={`preset-btn ${returnRate === p.rate ? 'active' : ''}`}
                style={returnRate === p.rate ? { borderColor: p.color, color: p.color, background: `${p.color}15` } : {}}
                onClick={() => setReturnRate(p.rate)}>
                {p.icon} {p.label} ({p.rate}%)
              </button>
            ))}
          </div>
        </div>
        <div className="card" style={{ textAlign:'center', padding:'48px 32px' }}>
          <div style={{ fontSize:48, marginBottom:16 }}>💡</div>
          <div style={{ fontFamily:'var(--font-head)', fontSize:20, fontWeight:700, marginBottom:12 }}>
            Enter an amount to simulate your growth
          </div>
          <div style={{ color:'var(--text2)', lineHeight:1.7, maxWidth:400, margin:'0 auto' }}>
            Type a <strong>Starting Amount</strong> or <strong>Monthly SIP</strong> above to see how your money compounds over time.
          </div>
        </div>
      </div>
    );
  }

  const totalInvest  = principal + monthly * years * 12;
  const totalProfit  = isFinite(finalRow.balance) ? finalRow.balance - totalInvest : 0; // FIX #13
  // FIX #13: Guard NaN when both principal=0 AND monthly=0 — totalInvest=0 → 0/0=NaN
  const multiplier = (totalInvest > 0 && finalRow.balance > 0)
    ? (finalRow.balance / totalInvest).toFixed(2)
    : '1.00';

  const milestones = [
    { label: '2×',  target: principal * 2  },
    { label: '5×',  target: principal * 5  },
    { label: '10×', target: principal * 10 },
  ];

  return (
    <div className="growth-sim animate-in">
      <h1 className="page-title">🌱 Growth Simulator</h1>
      <p className="page-sub">See how your money grows over time with the power of compounding</p>

      {/* Controls */}
      <div className="card sim-controls">
        <div className="sim-grid">
          <div className="field">
            <label>Starting Amount (₹)</label>
            <input type="number" min="0" value={principal}
              onChange={e => setPrincipal(Math.max(0, Number(e.target.value) || 0))} /> {/* min= only blocks spinners; Math.max blocks typed negatives */}
            <div className="field-hint">Your initial investment</div>
          </div>
          <div className="field">
            <label>Monthly Addition (₹)</label>
            <input type="number" min="0" value={monthly}
              onChange={e => setMonthly(Math.max(0, Number(e.target.value) || 0))} /> {/* blocks typed negative values */}
            <div className="field-hint">Add this every month (SIP)</div>
          </div>
          <div className="field">
            <label>Years to Invest</label>
            <input type="range" min="1" max="30" value={years}
              onChange={e => setYears(Number(e.target.value))} />
            <div className="range-val">{years} years</div>
          </div>
          <div className="field">
            <label>Annual Return (%)</label>
            <input type="range" min="4" max="30" step="0.5" value={returnRate}
              onChange={e => setReturnRate(Number(e.target.value))} />
            <div className="range-val">{returnRate}% per year</div>
          </div>
        </div>

        <div className="preset-row">
          <span style={{ fontSize: 12, color: 'var(--text2)' }}>Quick presets:</span>
          {RETURN_PRESETS.map(p => (
            <button key={p.label}
              className={`preset-btn ${returnRate === p.rate ? 'active' : ''}`}
              style={returnRate === p.rate ? { borderColor: p.color, color: p.color, background: `${p.color}15` } : {}}
              onClick={() => setReturnRate(p.rate)}>
              {p.icon} {p.label} ({p.rate}%)
            </button>
          ))}
        </div>
      </div>

      {/* Results summary */}
      <div className="results-row">
        <div className="result-card big-result">
          <div className="rc-label">Final Value after {years}yr</div>
          <div className="rc-value" style={{ color: 'var(--green)' }}>
            ₹{finalRow.balance.toLocaleString('en-IN')}
          </div>
          <div className="rc-sub">{multiplier}× your money!</div>
        </div>
        <div className="result-card">
          <div className="rc-label">Total Invested</div>
          <div className="rc-value">₹{totalInvest.toLocaleString('en-IN')}</div>
          <div className="rc-sub">₹{principal} + {years * 12} monthly SIPs</div>
        </div>
        <div className="result-card">
          <div className="rc-label">Total Profit</div>
          <div className="rc-value pos">+₹{totalProfit.toLocaleString('en-IN')}</div>
          <div className="rc-sub">From compound returns</div>
        </div>
        <div className="result-card">
          <div className="rc-label">Monthly SIP Effect</div>
          <div className="rc-value" style={{ color: 'var(--blue)' }}>
            ₹{(monthly * years * 12).toLocaleString('en-IN')}
          </div>
          <div className="rc-sub">Extra invested via SIP</div>
        </div>
      </div>

      {/* Chart */}
      <div className="card chart-card">
        <div className="chart-title">Your Money Over Time</div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22d3a5" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22d3a5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1e2334" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#8b98c4', fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#8b98c4', fontSize: 11 }} tickLine={false} axisLine={false}
              tickFormatter={v => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#8b98c4', paddingTop: 12 }} iconType="circle" iconSize={8} />
            <Area type="monotone" dataKey="balance"  name="Portfolio Value" stroke="#22d3a5" strokeWidth={2.5} fill="url(#balGrad)"  dot={false} />
            <Area type="monotone" dataKey="invested" name="Amount Invested"  stroke="#60a5fa" strokeWidth={2}   fill="url(#invGrad)" dot={false} strokeDasharray="5 3" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Milestones */}
      <div className="card milestones-card">
        <div className="ms-title">🎯 When do you hit milestones?</div>
        <div className="ms-grid">
          {milestones.map(ms => {
            const hit = data.find(d => d.balance >= ms.target);
            return (
              <div key={ms.label} className="ms-item">
                <div className="ms-label">{ms.label} (₹{ms.target.toLocaleString('en-IN')})</div>
                {hit ? (
                  <div className="ms-hit pos">✅ Month {hit.month} ({hit.label})</div>
                ) : (
                  <div className="ms-miss" style={{ color: 'var(--text3)' }}>Not reached in {years}yr — try longer!</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fun facts — power of starting early */}
      <div className="fun-facts">
        <div className="ff-title">💡 The Power of Starting Early</div>
        <div className="ff-grid">
          {[
            { scenario: 'Start today',  val: finalRow.balance },
            { scenario: 'Wait 2 years', val: final2yr ? final2yr.balance : 0 },
            { scenario: 'Wait 5 years', val: final5yr ? final5yr.balance : 0 },
          ].map(({ scenario, val }) => (
            <div key={scenario} className="ff-item card">
              <div className="ff-scenario">{scenario}</div>
              <div className="ff-val" style={{ color: scenario === 'Start today' ? 'var(--green)' : 'var(--text2)' }}>
                ₹{val.toLocaleString('en-IN')}
              </div>
            </div>
          ))}
        </div>
        <p className="ff-note">
          Starting early can make a HUGE difference! Every year you wait reduces your final wealth significantly.
        </p>
      </div>
    </div>
  );
}
