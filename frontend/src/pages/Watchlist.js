import React, { useState, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STOCKS } from '../data/stocks';
import LivePriceTag from '../components/LivePriceTag';
import './Watchlist.css';

function AlertBadge({ stock, alert, prices }) {
  if (!alert) return null;
  const current = prices[stock.ticker]?.price || stock.price;
  const hit     = alert.type === 'above' ? current >= alert.price : current <= alert.price;
  return (
    <div className={`alert-badge ${hit ? 'alert-hit' : 'alert-waiting'}`}>
      {/* FIX: toFixed(2) — alert.price is stored as parseFloat, could be 42.3500001 */}
      {hit ? '🔔 ALERT HIT!' : `🔕 Alert: ${alert.type === 'above' ? '↑' : '↓'} ₹${Number(alert.price).toFixed(2)}`}
    </div>
  );
}

function WatchCard({ item, prices, onRemove, onSetAlert, budget }) {
  const stock   = item.stock;
  const live    = prices[stock.ticker];
  const current = live?.price || stock.price;
  const change  = live?.change || 0;
  const changePct = live?.changePct || 0;
  const canAfford = budget >= current;
  // Removed: alertDistance was computed but never rendered (dead code).
  const [showAlert, setShowAlert] = useState(false);
  const [alertPrice, setAlertPrice] = useState(String(current.toFixed(0)));
  const [alertType,  setAlertType]  = useState('above');

  // FIX: Compute alert hit from item.alert.type (the saved direction), NOT alertType.
  // alertType is local form state that defaults to 'above' on every render, so a saved
  // "below" alert was wrongly glowing when price rose above target (backwards logic).
  const alertHit = item.alert
    ? (item.alert.type === 'above' ? current >= item.alert.price : current <= item.alert.price)
    : false;

  return (
    <div className={`watch-card ${alertHit ? 'wc-alert' : ''} animate-in`}>
      <div className="wc-header">
        <div className="wc-left">
          <div className="wc-ticker">{stock.ticker}</div>
          <div className="wc-name">{stock.name}</div>
          <div className="wc-sector">{stock.sector}</div>
        </div>
        <div className="wc-right">
          <LivePriceTag ticker={stock.ticker} prices={prices} size="md" showChange />
        </div>
      </div>

      <div className="wc-stats">
        <div className="wcs-item">
          <span className="wcs-l">Open</span>
          <span className="wcs-v">₹{(live?.open || stock.price).toFixed(2)}</span>
        </div>
        <div className="wcs-item">
          <span className="wcs-l">High</span>
          <span className="wcs-v pos">₹{(live?.high || stock.price).toFixed(2)}</span>
        </div>
        <div className="wcs-item">
          <span className="wcs-l">Low</span>
          <span className="wcs-v neg">₹{(live?.low || stock.price).toFixed(2)}</span>
        </div>
        <div className="wcs-item">
          <span className="wcs-l">Trend</span>
          <span className={`wcs-v ${stock.trend === 'up' ? 'pos' : stock.trend === 'down' ? 'neg' : ''}`}>
            {stock.trend === 'up' ? '▲' : stock.trend === 'down' ? '▼' : '→'} {stock.roi1y}%/yr
          </span>
        </div>
      </div>

      <div className="wc-badge-row">
        <span className={`risk-badge risk-${stock.risk}`}>{stock.risk} risk</span>
        {canAfford
          ? <span style={{ fontSize:11, color:'var(--teal)', background:'var(--teal-glow)', border:'1px solid rgba(0,245,192,.2)', borderRadius:20, padding:'2px 9px', fontWeight:600 }}>✓ Affordable</span>
          : <span style={{ fontSize:11, color:'var(--text3)', background:'var(--bg4)',      border:'1px solid var(--border)',      borderRadius:20, padding:'2px 9px' }}>₹{(current-budget).toFixed(0)} more needed</span>
        }
        {item.alert && <AlertBadge stock={stock} alert={item.alert} prices={prices} />}
      </div>

      {/* Alert section */}
      {showAlert ? (
        <div className="wc-alert-form animate-in">
          <div className="waf-title">🔔 Set Price Alert</div>
          <div className="waf-row">
            <div style={{ display:'flex', gap:6 }}>
              <button className={`chip ${alertType==='above'?'active':''}`} onClick={() => setAlertType('above')}>↑ Alert if Above</button>
              <button className={`chip ${alertType==='below'?'active':''}`} onClick={() => setAlertType('below')}>↓ Alert if Below</button>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontFamily:'var(--font-head)', color:'var(--teal)', fontSize:18, fontWeight:800 }}>₹</span>
              {/* FIX: max caps alert price to a sensible ceiling; min=1 blocks negative alerts */}
              <input type="number" min="1" max="100000" value={alertPrice} onChange={e => setAlertPrice(e.target.value)}
                style={{ background:'var(--bg4)', border:'1px solid var(--border2)', borderRadius:8, padding:'8px 12px', color:'var(--text)', fontFamily:'var(--font-mono)', fontSize:14, width:100 }}/>
              <button className="btn btn-primary" style={{ padding:'8px 16px', fontSize:12 }}
                onClick={() => {
                  // BUG-D FIX: Validate alertPrice before storing — parseFloat('') = NaN
                  // which makes the alert condition (current >= NaN) always false silently
                  const parsedPrice = parseFloat(alertPrice);
                  if (!isFinite(parsedPrice) || parsedPrice <= 0) return;
                  onSetAlert(item.stock.ticker, { type: alertType, price: parsedPrice });
                  setShowAlert(false);
                }}>
                Set Alert
              </button>
            </div>
          </div>
          <div style={{ fontSize:11, color:'var(--text3)' }}>Current price: ₹{current.toFixed(2)}</div>
          {alertPrice !== '' && !isFinite(parseFloat(alertPrice)) && (
            <div style={{fontSize:11,color:'var(--red)',marginTop:3}}>⚠ Enter a valid price number</div>
          )}
        </div>
      ) : (
        <div className="wc-actions">
          <button className="btn btn-secondary wca-btn" onClick={() => setShowAlert(true)}>🔔 Set Alert</button>
          {item.alert && <button className="btn btn-secondary wca-btn" onClick={() => onSetAlert(stock.ticker, null)}>✕ Remove Alert</button>}
          <button className="btn btn-secondary wca-btn" style={{ marginLeft:'auto', color:'var(--red)' }} onClick={() => onRemove(stock.ticker)}>Remove</button>
        </div>
      )}
    </div>
  );
}

