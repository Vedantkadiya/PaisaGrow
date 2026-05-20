import React, { useState, useEffect } from 'react';
import { getBudgetTier, BUDGET_ADVICE, buildPortfolioSuggestion, STOCKS } from '../data/stocks';
import './Home.css';
import { sanitizeBudget, MAX_BUDGET } from '../utils/money';

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000, 2000, 5000, 10000];

// ── Market Mood Indicator (Item 23) ────────────────────────────────────────────
function MarketMoodCard() {
  const stocksWithRoi = STOCKS.filter(s => typeof s.roi1y === 'number');
  const positive = stocksWithRoi.filter(s => s.roi1y > 0).length;
  const pct = stocksWithRoi.length > 0 ? Math.round((positive / stocksWithRoi.length) * 100) : 50;

  let mood, color, bg, explanation;
  if (pct > 60) {
    mood = 'Bull Run 📈'; color = '#22d3a5'; bg = 'rgba(34,211,165,0.08)';
    explanation = `${pct}% of tracked stocks are up this year — a generally positive market environment.`;
  } else if (pct < 40) {
    mood = 'Bear Phase 📉'; color = '#f4536c'; bg = 'rgba(244,83,108,0.08)';
    explanation = `${100 - pct}% of tracked stocks are down this year — proceed with caution.`;
  } else {
    mood = 'Sideways ➡️'; color = '#fbbf24'; bg = 'rgba(251,191,36,0.08)';
    explanation = `Markets are mixed — ${pct}% positive, ${100 - pct}% negative. A good time to be selective.`;
  }

  const sorted = [...stocksWithRoi].sort((a, b) => b.roi1y - a.roi1y);
  const topMovers = sorted.slice(0, 3);
  const bottomMovers = sorted.slice(-3).reverse();

  return (
    <div style={{ background: bg, border: `1px solid ${color}30`, borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color }}>{mood}</div>
        <div style={{ flex: 1, height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 1s ease' }}/>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>{pct}%</div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text2)', margin: '0 0 16px' }}>{explanation}</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>🔝 Top Movers</div>
          {topMovers.map(s => (
            <div key={s.ticker} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{s.ticker}</span>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>+{s.roi1y}%</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>📉 Laggards</div>
          {bottomMovers.map(s => (
            <div key={s.ticker} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{s.ticker}</span>
              <span style={{ color: 'var(--red)', fontWeight: 600 }}>{s.roi1y}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TipBox({ tier }) {
  const advice = BUDGET_ADVICE[tier];
  if (!advice) return null;
  return (
    <div className="tip-box animate-in">
      <div className="tip-title">{advice.title}</div>
      <div className="tip-body">{advice.advice}</div>
      <div className="tip-fact">💡 {advice.tip}</div>
    </div>
  );
}

function SuggestionCard({ stock, qty, spent }) {
  if (!stock) return null;
  return (
    <div className="suggestion-card animate-in">
      <div className="sugg-header">
        <div>
          <div className="sugg-ticker">{stock.ticker}</div>
          <div className="sugg-name">{stock.name}</div>
        </div>
        <span className={`risk-badge risk-${stock.risk}`}>{stock.risk}</span>
      </div>
      <div className="sugg-nums">
        <div className="sugg-num">
          <div className="sugg-num-label">Price/share</div>
          <div className="sugg-num-val">₹{stock.price.toLocaleString('en-IN')}</div>
        </div>
        <div className="sugg-num">
          <div className="sugg-num-label">You buy</div>
          <div className="sugg-num-val" style={{ color: 'var(--blue)' }}>{qty} share{qty > 1 ? 's' : ''}</div>
        </div>
        <div className="sugg-num">
          <div className="sugg-num-label">Cost</div>
          <div className="sugg-num-val" style={{ color: 'var(--green)' }}>₹{spent.toLocaleString('en-IN')}</div>
        </div>
        <div className="sugg-num">
          <div className="sugg-num-label">1Y est. return</div>
          <div className="sugg-num-val pos">+{stock.roi1y}%</div>
        </div>
      </div>
    </div>
  );
}

export default function Home({ budget, setBudget, setManualBudget, portfolio, livePortfolio, totalInvested, currentValue, profit, setPage }) {
  const displayPortfolio = livePortfolio || portfolio;
  const [input, setInput] = useState(budget > 0 ? String(budget) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // FIX: derive submitted from budget instead of storing separately
  const submitted = budget > 0;

  // Sync input once when budget is loaded from server on mount
  const [didSync, setDidSync] = useState(false);
  useEffect(() => {
    if (!didSync && budget > 0) {
      setInput(String(budget));
      setDidSync(true);
    }
  }, [budget, didSync]);

  const handleSet = async () => {
    const val = sanitizeBudget(input);
    if (val === null) { setError('Please enter a valid amount greater than ₹0'); return; }
    if (parseFloat(input) > MAX_BUDGET) {
      setError(`Maximum budget is ₹${MAX_BUDGET.toLocaleString('en-IN')} (₹1 crore)`);
      return;
    }
    setError('');
    setSaving(true);
    // FIX: use setManualBudget to persist budget to server, falls back to setBudget
    if (setManualBudget) {
      await setManualBudget(val);
    } else {
      setBudget(val);
    }
    setSaving(false);
  };

  const tier       = getBudgetTier(budget);
  const suggestion = budget > 0 ? buildPortfolioSuggestion(budget) : null;
  // suggestion is always {portfolio: [], remaining: N} shape now — safe to access .portfolio
  const hasSuggestions = suggestion && Array.isArray(suggestion.portfolio) && suggestion.portfolio.length > 0;

  return (
    <div className="home-page animate-in">
      <div className="home-hero">
        <div className="hero-emoji">🌱</div>
        <h1 className="page-title">Welcome to PaisaGrow!</h1>
        <p className="page-sub">India's friendliest investment guide for beginners.<br />Tell us your budget and we'll show you exactly what you can buy.</p>
        <div className="save-indicator">
          <span className="si-dot"/>
          Your data is saved automatically — close and reopen the app anytime 🎉
        </div>
      </div>

      {/* Budget Entry */}
      <div className="card budget-entry">
        <div className="be-title">Enter Your Investment Budget</div>
        <div className="be-subtitle">How much money do you want to invest? (Even ₹50 is a great start!)</div>

        <div className="be-input-row">
          <div className="be-rupee">₹</div>
          <input
            className="be-input"
            type="number" min="1" max="10000000" step="1"
            onKeyDown={e => {
              // FIX: Merge two duplicate onKeyDown handlers into one.
              // Previously the Enter handler silently overwrote the e/E/+/- guard.
              if (['e','E','+','-'].includes(e.key)) { e.preventDefault(); return; }
              if (e.key === 'Enter') handleSet();
            }}
            value={input}
            onChange={e => { setInput(e.target.value); setError(''); }}
            placeholder="e.g. 100"
          />
          <button className="btn btn-primary" onClick={handleSet} disabled={saving}>{saving ? 'Saving…' : "Let's Go! →"}</button>
        </div>

        {error && <div className="be-error">{error}</div>}

        <div className="quick-amounts">
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>Quick select:</span>
          {QUICK_AMOUNTS.map(a => (
            <button key={a} className={`chip ${budget === a ? 'active' : ''}`}
              onClick={() => { setInput(String(a)); setError(''); if (setManualBudget) { setManualBudget(a); } else { setBudget(a); } }}>
              ₹{a.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
      </div>

      {/* After budget is set */}
      {submitted && budget > 0 && (
        <>
          <MarketMoodCard />
          <TipBox tier={tier} />

          {/* Portfolio summary stats */}
          {displayPortfolio.length > 0 && (
            <div className="stat-row" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div className="stat-label">Remaining Cash</div>
                <div className="stat-value" style={{ color: 'var(--blue)' }}>₹{budget.toLocaleString('en-IN')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Invested</div>
                <div className="stat-value">₹{totalInvested.toFixed(0)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Current Value</div>
                <div className="stat-value" style={{ color: 'var(--green)' }}>₹{currentValue.toFixed(0)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Profit / Loss</div>
                <div className="stat-value" style={{ color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {/* FIX: show neutral when exactly 0 */}
                  {profit > 0 ? '+' : profit < 0 ? '-' : ''}₹{Math.abs(profit).toFixed(0)}
                </div>
              </div>
            </div>
          )}

          {/* Smart portfolio suggestion */}
          {hasSuggestions && (
            <div className="suggestion-section">
              <div className="sugg-section-title">
                🤖 Suggested Portfolio for ₹{budget.toLocaleString('en-IN')}
                <span className="sugg-section-sub">Optimised for beginners · Low risk priority</span>
              </div>
              <div className="sugg-grid">
                {suggestion.portfolio.map((item) => (
                  <SuggestionCard
                    key={item.stock.ticker}
                    stock={item.stock}
                    qty={item.qty}
                    spent={item.spent}
                  />
                ))}
              </div>
              {suggestion.remaining > 0 && (
                <div className="sugg-remaining">
                  💰 ₹{suggestion.remaining.toLocaleString('en-IN')} remaining — save for your next SIP!
                </div>
              )}
              <div className="sugg-actions">
                <button className="btn btn-primary" onClick={() => setPage('stocks')}>📈 Explore All Stocks</button>
                <button className="btn btn-secondary" onClick={() => setPage('growth')}>🌱 See Growth Projection</button>
              </div>
            </div>
          )}

          {/* Budget too small for any stock */}
          {!hasSuggestions && (
            <div className="card" style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>💡</div>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: 18, marginBottom: 10 }}>
                ₹{budget} is a great start!
              </div>
              <div style={{ color: 'var(--text2)', marginBottom: 20 }}>
                With this amount, consider starting with a{' '}
                <strong style={{ color: 'var(--green)' }}>SIP (Systematic Investment Plan)</strong>{' '}
                in a mutual fund — many allow ₹100/month minimum.
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={() => setPage('learn')}>📚 Learn About SIP</button>
                <button className="btn btn-secondary" onClick={() => setPage('stocks')}>📈 Browse All Stocks</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Feature highlights for new users */}
      {!submitted && (
        <div className="features-grid">
          {[
            { icon: '🎯', title: 'Budget-Aware',   desc: 'See only stocks you can actually afford with your exact budget' },
            { icon: '📊', title: 'Risk Explained',  desc: 'Every stock rated Low/Medium/High risk with plain English explanation' },
            { icon: '🌱', title: 'Grow Together',   desc: 'Watch how your ₹100 can grow into thousands over time' },
            { icon: '📚', title: 'Learn as You Go', desc: 'Simple guides on how the Indian stock market works — no jargon!' },
          ].map(f => (
            <div key={f.title} className="feature-card card">
              <div className="feat-icon">{f.icon}</div>
              <div className="feat-title">{f.title}</div>
              <div className="feat-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
