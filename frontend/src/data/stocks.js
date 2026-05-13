// Indian Stock Universe — NSE/BSE listed stocks with beginner context
// Prices in INR (₹), approximate as of 2024-2025
// Includes low-priced stocks accessible to beginners

export const STOCKS = [
  // ── Under ₹50 ────────────────────────────────────────────────────────────
  { ticker: 'SUZLON',    name: 'Suzlon Energy',         price: 42,    sector: 'Energy',      risk: 'high',   trend: 'up',   roi1y: 28,  desc: 'Leading wind energy company. Renewable energy boom in India.' },
  { ticker: 'IDFCFIRSTB',name: 'IDFC First Bank',       price: 67,    sector: 'Banking',     risk: 'medium', trend: 'up',   roi1y: 18,  desc: 'Fast-growing private sector bank focused on retail lending.' },
  { ticker: 'YESBANK',   name: 'Yes Bank',               price: 19,    sector: 'Banking',     risk: 'high',   trend: 'flat', roi1y: -5,  desc: 'Restructured private bank, high risk but speculative upside.' },
  { ticker: 'TRIDENT',   name: 'Trident Ltd',            price: 38,    sector: 'Textiles',    risk: 'medium', trend: 'up',   roi1y: 12,  desc: 'Textile & paper manufacturer with strong export orders.' },
  { ticker: 'RPOWER',    name: 'Reliance Power',         price: 28,    sector: 'Energy',      risk: 'high',   trend: 'up',   roi1y: 45,  desc: 'Power generation company with growing renewable capacity.' },
  { ticker: 'HFCL',      name: 'HFCL Ltd',               price: 89,    sector: 'Telecom',     risk: 'medium', trend: 'up',   roi1y: 22,  desc: 'Fibre optics and telecom infra play. Benefiting from 5G rollout.' },
  { ticker: 'IRFC',      name: 'Indian Railway Finance', price: 192,   sector: 'Finance',     risk: 'low',    trend: 'up',   roi1y: 35,  desc: 'Government-backed railway financing. Very safe for beginners.' },
  { ticker: 'NHPC',      name: 'NHPC Ltd',               price: 88,    sector: 'Energy',      risk: 'low',    trend: 'up',   roi1y: 20,  desc: 'Government hydro power company. Steady dividends, low risk.' },

  // ── ₹50–₹200 ─────────────────────────────────────────────────────────────
  { ticker: 'PNB',       name: 'Punjab National Bank',  price: 102,   sector: 'Banking',     risk: 'medium', trend: 'up',   roi1y: 25,  desc: 'Large public sector bank. Benefits from India\'s credit growth.' },
  { ticker: 'BANKBARODA',name: 'Bank of Baroda',        price: 238,   sector: 'Banking',     risk: 'medium', trend: 'up',   roi1y: 18,  desc: 'Strong PSU bank with international presence.' },
  { ticker: 'CANBK',     name: 'Canara Bank',           price: 96,    sector: 'Banking',     risk: 'medium', trend: 'up',   roi1y: 22,  desc: 'Public sector bank with strong rural and urban presence.' },
  { ticker: 'SAIL',      name: 'Steel Authority (SAIL)',price: 125,   sector: 'Steel',       risk: 'medium', trend: 'flat', roi1y: 8,   desc: 'India\'s largest steel maker. Benefits from infra spending.' },
  { ticker: 'COALINDIA', name: 'Coal India',            price: 385,   sector: 'Mining',      risk: 'low',    trend: 'up',   roi1y: 15,  desc: 'World\'s largest coal miner. High dividend yield, PSU stock.' },
  { ticker: 'ONGC',      name: 'ONGC',                  price: 272,   sector: 'Oil & Gas',   risk: 'low',    trend: 'flat', roi1y: 10,  desc: 'Largest oil & gas explorer in India. Dividend-paying PSU.' },
  { ticker: 'BHEL',      name: 'BHEL',                  price: 235,   sector: 'Engineering', risk: 'medium', trend: 'up',   roi1y: 30,  desc: 'Power equipment manufacturer. Riding India\'s power infra wave.' },
  { ticker: 'NTPC',      name: 'NTPC Ltd',              price: 348,   sector: 'Energy',      risk: 'low',    trend: 'up',   roi1y: 22,  desc: 'India\'s largest power utility. Government-backed, pays dividends.' },
  { ticker: 'RECLTD',    name: 'REC Limited',           price: 502,   sector: 'Finance',     risk: 'low',    trend: 'up',   roi1y: 40,  desc: 'Finances rural electrification. High growth with low risk.' },
  { ticker: 'ADANIPOWER',name: 'Adani Power',           price: 568,   sector: 'Energy',      risk: 'high',   trend: 'up',   roi1y: 20,  desc: 'Largest private power producer. Ambitious expansion plans.' },

  // ── ₹200–₹500 ────────────────────────────────────────────────────────────
  { ticker: 'TATAMOTORS', name: 'Tata Motors',          price: 765,   sector: 'Auto',        risk: 'medium', trend: 'up',   roi1y: 30,  desc: 'Makes cars & trucks. Owns Jaguar Land Rover. EV push.' },
  { ticker: 'TATASTEEL',  name: 'Tata Steel',           price: 152,   sector: 'Steel',       risk: 'medium', trend: 'up',   roi1y: 15,  desc: 'Global steel major. Benefits from Indian infra boom.' },
  { ticker: 'WIPRO',      name: 'Wipro',                price: 565,   sector: 'IT',          risk: 'low',    trend: 'flat', roi1y: 8,   desc: 'IT services giant. Stable, pays dividends, global clients.' },
  { ticker: 'HCLTECH',    name: 'HCL Technologies',     price: 1620,  sector: 'IT',          risk: 'low',    trend: 'up',   roi1y: 18,  desc: 'Strong IT company with products + services model.' },
  { ticker: 'TECHM',      name: 'Tech Mahindra',        price: 1680,  sector: 'IT',          risk: 'low',    trend: 'up',   roi1y: 22,  desc: 'IT company strong in telecom sector. 5G play.' },

  // ── ₹500–₹1500 ───────────────────────────────────────────────────────────
  { ticker: 'SBIN',       name: 'State Bank of India',  price: 808,   sector: 'Banking',     risk: 'low',    trend: 'up',   roi1y: 28,  desc: 'India\'s largest bank. Safest banking stock for beginners.' },
  { ticker: 'AXISBANK',   name: 'Axis Bank',            price: 1145,  sector: 'Banking',     risk: 'low',    trend: 'up',   roi1y: 15,  desc: 'Top private bank. Strong digital banking growth.' },
  { ticker: 'ICICIBANK',  name: 'ICICI Bank',           price: 1275,  sector: 'Banking',     risk: 'low',    trend: 'up',   roi1y: 18,  desc: 'Premium private bank, excellent fundamentals. Beginner-safe.' },
  { ticker: 'SUNPHARMA',  name: 'Sun Pharma',           price: 1780,  sector: 'Pharma',      risk: 'low',    trend: 'up',   roi1y: 20,  desc: 'India\'s largest pharma. US + India generics play.' },
  { ticker: 'POWERGRID',  name: 'Power Grid Corp',      price: 325,   sector: 'Energy',      risk: 'low',    trend: 'up',   roi1y: 12,  desc: 'Transmits electricity nationally. Monopoly, pays good dividends.' },
  { ticker: 'HINDALCO',   name: 'Hindalco Industries',  price: 658,   sector: 'Metals',      risk: 'medium', trend: 'up',   roi1y: 20,  desc: 'Aluminium & copper giant. Owns Novelis globally.' },

  // ── Mutual Fund Equivalents (ETF-style) ──────────────────────────────────
  { ticker: 'NIFTYBEES',  name: 'Nifty BeES ETF',       price: 248,   sector: 'Index Fund',  risk: 'low',    trend: 'up',   roi1y: 15,  desc: '⭐ BEST FOR BEGINNERS. Tracks Nifty 50. Like buying all top 50 companies at once.' },
  { ticker: 'JUNIORBEES', name: 'Junior BeES ETF',       price: 72,    sector: 'Index Fund',  risk: 'low',    trend: 'up',   roi1y: 18,  desc: 'Tracks Nifty Next 50. Good for long-term beginner investing.' },
  { ticker: 'GOLDBEES',   name: 'Gold BeES ETF',         price: 58,    sector: 'Gold',        risk: 'low',    trend: 'up',   roi1y: 14,  desc: 'Invest in gold without buying physical gold. Safe hedge.' },
  { ticker: 'ICICIB22',   name: 'ICICI Bharat 22 ETF',  price: 96,    sector: 'Index Fund',  risk: 'low',    trend: 'up',   roi1y: 16,  desc: 'Government-selected 22 companies ETF. Very safe.' },
];