export default function Watchlist({ prices, budget, setPage, userId,
    watchlist: serverWatchlist, setWatchlist: serverSetWatchlist,
    onAdd, onRemove, onSetAlert }) {
  const [localWatchlist, setLocalWatchlist] = useLocalStorage('watchlist', [], userId);
  const watchlist    = serverWatchlist    ?? localWatchlist;
  const setWatchlist = serverSetWatchlist ?? setLocalWatchlist;
  const [search,    setSearch]    = useState('');
  const [addSearch, setAddSearch] = useState('');
  const [sortBy,    setSortBy]    = useState('added'); // added | gain | alpha

  const watchTickers = useMemo(() => new Set(watchlist.map(w => w.stock.ticker)), [watchlist]);

  const addToWatch = onAdd
    ? (stock) => { if (!watchTickers.has(stock.ticker)) { onAdd(stock); setAddSearch(''); } }
    : (stock) => {
        if (watchTickers.has(stock.ticker)) return;
        setWatchlist(w => [...w, { stock, addedAt: new Date().toLocaleDateString('en-IN'), alert: null }]);
        setAddSearch('');
      };
  const removeFromWatch = onRemove ?? ((ticker) => setWatchlist(w => w.filter(i => i.stock.ticker !== ticker)));
  const setAlert = onSetAlert ?? ((ticker, alert) => setWatchlist(w => w.map(i => i.stock.ticker === ticker ? {...i, alert} : i)));

  // Alert hits count
  const alertHits = watchlist.filter(item => {
    if (!item.alert) return false;
    const cur = prices[item.stock.ticker]?.price || item.stock.price;
    return item.alert.type === 'above' ? cur >= item.alert.price : cur <= item.alert.price;
  }).length;

  // PERF FIX: extract only the changePct values needed for sort so the memo doesn't
  // re-run on every 15-second price tick for ALL 33 stocks — only when watched tickers change.
  const watchedChangePcts = useMemo(() => {
    const m = {};
    watchlist.forEach(w => { m[w.stock.ticker] = prices[w.stock.ticker]?.changePct || 0; });
    return m;
  }, [watchlist, prices]);

  const filtered = useMemo(() => {
    let list = [...watchlist];
    if (search) list = list.filter(i => i.stock.ticker.includes(search.toUpperCase()) || i.stock.name.toUpperCase().includes(search.toUpperCase()));
    if (sortBy === 'gain') list.sort((a,b) => (watchedChangePcts[b.stock.ticker]||0) - (watchedChangePcts[a.stock.ticker]||0));
    if (sortBy === 'alpha') list.sort((a,b) => a.stock.ticker.localeCompare(b.stock.ticker));
    return list;
  }, [watchlist, search, sortBy, watchedChangePcts]);

  const searchResults = addSearch
    ? STOCKS.filter(s => (s.ticker.includes(addSearch.toUpperCase()) || s.name.toUpperCase().includes(addSearch.toUpperCase())) && !watchTickers.has(s.ticker)).slice(0, 6)
    : [];

  return (
    <div className="watchlist-page animate-in">
      <h1 className="page-title">👁 Watchlist</h1>
      <p className="page-sub">Track stocks without buying — set price alerts and monitor live prices.</p>

      {/* Header stats */}
      <div className="stat-row" style={{ marginBottom:22 }}>
        <div className="stat-card">
          <div className="stat-label">Watching</div>
          <div className="stat-value" style={{ color:'var(--blue)' }}>{watchlist.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Alerts Set</div>
          <div className="stat-value" style={{ color:'var(--gold)' }}>{watchlist.filter(w=>w.alert).length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Alerts Hit 🔔</div>
          <div className="stat-value" style={{ color: alertHits > 0 ? 'var(--red)' : 'var(--teal)', animation: alertHits > 0 ? 'liveBadge 1s infinite' : 'none' }}>{alertHits}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Affordable Now</div>
          <div className="stat-value pos">{watchlist.filter(w => (prices[w.stock.ticker]?.price||w.stock.price) <= budget).length}</div>
        </div>
      </div>

      <div className="wl-layout">
        {/* Left: Add stocks */}
        <div className="wl-left">
          <div className="card wl-add">
            <div className="wla-title">➕ Add Stock to Watchlist</div>
            <div className="wla-search">
              <span>🔍</span>
              <input placeholder="Search by name or ticker…" value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                className="wla-input"/>
            </div>
            {searchResults.length > 0 && (
              <div className="wla-results">
                {searchResults.map(s => {
                  const live = prices[s.ticker];
                  return (
                    <button key={s.ticker} className="wla-result" onClick={() => addToWatch(s)}>
                      <div className="wlar-left">
                        <span className="wlar-ticker">{s.ticker}</span>
                        <span className="wlar-name">{s.name}</span>
                      </div>
                      <div className="wlar-right">
                        <span className="wlar-price" style={{ fontFamily:'var(--font-mono)', fontWeight:600 }}>
                          ₹{(live?.price || s.price).toFixed(2)}
                        </span>
                        <span className={`wlar-chg ${(live?.changePct||0)>=0?'pos':'neg'}`} style={{ fontSize:11, fontFamily:'var(--font-mono)' }}>
                          {(live?.changePct||0)>=0?'+':''}{(live?.changePct||0).toFixed(2)}%
                        </span>
                        <span className={`risk-badge risk-${s.risk}`} style={{ fontSize:9 }}>{s.risk}</span>
                        <span style={{ color:'var(--teal)', fontSize:12 }}>+ Add</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick add top movers */}
            <div className="wla-quick-title">📈 Top Movers Today</div>
            <div className="wla-movers">
              {STOCKS
                .filter(s => !watchTickers.has(s.ticker))
                .sort((a,b) => Math.abs(prices[b.ticker]?.changePct||0) - Math.abs(prices[a.ticker]?.changePct||0))
                .slice(0, 5)
                .map(s => {
                  const pct = prices[s.ticker]?.changePct || 0;
                  return (
                    <button key={s.ticker} className="wla-mover" onClick={() => addToWatch(s)}>
                      <span className="wlam-ticker">{s.ticker}</span>
                      <span className={`wlam-pct ${pct>=0?'pos':'neg'}`}>{pct>=0?'+':''}{pct.toFixed(2)}%</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Right: Watchlist */}
        <div className="wl-right">
          {watchlist.length > 0 ? (
            <>
              <div className="wl-toolbar">
                <div className="wl-search">
                  <span>🔍</span>
                  <input placeholder="Filter watchlist…" value={search}
                    onChange={e => setSearch(e.target.value)} className="wls-input"/>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  {['added','gain','alpha'].map(s => (
                    <button key={s} className={`chip ${sortBy===s?'active':''}`} onClick={() => setSortBy(s)} style={{ fontSize:11, padding:'4px 10px' }}>
                      {s==='added'?'Latest':s==='gain'?'Gain':'A-Z'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="wl-cards">
                {filtered.map((item, i) => (
                  <WatchCard key={item.stock.ticker} item={item} prices={prices}
                    onRemove={removeFromWatch} onSetAlert={setAlert} budget={budget}/>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state card" style={{ padding:52 }}>
              <div className="e-icon" style={{ fontSize:56 }}>👁</div>
              <h3>Nothing on your watchlist yet</h3>
              <p>Search for stocks on the left and add them to track prices.</p>
              {setPage && <button className="btn btn-primary" onClick={() => setPage('stocks')} style={{ marginTop:16 }}>Find Stocks</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
