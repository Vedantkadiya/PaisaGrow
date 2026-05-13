import React, { useEffect, useRef, useState } from 'react';
import './LivePriceTag.css';

/**
 * Shows a price with:
 * - Green/red flash animation ONLY when market is open and price actually changes
 * - Static display when market is closed (last traded price, no flash)
 * - Live dot only when market is genuinely open
 */
export default function LivePriceTag({ ticker, prices, showChange = true, size = 'md' }) {
  const data     = prices[ticker];
  const prevRef  = useRef(null);
  const [flash,  setFlash] = useState('');

  const isLive = data?.isLive || false;

  // Only flash when market is OPEN and price genuinely changes.
  // FIX (CRITICAL): prevRef.current must be updated BEFORE the early return so it always
  // tracks the latest price. The old code put the update AFTER `return () => clearTimeout(t)`,
  // which exits the effect body — prevRef was permanently stuck at the first price ever seen.
  // Result of old code: every flash compared against the initial price, not the previous price;
  // and if the price ever returned to its starting value, no flash fired at all.
  useEffect(() => {
    if (!data?.price || !isLive) return; // never flash when market is closed
    const prev = prevRef.current;
    prevRef.current = data.price; // FIX: always update ref FIRST, before any early return
    if (prev !== null && prev !== data.price) {
      setFlash(data.price > prev ? 'flash-up' : 'flash-down');
      const t = setTimeout(() => setFlash(''), 600);
      return () => clearTimeout(t);
    }
  }, [data?.price, isLive]);

  if (!data?.price) {
    return (
      <span style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
        Loading…
      </span>
    );
  }

  const up = data.change >= 0;

  return (
    <span className={`lpt lpt-${size} ${flash}`}>
      <span className="lpt-price">₹{data.price.toFixed(2)}</span>

      {showChange && data.change !== 0 && (
        <span className={`lpt-change ${up ? 'pos' : 'neg'}`}>
          {up ? '▲' : '▼'} {Math.abs(data.changePct).toFixed(2)}%
        </span>
      )}

      {showChange && data.change === 0 && (
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>—</span>
      )}

      {/* Only show live dot when market is actually open */}
      {isLive && <span className="lpt-live-dot" title="Live NSE price" />}

      {/* Show "Closed" label when market is shut */}
      {!isLive && data.fetchedAt !== '—' && (
        <span className="lpt-closed-tag" title={`Last traded price · fetched ${data.fetchedAt}`}>
          PREV CLOSE
        </span>
      )}
    </span>
  );
}
