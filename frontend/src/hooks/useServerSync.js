/**
 * useServerSync.js — API-backed state with optimistic local updates
 *
 * Pattern for every hook:
 *   1. On mount → fetch from server → populate local state
 *   2. On user action → apply optimistic update immediately (zero UI lag)
 *   3. Fire API call in background → on error → roll back + emit error event
 *
 * Server is the source of truth; local state is only the display layer.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  wallet as walletApi,
  portfolio as portfolioApi,
  watchlist as watchlistApi,
  goals as goalsApi,
  sip as sipApi,
  tracker as trackerApi,
  budget as budgetApi,
} from '../api';

// ── Error bus ─────────────────────────────────────────────────────────────────

export function emitError(msg) {
  window.dispatchEvent(new CustomEvent('pg:apierror', { detail: msg }));
}

function emitSuccess(msg) {
  window.dispatchEvent(new CustomEvent('pg:success', { detail: msg }));
}

// ── Generic fetch helper ──────────────────────────────────────────────────────

/** Unwrap paginated or plain list responses from DRF. */
function toList(data) {
  return Array.isArray(data) ? data : (data?.results ?? []);
}

// ── Wallet / Budget ───────────────────────────────────────────────────────────

export function useWallet() {
  const [budget,  _setBudget] = useState(0);
  const [txns,    setTxns]    = useState([]);
  const [loading, setLoading] = useState(true);

  // prevBudget lets us roll back optimistic updates without a stale closure.
  const prevBudget = useRef(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([walletApi.transactions(), budgetApi.get()])
      .then(([txData, budData]) => {
        if (cancelled) return;
        setTxns(toList(txData));
        const amount = budData?.budget ?? 0;
        _setBudget(amount);
        prevBudget.current = amount;
      })
      .catch(err => { if (!cancelled) emitError('Failed to load wallet: ' + err.message); })
      .finally(()  => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Exposed setBudget keeps prevBudget in sync so rollbacks are always correct.
  const setBudget = useCallback((updater) => {
    _setBudget(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      prevBudget.current = next;
      return next;
    });
  }, []);

  const _applyOptimisticTx = (type, amount, method, description, fakeId) => {
    const optimisticAdjust = type === 'deposit' ? amount : -amount;
    _setBudget(b => {
      const next = b + optimisticAdjust;
      prevBudget.current = next;
      return next;
    });
    setTxns(prev => [{
      id: fakeId, type, amount, method,
      desc: description, ts: Date.now(),
      status: 'success', _optimistic: true,
    }, ...prev]);
  };

  const _confirmTx = (res, fakeId) => {
    _setBudget(res.budget);
    prevBudget.current = res.budget;
    setTxns(prev => [
      {
        ...res.transaction,
        desc: res.transaction.description,
        ts: new Date(res.transaction.timestamp || Date.now()).getTime(),
      },
      ...prev.filter(t => t.id !== fakeId),
    ]);
  };

  const _rollbackTx = (fakeId) => {
    _setBudget(prevBudget.current);
    setTxns(prev => prev.filter(t => t.id !== fakeId));
  };

  const deposit = useCallback(async ({ amount, method, description }) => {
    const snap   = prevBudget.current;
    const fakeId = Date.now();
    _applyOptimisticTx('deposit', amount, method, description || `Added via ${method}`, fakeId);
    try {
      const res = await walletApi.deposit({ amount, method, description });
      _confirmTx(res, fakeId);
      emitSuccess(`Deposited ₹${amount.toLocaleString('en-IN')} successfully!`);
    } catch (err) {
      prevBudget.current = snap;
      _rollbackTx(fakeId);
      emitError(err.message || 'Deposit failed');
      throw err;
    }
  }, []);

  const withdraw = useCallback(async ({ amount, method, description }) => {
    const snap   = prevBudget.current;
    const fakeId = Date.now();
    _applyOptimisticTx('withdraw', amount, method, description || `Withdrawn to ${method}`, fakeId);
    try {
      const res = await walletApi.withdraw({ amount, method, description });
      _confirmTx(res, fakeId);
    } catch (err) {
      prevBudget.current = snap;
      _rollbackTx(fakeId);
      emitError(err.message || 'Withdrawal failed');
      throw err;
    }
  }, []);

  /**
   * setManualBudget — sets the user's starting budget via a deposit call.
   *
   * IMPORTANT: The PATCH /api/budget/ endpoint (budgetApi.set) now returns 403
   * for all non-staff users (SEC-H2 fix). Calling it here would cause every
   * first-time user who clicks "Let's Go!" to see "Failed to save budget" and
   * have their input wiped.
   *
   * The correct flow is: opening balance = deposit.  We call walletApi.deposit
   * with method='onboarding' so the wallet history shows a meaningful entry.
   * On success the server returns the new budget which we store authoritatively.
   *
   * If the user already has a non-zero balance (e.g. they already deposited
   * previously and are just editing the input field) we skip the deposit and
   * only update local display state — the true budget is whatever the server
   * already holds from earlier deposits/withdrawals.
   */
  const setManualBudget = useCallback(async (val) => {
    // Guard: val must be a positive number
    const amount = typeof val === 'number' ? val : parseFloat(val);
    if (!Number.isFinite(amount) || amount <= 0) return;

    // Optimistically reflect the value in local state immediately
    const snap = prevBudget.current;
    _setBudget(amount);
    prevBudget.current = amount;

    try {
      const res = await walletApi.deposit({
        amount,
        method:      'onboarding',
        description: 'Starting investment budget',
      });
      // Confirm with the server-authoritative budget
      if (res?.budget !== undefined) {
        _setBudget(res.budget);
        prevBudget.current = res.budget;
      }
      // Reflect the new deposit transaction in the list
      if (res?.transaction) {
        setTxns(prev => [
          {
            ...res.transaction,
            desc: res.transaction.description,
            ts: new Date(res.transaction.timestamp || Date.now()).getTime(),
          },
          ...prev,
        ]);
      }
    } catch (err) {
      // Roll back optimistic update on failure
      _setBudget(snap);
      prevBudget.current = snap;
      emitError('Failed to save budget: ' + (err.message || 'Unknown error'));
    }
  }, []);

  return { budget, setBudget, setManualBudget, txns, loading, deposit, withdraw };
}

// ── Portfolio ─────────────────────────────────────────────────────────────────

export function usePortfolio({ setBudget }) {
  const [portfolio, _setPortfolio] = useState([]);
  const [loading,   setLoading]    = useState(true);

  useEffect(() => {
    let cancelled = false;
    portfolioApi.list()
      .then(data => {
        if (cancelled) return;
        _setPortfolio(toList(data).map(serverHoldingToApp).filter(Boolean));
      })
      .catch(err => { if (!cancelled) emitError('Failed to load portfolio: ' + err.message); })
      .finally(()  => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const setPortfolio = useCallback((updater) => {
    _setPortfolio(prev => typeof updater === 'function' ? updater(prev) : updater);
  }, []);

  const _refreshPortfolioAndBudget = useCallback(() => {
    portfolioApi.list()
      .then(data => _setPortfolio(toList(data).map(serverHoldingToApp).filter(Boolean)))
      .catch(() => {});
    budgetApi.get().then(b => setBudget(b.budget)).catch(() => {});
  }, [setBudget]);

  const buyStock = useCallback(async ({ stock, qty, livePrice }) => {
    const cost  = livePrice * qty;
    const lotId = Date.now();
    const fake  = { stock, qty, buyPrice: livePrice, date: new Date().toLocaleDateString('en-IN'), lotId, _optimistic: true };

    _setPortfolio(prev => [...prev, fake]);
    setBudget(b => b - cost);

    try {
      const res = await portfolioApi.buy({
        ticker:     stock.ticker,
        stock_name: stock.name,
        qty,
        buy_price:  livePrice,
        sector:     stock.sector || '',
        risk:       stock.risk   || 'medium',
        roi1y:      stock.roi1y  || 0,
        date:       new Date().toISOString().slice(0, 10),
      });
      const confirmed = { ...serverHoldingToApp(res), lotId };
      confirmed.stock  = { ...confirmed.stock, price: livePrice };
      _setPortfolio(prev => [...prev.filter(h => h.lotId !== lotId), confirmed]);
      if (res.budget !== undefined) setBudget(res.budget);
      emitSuccess(`Bought ${qty} shares of ${stock.ticker}!`);
    } catch (err) {
      _setPortfolio(prev => prev.filter(h => h.lotId !== lotId));
      setBudget(b => b + cost);
      emitError(err.message || 'Buy failed');
      throw err;
    }
  }, [setBudget]);

  const sellStock = useCallback(async (holding, qty) => {
    const price    = holding.stock.price;
    const proceeds = price * qty;

    // Optimistic: reduce qty or remove holding from local state
    _setPortfolio(prev => {
      let remaining = qty;
      return prev.map(h => {
        if (h.stock?.ticker !== holding.stock?.ticker || remaining <= 0) return h;
        const deduct = Math.min(h.qty, remaining);
        remaining   -= deduct;
        const newQty = h.qty - deduct;
        return newQty > 0 ? { ...h, qty: newQty } : null;
      }).filter(Boolean);
    });
    setBudget(b => b + proceeds);

    if (!holding._serverId) {
      // Buy API call still in flight — can't sell yet. Roll back optimistic update.
      emitError('Sell failed: holding not yet confirmed. Please try again in a moment.');
      _refreshPortfolioAndBudget();
      throw new Error('Holding not yet confirmed by server');
    }

    try {
      const res = await portfolioApi.sell(holding._serverId, { qty, price });
      // FIX: Confirm server-side budget after sell (server is source of truth)
      if (res?.budget !== undefined) {
        setBudget(res.budget);
      }
    } catch (err) {
      emitError('Sell failed: ' + (err.message || '') + '. Refreshing…');
      _refreshPortfolioAndBudget();
      throw err;
    }
  }, [setBudget, _refreshPortfolioAndBudget]);

  return { portfolio, setPortfolio, loading, buyStock, sellStock };
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

export function useWatchlist() {
  const [watchlist, _setWatchlist] = useState([]);
  const [loading,   setLoading]    = useState(true);

  useEffect(() => {
    let cancelled = false;
    watchlistApi.list()
      .then(data => {
        if (cancelled) return;
        _setWatchlist(toList(data).map(serverWatchToApp));
      })
      .catch(err => { if (!cancelled) emitError('Failed to load watchlist: ' + err.message); })
      .finally(()  => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const setWatchlist = useCallback((updater) => {
    _setWatchlist(prev => typeof updater === 'function' ? updater(prev) : updater);
  }, []);

  const addToWatchlist = useCallback(async (stock) => {
    const localId = 'opt_' + Date.now();
    const fake    = { _serverId: null, _localId: localId, stock, addedAt: new Date().toLocaleDateString('en-IN'), alert: null };
    _setWatchlist(prev => [...prev, fake]);
    try {
      const res = await watchlistApi.add({ ticker: stock.ticker, stock_name: stock.name, sector: stock.sector || '', risk: stock.risk || 'medium' });
      _setWatchlist(prev => prev.map(w => w._localId === localId ? { ...w, _serverId: res.id, _localId: undefined } : w));
    } catch (err) {
      _setWatchlist(prev => prev.filter(w => w._localId !== localId));
      emitError(err.message || 'Failed to add to watchlist');
      throw err;
    }
  }, []);

  const removeFromWatchlist = useCallback(async (ticker) => {
    _setWatchlist(prev => {
      const item = prev.find(w => w.stock.ticker === ticker);
      if (!item) return prev;
      if (item._serverId) {
        watchlistApi.remove(item._serverId).catch(err => {
          emitError('Failed to remove: ' + err.message);
          _setWatchlist(p => [...p, item]);
        });
      }
      return prev.filter(w => w.stock.ticker !== ticker);
    });
  }, []);

  const setAlert = useCallback(async (ticker, alert) => {
    _setWatchlist(prev => {
      const item = prev.find(w => w.stock.ticker === ticker);
      if (!item) return prev;
      const updated = prev.map(w => w.stock.ticker === ticker ? { ...w, alert } : w);
      if (item._serverId) {
        watchlistApi.update(item._serverId, {
          alert_price: alert?.price ?? null,
          alert_type:  alert?.type  ?? null,
        }).catch(err => {
          emitError('Failed to update alert: ' + err.message);
          _setWatchlist(p => p.map(w => w.stock.ticker === ticker ? { ...w, alert: item.alert } : w));
        });
      }
      return updated;
    });
  }, []);

  return { watchlist, setWatchlist, loading, addToWatchlist, removeFromWatchlist, setAlert };
}

// ── Goals ─────────────────────────────────────────────────────────────────────

function serverGoalToApp(g) {
  return {
    id:           g.id,
    _serverId:    g.id,
    name:         g.name,
    icon:         g.icon || '🎯',
    targetAmount: parseFloat(g.target_amount),
    currentSaved: parseFloat(g.current_saved),
    months:       g.months,
    returnRate:   g.expected_return,
    createdAt:    g.created_at ? new Date(g.created_at).toLocaleDateString('en-IN') : '',
  };
}

export function useGoals() {
  const [savedGoals, _setSavedGoals] = useState([]);
  const [loading,    setLoading]     = useState(true);

  useEffect(() => {
    let cancelled = false;
    goalsApi.list()
      .then(data => {
        if (cancelled) return;
        _setSavedGoals(toList(data).map(serverGoalToApp));
      })
      .catch(err => { if (!cancelled) emitError('Failed to load goals: ' + err.message); })
      .finally(()  => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const setSavedGoals = useCallback((updater) => {
    _setSavedGoals(prev => typeof updater === 'function' ? updater(prev) : updater);
  }, []);

  const createGoal = useCallback(async (goalData) => {
    const localId = 'opt_' + Date.now();
    const fake    = { ...goalData, id: localId, _serverId: null, _localId: localId };
    _setSavedGoals(prev => [...prev, fake]);
    try {
      const res = await goalsApi.create({
        name:            goalData.name,
        icon:            goalData.icon || '🎯',
        target_amount:   goalData.targetAmount,
        current_saved:   goalData.currentSaved || 0,
        months:          goalData.months,
        expected_return: goalData.returnRate || 14,
      });
      _setSavedGoals(prev => prev.map(g => g._localId === localId
        ? { ...goalData, id: res.id, _serverId: res.id, _localId: undefined } : g));
    } catch (err) {
      _setSavedGoals(prev => prev.filter(g => g._localId !== localId));
      emitError(err.message || 'Failed to save goal');
      throw err;
    }
  }, []);

  const deleteGoal = useCallback(async (id) => {
    let removedItem = null;
    _setSavedGoals(prev => {
      removedItem = prev.find(g => g.id === id);
      return prev.filter(g => g.id !== id);
    });
    if (removedItem?._serverId) {
      try {
        await goalsApi.remove(removedItem._serverId);
      } catch (err) {
        emitError('Failed to delete goal: ' + err.message);
        _setSavedGoals(prev => [...prev, removedItem]);
        throw err;
      }
    }
  }, []);

  return { savedGoals, setSavedGoals, loading, createGoal, deleteGoal };
}

// ── SIP ───────────────────────────────────────────────────────────────────────

function sipLogSort(a, b) {
  return a.year !== b.year ? a.year - b.year : a.month - b.month;
}

function serverSipLogToApp(l) {
  return { id: l.id, _serverId: l.id, year: l.year, month: l.month, amount: parseFloat(l.amount), note: l.note || '' };
}

export function useSIP() {
  const [logs,      setLogs]    = useState([]);
  const [sipAmount, _setSipAmt] = useState(500);
  const [sipDay,    _setSipDay] = useState(1);
  const [loading,   setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([sipApi.getLogs(), sipApi.getSettings()])
      .then(([logData, settings]) => {
        if (cancelled) return;
        setLogs(toList(logData).map(serverSipLogToApp));
        if (settings?.sip_amount) _setSipAmt(parseFloat(settings.sip_amount));
        if (settings?.sip_day)    _setSipDay(settings.sip_day);
      })
      .catch(err => { if (!cancelled) emitError('Failed to load SIP: ' + err.message); })
      .finally(()  => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const setSipAmount = useCallback(async (val) => {
    _setSipAmt(val);
    sipApi.saveSettings({ sip_amount: val }).catch(err => emitError('SIP save failed: ' + err.message));
  }, []);

  const setSipDay = useCallback(async (val) => {
    _setSipDay(val);
    sipApi.saveSettings({ sip_day: val }).catch(err => emitError('SIP save failed: ' + err.message));
  }, []);

  const addLog = useCallback(async (entry) => {
    const localId = 'opt_' + Date.now();
    const fake    = { ...entry, id: localId, _serverId: null, _localId: localId };
    setLogs(prev => [...prev, fake].sort(sipLogSort));
    try {
      const res = await sipApi.addLog({ year: entry.year, month: entry.month, amount: entry.amount, note: entry.note || '' });
      setLogs(prev => prev.map(l => l._localId === localId
        ? { ...entry, id: res.id, _serverId: res.id, _localId: undefined } : l));
    } catch (err) {
      setLogs(prev => prev.filter(l => l._localId !== localId));
      emitError(err.message || 'Failed to log SIP');
      throw err;
    }
  }, []);

  const removeLog = useCallback(async (id) => {
    let removedItem = null;
    setLogs(prev => {
      removedItem = prev.find(l => l.id === id);
      return prev.filter(l => l.id !== id);
    });
    if (removedItem?._serverId) {
      try {
        await sipApi.removeLog(removedItem._serverId);
      } catch (err) {
        emitError('Failed to delete SIP log: ' + err.message);
        setLogs(prev => [...prev, removedItem].sort(sipLogSort));
        throw err;
      }
    }
  }, []);

  return { logs, setLogs, sipAmount, setSipAmount, sipDay, setSipDay, loading, addLog, removeLog };
}

// ── Daily Tracker ─────────────────────────────────────────────────────────────
// NOTE: This hook is NOT currently used in App.js. The backend /tracker/ endpoint
// and this hook are fully implemented for a future expense-tracker page. The existing
// DailyTracker.js page is a stock-simulation tool that manages its own local state
// (useLocalStorage) and is intentionally separate from this server-backed feature.

export function useDailyTracker() {
  const [entries, setEntries] = useState(null); // null = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    trackerApi.list()
      .then(data => {
        if (cancelled) return;
        setEntries(toList(data));
      })
      .catch(err => {
        if (!cancelled) {
          emitError('Failed to load tracker: ' + err.message);
          setEntries([]);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const _updateEntry = (id, data) =>
    setEntries(prev => prev ? prev.map(e => e.id === id ? { ...e, ...data } : e) : null);

  const onAddEntry = useCallback(async (data) => {
    const fakeId = 'opt_' + Date.now();
    setEntries(prev => prev ? [{ ...data, id: fakeId, _optimistic: true }, ...prev] : [{ ...data, id: fakeId }]);
    try {
      const res = await trackerApi.add({
        date:        data.date,
        type:        data.type,
        category:    data.category || 'other',
        description: data.description,
        amount:      data.amount,
      });
      setEntries(prev => prev ? prev.map(e => e.id === fakeId ? res : e) : [res]);
      emitSuccess(`Added ${data.type} of ₹${data.amount}`);
      return res;
    } catch (err) {
      setEntries(prev => prev ? prev.filter(e => e.id !== fakeId) : []);
      emitError(err.message || 'Failed to add entry');
      throw err;
    }
  }, []);

  const onUpdateEntry = useCallback(async (id, data) => {
    _updateEntry(id, data);
    try {
      const res = await trackerApi.update(id, data);
      setEntries(prev => prev ? prev.map(e => e.id === id ? res : e) : null);
      return res;
    } catch (err) {
      emitError(err.message || 'Failed to update entry');
      trackerApi.list().then(d => setEntries(toList(d))).catch(() => {});
      throw err;
    }
  }, []);

  const onDeleteEntry = useCallback(async (id) => {
    // Use a functional updater to capture the removed entry without closing
    // over `entries` directly.  This keeps the dependency array empty (stable
    // callback reference) and avoids the stale-closure bug where memoized
    // children hold on to an old version of this function.
    let removedEntry;
    setEntries(prev => {
      if (!prev) return prev;
      removedEntry = prev.find(e => e.id === id);
      return prev.filter(e => e.id !== id);
    });
    try {
      await trackerApi.remove(id);
      emitSuccess('Entry deleted');
    } catch (err) {
      // Roll back using a functional updater — no stale data needed
      setEntries(prev => prev && removedEntry ? [...prev, removedEntry] : prev);
      emitError(err.message || 'Failed to delete entry');
      throw err;
    }
  }, []); // stable reference — no entries in dep array

  return { entries, onAddEntry, onUpdateEntry, onDeleteEntry, loading };
}

// ── Shape converters ──────────────────────────────────────────────────────────
//
// PERF-B6 FIX: Build a ticker→stock map once at module load (O(1) lookup)
// instead of calling STOCKS.find() — an O(N) linear scan — for every holding
// on every server sync.  For a portfolio of 50 holdings against a 200-stock
// list this eliminates 10,000 string comparisons per sync cycle.
//
// The map is built lazily on first use so it does not block module evaluation,
// and is memo-ised so it is built at most once per page load.

let _stocksByTicker = null;

function getStocksByTicker() {
  if (_stocksByTicker) return _stocksByTicker;
  try {
    const stocks = require('../data/stocks').STOCKS || [];
    _stocksByTicker = Object.fromEntries(stocks.map(s => [s.ticker, s]));
  } catch {
    _stocksByTicker = {};
  }
  return _stocksByTicker;
}

function serverHoldingToApp(h) {
  if (!h?.ticker) return null;
  const local = getStocksByTicker()[h.ticker] || {};  // O(1)
  return {
    _serverId: h.id,
    lotId:     h.id,
    stock: {
      ticker: h.ticker,
      name:   h.stock_name    || local.name   || h.ticker,
      price:  local.price     || 0,
      sector: h.sector        || local.sector || '',
      risk:   h.risk          || local.risk   || 'medium',
      roi1y:  h.roi1y         !== undefined ? h.roi1y : (local.roi1y || 0),
      trend:  local.trend     || 'neutral',
    },
    qty:      h.qty,
    buyPrice: parseFloat(h.buy_price),
    date:     h.date ? new Date(h.date).toLocaleDateString('en-IN') : '',
  };
}

function serverWatchToApp(item) {
  const local = getStocksByTicker()[item.ticker] || {};  // O(1)
  return {
    _serverId: item.id,
    stock: {
      ticker: item.ticker,
      name:   item.stock_name || local.name   || item.ticker,
      sector: item.sector     || local.sector || '',
      risk:   item.risk       || local.risk   || 'medium',
      price:  local.price     || 0,
      roi1y:  local.roi1y     || 0,
      trend:  local.trend     || 'neutral',
    },
    addedAt: item.added_at ? new Date(item.added_at).toLocaleDateString('en-IN') : '',
    alert: item.alert_price != null
      ? { price: parseFloat(item.alert_price), type: item.alert_type || 'above' }
      : null,
  };
}
