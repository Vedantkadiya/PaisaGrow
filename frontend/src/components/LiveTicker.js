import React from 'react';
import './LiveTicker.css';

const LiveTicker = React.memo(function LiveTicker({ prices, stocks, status, lastFetch, marketStatus }) {
  const { isOpen, timeStr, minutesUntilChange } = marketStatus || {};

  const items = stocks
    .map(s => {
      const p = prices[s.ticker];
      if (!p || !p.price) return null;
      return { ticker: s.ticker, name: s.name, ...p };
    })
    .filter(Boolean);

  if (!items.length) {
    return (
      <div className="live-ticker-wrap">
        <div className={`lt-status lt-connecting`}>
          <span className="lt-dot" /> LOADING PRICES…
        </div>
      </div>
    );
  }

  const doubled = [...items, ...items];

  // Status label
  const statusLabel =
    status === 'live'       ? 'LIVE' :
    status === 'connecting' ? 'CONNECTING' :
    status === 'closed'     ? 'CLOSED' :
    status === 'offline'    ? 'OFFLINE' : 'LOADING';

  const statusClass =
    status === 'live'       ? 'lt-live' :
    status === 'connecting' ? 'lt-connecting' :
    status === 'closed'     ? 'lt-closed-status' :
    'lt-sim';

  return (
    <div className="live-ticker-wrap">
      {/* Status pill */}
      <div className={`lt-status ${statusClass}`}>
        <span className="lt-dot" />
        {statusLabel}
      </div>

      {/* Market status */}
      <div className={`lt-market ${isOpen ? 'lt-open' : 'lt-closed'}`}>
        NSE {isOpen ? 'OPEN' : 'CLOSED'}
        {!isOpen && status === 'closed' && (
          <span className="lt-closed-note"> · Last traded price</span>
        )}
      </div>

      {/* IST Clock */}
      <div className="lt-clock">{timeStr} IST</div>

      {/* Scrolling strip */}
      <div className="lt-track-outer">
        <div className="lt-track">
          {doubled.map((item, i) => {
            const up = item.change >= 0;
            // When market closed, don't show misleading change arrows
            const showChange = item.change !== 0;
            return (
              <div key={`${item.ticker}-${i}`} className={`lt-item ${item.isLive ? 'lt-item-live' : ''}`}>
                <span className="lt-ticker">{item.ticker}</span>
                <span className="lt-price">₹{item.price?.toFixed(2)}</span>
                {showChange && (
                  <span className={`lt-change ${up ? 'lt-up' : 'lt-down'}`}>
                    {up ? '▲' : '▼'}{Math.abs(item.changePct)?.toFixed(2)}%
                  </span>
                )}
                {!showChange && (
                  <span className="lt-change" style={{ color: 'var(--text3)' }}>—</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Last update time */}
      {lastFetch && (
        <div className="lt-time">
          {isOpen ? `Updated ${lastFetch}` : `Closed ${lastFetch}`}
        </div>
      )}

      {/* Offline warning */}
      {status === 'offline' && (
        <div className="lt-offline">⚠ Fallback prices</div>
      )}
    </div>
  );
});
export default LiveTicker;