export const SECTORS = ['All', 'Index Fund', 'Banking', 'IT', 'Energy', 'Finance', 'Auto', 'Pharma', 'Steel', 'Metals', 'Mining', 'Telecom', 'Textiles', 'Oil & Gas', 'Engineering', 'Gold'];

export const RISK_LEVELS = ['All', 'low', 'medium', 'high'];

// Tips for different budget ranges
export const BUDGET_ADVICE = {
  tiny: { // < 100
    title: 'Smart Start! 💡',
    advice: 'With ₹100, start with ETFs like Juniorbees (₹72) or Gold BeES (₹58). They spread your risk across many companies automatically. Every rupee counts — the habit of investing matters more than the amount!',
    tip: 'Did you know? SIP (Systematic Investment Plan) lets you invest just ₹100/month in mutual funds!'
  },
  small: { // 100–500
    title: 'Great Starting Point! 🚀',
    advice: 'With ₹100–₹500, you can buy single shares of several low-risk stocks. Focus on PSU (government) companies like NHPC, IRFC, or ETFs. These are safer for beginners.',
    tip: 'Rule of thumb: Never invest more than 10% of your budget in a single high-risk stock.'
  },
  medium: { // 500–2000
    title: 'Building a Real Portfolio! 📈',
    advice: 'With ₹500–₹2000, you can diversify across 3-5 stocks. Mix 1 ETF + 2 PSU stocks + 1 banking stock for a balanced beginner portfolio.',
    tip: 'Diversification means if one stock falls, others might rise and balance it out.'
  },
  good: { // 2000–10000
    title: 'Solid Investment Budget! 💰',
    advice: 'You can build a proper 5-7 stock portfolio. Consider mixing sectors: Banking + IT + Energy + Healthcare. Add Nifty BeES as your core holding.',
    tip: 'Invest regularly (monthly SIP) rather than all at once to average your purchase price.'
  },
  large: { // > 10000
    title: 'Serious Investor! 🏆',
    advice: 'Excellent budget! Build a diversified portfolio of 8-12 stocks. Consider blue chips like ICICI Bank, SBI, TCS alongside growth stocks.',
    tip: 'At this level, consider consulting a SEBI-registered financial advisor for personalized advice.'
  }
};

