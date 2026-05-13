// ── Precision-safe money arithmetic ────────────────────────────────────────
// JavaScript floats (IEEE 754) accumulate tiny errors in repeated add/subtract.
// e.g. 42.35 * 5 = 211.74999999999997 instead of 211.75.
// These helpers round every result to 2 decimal places (paise precision),
// preventing errors from accumulating across multiple buy/sell operations.

/** Round a money value to 2 decimal places (nearest paisa). */
export const roundMoney = (n) => Math.round(n * 100) / 100;

/** Safely subtract money: a - b, rounded to 2dp. */
export const moneySubtract = (a, b) => roundMoney(a - b);

/** Safely add money: a + b, rounded to 2dp. */
export const moneyAdd = (a, b) => roundMoney(a + b);

/** Safely multiply price × qty, rounded to 2dp. */
export const moneyCost = (price, qty) => roundMoney(price * qty);

/**
 * Max allowed budget in rupees (₹1 crore).
 * Guards against typos like "100000000000" causing Infinity in calculations.
 */
export const MAX_BUDGET = 10_000_000; // ₹1 crore

/**
 * Validate and sanitize a budget value from user input.
 * Returns the clamped, rounded value or null if invalid.
 */
export function sanitizeBudget(raw) {
  const val = parseFloat(raw);
  if (!isFinite(val) || val <= 0) return null;
  return roundMoney(Math.min(val, MAX_BUDGET));
}
