import React, { useState, useMemo } from 'react';
import './Wallet.css';

const UPI_APPS = [
  { id: 'gpay',    name: 'Google Pay',  icon: '🔵', color: '#4285f4' },
  { id: 'phonepe', name: 'PhonePe',     icon: '🟣', color: '#5f259f' },
  { id: 'paytm',   name: 'Paytm',       icon: '🔷', color: '#00b9f1' },
  { id: 'bhim',    name: 'BHIM UPI',    icon: '🇮🇳', color: '#ff6600' },
  { id: 'amazon',  name: 'Amazon Pay',  icon: '🛒', color: '#ff9900' },
];

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];

const BANKS = [
  { id: 'sbi',   name: 'State Bank of India', last4: '4521', icon: '🏦' },
  { id: 'hdfc',  name: 'HDFC Bank',            last4: '7832', icon: '🏛' },
  { id: 'icici', name: 'ICICI Bank',           last4: '3190', icon: '🏗' },
];

function formatINR(n) {
  return '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function timeAgo(ts) {
  const diff = Date.now() - (typeof ts === 'string' ? new Date(ts).getTime() : ts);
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24)  return `${hrs}h ago`;
  return `${days}d ago`;
}

// ─── DEPOSIT MODAL ──────────────────────────────────────────────────────────
function DepositModal({ budget, onDeposit, onClose }) {
  const [step,     setStep]     = useState('amount');
  const [amount,   setAmount]   = useState('');
  const [method,   setMethod]   = useState(null);
  const [pin,      setPin]      = useState('');
  const [pinError, setPinError] = useState('');
  const [apiError, setApiError] = useState('');

  const amt = parseFloat(amount) || 0;

  const handlePinSubmit = async () => {
    if (pin.length < 4) { setPinError('Enter 4-digit UPI PIN'); return; }
    setPinError('');
    setStep('processing');
    try {
      await onDeposit({ amount: amt, method: method?.name || 'UPI', description: `Added via ${method?.name || 'UPI'}` });
      setStep('success');
    } catch (err) {
      setApiError(err.message || 'Payment failed. Please try again.');
      setStep('error');
    }
  };

  return (
    <div className="wallet-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wallet-modal animate-in">
        <div className="wm-header">
          <span>💰 Add Money</span>
          <button className="wm-close" onClick={onClose}>✕</button>
        </div>

        {step === 'amount' && (
          <div className="wm-body">
            <div className="wm-label">Enter Amount</div>
            <div className="wm-amount-input-wrap">
              <span className="wm-rupee">₹</span>
              <input className="wm-amount-input" type="number" min="100" value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="0" autoFocus />
            </div>
            {amt > 0 && amt < 100 && <div className="wm-error">Minimum deposit is ₹100</div>}
            <div className="wm-quick-label">Quick Add</div>
            <div className="wm-quick-grid">
              {QUICK_AMOUNTS.map(q => (
                <button key={q} className={`wm-quick-btn ${amt === q ? 'active' : ''}`} onClick={() => setAmount(String(q))}>
                  {formatINR(q)}
                </button>
              ))}
            </div>
            <button className="btn btn-primary wm-cta" disabled={amt < 100} onClick={() => setStep('method')}>Continue →</button>
          </div>
        )}

        {step === 'method' && (
          <div className="wm-body">
            <div className="wm-summary-row"><span>Adding</span><span className="wm-big">{formatINR(amt)}</span></div>
            <div className="wm-label">Choose Payment Method</div>
            <div className="wm-methods">
              {UPI_APPS.map(app => (
                <button key={app.id} className={`wm-method-btn ${method?.id === app.id ? 'active' : ''}`} onClick={() => setMethod(app)}>
                  <span className="wm-method-icon">{app.icon}</span>
                  <span>{app.name}</span>
                  {method?.id === app.id && <span className="wm-method-check">✓</span>}
                </button>
              ))}
            </div>
            <div className="wm-label" style={{marginTop:16}}>Linked Bank Account</div>
            {BANKS.map(bank => (
              <div key={bank.id} className="wm-bank-row">
                <span>{bank.icon} {bank.name}</span>
                <span style={{color:'var(--text3)',fontSize:12}}>••••{bank.last4}</span>
              </div>
            ))}
            <div style={{display:'flex',gap:10,marginTop:18}}>
              <button className="btn btn-secondary" onClick={() => setStep('amount')}>← Back</button>
              <button className="btn btn-primary wm-cta" disabled={!method} onClick={() => setStep('pin')}>Pay {formatINR(amt)}</button>
            </div>
          </div>
        )}

        {step === 'pin' && (
          <div className="wm-body">
            <div className="wm-summary-row"><span>Paying via</span><span>{method.icon} {method.name}</span></div>
            <div className="wm-pin-icon">🔐</div>
            <div className="wm-label" style={{textAlign:'center'}}>Enter UPI PIN</div>
            <div className="wm-pin-wrap">
              <input className="wm-pin-input" type="password" maxLength={6} value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" autoFocus />
            </div>
            {pinError && <div className="wm-error" style={{textAlign:'center'}}>{pinError}</div>}
            <div className="wm-pin-hint">Demo: any 4+ digit PIN works</div>
            <div style={{display:'flex',gap:10,marginTop:18}}>
              <button className="btn btn-secondary" onClick={() => setStep('method')}>← Back</button>
              <button className="btn btn-primary wm-cta" onClick={handlePinSubmit}>Confirm</button>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="wm-body wm-center">
            <div className="wm-spinner" />
            <div className="wm-processing-text">Processing payment…</div>
            <div style={{color:'var(--text3)',fontSize:12}}>Do not close or go back</div>
          </div>
        )}

        {step === 'success' && (
          <div className="wm-body wm-center">
            <div className="wm-success-icon animate-in">✅</div>
            <div className="wm-success-title">Money Added!</div>
            <div className="wm-success-amount">{formatINR(amt)}</div>
            <div style={{color:'var(--text2)',fontSize:13}}>Added via {method?.name}</div>
            <button className="btn btn-primary" style={{marginTop:24,width:'100%'}} onClick={onClose}>Done</button>
          </div>
        )}

        {step === 'error' && (
          <div className="wm-body wm-center">
            <div style={{fontSize:40,marginBottom:12}}>❌</div>
            <div className="wm-success-title" style={{color:'var(--red)'}}>Payment Failed</div>
            <div style={{color:'var(--text2)',fontSize:13,marginTop:8}}>{apiError}</div>
            <button className="btn btn-primary" style={{marginTop:24,width:'100%'}} onClick={() => setStep('amount')}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── WITHDRAW MODAL ─────────────────────────────────────────────────────────
function WithdrawModal({ budget, onWithdraw, onClose }) {
  const [step,     setStep]   = useState('amount');
  const [amount,   setAmount] = useState('');
  const [bank,     setBank]   = useState(null);
  const [apiError, setApiError] = useState('');

  const amt = parseFloat(amount) || 0;

  const handleConfirm = async () => {
    if (amt < 100 || amt > budget || !bank) return;
    setStep('processing');
    try {
      await onWithdraw({ amount: amt, method: bank.name, description: `Withdrawn to ${bank.name} ••••${bank.last4}` });
      setStep('success');
    } catch (err) {
      setApiError(err.message || 'Withdrawal failed. Please try again.');
      setStep('error');
    }
  };

  return (
    <div className="wallet-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="wallet-modal animate-in">
        <div className="wm-header">
          <span>🏦 Withdraw to Bank</span>
          <button className="wm-close" onClick={onClose}>✕</button>
        </div>

        {step === 'amount' && (
          <div className="wm-body">
            <div className="wm-avail">Available Balance: <strong>{formatINR(budget)}</strong></div>
            <div className="wm-label">Enter Amount</div>
            <div className="wm-amount-input-wrap">
              <span className="wm-rupee">₹</span>
              <input className="wm-amount-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" autoFocus />
            </div>
            {amt > budget && <div className="wm-error">Insufficient balance</div>}
            {amt > 0 && amt < 100 && <div className="wm-error">Minimum withdrawal is ₹100</div>}
            <div className="wm-quick-grid">
              {[500, 1000, 2000, 5000].filter(q => q <= budget).map(q => (
                <button key={q} className={`wm-quick-btn ${amt === q ? 'active' : ''}`} onClick={() => setAmount(String(q))}>{formatINR(q)}</button>
              ))}
              {budget > 0 && <button className={`wm-quick-btn ${amt === budget ? 'active' : ''}`} onClick={() => setAmount(String(Math.floor(budget)))}>All</button>}
            </div>
            <div className="wm-label">Select Bank Account</div>
            {BANKS.map(b => (
              <button key={b.id} className={`wm-method-btn ${bank?.id === b.id ? 'active' : ''}`} onClick={() => setBank(b)}>
                <span>{b.icon} {b.name}</span>
                <span style={{color:'var(--text3)',fontSize:12,marginLeft:'auto'}}>••••{b.last4}</span>
                {bank?.id === b.id && <span className="wm-method-check">✓</span>}
              </button>
            ))}
            <button className="btn btn-primary wm-cta" disabled={amt < 100 || amt > budget || !bank} onClick={handleConfirm}>
              Withdraw {formatINR(amt)}
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="wm-body wm-center">
            <div className="wm-spinner" />
            <div className="wm-processing-text">Processing withdrawal…</div>
            <div style={{color:'var(--text3)',fontSize:12}}>Usually credited within 1 working day</div>
          </div>
        )}

        {step === 'success' && (
          <div className="wm-body wm-center">
            <div className="wm-success-icon">✅</div>
            <div className="wm-success-title">Withdrawal Initiated!</div>
            <div className="wm-success-amount">{formatINR(amt)}</div>
            <div style={{color:'var(--text2)',fontSize:13}}>Will be credited to {bank?.name} ••••{bank?.last4}</div>
            <div style={{color:'var(--text3)',fontSize:11,marginTop:8}}>Typically credited within 1 working day</div>
            <button className="btn btn-primary" style={{marginTop:24,width:'100%'}} onClick={onClose}>Done</button>
          </div>
        )}

        {step === 'error' && (
          <div className="wm-body wm-center">
            <div style={{fontSize:40,marginBottom:12}}>❌</div>
            <div className="wm-success-title" style={{color:'var(--red)'}}>Withdrawal Failed</div>
            <div style={{color:'var(--text2)',fontSize:13,marginTop:8}}>{apiError}</div>
            <button className="btn btn-primary" style={{marginTop:24,width:'100%'}} onClick={() => setStep('amount')}>Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN WALLET ─────────────────────────────────────────────────────────────
export default function Wallet({ budget, setBudget, userId, setPage, txns = [], onDeposit, onWithdraw }) {
  const [showDeposit,  setShowDeposit]  = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [filterType,   setFilterType]   = useState('all');

  const totalDeposited = useMemo(() => txns.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0),  [txns]);
  const totalWithdrawn = useMemo(() => txns.filter(t => t.type === 'withdraw').reduce((s, t) => s + t.amount, 0), [txns]);

  const filteredTxns = useMemo(() => {
    if (filterType === 'all') return txns;
    return txns.filter(t => t.type === filterType);
  }, [txns, filterType]);

  return (
    <div className="wallet-page animate-in">
      {showDeposit && (
        <DepositModal budget={budget} onDeposit={onDeposit} onClose={() => setShowDeposit(false)} />
      )}
      {showWithdraw && (
        <WithdrawModal budget={budget} onWithdraw={onWithdraw} onClose={() => setShowWithdraw(false)} />
      )}

      <h1 className="page-title">💳 Wallet & Payments</h1>
      <p className="page-sub">Add money, track transactions, and manage your investing cash</p>

      {/* Balance Card */}
      <div className="wallet-balance-card card">
        <div className="wbc-label">Available Balance</div>
        <div className="wbc-amount">{formatINR(budget)}</div>
        <div className="wbc-subrow">
          <div className="wbc-stat"><span>Total Added</span><span style={{color:'var(--teal)'}}>{formatINR(totalDeposited)}</span></div>
          <div className="wbc-divider" />
          <div className="wbc-stat"><span>Withdrawn</span><span style={{color:'var(--red)'}}>{formatINR(totalWithdrawn)}</span></div>
          <div className="wbc-divider" />
          <div className="wbc-stat"><span>Transactions</span><span>{txns.length}</span></div>
        </div>
        <div className="wbc-actions">
          <button className="btn btn-primary wbc-btn" onClick={() => setShowDeposit(true)}>
            <span>➕</span> Add Money
          </button>
          <button className="btn btn-secondary wbc-btn" onClick={() => setShowWithdraw(true)} disabled={budget < 100}>
            <span>🏦</span> Withdraw
          </button>
          <button className="btn btn-secondary wbc-btn" onClick={() => setPage && setPage('stocks')}>
            <span>📈</span> Invest Now
          </button>
        </div>
      </div>

      {/* UPI & Bank Info */}
      <div className="wallet-info-grid">
        <div className="card wallet-upi-card">
          <div className="wui-title">🔗 Linked UPI Apps</div>
          <div className="wui-apps">
            {UPI_APPS.map(app => (
              <div key={app.id} className="wui-app-chip">
                <span>{app.icon}</span><span>{app.name}</span>
              </div>
            ))}
          </div>
          <div className="wui-note">All UPI payments are simulated for practice. No real money is transferred.</div>
        </div>
        <div className="card wallet-bank-card">
          <div className="wui-title">🏦 Linked Bank Accounts</div>
          {BANKS.map(b => (
            <div key={b.id} className="wui-bank-row">
              <span>{b.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600}}>{b.name}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>A/C ••••{b.last4}</div>
              </div>
              <span className="wui-verified">✓ Verified</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="card wallet-txns">
        <div className="wtxns-header">
          <div className="wtxns-title">📋 Transaction History</div>
          <div className="wtxns-filters">
            {['all', 'deposit', 'withdraw'].map(f => (
              <button key={f} className={`wtxn-filter ${filterType === f ? 'active' : ''}`} onClick={() => setFilterType(f)}>
                {f === 'all' ? 'All' : f === 'deposit' ? '↓ Added' : '↑ Withdrawn'}
              </button>
            ))}
          </div>
        </div>

        {filteredTxns.length === 0 ? (
          <div className="wtxns-empty">
            <div style={{fontSize:36,marginBottom:10}}>💳</div>
            <div style={{fontWeight:600}}>No transactions yet</div>
            <div style={{color:'var(--text3)',fontSize:13,marginTop:4}}>Add money to get started with paper trading!</div>
            <button className="btn btn-primary" style={{marginTop:16}} onClick={() => setShowDeposit(true)}>Add Money Now</button>
          </div>
        ) : (
          <div className="wtxns-list">
            {filteredTxns.map(tx => (
              <div key={tx.id} className="wtxn-row">
                <div className={`wtxn-icon ${tx.type}`}>
                  {tx.type === 'deposit' ? '↓' : '↑'}
                </div>
                <div style={{flex:1}}>
                  <div className="wtxn-desc">{tx.desc || tx.description || tx.method}</div>
                  <div className="wtxn-meta">{timeAgo(tx.ts || tx.timestamp)} · {tx.method}</div>
                </div>
                <div className={`wtxn-amount ${tx.type}`}>
                  {tx.type === 'deposit' ? '+' : '−'}{formatINR(tx.amount)}
                </div>
                <div className="wtxn-status success">✓</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="wallet-disclaimer">
        🛡️ <strong>Paper Trading Mode</strong> — All transactions are simulated for learning purposes only.
        No real money is involved. Practice investing safely before using real funds.
      </div>
    </div>
  );
}