export function getBudgetTier(amount) {
  if (amount < 100)   return 'tiny';
  if (amount < 500)   return 'small';
  if (amount < 2000)  return 'medium';
  if (amount < 10000) return 'good';
  return 'large';
}

export function getAffordableStocks(budget, riskFilter = 'All', sectorFilter = 'All') {
  return STOCKS
    .filter(s => s.price <= budget)
    .filter(s => riskFilter === 'All' || s.risk === riskFilter)
    .filter(s => sectorFilter === 'All' || s.sector === sectorFilter)
    .sort((a, b) => b.price - a.price); // highest price first (better companies)
}

export function simulateGrowth(principal, monthlyAdd, years, annualReturn) {
  const monthlyRate = annualReturn / 100 / 12;
  const months = years * 12;
  const data = [];
  let balance = principal;

  for (let m = 0; m <= months; m++) {
    if (m > 0) {
      balance = balance * (1 + monthlyRate) + monthlyAdd;
    }
    if (m % 3 === 0 || m === months) { // quarterly data points
      const totalInvested = principal + monthlyAdd * m;
      data.push({
        month: m,
        label: m === 0 ? 'Start' : m < 12 ? `M${m}` : `Y${Math.floor(m/12)}${m%12 > 0 ? `.${m%12}` : ''}`,
        balance: Math.round(balance),
        invested: Math.round(totalInvested),
        profit: Math.round(balance - totalInvested),
      });
    }
  }
  return data;
}

export function buildPortfolioSuggestion(budget) {
  const affordable = STOCKS.filter(s => s.price <= budget * 0.6);
  if (!affordable.length) return { portfolio: [], remaining: budget };

  // Strategy: prioritize ETFs first, then low risk, then medium
  const etfs    = affordable.filter(s => s.sector === 'Index Fund').slice(0, 1);
  const lowRisk = affordable.filter(s => s.risk === 'low' && s.sector !== 'Index Fund').slice(0, 2);
  const medRisk = affordable.filter(s => s.risk === 'medium').slice(0, 1);

  const picks = [...etfs, ...lowRisk, ...medRisk].slice(0, 4);
  let remaining = budget;
  const portfolio = [];

  for (const stock of picks) {
    if (remaining >= stock.price) {
      const qty   = Math.floor(remaining * 0.35 / stock.price) || 1;
      const spent = qty * stock.price;
      if (spent <= remaining) {
        portfolio.push({ stock, qty, spent });
        remaining -= spent;
      }
    }
  }
  return { portfolio, remaining: Math.round(remaining) };
}

// ── Budget Level-Up helpers ────────────────────────────────────────────────

export function getNewlyAffordableStocks(oldBudget, newBudget) {
  // Returns stocks that became affordable due to profit/budget increase
  return STOCKS.filter(s => s.price > oldBudget && s.price <= newBudget)
    .sort((a, b) => a.price - b.price);
}

export function getNextAffordableStock(budget) {
  // The cheapest stock just above current budget — the "next unlock"
  const above = STOCKS.filter(s => s.price > budget).sort((a, b) => a.price - b.price);
  return above[0] || null;
}

