// FIX #12: Consolidated duplicate React imports into one line
import React, { useState, useRef, useEffect } from 'react'; // BUG-I FIX: useRef for timer cleanup
import { useLocalStorage } from '../hooks/useLocalStorage';
import './SipTracker.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function getCurrentYearMonth() {
  const d = new Date();
  return { month: d.getMonth(), year: d.getFullYear() };
}

export default function SipTracker({ budget, userId,
    logs: serverLogs, setLogs: serverSetLogs,
    sipAmount: serverSipAmount, setSipAmount: serverSetSipAmount,
    sipDay: serverSipDay, setSipDay: serverSetSipDay,
    onAddLog, onRemoveLog }) {
  const { month: curMonth, year: curYear } = getCurrentYearMonth();

  // FIX: useLocalStorage instead of useState — sipAmount was reset to 500 on every page navigation
  const [localSipAmount, setLocalSipAmount] = useLocalStorage('sip_amount', 500, userId);
  const [localSipDay,    setLocalSipDay]    = useLocalStorage('sip_day', 1, userId);
  const [localLogs,      setLocalLogs]      = useLocalStorage('sip_logs', [], userId);
  const sipAmount    = serverSipAmount    ?? localSipAmount;
  const setSipAmount = serverSetSipAmount ?? setLocalSipAmount;
  const sipDay       = serverSipDay       ?? localSipDay;
  const setSipDay    = serverSetSipDay    ?? setLocalSipDay;
  const logs         = serverLogs         ?? localLogs;
  const setLogs      = serverSetLogs      ?? setLocalLogs;
  const [logAmount, setLogAmount] = useState('');
  const [logNote,   setLogNote]   = useState('');
  const [logMonth,  setLogMonth]  = useState(curMonth);
  const [logYear,   setLogYear]   = useState(curYear);
  const [toast,     setToast]     = useState('');
  // BUG-I FIX: Store timer in ref so it can be cleared on unmount or new toast
  const toastTimerRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 3000);
  };

  // BUG-I FIX: Cleanup timer on unmount to prevent setState-after-unmount
  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); };
  }, []);

  const handleLog = () => {
    const amount = parseFloat(logAmount);
    if (!amount || amount <= 0) { showToast('⚠️ Please enter a valid amount.'); return; }
    // FIX: block future-dated entries — they inflate the streak counter artificially
    const isFuture = logYear > curYear || (logYear === curYear && logMonth > curMonth);
    if (isFuture) { showToast('⚠️ Cannot log a SIP for a future month.'); return; }
    const already = logs.find(l => l.year === logYear && l.month === logMonth);
    if (already) { showToast('⚠️ Already logged for this month!'); return; }
    const entry = { id: Date.now(), year: logYear, month: logMonth, amount, note: logNote };
    if (onAddLog) {
      onAddLog(entry).catch(() => showToast('⚠️ Failed to save SIP log.'));
    } else {
      setLogs(prev => [...prev, entry].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month));
    }
    setLogAmount('');
    setLogNote('');
    showToast('✅ SIP logged successfully!');
  };

  const handleDelete = (id) => {
    if (onRemoveLog) {
      onRemoveLog(id).catch(() => {});
    } else {
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  const totalInvested = logs.reduce((s, l) => s + l.amount, 0);
  const avgMonthly    = logs.length > 0 ? Math.round(totalInvested / logs.length) : 0;

  // Streak: consecutive months logged going backwards from current month
  // FIX #11: Outer bounds on while loop prevents infinite loop on corrupted data.
  // Also validate log entries before counting to guard against NaN years.
  let streak = 0;
  const MAX_LOOKBACK = Math.min(24, logs.length + 1);
  for (let i = 0; i < MAX_LOOKBACK; i++) {
    let checkYear  = curYear;
    let checkMonth = curMonth - i;
    let guard = 0;
    while (checkMonth < 0 && guard < 13) { checkMonth += 12; checkYear -= 1; guard++; }
    if (checkMonth < 0) break; // safety exit
    const found = logs.find(l =>
      l && typeof l.year === 'number' && typeof l.month === 'number' &&
      l.year === checkYear && l.month === checkMonth
    );
    if (found) streak++;
    else break;
  }

  const daysUntilSIP = (() => {
    const today   = new Date();
    const nextSIP = new Date(today.getFullYear(), today.getMonth(), sipDay);
    if (nextSIP <= today) nextSIP.setMonth(nextSIP.getMonth() + 1);
    return Math.ceil((nextSIP - today) / (1000 * 60 * 60 * 24));
  })();

  // Ordinal suffix helper
  const ordinal = (n) => {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Calendar for current year
  const calMonths = MONTHS.map((name, idx) => {
    const log       = logs.find(l => l.year === curYear && l.month === idx);
    const isCurrent = idx === curMonth;
    const isPast    = idx < curMonth;
    const isFuture  = idx > curMonth;
    return { name, idx, log, isCurrent, isPast, isFuture };
  });

  return (
    <div className="sip-tracker animate-in">
      <h1 className="page-title">📅 SIP Tracker</h1>
      <p className="page-sub">Log your monthly investments. Build the habit — consistency beats perfection!</p>

      {toast && <div className="sip-toast animate-pop">{toast}</div>}

      {/* Stats */}
      <div className="stat-row" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total SIPs</div>
          <div className="stat-value" style={{ color: 'var(--blue)' }}>{logs.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Invested</div>
          <div className="stat-value pos">₹{totalInvested.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Monthly</div>
          <div className="stat-value">₹{avgMonthly.toLocaleString('en-IN')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Streak 🔥</div>
          <div className="stat-value" style={{ color: streak >= 3 ? 'var(--orange)' : 'var(--text)' }}>
            {streak} month{streak !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Next SIP In</div>
          <div className="stat-value" style={{ color: 'var(--yellow)' }}>
            {daysUntilSIP} day{daysUntilSIP !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="sip-layout">
        {/* Left: setup + log form */}
        <div className="sip-left">
          <div className="card sip-setup">
            <div className="ss-title">⚙️ My SIP Setup</div>
            <div className="ss-fields">
              <div className="field">
                <label>Monthly SIP Amount (₹)</label>
                {/* FIX: max=500000 (₹5L/month) — no upper bound allowed absurd values */}
                <input type="number" min="100" max="500000" value={sipAmount}
                  onChange={e => setSipAmount(Math.min(500_000, Math.max(100, Number(e.target.value) || 100)))} />
                <div className="field-hint">
                  ₹{sipAmount}/month × 12 = ₹{(sipAmount * 12).toLocaleString('en-IN')}/year
                </div>
              </div>
              <div className="field">
                <label>SIP Date — every {ordinal(sipDay)} of the month</label>
                <input type="range" min="1" max="28" value={sipDay}
                  onChange={e => setSipDay(Number(e.target.value))} />
                <div className="range-val-small">Day {sipDay}</div>
              </div>
            </div>
            <div className="sip-reminder">
              ⏰ Next SIP in <strong>{daysUntilSIP} day{daysUntilSIP !== 1 ? 's' : ''}</strong>{' '}
              (on the {ordinal(sipDay)} of{' '}
              {(() => {
                const m = daysUntilSIP <= 3 ? curMonth : (curMonth + 1) % 12;
                // FIX #16: When Dec→Jan, increment year display correctly
                const y = daysUntilSIP <= 3 ? curYear : (curMonth === 11 ? curYear + 1 : curYear);
                return `${MONTHS[m]} ${y}`;
              })()})
            </div>
          </div>

          <div className="card sip-log-form">
            <div className="slf-title">✅ Log a SIP Payment</div>
            <div className="slf-fields">
              <div className="field-row">
                <div className="field" style={{ flex: 1 }}>
                  <label>Month</label>
                  <select value={logMonth} onChange={e => setLogMonth(Number(e.target.value))}>
                    {/* index key OK: MONTHS is static, never reordered */}
                    {MONTHS.map((m, i) => (
                      <option key={i} value={i}>{m} {logYear}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Year</label>
                  <select value={logYear} onChange={e => setLogYear(Number(e.target.value))}>
                    {[curYear - 1, curYear, curYear + 1].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Amount Invested (₹)</label>
                {/* FIX: max matches sipAmount ceiling; negative log amounts blocked */}
                <input type="number" min="1" max="500000" value={logAmount}
                  onChange={e => setLogAmount(e.target.value)}
                  placeholder={String(sipAmount)} />
              </div>
              <div className="field">
                <label>Note (optional)</label>
                <input value={logNote} onChange={e => setLogNote(e.target.value)}
                  placeholder="e.g. Bought Nifty BeES" />
              </div>
              <button className="btn btn-primary" onClick={handleLog}
                style={{ width: '100%', justifyContent: 'center' }}>
                📝 Log SIP
              </button>
            </div>
          </div>
        </div>

        {/* Right: calendar + history */}
        <div className="sip-right">
          <div className="card sip-calendar">
            <div className="sc-title">📆 {curYear} SIP Calendar</div>
            <div className="sc-grid">
              {calMonths.map(({ name, idx, log, isCurrent, isPast, isFuture }) => (
                <div key={idx} className={[
                  'sc-cell',
                  log        ? 'done'    : '',
                  isFuture   ? 'future'  : '',
                  !log && isPast && !isCurrent ? 'missed' : '',
                  isCurrent && !log ? 'current' : '',
                ].filter(Boolean).join(' ')}>
                  <div className="sc-month">{name}</div>
                  {log ? (
                    <>
                      <div className="sc-check">✓</div>
                      <div className="sc-amount">₹{log.amount.toLocaleString('en-IN')}</div>
                    </>
                  ) : isFuture ? (
                    <div className="sc-future">—</div>
                  ) : isCurrent ? (
                    <div className="sc-pending">now</div>
                  ) : (
                    <div className="sc-missed-icon">✗</div>
                  )}
                </div>
              ))}
            </div>
            <div className="sc-legend">
              <span className="sc-legend-item done">✓ Done</span>
              <span className="sc-legend-item missed">✗ Missed</span>
              <span className="sc-legend-item current">⬤ This month</span>
              <span className="sc-legend-item future">— Future</span>
            </div>
          </div>

          <div className="card sip-history">
            <div className="sh-title">📋 Payment History</div>
            {logs.length === 0 ? (
              <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No SIPs logged yet. Log your first payment above!
              </div>
            ) : (
              <div className="sh-list">
                {[...logs].reverse().map(log => (
                  <div key={log.id} className="sh-row">
                    <div className="sh-date">{MONTHS[log.month]} {log.year}</div>
                    <div className="sh-amount pos">₹{log.amount.toLocaleString('en-IN')}</div>
                    {log.note && <div className="sh-note">{log.note}</div>}
                    <button className="sh-del" onClick={() => handleDelete(log.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
