import React, { useState, useEffect } from 'react';
import './Portfolio.css';
import { roundMoney, moneyAdd, moneyCost } from '../utils/money';
import Skeleton from '../components/Skeleton';
import { exportPortfolioCsv, getPortfolioSummary } from '../api';

// PERF: React.memo — HoldingRow only re-renders when its own holding changes
const HoldingRow = React.memo(function HoldingRow({ holding, onSell }) {
  const { stock, qty, buyPrice, date } = holding;
  const currentVal  = stock.price * qty;
  const invested    = buyPrice * qty;
  const pnl         = currentVal - invested;
  // FIX: Guard division by zero — invested=0 if buyPrice was 0 (validator gap)
  const pnlPct      = invested > 0 ? ((pnl / invested) * 100).toFixed(2) : '0.00';
  // FIX: strict > 0 — pnl===0 (break-even) renders neutral, not green
  const isProfit     = pnl > 0;
  const isLoss       = pnl < 0;
  const est1yReturn  = currentVal * (1 + stock.roi1y / 100);
  const [showSell, setShowSell] = useState(false);
  const [sellQty,  setSellQty]  = useState(1);

  return (
    <div className="holding-row card animate-in">
      <div className="hr-main">
        <div className="hr-left">
          <div className="hr-ticker">{stock.ticker}</div>
          <div className="hr-name">{stock.name}</div>
          <div className="hr-date">Bought on {date}</div>
        </div>
        <div className="hr-stats">
          <div className="hr-stat">
            <div className="hr-stat-label">Shares</div>
            <div className="hr-stat-val">{qty}</div>
          </div>
          <div className="hr-stat">
            <div className="hr-stat-label">Buy Price</div>
            <div className="hr-stat-val">₹{buyPrice.toFixed(2)}</div>
          </div>
          <div className="hr-stat">
            <div className="hr-stat-label">Current Price</div>
            {/* FIX: toFixed(2) — live prices from Yahoo are floats e.g. 42.3500001 */}
            <div className="hr-stat-val">₹{stock.price.toFixed(2)}</div>
          </div>
          <div className="hr-stat">
            <div className="hr-stat-label">Invested</div>
            <div className="hr-stat-val">₹{invested.toFixed(2)}</div>
          </div>
          <div className="hr-stat">
            <div className="hr-stat-label">Current Value</div>
            <div className="hr-stat-val" style={{ color: 'var(--green)' }}>₹{currentVal.toFixed(2)}</div>
          </div>
          <div className="hr-stat">
            <div className="hr-stat-label">P&L</div>
            <div className="hr-stat-val" style={{ color: isProfit ? 'var(--green)' : isLoss ? 'var(--red)' : 'var(--text2)' }}>
              {/* FIX: neutral color and no sign prefix when pnl is exactly zero */}
              {isProfit ? '+' : isLoss ? '-' : ''}₹{Math.abs(pnl).toFixed(2)}<br />
              <span style={{ fontSize: 11 }}>({pnlPct}%)</span>
            </div>
          </div>
          <div className="hr-stat">
            <div className="hr-stat-label">Est. 1Y Value</div>
            <div className="hr-stat-val pos">₹{est1yReturn.toFixed(2)}</div>
          </div>
        </div>
        <button className="btn btn-secondary hr-sell-btn" onClick={() => setShowSell(!showSell)}>
          {showSell ? 'Cancel' : '💸 Sell'}
        </button>
      </div>

      {showSell && (
        <div className="sell-panel animate-in">
          <div className="sell-title">Sell Shares of {stock.ticker}</div>
          <div className="sell-row">
            <div className="field" style={{ flex: 1 }}>
              <label>Quantity to Sell (max {qty})</label>
              <input
                type="number" min="1" max={qty}
                value={sellQty}
                onChange={e => setSellQty(Math.min(qty, Math.max(1, parseInt(e.target.value) || 1)))}
              />
            </div>
            <div className="sell-preview">
              <div className="sell-preview-label">You'll receive</div>
              <div className="sell-preview-val" style={{ color: 'var(--green)' }}>
                ₹{(stock.price * sellQty).toFixed(2)}
              </div>
            </div>
            <button className="btn btn-primary" onClick={() => { onSell(holding, sellQty); setShowSell(false); }}>
              Confirm Sell
            </button>
          </div>
        </div>
      )}
    </div>
  );
}); // end React.memo HoldingRow