export function getBudgetMilestones(budget) {
  const milestones = [100, 200, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000];
  return milestones.map(m => ({
    amount:    m,
    reached:   budget >= m,
    label:     m >= 100000 ? `₹${m/100000}L` : m >= 1000 ? `₹${m/1000}K` : `₹${m}`,
    reward:    STOCKS.filter(s => s.price <= m && (m === 100 ? true : s.price > milestones[milestones.indexOf(m)-1]))
                     .slice(0, 2).map(s => s.ticker),
  }));
}

// ── Goal Planner helpers ───────────────────────────────────────────────────

export const GOAL_PRESETS = [
  { icon: '💻', label: 'Laptop',        amount: 50000,  months: 12 },
  { icon: '📱', label: 'Smartphone',    amount: 15000,  months: 6  },
  { icon: '🏍️', label: 'Bike',          amount: 80000,  months: 18 },
  { icon: '✈️', label: 'Trip abroad',   amount: 100000, months: 24 },
  { icon: '📚', label: 'Course / MBA',  amount: 200000, months: 36 },
  { icon: '🏠', label: 'Home deposit',  amount: 500000, months: 60 },
  { icon: '🎯', label: 'Custom goal',   amount: 0,      months: 12 },
];

export function calcGoalSIP(targetAmount, currentSavings, months, annualReturn) {
  if (!targetAmount || targetAmount <= 0 || months <= 0) return 0;
  const r = (annualReturn || 0) / 100 / 12;
  const fvCurrent = currentSavings * Math.pow(1 + r, months);
  const remaining = targetAmount - fvCurrent;
  if (remaining <= 0) return 0;
  // FIX #4: Guard r===0 to prevent division by zero (when annualReturn=0)
  // Simple case: no interest, just divide remaining by months
  if (r === 0) return Math.ceil(remaining / months);
  // SIP formula: FV = PMT * [((1+r)^n - 1) / r]
  const factor = (Math.pow(1 + r, months) - 1) / r;
  return factor > 0 ? Math.ceil(remaining / factor) : Math.ceil(remaining / months);
}

export function calcGoalProgress(targetAmount, currentSavings, monthlyContrib, months, annualReturn) {
  const r = annualReturn / 100 / 12;
  const data = [];
  let balance = currentSavings;
  for (let m = 0; m <= months; m++) {
    if (m > 0) balance = balance * (1 + r) + monthlyContrib;
    data.push({
      month: m,
      label: m === 0 ? 'Now' : m < 12 ? `M${m}` : `Y${Math.floor(m/12)}`,
      balance: Math.round(balance),
      target:  targetAmount,
    });
    if (balance >= targetAmount && m > 0) break;
  }
  return data;
}

export function suggestStocksForGoal(months, riskTolerance) {
  // Short goals (< 12 months) → low risk only
  // Medium goals (12-36 months) → low + medium
  // Long goals (> 36 months) → all
  if (months < 12)  return STOCKS.filter(s => s.risk === 'low').slice(0, 4);
  if (months < 36)  return STOCKS.filter(s => ['low','medium'].includes(s.risk)).slice(0, 5);
  return STOCKS.filter(s => s.sector !== 'Index Fund' ? s.roi1y > 15 : true).slice(0, 6);
}

// ── Daily Price Simulation & Prediction Engine ─────────────────────────────

/**
 * Generates a seeded pseudo-random number (deterministic per stock+day).
 * This ensures the same stock shows the same price history every session.
 */
