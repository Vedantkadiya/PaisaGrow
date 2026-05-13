import { useState, useEffect, useRef, useCallback } from 'react';

// ── NSE ticker → Yahoo Finance symbol map ─────────────────────────────────
export const YAHOO_SYMBOLS = {
  SUZLON:'SUZLON.NS', IDFCFIRSTB:'IDFCFIRSTB.NS', YESBANK:'YESBANK.NS',
  TRIDENT:'TRIDENT.NS', RPOWER:'RPOWER.NS', HFCL:'HFCL.NS', IRFC:'IRFC.NS',
  NHPC:'NHPC.NS', PNB:'PNB.NS', BANKBARODA:'BANKBARODA.NS', CANBK:'CANBK.NS',
  SAIL:'SAIL.NS', COALINDIA:'COALINDIA.NS', ONGC:'ONGC.NS', BHEL:'BHEL.NS',
  NTPC:'NTPC.NS', RECLTD:'RECLTD.NS', ADANIPOWER:'ADANIPOWER.NS',
  TATAMOTORS:'TATAMOTORS.NS', TATASTEEL:'TATASTEEL.NS', WIPRO:'WIPRO.NS',
  HCLTECH:'HCLTECH.NS', TECHM:'TECHM.NS', SBIN:'SBIN.NS', AXISBANK:'AXISBANK.NS',
  ICICIBANK:'ICICIBANK.NS', SUNPHARMA:'SUNPHARMA.NS', POWERGRID:'POWERGRID.NS',
  HINDALCO:'HINDALCO.NS', NIFTYBEES:'NIFTYBEES.NS', JUNIORBEES:'JUNIORBEES.NS',
  GOLDBEES:'GOLDBEES.NS', ICICIB22:'ICICIB22.NS',
};

// FIX HIGH: Use raw ^ symbols — do NOT pre-encode them.
// fetchYahooBatch calls encodeURIComponent() on the joined symbol string.
// If symbols are already %5E-encoded, encodeURIComponent('%5E') → '%255E' (double-encoding),
// causing Yahoo to return q.symbol = '^NSEI' while our keys are '%5ENSEI' — indices never populate.
// Using raw ^ here means encodeURIComponent('^NSEI') → '%5ENSEI' exactly once, as intended.
export const INDEX_SYMBOLS = {
  NIFTY50:   '^NSEI',
  SENSEX:    '^BSESN',
  BANKNIFTY: '^NSEBANK',
};

const PROXY = 'https://api.allorigins.win/get?url=';

// FIX: Use formatToParts to reliably extract IST hour/minute in any browser.
// new Date(toLocaleString()) is non-standard and returns Invalid Date in Safari/Firefox.
export function getMarketStatus() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    weekday: 'short', hour12: false,
  }).formatToParts(now);

  const get = (type) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);

  const weekdayStr = parts.find(p => p.type === 'weekday')?.value || '';
  const hour       = get('hour');
  const minute     = get('minute');

  // Normalize hour=24 → 0 (some implementations return 24 for midnight)
  const h = hour === 24 ? 0 : hour;
  const totalMinutes = h * 60 + minute;

  const isWeekday  = !['Sat', 'Sun'].includes(weekdayStr);
  const NSE_OPEN   = 9 * 60 + 15;   // 09:15 IST
  const NSE_CLOSE  = 15 * 60 + 30;  // 15:30 IST
  const isInHours  = totalMinutes >= NSE_OPEN && totalMinutes < NSE_CLOSE;
  const isOpen     = isWeekday && isInHours;

  let minutesUntilChange = 0;
  if (isOpen) minutesUntilChange = NSE_CLOSE - totalMinutes;
  else if (isWeekday && totalMinutes < NSE_OPEN) minutesUntilChange = NSE_OPEN - totalMinutes;

  const displayH   = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const ampm       = h < 12 ? 'AM' : 'PM';
  const timeStr    = `${String(displayH).padStart(2,'0')}:${String(minute).padStart(2,'0')} ${ampm}`;

  return { isOpen, isWeekday, totalMinutes, timeStr, minutesUntilChange };
}

