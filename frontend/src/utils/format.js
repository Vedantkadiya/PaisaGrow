// ── Shared formatting utilities ────────────────────────────────────────────
// Single source of truth — previously duplicated in DailyTracker, TradingSignals,
// StockCompare, and TaxCalculator.

/**
 * Format a number as Indian Rupee.
 * - Values >= ₹1Cr shown as "₹X.XXCr"
 * - Values >= ₹1L shown as "₹X.XXL"
 * - All others shown with 2 decimal places: "₹1,234.50"
 * Works for negative values (passes through sign).
 */
export function fmt(n) {
  const abs = Math.abs(n);
  if (abs >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000)   return `₹${(n / 100000).toFixed(2)}L`;
  return `₹${Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Compact format for large numbers in chart labels / UI chips.
 * e.g. 150000 → "₹1.5L", 5000 → "₹5K"
 */
export function fmtK(n) {
  // FIX: handle negatives by prepending sign before ₹, not inside denomination
  // Old code: fmtK(-150000) → "₹-1.5L" | New: "-₹1.5L"
  const sign = n < 0 ? '-' : '';
  const abs  = Math.abs(n);
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(1)}Cr`;
  if (abs >= 100000)   return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  return `${sign}₹${(abs / 1000).toFixed(0)}K`;
}

/**
 * Return today's date as ISO string "YYYY-MM-DD" in LOCAL time.
 * IMPORTANT: Do NOT use new Date().toISOString() — that returns UTC,
 * which gives yesterday's date after ~6:30 PM IST (UTC+5:30).
 */
export function today() {
  const d    = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