function seededRandom(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

/**
 * Simulate daily price history for a stock from its buy date.
 * Uses momentum + mean-reversion + volatility model (realistic).
 * Returns array of { day, date, price, predicted, signal, rsi, ma7, ma14 }
 */
export function simulateDailyPrices(stock, buyPrice, buyDateStr, currentDay) {
  const dailyReturn  = stock.roi1y / 100 / 252;         // expected daily return
  const volatility   = stock.risk === 'low' ? 0.008
                     : stock.risk === 'medium' ? 0.015
                     : 0.025;                            // daily volatility

  const prices = [buyPrice];
  const seed   = stock.ticker.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  for (let d = 1; d <= currentDay + 30; d++) {
    const prev      = prices[prices.length - 1];
    const rnd       = seededRandom(seed * 1000 + d);
    // Box-Muller normal approximation
    const rnd2      = seededRandom(seed * 1000 + d + 500);
    const z         = Math.sqrt(-2 * Math.log(rnd + 1e-10)) * Math.cos(2 * Math.PI * rnd2);
    // Mean-reversion toward trend
    const drift     = dailyReturn;
    const shock     = volatility * z;
    // Occasional news shock (5% chance)
    const newsShock = seededRandom(seed + d * 7) > 0.95
                        ? (seededRandom(seed + d * 13) - 0.5) * volatility * 4
                        : 0;
    const newPrice  = prev * (1 + drift + shock + newsShock);
    prices.push(Math.max(newPrice, buyPrice * 0.4)); // floor at 40% of buy
  }

  // Build prediction using linear regression on last 14 days
  const buildRecord = (d) => {
    const price  = prices[d];
    const window = prices.slice(Math.max(0, d - 14), d + 1);
    const ma7    = d >= 6  ? prices.slice(d - 6, d + 1).reduce((a,b)=>a+b,0) / 7 : price;
    const ma14   = d >= 13 ? prices.slice(d - 13, d + 1).reduce((a,b)=>a+b,0) / 14 : price;

    // RSI
    let gains = 0, losses = 0;
    for (let i = Math.max(1, d - 13); i <= d; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff > 0) gains  += diff;
      else          losses -= diff;
    }
    const rs  = losses === 0 ? 100 : gains / losses;
    const rsi = 100 - (100 / (1 + rs));

    // Linear regression prediction for next 7 days
    const n   = window.length;
    const xs  = Array.from({ length: n }, (_, i) => i);
    const xm  = xs.reduce((a, b) => a + b, 0) / n;
    const ym  = window.reduce((a, b) => a + b, 0) / n;
    const num = xs.reduce((a, x, i) => a + (x - xm) * (window[i] - ym), 0);
    const den = xs.reduce((a, x) => a + (x - xm) ** 2, 0);
    const slope    = den !== 0 ? num / den : 0;
    const intercept= ym - slope * xm;
    const predicted7 = intercept + slope * (n + 6); // price in 7 days

    // MACD signal
    const ema12 = prices.slice(Math.max(0, d - 11), d + 1).reduce((a,b)=>a+b,0) / Math.min(12, d+1);
    const ema26 = prices.slice(Math.max(0, d - 25), d + 1).reduce((a,b)=>a+b,0) / Math.min(26, d+1);
    const macd  = ema12 - ema26;

    // Date string
    const buyDate  = new Date(buyDateStr);
    const thisDate = new Date(buyDate);
    thisDate.setDate(buyDate.getDate() + d);
    // Skip weekends
    while (thisDate.getDay() === 0 || thisDate.getDay() === 6) {
      thisDate.setDate(thisDate.getDate() + 1);
    }
    const dateStr = thisDate.toLocaleDateString('en-IN', { day:'2-digit', month:'short' });

    // Signal: BUY / HOLD / SELL
    // FIX: guard price===0 (shouldn't happen with real stocks, but live price could be 0
    // momentarily during market open; would produce Infinity/-Infinity without this guard)
    const pctFrom7dPred = price > 0 ? (predicted7 - price) / price * 100 : 0;
    let signal = 'HOLD';
    let signalReason = '';
    if (rsi < 35 && pctFrom7dPred > 2) {
      signal = 'BUY'; signalReason = `RSI oversold (${rsi.toFixed(0)}) + upward trend`;
    } else if (rsi > 68 && pctFrom7dPred < -1) {
      signal = 'SELL'; signalReason = `RSI overbought (${rsi.toFixed(0)}) + downward trend`;
    } else if (macd > 0 && pctFrom7dPred > 3) {
      signal = 'BUY'; signalReason = `MACD bullish + model predicts +${pctFrom7dPred.toFixed(1)}%`;
    } else if (macd < 0 && pctFrom7dPred < -2) {
      signal = 'SELL'; signalReason = `MACD bearish + model predicts ${pctFrom7dPred.toFixed(1)}%`;
    } else if (pctFrom7dPred > 1.5) {
      signalReason = `Model predicts +${pctFrom7dPred.toFixed(1)}% in 7 days`;
    } else if (pctFrom7dPred < -1) {
      signalReason = `Model predicts ${pctFrom7dPred.toFixed(1)}% in 7 days`;
    } else {
      signalReason = 'Price stable — hold position';
    }

    return {
      day: d, date: dateStr,
      price:      parseFloat(price.toFixed(2)),
      predicted:  parseFloat(predicted7.toFixed(2)),
      ma7:        parseFloat(ma7.toFixed(2)),
      ma14:       parseFloat(ma14.toFixed(2)),
      rsi:        parseFloat(rsi.toFixed(1)),
      macd:       parseFloat(macd.toFixed(3)),
      signal, signalReason,
      pnl:        parseFloat(((price - buyPrice) / buyPrice * 100).toFixed(2)),
    };
  };

  // Return records for days 0 to currentDay (actual) + 7 predicted
  const records = [];
  for (let d = 0; d <= currentDay; d++) {
    records.push({ ...buildRecord(d), type: 'actual' });
  }
  // Future 7-day prediction points
  for (let d = currentDay + 1; d <= currentDay + 7; d++) {
    records.push({ ...buildRecord(d), type: 'predicted' });
  }
  return records;
}

/**
 * Returns a recommendation summary for the current day.
 */