// FIX: Replace AbortSignal.timeout() (unsupported in Safari < 17, Firefox < 100)
// with a manual AbortController + setTimeout that works everywhere.
function fetchWithTimeout(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

// ── Fetch a batch of Yahoo Finance symbols ────────────────────────────────
async function fetchYahooBatch(symbols) {
  const joined = symbols.join(',');
  const fields = [
    'regularMarketPrice','regularMarketChange','regularMarketChangePercent',
    'regularMarketOpen','regularMarketDayHigh','regularMarketDayLow',
    'regularMarketPreviousClose','regularMarketVolume','regularMarketTime',
    'marketState','trailingPE','marketCap',
  ].join(',');

  // FIX HIGH: encodeURIComponent(joined) correctly encodes ^ → %5E exactly once.
  // Because INDEX_SYMBOLS now uses raw ^ (not pre-encoded), this produces the right URL.
  const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(joined)}&fields=${fields}`;
  const proxyUrl = `${PROXY}${encodeURIComponent(yahooUrl)}`;

  const resp = await fetchWithTimeout(proxyUrl, 10000);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const outer  = await resp.json();
  if (!outer?.contents) return {};
  const parsed = JSON.parse(outer.contents);
  const quotes = parsed?.quoteResponse?.result || [];

  const result = {};
  for (const q of quotes) {
    // FIX HIGH: For index symbols (^NSEI etc.), Yahoo returns the symbol with ^.
    // Strip .NS for stock tickers; for indices the symbol is already clean.
    const rawSymbol = q.symbol || '';
    const ticker = rawSymbol.replace('.NS', '');
    if (!ticker) continue;

    const marketState = q.marketState || 'CLOSED';
    const isLive      = marketState === 'REGULAR';
    const rawPrice    = parseFloat((q.regularMarketPrice || 0).toFixed(2));

    // Sanity-check: reject non-finite or non-positive prices (corrupted proxy data)
    if (!isFinite(rawPrice) || rawPrice <= 0) continue;

    const price     = rawPrice;
    const prevClose = parseFloat((q.regularMarketPreviousClose || price).toFixed(2));

    result[ticker] = {
      price,
      prevClose,
      open:        parseFloat((q.regularMarketOpen    || price).toFixed(2)),
      high:        parseFloat((q.regularMarketDayHigh || price).toFixed(2)),
      low:         parseFloat((q.regularMarketDayLow  || price).toFixed(2)),
      change:      parseFloat((q.regularMarketChange  || 0).toFixed(2)),
      changePct:   parseFloat((q.regularMarketChangePercent || 0).toFixed(2)),
      volume:      q.regularMarketVolume || 0,
      pe:          q.trailingPE || null,
      marketCap:   q.marketCap  || null,
      marketState,
      isLive,
      fetchedAt:   new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true }),
    };
  }
  return result;
}

// ── Main hook ──────────────────────────────────────────────────────────────
export function useLivePrices(stocks = []) {
  const [prices,       setPrices]      = useState({});
  const [indices,      setIndices]     = useState({});
  const [status,       setStatus]      = useState('connecting');
  const [lastFetch,    setLastFetch]   = useState('');
  const [marketStatus, setMarketStatus]= useState(getMarketStatus);

  const liveTimerRef   = useRef(null);
  const marketCheckRef = useRef(null);
  const hasFetched     = useRef(false);
  // Store latest stocks in a ref so interval callbacks never use a stale closure
  const stocksRef      = useRef(stocks);
  stocksRef.current    = stocks;

  const initFromFallback = useCallback((stockList) => {
    const init = {};
    for (const s of stockList) {
      init[s.ticker] = {
        price: s.price, prevClose: s.price, open: s.price,
        high: s.price, low: s.price, change: 0, changePct: 0,
        volume: 0, pe: null, marketCap: null,
        marketState: 'CLOSED', isLive: false, fetchedAt: '—',
      };
    }
    setPrices(init);
  }, []);

  const doFetch = useCallback(async (stockList) => {
    const symbols = stockList.map(s => YAHOO_SYMBOLS[s.ticker]).filter(Boolean);
    if (!symbols.length) return;

    const batches = [];
    for (let i = 0; i < symbols.length; i += 10) batches.push(symbols.slice(i, i + 10));

    try {
      const results = await Promise.all(batches.map(fetchYahooBatch));
      const merged  = Object.assign({}, ...results);

      if (Object.keys(merged).length > 0) {
        setPrices(prev => ({ ...prev, ...merged }));
        const anyLive = Object.values(merged).some(p => p.isLive);
        setStatus(anyLive ? 'live' : 'closed');
        setLastFetch(new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:true }));
        hasFetched.current = true;
      }
    } catch (err) {
      console.warn('[PaisaGrow] Price fetch failed:', err.message);
      if (!hasFetched.current) setStatus('offline');
    }

    // Fetch indices — failure here is non-critical and doesn't affect stock prices
    try {
      const idxSyms = Object.values(INDEX_SYMBOLS);
      const idxBatches = [];
      for (let i = 0; i < idxSyms.length; i += 5) idxBatches.push(idxSyms.slice(i, i + 5));
      const idxResults = await Promise.all(idxBatches.map(fetchYahooBatch));
      const idxMerged  = Object.assign({}, ...idxResults);

      // FIX HIGH: Build REVERSE_INDEX mapping Yahoo symbol → friendly name using raw ^ keys.
      // Previously used positional Object.values()[idx] which silently shifts all indices
      // when any one symbol fails. Now uses explicit key lookup — safe and correct.
      // fetchYahooBatch strips .NS but keeps ^ so index keys are e.g. '^NSEI' which matches
      // INDEX_SYMBOLS values directly.
      const REVERSE_INDEX = Object.fromEntries(
        Object.entries(INDEX_SYMBOLS).map(([name, sym]) => [sym, name])
      );
      const mapped = {};
      Object.entries(idxMerged).forEach(([sym, val]) => {
        const name = REVERSE_INDEX[sym];
        if (name && val) mapped[name] = val;
      });
      if (Object.keys(mapped).length) setIndices(mapped);
    } catch { /* non-critical */ }
  }, []);

  const scheduleLiveRefresh = useCallback((stockList) => {
    if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    liveTimerRef.current = setInterval(() => {
      const ms = getMarketStatus();
      if (ms.isOpen) {
        doFetch(stockList);
      } else {
        // Market just closed — final fetch then stop
        doFetch(stockList);
        clearInterval(liveTimerRef.current);
        liveTimerRef.current = null;
        setStatus('closed');
      }
    }, 15000);
  }, [doFetch]);

  useEffect(() => {
    if (!stocks.length) return;
    initFromFallback(stocks);

    // Check market status every 60s; restart live fetch when market opens
    marketCheckRef.current = setInterval(() => {
      const ms = getMarketStatus();
      setMarketStatus(ms);
      if (ms.isOpen && !liveTimerRef.current) {
        doFetch(stocksRef.current);
        scheduleLiveRefresh(stocksRef.current);
      }
    }, 60000);

    const ms = getMarketStatus();
    setMarketStatus(ms);
    doFetch(stocksRef.current);
    if (ms.isOpen) scheduleLiveRefresh(stocksRef.current);

    return () => {
      clearInterval(liveTimerRef.current);
      clearInterval(marketCheckRef.current);
    };
  }, [stocks.length]); // intentional: stocksRef always reflects latest stocks

  const refresh = useCallback(() => {
    setStatus('connecting');
    doFetch(stocksRef.current);
  }, [doFetch]);

  return { prices, indices, status, marketStatus, lastFetch, refresh,
    getPrice: (ticker) => prices[ticker]?.price || null };
}
