/**
 * useLocalStorage.js — Persistent state with user-scoped keys
 */
import { useState, useEffect, useRef } from 'react';

const DEBOUNCE_MS = 500;

const VALIDATORS = {
  budget:    (v) => typeof v === 'number' && isFinite(v) && v >= 0 ? v : 0,
  portfolio: (v) => {
    if (!Array.isArray(v)) return [];
    return v.filter(h =>
      h && h.stock && typeof h.stock.ticker === 'string' &&
      typeof h.qty === 'number' && h.qty > 0 && isFinite(h.qty) &&
      typeof h.buyPrice === 'number' && h.buyPrice > 0 && isFinite(h.buyPrice)
    ).map(h => ({
      ...h,
      qty:      Math.min(Math.floor(h.qty), 100000),
      buyPrice: Math.min(h.buyPrice, 1000000),
    }));
  },
  tracker:   (v) => Array.isArray(v) ? v.filter(h =>
    h && h.stock && typeof h.stock.ticker === 'string' &&
    typeof h.qty === 'number' && h.qty > 0 && isFinite(h.qty) &&
    typeof h.buyPrice === 'number' && h.buyPrice > 0
  ) : [],
  sip_logs:  (v) => Array.isArray(v) ? v.filter(l =>
    l && typeof l.amount === 'number' && l.amount > 0 && isFinite(l.amount) &&
    typeof l.year === 'number' && typeof l.month === 'number'
  ) : [],
  sip_amount:(v) => typeof v === 'number' && v > 0 && isFinite(v) ? v : 500,
  sip_day:   (v) => typeof v === 'number' && v >= 1 && v <= 28 ? v : 1,
  goals:     (v) => Array.isArray(v) ? v : [],
  watchlist: (v) => Array.isArray(v) ? v.filter(w => w && w.stock && typeof w.stock.ticker === 'string') : [],
  page:      (v) => typeof v === 'string' ? v : 'home',
  tax_trades:(v) => Array.isArray(v) ? v.filter(t =>
    t && typeof t.ticker === 'string' &&
    typeof t.buyPrice === 'number' && t.buyPrice > 0 && isFinite(t.buyPrice) &&
    typeof t.sellPrice === 'number' && t.sellPrice > 0 && isFinite(t.sellPrice) &&
    typeof t.qty === 'number' && t.qty > 0 &&
    typeof t.holdDays === 'number' && t.holdDays > 0
  ) : [],
  wallet_txns: (v) => Array.isArray(v) ? v.filter(t => t && typeof t.id === 'number' && typeof t.amount === 'number' && t.amount > 0) : [],
  learn_quizzes: (v) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {},
  learn_xp: (v) => typeof v === 'number' && isFinite(v) && v >= 0 ? v : 0,
};

function validate(suffix, value) {
  const validator = VALIDATORS[suffix];
  if (!validator) return value;
  try { return validator(value); } catch { return null; }
}

export function buildKey(suffix, userId) {
  return userId ? 'pg_' + userId + '_' + suffix : 'pg_' + suffix;
}

export function useLocalStorage(suffix, initialValue, userId) {
  const key = buildKey(suffix, userId);

  const [value, setValue] = useState(function() {
    try {
      var stored = localStorage.getItem(key);
      if (stored === null) return initialValue;
      var parsed = JSON.parse(stored);
      return validate(suffix, parsed) !== null ? validate(suffix, parsed) : initialValue;
    } catch(e) {
      return initialValue;
    }
  });

  var timerRef = useRef(null);
  var valueRef = useRef(value);
  valueRef.current = value;

  var prevKeyRef = useRef(key);
  useEffect(function() {
    if (prevKeyRef.current === key) return;
    prevKeyRef.current = key;
    try {
      var stored = localStorage.getItem(key);
      if (stored === null) { setValue(initialValue); return; }
      var parsed = JSON.parse(stored);
      var validated = validate(suffix, parsed);
      setValue(validated !== null ? validated : initialValue);
    } catch(e) {
      setValue(initialValue);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(function() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(function() {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        if (e && e.name === 'QuotaExceededError') {
          console.warn('[PaisaGrow] localStorage quota exceeded for key:', key);
        }
      }
    }, DEBOUNCE_MS);
    return function() { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [key, value]);

  useEffect(function() {
    var flush = function() {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        try {
          localStorage.setItem(key, JSON.stringify(valueRef.current));
        } catch(e) {}
      }
    };
    window.addEventListener('beforeunload', flush);
    return function() { window.removeEventListener('beforeunload', flush); };
  }, [key]);

  return [value, setValue];
}

export function clearAllData(userId) {
  var prefix = userId ? 'pg_' + userId + '_' : 'pg_';
  Object.keys(localStorage)
    .filter(function(k) { return k.startsWith(prefix); })
    .forEach(function(k) { localStorage.removeItem(k); });
}