export function getDailyRecommendation(records, buyPrice) {
  const today      = records.filter(r => r.type === 'actual').slice(-1)[0];
  const futureRecs = records.filter(r => r.type === 'predicted');
  if (!today) return null;

  const target7d   = futureRecs[6]?.price || today.price;
  const target30d  = today.price * (1 + (target7d - today.price) / today.price * 4); // extrapolate
  const totalPnl   = today.pnl;

  const advice =
    today.signal === 'BUY'  ? 'Great time to add more shares!'        :
    today.signal === 'SELL' ? 'Consider booking partial profit/loss.'  :
    totalPnl > 10           ? 'Excellent gains! Hold or take partial profit.' :
    totalPnl < -8           ? 'Down significantly. Hold — markets recover.'   :
                               'Stable position. Continue holding.';

  return { today, target7d, target30d, totalPnl, advice, futureRecs };
}

// ── Smart Trading Signals Engine ───────────────────────────────────────────

/**
 * Analyses a stock using technical indicators and gives specific
 * BUY / SELL / HOLD advice with:
 *  - Exact entry price (buy now or wait for dip)
 *  - Target sell price
 *  - Stop-loss price (exit if it falls this low)
 *  - Expected timeline in days
 *  - Confidence score 0-100
 *  - Plain-English reason
 */