export default function Portfolio({ portfolio, setPortfolio, budget, setBudget, totalInvested, currentValue, profit, prices, onSell, setPage }) {
  const pnlPct   = totalInvested > 0 ? ((profit / totalInvested) * 100).toFixed(2) : '0.00';
  const isProfit = profit > 0;
  const isLoss   = profit < 0;
  const [selling, setSelling] = React.useState(null);
  const [summary, setSummary] = useState(null);
  const [noteDraft, setNoteDraft] = useState({});

  useEffect(() => {
    if (portfolio && portfolio.length > 0) {
      getPortfolioSummary().then(setSummary).catch(() => {});
    }
  }, [portfolio]);

  const handleSell = async (holding, qty) => {
    if (onSell) {
      setSelling(holding._serverId || holding.lotId);
      try {
        await onSell(holding, qty);
        window.dispatchEvent(new CustomEvent('pg:success', { detail: `Sold ${qty} shares of ${holding.stock.ticker}` }));
      } catch (_) {
      } finally {
        setSelling(null);
      }
    } else {
      const saleValue = roundMoney(holding.stock.price * qty);
      setBudget(b => roundMoney(b + saleValue));
      setPortfolio(p => {
        let remaining = qty;
        const updated = p.map(h => {
          if (h.stock.ticker !== holding.stock.ticker) return h;
          if (remaining <= 0) return h;
          const deduct = Math.min(h.qty, remaining);
          remaining -= deduct;
          const newQty = h.qty - deduct;
          return newQty > 0 ? { ...h, qty: newQty } : null;
        }).filter(Boolean);
        return updated;
      });
    }
  };

  // Group by ticker for consolidated view
  // FIX #9: Immutable reduce — never mutate accumulator elements.
  // Previously used `existing.qty = totalQty` which mutates the spread copy,
  // causing stale closure bugs if portfolio prop reference is reused.
  const consolidated = portfolio.reduce((acc, h) => {
    const idx = acc.findIndex(x => x.stock.ticker === h.stock.ticker);
    if (idx !== -1) {
      const prev          = acc[idx];
      const totalQty      = prev.qty + h.qty;
      const weightedPrice = (prev.buyPrice * prev.qty + h.buyPrice * h.qty) / totalQty;
      // Return new array with updated element — no mutation
      return [
        ...acc.slice(0, idx),
        { ...prev, qty: totalQty, buyPrice: weightedPrice },
        ...acc.slice(idx + 1),
      ];
    }
    return [...acc, { ...h }];
  }, []);

  // Calculate how much budget grew after profit
  const totalBudgetValue = budget + currentValue;
  const originalBudget   = budget + totalInvested;

  return (
    <div className="portfolio-page animate-in">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
        <h1 className="page-title" style={{ marginBottom:0 }}>💼 My Portfolio</h1>
        {portfolio && portfolio.length > 0 && (
          <button onClick={exportPortfolioCsv} style={{ padding:'7px 14px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text2)', fontSize:12, cursor:'pointer', fontFamily:'var(--font-head)' }}>
            📥 Export CSV
          </button>
        )}
      </div>
      <p className="page-sub">Track your investments and see how your money is growing</p>

      {/* Skeleton loading */}
      {portfolio === null && (
        <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:16 }}>
          {[1,2,3].map(i => <Skeleton key={i} height={80} radius={12} />)}
        </div>
      )}

      {portfolio !== null && portfolio.length === 0 && (
        <div className="empty-state">
          <div className="e-icon">💼</div>
          <h3>No holdings yet — make your first paper trade!</h3>
          <p>Go to "Buy Stocks" and pick a company to invest in.</p>
          {setPage && <button className="btn btn-primary" onClick={() => setPage('stocks')} style={{ marginTop:16 }}>Browse Stocks</button>}
        </div>
      )}

      {portfolio !== null && portfolio.length > 0 && (
        <>
          {/* Summary cards (Item 26) */}
          {summary && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:20 }}>
              {[
                { label:'Total Invested', value:`₹${Number(summary.total_invested).toLocaleString('en-IN',{maximumFractionDigits:0})}`, color:'var(--text)' },
                { label:'Holdings', value:summary.holding_count, color:'var(--text)' },
                { label:'Avg 1Y ROI', value:`${summary.avg_roi1y > 0 ? '+' : ''}${summary.avg_roi1y}%`, color: summary.avg_roi1y >= 0 ? 'var(--green)' : 'var(--red)' },
                { label:'Best Sector', value: summary.best_sector || '—', color:'var(--teal)' },
              ].map(card => (
                <div key={card.label} style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
                  <div style={{ fontSize:11, color:'var(--text3)', fontFamily:'var(--font-head)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6 }}>{card.label}</div>
                  <div style={{ fontSize:18, fontWeight:700, color:card.color, fontFamily:'var(--font-mono)' }}>{card.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="port-summary">
            <div className="port-summary-main card">
              <div className="psm-label">Total Portfolio Value</div>
              <div className="psm-value">₹{currentValue.toFixed(2)}</div>
              <div className={`psm-change ${isProfit ? 'pos' : isLoss ? 'neg' : ''}`}>
                {isProfit ? '▲' : isLoss ? '▼' : '—'} ₹{Math.abs(profit).toFixed(2)} ({pnlPct}%)
                <span> from invested ₹{totalInvested.toFixed(2)}</span>
              </div>
            </div>

            <div className="port-stats">
              <div className="stat-card">
                <div className="stat-label">Total Invested</div>
                <div className="stat-value">₹{totalInvested.toFixed(0)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Current Value</div>
                <div className="stat-value" style={{color:'var(--green)'}}>₹{currentValue.toFixed(0)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">P&L</div>
                <div className="stat-value" style={{color: isProfit?'var(--green)':isLoss?'var(--red)':'var(--text2)'}}>
                  {isProfit?'+':isLoss?'-':''}₹{Math.abs(profit).toFixed(0)}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Remaining Budget</div>
                <div className="stat-value" style={{color:'var(--blue)'}}>₹{budget.toFixed(0)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Wealth</div>
                <div className="stat-value" style={{color:'var(--orange)'}}>₹{totalBudgetValue.toFixed(0)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Overall Return</div>
                <div className="stat-value" style={{color: totalBudgetValue >= originalBudget ? 'var(--green)':'var(--red)'}}>
                  {/* Guard: originalBudget=0 when user's first buy used all budget */}
                  {totalBudgetValue >= originalBudget?'+':''}
                  {originalBudget > 0 ? ((totalBudgetValue/originalBudget-1)*100).toFixed(1) : '0.0'}%
                </div>
              </div>
            </div>
          </div>

          {/* Budget growth banner */}
          {profit > 0 && (
            <div className="profit-banner animate-pop">
              🎉 Your investments have earned ₹{profit.toFixed(2)} unrealised profit!
              {/* FIX: budget+profit was wrong — profit is locked in stocks until sold.
                  Show only actual cash budget as spendable. */}
              You have ₹{budget.toFixed(0)} cash available — sell holdings to free up more!
            </div>
          )}

          {/* Holdings */}
          <div className="holdings-title">Your Holdings</div>
          <div className="holdings-list">
            {consolidated.map((h, i) => (
              <HoldingRow key={h.stock.ticker} holding={h} onSell={handleSell} />
            ))}
          </div>

          {/* 1-year projection */}
          <div className="card projection-card">
            <div className="proj-title">📅 1-Year Projection</div>
            <div className="proj-subtitle">If current trends continue…</div>
            <div className="proj-grid">
              {consolidated.map(h => {
                const curr = h.stock.price * h.qty;
                const proj = curr * (1 + h.stock.roi1y / 100);
                return (
                  <div key={h.stock.ticker} className="proj-item">
                    <div className="proj-ticker">{h.stock.ticker}</div>
                    <div className="proj-now">₹{curr.toFixed(0)}</div>
                    <div className="proj-arrow">→</div>
                    <div className="proj-future pos">₹{proj.toFixed(0)}</div>
                    <div className="proj-pct pos">+{h.stock.roi1y}%</div>
                  </div>
                );
              })}
            </div>
            <div className="proj-total">
              Total projected value:
              <strong className="pos"> ₹{consolidated.reduce((s,h) => s + h.stock.price * h.qty * (1 + h.stock.roi1y/100), 0).toFixed(0)}</strong>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
