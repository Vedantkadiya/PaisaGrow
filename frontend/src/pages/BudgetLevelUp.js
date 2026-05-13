import React, { useState, useEffect, useRef } from 'react';
import {
  getBudgetMilestones,
  getNextAffordableStock,
  getAffordableStocks,
  STOCKS,
} from '../data/stocks';
import './BudgetLevelUp.css';

// ── Confetti burst (pure CSS + JS, no library) ──────────────────────────────
// FIX: useMemo with seeded values — Math.random() was called 5× per piece × 30 pieces
// on every render while active, causing jank during every live price tick.
// Pieces are now generated once and memoized until confetti is dismissed.
function Confetti({ active }) {
  const colors = ['#22d3a5','#60a5fa','#fbbf24','#f472b6','#fb923c'];
  // Use a simple LCG seeded random so pieces are deterministic and stable
  const pieces = React.useMemo(() => {
    let seed = 42;
    const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
    return Array.from({ length: 30 }, (_, i) => ({
      left:     `${rand() * 100}%`,
      bg:       colors[i % colors.length],
      delay:    `${rand() * 0.5}s`,
      duration: `${0.8 + rand() * 0.6}s`,
      w:        `${6 + rand() * 6}px`,
      h:        `${6 + rand() * 6}px`,
      round:    rand() > 0.5,
    }));
  }, []); // [] — pieces never change, only visibility toggled

  if (!active) return null;
  return (
    <div className="confetti-wrap" aria-hidden>
      {pieces.map((p, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left:             p.left,
            background:       p.bg,
            animationDelay:   p.delay,
            animationDuration:p.duration,
            width:            p.w,
            height:           p.h,
            borderRadius:     p.round ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

// ── Single unlock card ────────────────────────────────────────────────────
function UnlockCard({ stock, isNew }) {
  const riskIcon = { low: '🟢', medium: '🟡', high: '🔴' };
  return (
    <div className={`unlock-card ${isNew ? 'unlock-card-new animate-pop' : ''}`}>
      {isNew && <div className="new-badge">🔓 Newly Unlocked!</div>}
      <div className="uc-header">
        <div>
          <div className="uc-ticker">{stock.ticker}</div>
          <div className="uc-name">{stock.name}</div>
          <div className="uc-sector">{stock.sector}</div>
        </div>
        <div className="uc-price">₹{stock.price.toLocaleString('en-IN')}</div>
      </div>
      <div className="uc-stats">
        <span className={`risk-badge risk-${stock.risk}`}>
          {riskIcon[stock.risk]} {stock.risk} risk
        </span>
        <span className="uc-roi pos">+{stock.roi1y}% /yr</span>
      </div>
      <div className="uc-desc">{stock.desc}</div>
    </div>
  );
}

// ── Milestone progress bar ─────────────────────────────────────────────────
function MilestoneBar({ milestones, totalWealth }) {
  const reached = milestones.filter(m => m.reached).length;
  const pct     = Math.round((reached / milestones.length) * 100);

  return (
    <div className="milestone-bar card">
      <div className="mb-title">
        🏆 Investor Journey — {reached} / {milestones.length} milestones reached
      </div>
      <div className="mb-track">
        <div className="mb-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="mb-steps">
        {milestones.map((m, i) => (
          <div key={i} className={`mb-step ${m.reached ? 'reached' : ''}`}>
            <div className="mb-dot" />
            <div className="mb-label">{m.label}</div>
            {m.reward.length > 0 && (
              <div className="mb-reward">{m.reward.join(', ')}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Next unlock teaser ─────────────────────────────────────────────────────
function NextUnlock({ stock, totalWealth }) {
  if (!stock) return null;
  const gap     = stock.price - totalWealth;
  const pct     = Math.min(99, Math.round((totalWealth / stock.price) * 100));
  const riskIcon= { low: '🟢', medium: '🟡', high: '🔴' };

  return (
    <div className="next-unlock card">
      <div className="nu-label">🔜 Next Stock to Unlock</div>
      <div className="nu-body">
        <div className="nu-info">
          <div className="nu-ticker">{stock.ticker}</div>
          <div className="nu-name">{stock.name}</div>
          <div className="nu-price">₹{stock.price.toLocaleString('en-IN')} per share</div>
          <div className="nu-risk">
            <span className={`risk-badge risk-${stock.risk}`}>
              {riskIcon[stock.risk]} {stock.risk} risk
            </span>
            <span className="nu-roi pos">+{stock.roi1y}% /yr</span>
          </div>
        </div>
        <div className="nu-progress">
          <div className="nu-pct-label">{pct}% there</div>
          <div className="nu-track">
            <div className="nu-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="nu-gap">
            Need ₹{gap.toLocaleString('en-IN')} more profit to unlock
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function BudgetLevelUp({
  budget, portfolio, totalInvested, currentValue, profit, setPage
}) {
  const totalWealth        = budget + currentValue;
  // FIX #25: useMemo prevents re-running expensive stock scans on every price tick
  const affordable = React.useMemo(
    () => getAffordableStocks(totalWealth, 'All', 'All'),
    [totalWealth]
  );
  const nextStock          = getNextAffordableStock(totalWealth);
  const milestones = React.useMemo(
    () => getBudgetMilestones(totalWealth),
    [totalWealth]
  ); // FIX #25
  const [showConfetti, setShowConfetti] = useState(false);
  const [newlyUnlocked, setNewlyUnlocked] = useState([]);
  // FIX #10: Initialize to null so first render never triggers false confetti.
  // Previously initialized to totalWealth, which caused incorrect "newly unlocked"
  // firings when the user's wealth had changed since last session.
  const prevWealth = useRef(null);
  const confettiTimerRef = useRef(null); // FIX #15: cleanup confetti timer

  // Detect new unlocks when wealth increases
  useEffect(() => {
    const prev = prevWealth.current;
    // FIX #10: Skip the very first render (prev===null) to avoid false confetti
    // Only fire when totalWealth genuinely increases during the current session
    if (prev !== null && totalWealth > prev) {
      const freshUnlocks = STOCKS.filter(
        s => s.price > prev && s.price <= totalWealth
      );
      if (freshUnlocks.length > 0) {
        setNewlyUnlocked(freshUnlocks.map(s => s.ticker));
        setShowConfetti(true);
        // FIX #15: confetti timer cleanup
        if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
        confettiTimerRef.current = setTimeout(() => setShowConfetti(false), 2500);
      }
    }
    prevWealth.current = totalWealth;
  }, [totalWealth]);

  // FIX HIGH: Cleanup confetti timer on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => { if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current); };
  }, []);

  // Investor level
  const level =
    totalWealth >= 100000 ? { name: 'Pro Investor 🏆',    color: 'var(--orange)', xp: 5 } :
    totalWealth >= 25000  ? { name: 'Growing Investor 📊', color: 'var(--blue)',   xp: 4 } :
    totalWealth >= 5000   ? { name: 'Active Investor 🚀',  color: 'var(--green)',  xp: 3 } :
    totalWealth >= 1000   ? { name: 'Learning Investor 📚',color: 'var(--yellow)', xp: 2 } :
                            { name: 'Beginner 🌱',          color: 'var(--text2)', xp: 1 };

  return (
    <div className="levelup-page animate-in">
      <Confetti active={showConfetti} />

      <h1 className="page-title">🔓 Budget Level-Up</h1>
      <p className="page-sub">
        Your total wealth grows as your portfolio earns profit — unlocking new stocks!
      </p>

      {/* Wealth summary hero */}
      <div className="wealth-hero card">
        <div className="wh-left">
          <div className="wh-label">Total Wealth</div>
          <div className="wh-amount">
            ₹{totalWealth.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="wh-breakdown">
            <span>💰 ₹{budget.toFixed(0)} free cash</span>
            <span className="wh-sep">+</span>
            <span className="pos">📈 ₹{currentValue.toFixed(0)} portfolio</span>
          </div>
        </div>
        <div className="wh-right">
          <div className="wh-level" style={{ color: level.color }}>
            {level.name}
          </div>
          <div className="wh-xp">
            {'⭐'.repeat(level.xp)}{'☆'.repeat(5 - level.xp)}
          </div>
          {profit > 0 && (
            <div className="wh-profit-tag pos">
              +₹{profit.toFixed(0)} profit earned!
            </div>
          )}
        </div>
      </div>

      {/* New unlocks banner */}
      {newlyUnlocked.length > 0 && (
        <div className="unlock-banner animate-pop">
          🎉 You just unlocked {newlyUnlocked.length} new stock
          {newlyUnlocked.length > 1 ? 's' : ''}:{' '}
          <strong>{newlyUnlocked.join(', ')}</strong>!
          <button
            className="btn btn-primary"
            style={{ marginLeft: 16, padding: '6px 16px', fontSize: 13 }}
            onClick={() => setPage('stocks')}
          >
            Buy Now →
          </button>
        </div>
      )}

      {/* Milestone journey bar */}
      <MilestoneBar milestones={milestones} totalWealth={totalWealth} />

      {/* Next unlock teaser */}
      <NextUnlock stock={nextStock} totalWealth={totalWealth} />

      {/* All affordable stocks grid */}
      <div className="affordable-section">
        <div className="as-title">
          ✅ All Stocks You Can Afford
          <span className="as-count">{affordable.length} stocks</span>
        </div>

        {affordable.length === 0 ? (
          <div className="empty-state">
            <div className="e-icon">💰</div>
            <h3>Keep saving! Your first stock is coming soon.</h3>
            {/* FIX: was hardcoded "₹19 (Yes Bank)" — now computed from live STOCKS data */}
            {(() => {
              const cheapest = STOCKS.reduce((a, b) => b.price < a.price ? b : a);
              return (
                <p>
                  The cheapest stock in our list is {cheapest.ticker} at ₹{cheapest.price}.<br />
                  Add ₹{Math.max(0, cheapest.price - totalWealth).toFixed(0)} more to unlock your first share!
                </p>
              );
            })()}
          </div>
        ) : (
          <div className="unlock-grid">
            {affordable.map(stock => (
              <UnlockCard
                key={stock.ticker}
                stock={stock}
                isNew={newlyUnlocked.includes(stock.ticker)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Tips to grow faster */}
      <div className="card grow-tips">
        <div className="gt-title">💡 How to Unlock More Stocks Faster</div>
        <div className="gt-grid">
          {[
            { icon: '📅', tip: 'Do a monthly SIP', detail: 'Add ₹100–₹500 every month. Small amounts add up fast with compounding.' },
            { icon: '🌱', tip: 'Reinvest profits',  detail: 'When you sell a stock at profit, use that money to buy a higher-priced stock.' },
            { icon: '⏳', tip: 'Be patient',         detail: 'Even holding Nifty BeES for 1 year gives ~15% return, growing your buying power.' },
            { icon: '📈', tip: 'Buy ETFs first',      detail: 'Nifty BeES and Junior BeES grow steadily, building your portfolio value reliably.' },
          ].map(t => (
            <div key={t.tip} className="gt-card">
              <div className="gt-icon">{t.icon}</div>
              <div className="gt-tip">{t.tip}</div>
              <div className="gt-detail">{t.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