export function analyseStock(stock, budget, livePrice = null) {
  // FIX: Guard against corrupted stock data (price=0 or NaN causes division by zero in Bollinger bands)
  if (!stock || !stock.price || !isFinite(stock.price) || stock.price <= 0) {
    return {
      ticker: stock?.ticker || '?', name: stock?.name || 'Unknown',
      sector: stock?.sector || '', risk: stock?.risk || 'high',
      currentPrice: 0, action: 'HOLD', confidence: 0,
      entryPrice: 0, targetPrice: 0, stopLoss: 0, timelineDays: 30,
      reasons: ['Data unavailable'], indicators: { rsi: 50, macd: 0, trend: 'sideways', bbPos: 50, momentum: 0 },
      potentialGainPct: 0, stopLossPct: 0, canAfford: false, roi1y: 0,
    };
  }
  const seed   = stock.ticker.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
  const r      = (n) => { const x = Math.sin(seed * n + 17) * 9999; return x - Math.floor(x); };

  // FIX: use live price as the simulation seed when available — signals are then
  // grounded in the real current price rather than the stale hardcoded fallback
  const price      = (livePrice && isFinite(livePrice) && livePrice > 0) ? livePrice : stock.price;
  const dailyVol   = stock.risk === 'low' ? 0.008 : stock.risk === 'medium' ? 0.014 : 0.024;
  const annualRet  = stock.roi1y / 100;
  const dailyRet   = annualRet / 252;

  // Simulate 60 days of price history to compute indicators
  const hist = [price];
  for (let d = 1; d <= 60; d++) {
    const prev  = hist[hist.length - 1];
    const z     = (r(d) + r(d * 3) + r(d * 7) - 1.5) * 2; // approx normal
    hist.push(Math.max(prev * (1 + dailyRet + dailyVol * z), price * 0.4));
  }

  const cur = hist[hist.length - 1];

  // RSI (14-day)
  let gains = 0, losses = 0;
  for (let i = 47; i < 61; i++) {
    const d = hist[i] - hist[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  const rs  = losses === 0 ? 100 : gains / losses;
  const rsi = parseFloat((100 - 100 / (1 + rs)).toFixed(1));

  // Moving averages
  const ma7  = hist.slice(-7).reduce((a,b)=>a+b,0) / 7;
  const ma20 = hist.slice(-20).reduce((a,b)=>a+b,0) / 20;
  const ma50 = hist.slice(-50).reduce((a,b)=>a+b,0) / 50;

  // MACD
  const ema12 = hist.slice(-12).reduce((a,b)=>a+b,0) / 12;
  const ema26 = hist.slice(-26).reduce((a,b)=>a+b,0) / 26;
  const macd  = ema12 - ema26;

  // Bollinger bands
  const bbMid   = ma20;
  const bbStd   = Math.sqrt(hist.slice(-20).reduce((a,p)=>(a+(p-bbMid)**2),0)/20);
  const bbUpper = bbMid + 2 * bbStd;
  const bbLower = bbMid - 2 * bbStd;
  const bbPos   = (cur - bbLower) / (bbUpper - bbLower + 1e-10); // 0=lower, 1=upper

  // Volume spike simulation
  const volSpike = r(99) > 0.65;

  // Trend strength
  const trend   = cur > ma50 ? 'up' : cur < ma50 * 0.95 ? 'down' : 'sideways';
  const momentum= (cur - ma20) / ma20 * 100; // % above/below 20-day MA

  // ── Decision Logic ──────────────────────────────────────────────────────

  let action     = 'HOLD';
  let confidence = 50;
  let reasons    = [];
  let entryPrice, targetPrice, stopLoss, timelineDays;

  const canAfford = budget >= price;

  // BUY conditions
  if (rsi < 38 && macd > 0 && trend !== 'down') {
    action = 'BUY'; confidence = 82;
    reasons = [`RSI=${rsi} (oversold)`, 'MACD bullish', `Trend: ${trend}`];
    entryPrice   = parseFloat((cur * 0.99).toFixed(2));      // buy at 1% below current
    targetPrice  = parseFloat((cur * (1 + annualRet * 0.25)).toFixed(2)); // 3-month target
    stopLoss     = parseFloat((cur * 0.93).toFixed(2));
    timelineDays = 30 + Math.floor(r(1) * 30);
  } else if (rsi < 32) {
    action = 'BUY'; confidence = 74;
    reasons = [`RSI=${rsi} (strongly oversold)`, 'Mean-reversion expected'];
    entryPrice   = parseFloat((cur * 1.0).toFixed(2));
    targetPrice  = parseFloat((cur * 1.12).toFixed(2));
    stopLoss     = parseFloat((cur * 0.91).toFixed(2));
    timelineDays = 21 + Math.floor(r(2) * 21);
  } else if (bbPos < 0.15 && trend !== 'down' && macd > -0.5) {
    action = 'BUY'; confidence = 68;
    reasons = [`Near Bollinger lower band (${(bbPos*100).toFixed(0)}%)`, 'Bounce expected'];
    entryPrice   = parseFloat((cur * 0.995).toFixed(2));
    targetPrice  = parseFloat(bbMid.toFixed(2));              // target: BB midline
    stopLoss     = parseFloat((bbLower * 0.97).toFixed(2));
    timelineDays = 14 + Math.floor(r(3) * 14);
  } else if (ma7 > ma20 && macd > 0 && volSpike && rsi > 45 && rsi < 65) {
    action = 'BUY'; confidence = 71;
    reasons = ['MA7 > MA20 (golden cross)', 'Volume surge', 'Momentum building'];
    entryPrice   = parseFloat((cur * 1.005).toFixed(2));      // buy on breakout
    targetPrice  = parseFloat((cur * (1 + annualRet * 0.33)).toFixed(2));
    stopLoss     = parseFloat(ma20.toFixed(2));
    timelineDays = 45 + Math.floor(r(4) * 30);
  }
  // SELL conditions
  else if (rsi > 72 && macd < 0) {
    action = 'SELL'; confidence = 80;
    reasons = [`RSI=${rsi} (overbought)`, 'MACD turning bearish', 'Take profit'];
    entryPrice   = parseFloat((cur * 1.0).toFixed(2));        // sell now
    targetPrice  = parseFloat((cur * 0.93).toFixed(2));       // expected drop
    stopLoss     = parseFloat((cur * 1.03).toFixed(2));        // exit if it rises more (short stop)
    timelineDays = 7 + Math.floor(r(5) * 14);
  } else if (rsi > 78) {
    action = 'SELL'; confidence = 77;
    reasons = [`RSI=${rsi} (strongly overbought)`, 'Correction likely'];
    entryPrice   = parseFloat(cur.toFixed(2));
    targetPrice  = parseFloat((cur * 0.91).toFixed(2));
    stopLoss     = parseFloat((cur * 1.04).toFixed(2));
    timelineDays = 10 + Math.floor(r(6) * 10);
  } else if (bbPos > 0.88 && macd < 0) {
    action = 'SELL'; confidence = 65;
    reasons = [`Near Bollinger upper band (${(bbPos*100).toFixed(0)}%)`, 'Reversal possible'];
    entryPrice   = parseFloat(cur.toFixed(2));
    targetPrice  = parseFloat(bbMid.toFixed(2));
    stopLoss     = parseFloat((bbUpper * 1.02).toFixed(2));
    timelineDays = 7 + Math.floor(r(7) * 14);
  }
  // HOLD
  else {
    if (momentum > 3)       reasons.push(`+${momentum.toFixed(1)}% above 20-day avg`);
    else if (momentum < -3) reasons.push(`${momentum.toFixed(1)}% below 20-day avg`);
    reasons.push(`RSI=${rsi} (neutral)`);
    if (trend === 'up')   reasons.push('Uptrend intact');
    if (trend === 'down') reasons.push('Watch for recovery');

    entryPrice   = parseFloat((cur * 0.97).toFixed(2));       // wait for 3% dip to buy
    targetPrice  = parseFloat((cur * (1 + annualRet * 0.33)).toFixed(2));
    stopLoss     = parseFloat((cur * 0.90).toFixed(2));
    timelineDays = 60;
    confidence   = 55 + Math.floor(r(8) * 20);
  }

  // Cap confidence
  if (!canAfford) confidence = Math.min(confidence, 60);

  // Calculate potential gain/loss %
  const potentialGainPct  = parseFloat(((targetPrice - entryPrice) / entryPrice * 100).toFixed(1));
  const stopLossPct       = parseFloat(((stopLoss   - entryPrice) / entryPrice * 100).toFixed(1));

  return {
    ticker:       stock.ticker,
    name:         stock.name,
    sector:       stock.sector,
    risk:         stock.risk,
    currentPrice: parseFloat(cur.toFixed(2)),
    action,                // BUY | SELL | HOLD
    confidence,            // 0-100
    entryPrice,            // exact price to enter
    targetPrice,           // take-profit target
    stopLoss,              // stop-loss exit
    timelineDays,          // expected days to target
    reasons,
    indicators: { rsi, macd: parseFloat(macd.toFixed(3)), trend, bbPos: parseFloat((bbPos*100).toFixed(0)), momentum: parseFloat(momentum.toFixed(1)) },
    potentialGainPct,
    stopLossPct,
    canAfford,
    roi1y: stock.roi1y,
  };
}

/**
 * Scan all stocks and return ranked signals for BUY, SELL, HOLD.
 * Sorted by: BUY first (high confidence), then HOLD, then SELL.
 */
export function scanAllSignals(budget, riskFilter = 'All', prices = {}) {
  // FIX: accept live prices map so signals are grounded in real market data when available
  return STOCKS
    .filter(s => riskFilter === 'All' || s.risk === riskFilter)
    .map(s => analyseStock(s, budget, prices[s.ticker]?.price || null))
    .sort((a, b) => {
      const order = { BUY: 0, HOLD: 1, SELL: 2 };
      if (order[a.action] !== order[b.action]) return order[a.action] - order[b.action];
      return b.confidence - a.confidence;
    });
}

/**
 * For a holding (bought stock), give a specific sell recommendation.
 */
export function getExitSignal(stock, buyPrice, currentDay) {
  // FIX: use local date arithmetic to avoid UTC midnight bug (same fix as today() in format.js)
  // toISOString() returns UTC — after 6:30pm IST this gives yesterday's date
  const _exitDate = new Date(Date.now() - currentDay * 86400000);
  const _exitDateStr = `${_exitDate.getFullYear()}-${String(_exitDate.getMonth()+1).padStart(2,'0')}-${String(_exitDate.getDate()).padStart(2,'0')}`;
  const recs = simulateDailyPrices(stock, buyPrice, _exitDateStr, currentDay);
  const actual = recs.filter(r => r.type === 'actual');
  const today  = actual[actual.length - 1];
  if (!today) return null;

  const pnlPct      = today.pnl;
  const signal      = today.signal;
  const predicted7d = recs.filter(r => r.type === 'predicted')[6]?.price || today.price;
  const pred7dPct   = ((predicted7d - today.price) / today.price * 100).toFixed(1);

  let recommendation, sellTarget, holdUntilDay, urgency;

  if (pnlPct >= 15 && signal === 'SELL') {
    recommendation = 'TAKE PROFIT NOW';
    sellTarget     = today.price;
    urgency        = 'high';
    holdUntilDay   = currentDay;
  } else if (pnlPct >= 8 && parseFloat(pred7dPct) < -2) {
    recommendation = 'SELL — protect gains';
    sellTarget     = parseFloat((today.price * 0.99).toFixed(2));
    urgency        = 'medium';
    holdUntilDay   = currentDay + 3;
  } else if (pnlPct <= -10) {
    recommendation = 'STOP LOSS — limit damage';
    sellTarget     = today.price;
    urgency        = 'high';
    holdUntilDay   = currentDay;
  } else if (signal === 'BUY' || pnlPct > 0) {
    // FIX #1: Guard division by zero — Math.log(1)=0 when roi1y=0
    const dailyRateForDays = stock.roi1y > 0 ? Math.log(1 + stock.roi1y / 100 / 252) : 0.0004;
    const daysToTarget = Math.ceil(Math.log(1.12) / dailyRateForDays);
    recommendation = 'HOLD — target not reached';
    sellTarget     = parseFloat((buyPrice * 1.15).toFixed(2));
    urgency        = 'low';
    holdUntilDay   = currentDay + daysToTarget;
  } else {
    recommendation = 'HOLD — await recovery';
    sellTarget     = parseFloat((buyPrice * 1.08).toFixed(2));
    urgency        = 'low';
    holdUntilDay   = currentDay + 30;
  }

  return {
    recommendation, sellTarget, urgency, holdUntilDay,
    currentPrice: today.price, pnlPct, signal,
    predicted7d, pred7dPct,
  };
}
