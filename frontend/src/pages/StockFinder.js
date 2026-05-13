import React, { useState, useMemo } from 'react';
import { roundMoney, moneyCost } from '../utils/money';
import { STOCKS, SECTORS, getAffordableStocks } from '../data/stocks';
import LivePriceTag from '../components/LivePriceTag';
import './StockFinder.css';

const RISK_OPTS = ['All', 'low', 'medium', 'high'];

// PERF: React.memo prevents re-render when prices update for OTHER stocks
const StockCard = React.memo(function StockCard({ stock, budget, onBuy, owned, prices }) {
  const live     = prices[stock.ticker];
  const curPrice = live?.price || stock.price;
  const [qty, setQty] = useState(1);
  // FIX: maxQty declared BEFORE useEffect — const TDZ would crash if useEffect dep
  // array evaluated maxQty before its declaration (TDZ = Temporal Dead Zone ReferenceError)
  const maxQty   = Math.floor(budget / curPrice);
  // FIX: clamp qty when budget changes and maxQty drops below current selection
  React.useEffect(() => {
    if (maxQty > 0 && qty > maxQty) setQty(maxQty);
  }, [maxQty]); // intentional: only re-clamp when maxQty changes
  const canBuy   = budget >= curPrice * qty && qty >= 1;
  const cost     = curPrice * qty;
  const est1y    = cost * (1 + stock.roi1y / 100);
  const profit   = est1y - cost;
  const isETF    = stock.sector === 'Index Fund';

  const trendIcon  = live?.change >= 0 ? '▲' : live?.change < 0 ? '▼' : (stock.trend === 'up' ? '▲' : stock.trend === 'down' ? '▼' : '→');
  const trendColor = live?.change >= 0 ? 'var(--green)' : live?.change < 0 ? 'var(--red)' : 'var(--yellow)';

  return (
    <div className={`stock-card ${isETF ? 'stock-card-etf' : ''} animate-in`}>
      {isETF && <div className="etf-crown">⭐ Beginner Friendly</div>}
      {owned > 0 && <div className="owned-badge">✓ You own {owned}</div>}

      <div className="sc-header">
        <div>
          <div className="sc-ticker">{stock.ticker}</div>
          <div className="sc-name">{stock.name}</div>
          <div className="sc-sector">{stock.sector}</div>
        </div>
        <div className="sc-right">
          <LivePriceTag ticker={stock.ticker} prices={prices} size="md" showChange={true}/>
          <div className="sc-trend" style={{ color: trendColor }}>
            {trendIcon} {stock.roi1y}% /yr est.
          </div>
        </div>
      </div>

      <div className="sc-desc">{stock.desc}</div>

      <div className="sc-badges">
        <span className={`risk-badge risk-${stock.risk}`}>
          {stock.risk === 'low' ? '🟢' : stock.risk === 'medium' ? '🟡' : '🔴'} {stock.risk} risk
        </span>
        {budget < curPrice && (
          <span className="risk-badge" style={{ background:'var(--red-bg)', color:'var(--red)', borderColor:'rgba(244,83,108,0.25)' }}>
            Need ₹{(curPrice - budget).toFixed(0)} more
          </span>
        )}
        {/* FIX #2: was live?.live — wrong field name. The price object uses isLive not live */}
        {live?.isLive && (
          <span className="risk-badge" style={{ background:'var(--green-bg)', color:'var(--green)', borderColor:'rgba(34,211,165,0.25)', fontSize:10 }}>
            ● LIVE
          </span>
        )}
      </div>

      {budget >= curPrice ? (
        <div className="sc-buy">
          <div className="qty-row">
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Quantity:</span>
            <div className="qty-controls">
              <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q-1))}>−</button>
              <span className="qty-val">{qty}</span>
              <button className="qty-btn" onClick={() => setQty(q => Math.min(maxQty || 999, q+1))}>+</button>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Max: {maxQty}</span>
          </div>
          <div className="sc-calc">
            <div className="sc-calc-row"><span>Total Cost</span><span style={{fontWeight:600}}>₹{cost.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
            <div className="sc-calc-row"><span>1-Year Estimate</span><span className="pos">₹{est1y.toLocaleString('en-IN',{minimumFractionDigits:2})}</span></div>
            <div className="sc-calc-row"><span>Estimated Profit</span><span className="pos">+₹{profit.toFixed(2)}</span></div>
          </div>
          <button className={`btn btn-primary sc-buy-btn ${!canBuy?'disabled':''}`}
            onClick={() => canBuy && onBuy(stock, qty, curPrice)} disabled={!canBuy}>
            {canBuy ? `Buy ${qty} Share${qty>1?'s':''} · ₹${cost.toFixed(0)}` : 'Not enough budget'}
          </button>
        </div>
      ) : (
        <div className="sc-locked">
          <span>💰 Need ₹{curPrice.toLocaleString('en-IN')} per share to invest</span>
        </div>
      )}
    </div>
  );
}); // end React.memo StockCard

