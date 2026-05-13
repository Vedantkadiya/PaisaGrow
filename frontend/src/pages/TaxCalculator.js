import React, { useState, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage'; // FIX: persist tax trades
import './TaxCalculator.css';
import { fmt } from '../utils/format'; // FIX: shared util — was duplicated across 4 pages

// ── Tax rules (India FY 2024-25) ──────────────────────────────────────────
const TAX_RULES = {
  STCG: { rate: 0.20, label: 'Short Term Capital Gain', threshold: 0,      note: 'Held < 1 year — taxed at flat 20%' },
  LTCG: { rate: 0.125,label: 'Long Term Capital Gain',  threshold: 125000, note: 'Held > 1 year — first ₹1.25L is tax-free, rest at 12.5%' },
};

const INCOME_SLABS = [
  { label: 'Up to ₹3 lakh',      limit: 300000,   rate: 0 },
  { label: '₹3L – ₹7L',          limit: 700000,   rate: 0.05 },
  { label: '₹7L – ₹10L',         limit: 1000000,  rate: 0.10 },
  { label: '₹10L – ₹12L',        limit: 1200000,  rate: 0.15 },
  { label: '₹12L – ₹15L',        limit: 1500000,  rate: 0.20 },
  { label: 'Above ₹15L',         limit: Infinity, rate: 0.30 },
];

function calcLTCG(gain) {
  if (gain <= 0) return 0;
  const taxable = Math.max(0, gain - TAX_RULES.LTCG.threshold);
  return taxable * TAX_RULES.LTCG.rate;
}
function calcSTCG(gain) {
  if (gain <= 0) return 0;
  return gain * TAX_RULES.STCG.rate;
}

// ── Slab info ──────────────────────────────────────────────────────────────
function SlabRow({ label, rate, active }) {
  return (
    <div className={`slab-row ${active ? 'slab-active' : ''}`}>
      <span className="slab-label">{label}</span>
      <span className="slab-rate" style={{ color: rate === 0 ? 'var(--teal)' : rate >= 0.25 ? 'var(--red)' : 'var(--gold)' }}>
        {(rate * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ── Trade entry row ────────────────────────────────────────────────────────
function TradeRow({ trade, onDelete, idx }) {
  const days    = trade.holdDays;
  const isLT    = days >= 365;
  const gain    = (trade.sellPrice - trade.buyPrice) * trade.qty;
  const tax     = isLT ? calcLTCG(gain) : calcSTCG(gain);
  // FIX: strict > 0 — gain===0 is break-even, show neutral not green
  const isProfit = gain > 0;
  const isLoss   = gain < 0;

  return (
    <div className={`trade-row ${isProfit ? 'tr-profit' : isLoss ? 'tr-loss' : ''} animate-in`}>
      <div className="tr-main">
        <div className="tr-left">
          <div className="tr-ticker">{trade.ticker}</div>
          <div className="tr-meta">{trade.qty} shares · {days} days held</div>
        </div>
        <div className="tr-type">
          <span className={`term-badge ${isLT ? 'tb-lt' : 'tb-st'}`}>
            {isLT ? 'LTCG' : 'STCG'}
          </span>
          <div className="tr-hold-note">{isLT ? '> 1 year ✓' : `${365 - days} days to LTCG`}</div>
        </div>
        <div className="tr-nums">
          <div className="tr-num">
            <span className="tr-num-l">Buy</span>
            <span className="tr-num-v">₹{trade.buyPrice.toFixed(2)}</span>
          </div>
          <div className="tr-num">
            <span className="tr-num-l">Sell</span>
            <span className="tr-num-v">₹{trade.sellPrice.toFixed(2)}</span>
          </div>
          <div className="tr-num">
            <span className="tr-num-l">Gain/Loss</span>
            <span className={`tr-num-v ${isProfit ? 'pos' : 'neg'}`}>{fmt(gain)}</span>
          </div>
          <div className="tr-num">
            <span className="tr-num-l">Tax owed</span>
            <span className="tr-num-v" style={{ color: tax > 0 ? 'var(--red)' : 'var(--teal)' }}>
              {tax > 0 ? fmt(tax) : '₹0 (loss)'}
            </span>
          </div>
        </div>
        <button className="tr-del" onClick={() => onDelete(idx)}>✕</button>
      </div>
      {!isLT && gain > 0 && (
        <div className="tr-tip">
          💡 Wait {365 - days} more days → switch to LTCG and save{' '}
          <strong>{fmt((gain * TAX_RULES.STCG.rate) - calcLTCG(gain))}</strong> in tax!
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function TaxCalculator({ portfolio, userId }) {
  // FIX CRITICAL: Use localStorage so tax trade entries survive page refresh/navigation
  const [trades, setTrades] = useLocalStorage('tax_trades', [], userId);
  const [ticker, setTicker]         = useState('');
  const [buyPrice, setBuyPrice]     = useState('');
  const [sellPrice, setSellPrice]   = useState('');
  const [qty, setQty]               = useState('');
  const [holdDays, setHoldDays]     = useState('');
  const [annualIncome, setAnnualIncome] = useState(0);
  const [error, setError]           = useState('');

  // Auto-populate from portfolio
  const addFromPortfolio = (holding) => {
    // FIX: Robust date parsing for Indian DD/MM/YYYY format from portfolio
    // Splitting and reversing is fragile if format changes; now uses explicit parse
    let holdDate = Date.now();
    if (holding.date) {
      const parts = holding.date.split('/');
      if (parts.length === 3) {
        // DD/MM/YYYY → construct as YYYY-MM-DD for reliable cross-browser parsing
        holdDate = new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`).getTime();
        if (isNaN(holdDate)) holdDate = Date.now();
      }
    }
    const days = Math.max(1, Math.floor((Date.now() - holdDate) / 86400000));
    setTicker(holding.stock.ticker);
    setBuyPrice(String(holding.buyPrice.toFixed(2)));
    setSellPrice(String((holding.stock?.price || 0).toFixed(2))); // FIX: optional chain guard
    setQty(String(holding.qty));
    setHoldDays(String(days));
  };

  const addTrade = () => {
    // FIX #7: Validate all fields AND guard against NaN from non-numeric input
    const bp  = parseFloat(buyPrice);
    const sp  = parseFloat(sellPrice);
    const q   = parseInt(qty, 10);
    const hd  = parseInt(holdDays, 10);
    const t   = ticker.trim().toUpperCase();

    if (!t)                    { setError('Enter a stock ticker');             return; }
    if (!isFinite(bp) || bp<=0){ setError('Buy price must be a positive number'); return; }
    if (!isFinite(sp) || sp<=0){ setError('Sell price must be a positive number'); return; }
    if (!isFinite(q)  || q<=0) { setError('Quantity must be a positive whole number'); return; }
    if (!isFinite(hd) || hd<=0){ setError('Hold days must be a positive number'); return; }

    // FIX: cap at 200 trades to prevent localStorage bloat from spam-adding
    setTrades(prev => {
      if (prev.length >= 200) {
        setError('Maximum 200 trades reached. Delete some to add more.');
        return prev;
      }
      return [...prev, { ticker: t, buyPrice: bp, sellPrice: sp, qty: q, holdDays: hd }];
    });
    setTicker(''); setBuyPrice(''); setSellPrice(''); setQty(''); setHoldDays('');
    setError('');
  };

  const deleteTrade = (idx) => setTrades(t => t.filter((_, i) => i !== idx));

  // Summary calculations
  const summary = useMemo(() => {
    let stcgGain = 0, ltcgGain = 0, stcgLoss = 0, ltcgLoss = 0;
    for (const tr of trades) {
      const gain = (tr.sellPrice - tr.buyPrice) * tr.qty;
      if (tr.holdDays >= 365) {
        if (gain >= 0) ltcgGain += gain; else ltcgLoss += Math.abs(gain);
      } else {
        if (gain >= 0) stcgGain += gain; else stcgLoss += Math.abs(gain);
      }
    }
    // Offset losses against gains (same category first)
    const netSTCG = Math.max(0, stcgGain - stcgLoss);
    const netLTCG = Math.max(0, ltcgGain - ltcgLoss);

    const stcgTax = calcSTCG(netSTCG);
    const ltcgTax = calcLTCG(netLTCG);
    const totalTax = stcgTax + ltcgTax;
    const totalGain = stcgGain + ltcgGain;
    const totalLoss = stcgLoss + ltcgLoss;
    const netGain   = totalGain - totalLoss;

    return { stcgGain, ltcgGain, stcgLoss, ltcgLoss, netSTCG, netLTCG, stcgTax, ltcgTax, totalTax, totalGain, totalLoss, netGain };
  }, [trades]); // PERF FIX: removed annualIncome dep — income only affects the slab highlight, not tax

  // PERF FIX: separate memo for activeSlab so dragging income slider doesn't
  // re-run the entire tax calculation (O(trades) loop) on every slider tick
  const activeSlab = useMemo(() => INCOME_SLABS.findIndex((s, i) => {
    const prev = i === 0 ? 0 : INCOME_SLABS[i-1].limit;
    return annualIncome > prev && annualIncome <= s.limit;
  }), [annualIncome]);

  const isFY = () => {
    const m = new Date().getMonth();
    const remaining = m < 3 ? 3 - m : 15 - m; // months until March
    return `${remaining} month${remaining !== 1 ? 's' : ''} left in FY`;
  };

  return (
    <div className="tax-calculator animate-in">
      <h1 className="page-title">🏛 Tax Calculator</h1>
      <p className="page-sub">
        Calculate STCG & LTCG tax on your stock profits — Indian tax rules (FY 2024-25). {isFY()}.
      </p>

      <div className="tax-layout">
        {/* Left: Entry + portfolio */}
        <div className="tax-left">
          {/* From portfolio */}
          {portfolio.length > 0 && (
            <div className="card tc-portfolio">
              <div className="tcp-title">⚡ Import from My Portfolio</div>
              <div className="tcp-list">
                {portfolio.map(h => (
                  <button key={h.stock.ticker} className="tcp-item" onClick={() => addFromPortfolio(h)}>
                    <span className="tcp-ticker">{h.stock.ticker}</span>
                    <span className="tcp-qty">{h.qty} shares</span>
                    <span className="tcp-action">Import →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual entry */}
          <div className="card tc-entry">
            <div className="tce-title">➕ Add a Trade</div>
            <div className="tce-grid">
              <div className="field">
                <label>Stock Ticker</label>
                <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="e.g. NHPC" />
              </div>
              <div className="field">
                <label>Quantity (shares)</label>
                {/* FIX: max=100000 matches localStorage validator cap */}
                <input type="number" min="1" max="100000" value={qty} onChange={e => setQty(e.target.value)} placeholder="10" />
              </div>
              <div className="field">
                <label>Buy Price (₹)</label>
                {/* FIX: max=1000000 matches localStorage validator cap (₹10L/share) */}
                <input type="number" min="0.01" max="1000000" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} placeholder="88.00" />
              </div>
              <div className="field">
                <label>Sell Price (₹)</label>
                {/* FIX: max and min consistent with buy price cap */}
                <input type="number" min="0.01" max="1000000" value={sellPrice} onChange={e => setSellPrice(e.target.value)} placeholder="105.00" />
              </div>
              <div className="field" style={{ gridColumn: '1/-1' }}>
                <label>Days Held</label>
                <input type="range" min="1" max="730" value={holdDays || 1}
                  onChange={e => setHoldDays(e.target.value)} />
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
                  <span className="range-val-small">{holdDays || 0} days</span>
                  <span style={{ fontSize:11, color: parseInt(holdDays) >= 365 ? 'var(--teal)' : 'var(--gold)' }}>
                    {parseInt(holdDays) >= 365 ? '✓ LTCG (> 1 year)' : `${365 - parseInt(holdDays || 0)} days to LTCG`}
                  </span>
                </div>
              </div>
            </div>
            {error && <div className="error-box" style={{ marginBottom:12 }}>{error}</div>}
            <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={addTrade}>
              + Add Trade
            </button>
          </div>

          {/* Income for slab reference */}
          <div className="card tc-income">
            <div className="tci-title">💼 Annual Income (for reference)</div>
            <div className="field">
              <label>Your Annual Income</label>
              <input type="range" min="0" max="2000000" step="50000" value={annualIncome}
                onChange={e => setAnnualIncome(Number(e.target.value))} />
              <div className="range-val" style={{ fontSize:18 }}>{fmt(annualIncome)}</div>
            </div>
            <div className="slab-list">
              {/* index key OK: INCOME_SLABS is a static constant, never reordered */}
              {INCOME_SLABS.map((s, i) => (
                <SlabRow key={i} label={s.label} rate={s.rate} active={i === activeSlab} />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Summary + trades */}
        <div className="tax-right">
          {/* Summary cards */}
          <div className="tax-summary-grid">
            <div className="card ts-card ts-gain">
              <div className="ts-label">Total Gain</div>
              <div className="ts-val pos">{fmt(summary.totalGain)}</div>
            </div>
            <div className="card ts-card ts-loss">
              <div className="ts-label">Total Loss</div>
              {/* FIX: avoid "-₹0.00" when no losses — summary.totalLoss is always >= 0 */}
              <div className="ts-val neg">{summary.totalLoss > 0 ? `-${fmt(summary.totalLoss)}` : fmt(0)}</div>
            </div>
            <div className="card ts-card ts-net">
              <div className="ts-label">Net Gain / Loss</div>
              <div className={`ts-val ${summary.netGain >= 0 ? 'pos' : 'neg'}`}>{fmt(summary.netGain)}</div>
            </div>
            <div className="card ts-card ts-tax">
              <div className="ts-label">Total Tax Payable</div>
              <div className="ts-val" style={{ color: summary.totalTax > 0 ? 'var(--red)' : 'var(--teal)' }}>
                {fmt(summary.totalTax)}
              </div>
            </div>
          </div>

          {/* Tax breakdown */}
          {trades.length > 0 && (
            <div className="card tax-breakdown">
              <div className="tb-title">📊 Tax Breakdown</div>
              <div className="tb-rows">
                <div className="tb-row">
                  <div className="tb-item">
                    <span className="tb-l">STCG Net Gain</span>
                    <span className={`tb-v ${summary.netSTCG >= 0 ? 'pos' : 'neg'}`}>{fmt(summary.netSTCG)}</span>
                  </div>
                  <div className="tb-item">
                    <span className="tb-l">STCG Tax (20%)</span>
                    <span className="tb-v" style={{ color: 'var(--red)' }}>{fmt(summary.stcgTax)}</span>
                  </div>
                </div>
                <div className="tb-divider"/>
                <div className="tb-row">
                  <div className="tb-item">
                    <span className="tb-l">LTCG Net Gain</span>
                    <span className={`tb-v ${summary.netLTCG >= 0 ? 'pos' : 'neg'}`}>{fmt(summary.netLTCG)}</span>
                  </div>
                  <div className="tb-item">
                    <span className="tb-l">LTCG Tax-free slab</span>
                    <span className="tb-v pos">₹1,25,000</span>
                  </div>
                  <div className="tb-item">
                    <span className="tb-l">LTCG Tax (12.5%)</span>
                    <span className="tb-v" style={{ color: 'var(--red)' }}>{fmt(summary.ltcgTax)}</span>
                  </div>
                </div>
                <div className="tb-total">
                  <span>Total Tax Payable</span>
                  <span style={{ color: summary.totalTax > 0 ? 'var(--red)' : 'var(--teal)', fontFamily:'var(--font-mono)', fontSize:20, fontWeight:700 }}>
                    {fmt(summary.totalTax)}
                  </span>
                </div>
              </div>

              {/* Tax-saving tip */}
              {summary.stcgTax > 0 && (
                <div className="tb-savetip">
                  💰 <strong>Tax Harvesting Tip:</strong> If you have loss-making stocks, sell them before FY end to offset your STCG gains and reduce your tax!
                </div>
              )}
              {summary.netGain > 0 && summary.netGain <= 125000 && (
                <div className="tb-savetip">
                  🎉 <strong>Great news!</strong> Your total gain of {fmt(summary.netGain)} is within the ₹1.25L LTCG exemption — hold for 1+ year and pay ₹0 tax!
                </div>
              )}
            </div>
          )}

          {/* Trade list */}
          {trades.length > 0 ? (
            <div className="trade-list">
              <div className="tl-title">Your Trades ({trades.length})</div>
              {/* FIX: stable compound key — index key caused wrong row to get delete animation */}
              {trades.map((tr, i) => <TradeRow key={`${tr.ticker}-${tr.buyPrice}-${tr.qty}-${i}`} trade={tr} onDelete={deleteTrade} idx={i} />)}
            </div>
          ) : (
            <div className="empty-state card" style={{ padding:48 }}>
              <div className="e-icon">🏛</div>
              <h3>No trades added yet</h3>
              <p>Add a trade on the left or import from your portfolio to calculate your tax.</p>
            </div>
          )}

          {/* Key rules reminder */}
          <div className="card tax-rules">
            <div className="tr-title">📋 Key Tax Rules (FY 2024-25)</div>
            <div className="tr-list">
              {[
                { icon:'⏱', title:'STCG', rule:'Sell within 1 year → 20% flat tax on profit' },
                { icon:'📅', title:'LTCG', rule:'Hold > 1 year → first ₹1.25L/year is tax-FREE, rest at 12.5%' },
                { icon:'📉', title:'Loss Offset', rule:'Capital losses can offset same-year capital gains' },
                { icon:'🔄', title:'Carry Forward', rule:'Unused losses carry forward for 8 years' },
                { icon:'📝', title:'ITR Filing', rule:'File ITR-2 if you have capital gains from equity' },
              ].map(r => (
                <div key={r.title} className="tr-item">
                  <span className="tri-icon">{r.icon}</span>
                  <div>
                    <span className="tri-title">{r.title}</span>
                    <span className="tri-rule">{r.rule}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="tax-disclaimer">
        ⚠️ This calculator is for educational purposes only. Tax laws change — consult a CA or tax advisor for accurate filing. Securities Transaction Tax (STT) and cess are not included.
      </div>
    </div>
  );
}