export default function StockFinder({ budget, setBudget, portfolio, setPortfolio, prices = {}, marketStatus, onBuy }) {
  const [sector,  setSector]  = useState('All');
  const [risk,    setRisk]    = useState('All');
  const [showAll, setShowAll] = useState(false);
  const [bought,  setBought]  = useState(null);
  const [search,  setSearch]  = useState('');
  const [buying,  setBuying]  = useState(null); // ticker being bought
  const buyingRef     = React.useRef(new Set());
  const boughtTimerRef = React.useRef(null);

  const ownedMap = useMemo(() => {
    const m = {};
    portfolio.forEach(h => {
      const ticker = h?.stock?.ticker;
      if (ticker) m[ticker] = (m[ticker] || 0) + h.qty;
    });
    return m;
  }, [portfolio]);

  const affordable = useMemo(() => {
    const base = showAll ? STOCKS : getAffordableStocks(budget, risk, sector);
    if (!search) return base;
    const q = search.toUpperCase();
    return base.filter(s => s.ticker.includes(q) || s.name.toUpperCase().includes(q) || s.sector.toUpperCase().includes(q));
  }, [budget, risk, sector, showAll, search]);

  const handleBuy = async (stock, qty, livePrice) => {
    const cost = moneyCost(livePrice, qty);
    if (cost > budget) return;
    if (buyingRef.current.has(stock.ticker)) return;
    buyingRef.current.add(stock.ticker);
    setBuying(stock.ticker);

    try {
      if (onBuy) {
        await onBuy({ stock, qty, livePrice });
      } else {
        // Fallback: local only
        setPortfolio(p => [...p, { stock, qty, buyPrice: livePrice, date: new Date().toLocaleDateString('en-IN'), lotId: Date.now() }]);
        setBudget(b => roundMoney(b - cost));
      }
      setBought({ stock, qty, cost });   // FIX: store object so toast can read .qty .stock .cost
      clearTimeout(boughtTimerRef.current);
      boughtTimerRef.current = setTimeout(() => setBought(null), 2500);
    } catch (_) {
      // error already emitted by hook
    } finally {
      buyingRef.current.delete(stock.ticker);
      setBuying(null);
    }
  };

  // Old handleBuy removed — now using handleBuy defined above (props.onBuy based)

  return (
    <div className="stock-finder animate-in">
      <h1 className="page-title">📈 Buy Stocks</h1>
      <p className="page-sub">
        {budget > 0
          ? `Your remaining budget: ₹${budget.toLocaleString('en-IN')} — ${marketStatus?.isOpen ? 'live prices updating every 15 seconds' : 'showing last traded prices (NSE closed)'}`
          : 'Set your budget on the Dashboard first, or browse all stocks below'}
      </p>

      {/* Market closed notice */}
      {marketStatus && !marketStatus.isOpen && Object.keys(prices).length > 0 && (
        <div className="market-closed-banner">
          🔒 NSE is currently closed · Prices shown are the last traded (previous close) prices · No fluctuations until market reopens at 9:15 AM IST
        </div>
      )}

      {budget > 0 && (
        <div className="budget-pill">
          💰 Available: <strong>₹{budget.toLocaleString('en-IN')}</strong>
          <span className="budget-pill-stocks">
            {STOCKS.filter(s => s.price <= budget).length} stocks within budget
          </span>
        </div>
      )}

      {bought && (
        <div className="buy-toast animate-pop">
          ✅ Bought {bought.qty} share{bought.qty>1?'s':''} of {bought.stock.ticker} for ₹{bought.cost.toFixed(0)}!
          Remaining: ₹{budget.toLocaleString('en-IN')}
        </div>
      )}

      <div className="card filters-bar">
        <div className="filter-search">
          <span className="filter-search-icon">🔍</span>
          <input placeholder="Search by name or ticker…" value={search}
            onChange={e => setSearch(e.target.value)} className="filter-search-input"/>
        </div>
        <div className="filter-row">
          <div className="filter-group">
            <div className="filter-label">Sector</div>
            <div className="filter-chips">
              {SECTORS.slice(0,8).map(s => (
                <button key={s} className={`chip ${sector===s?'active':''}`} onClick={()=>setSector(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-label">Risk Level</div>
            <div className="filter-chips">
              {RISK_OPTS.map(r => (
                <button key={r} className={`chip ${risk===r?'active':''}`} onClick={()=>setRisk(r)}>
                  {r==='low'?'🟢':r==='medium'?'🟡':r==='high'?'🔴':''} {r}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="filter-toggle-row">
          <label className="toggle-label">
            <input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)}/>
            <span>Show all stocks (including ones above your budget)</span>
          </label>
          <span style={{fontSize:12,color:'var(--text2)'}}>{affordable.length} stocks</span>
        </div>
      </div>

      {budget === 0 && !showAll && (
        <div className="empty-state">
          <div className="e-icon">💰</div>
          <h3>Set Your Budget First</h3>
          <p>Go to Dashboard and enter how much you want to invest, or check "Show all stocks" above.</p>
        </div>
      )}

      <div className="stocks-grid">
        {affordable.map(stock => (
          <StockCard key={stock.ticker} stock={stock} budget={budget}
            onBuy={handleBuy} owned={ownedMap[stock.ticker]||0} prices={prices}/>
        ))}
        {affordable.length === 0 && (budget>0||showAll) && (
          <div className="empty-state" style={{gridColumn:'1/-1'}}>
            <div className="e-icon">🔍</div><h3>No stocks found</h3>
            <p>Try changing your filters or increasing your budget.</p>
          </div>
        )}
      </div>
    </div>
  );
}
