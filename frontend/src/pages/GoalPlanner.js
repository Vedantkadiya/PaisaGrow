import React, { useState, useMemo, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  GOAL_PRESETS,
  calcGoalSIP,
  calcGoalProgress,
  suggestStocksForGoal,
} from '../data/stocks';
import './GoalPlanner.css';

const RETURN_OPTIONS = [
  { label: 'FD (7%)',          value: 7  },
  { label: 'Nifty ETF (14%)',  value: 14 },
  { label: 'Growth stocks (20%)', value: 20 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, fontSize: 12, fontWeight: 600, display:'flex', justifyContent:'space-between', gap:16 }}>
          <span>{p.name}</span>
          <span>₹{Number(p.value).toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
};

function GoalCard({ goal, isActive, onSelect }) {
  return (
    <button className={`goal-preset ${isActive ? 'active' : ''}`} onClick={() => onSelect(goal)}>
      <span className="gp-icon">{goal.icon}</span>
      <span className="gp-label">{goal.label}</span>
      {goal.amount > 0 && (
        <span className="gp-amount">₹{goal.amount.toLocaleString('en-IN')}</span>
      )}
    </button>
  );
}

function SavedGoalRow({ goal, onDelete, onSelect }) {
  // FIX: Guard targetAmount=0 to prevent NaN% from division by zero
  const pct = goal.targetAmount > 0
    ? Math.min(100, Math.round((goal.currentSaved / goal.targetAmount) * 100))
    : 0;
  return (
    <div className="saved-goal-row" onClick={() => onSelect(goal)}>
      <div className="sgr-icon">{goal.icon}</div>
      <div className="sgr-info">
        <div className="sgr-name">{goal.name}</div>
        <div className="sgr-target">₹{goal.targetAmount.toLocaleString('en-IN')} in {goal.months} months</div>
      </div>
      <div className="sgr-progress-wrap">
        <div className="sgr-pct" style={{ color: pct >= 100 ? 'var(--green)' : 'var(--text2)' }}>
          {pct >= 100 ? '✅ Done!' : `${pct}%`}
        </div>
        <div className="sgr-track">
          <div className="sgr-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button className="sgr-del" onClick={e => { e.stopPropagation(); onDelete(goal.id); }}>✕</button>
    </div>
  );
}

export default function GoalPlanner({ budget, setPage, userId,
    savedGoals: serverGoals, setSavedGoals: serverSetGoals,
    onCreateGoal, onDeleteGoal }) {
  const [localGoals, setLocalGoals] = useLocalStorage('goals', [], userId);
  const savedGoals    = serverGoals    ?? localGoals;
  const setSavedGoals = serverSetGoals ?? setLocalGoals;
  const [selectedPreset,  setSelectedPreset]  = useState(GOAL_PRESETS[0]);
  const [goalName,        setGoalName]        = useState('');
  const [targetAmount,    setTargetAmount]    = useState(GOAL_PRESETS[0].amount);
  const [months,          setMonths]          = useState(GOAL_PRESETS[0].months);
  const [currentSaved,    setCurrentSaved]    = useState(budget > 0 ? budget : 0);

  // FIX: Sync currentSaved when budget prop changes (e.g. user adds budget on Home then
  // navigates here). Only auto-update if user hasn't manually typed a different value —
  // if currentSaved is still 0 and budget becomes positive, seed it from budget.
  useEffect(() => {
    setCurrentSaved(prev => prev === 0 && budget > 0 ? budget : prev);
  }, [budget]);
  const [returnRate,      setReturnRate]      = useState(14);
  const [activeGoal,      setActiveGoal]      = useState(null);

  const requiredSIP  = useMemo(() =>
    calcGoalSIP(targetAmount, currentSaved, months, returnRate),
    [targetAmount, currentSaved, months, returnRate]
  );

  const progressData = useMemo(() =>
    calcGoalProgress(targetAmount, currentSaved, requiredSIP, months + 6, returnRate),
    [targetAmount, currentSaved, requiredSIP, months, returnRate]
  );

  const hitMonth = progressData.find(d => d.balance >= targetAmount && d.month > 0);
  const suggestedStocks = useMemo(() => suggestStocksForGoal(months, 'medium'), [months]);

  const handlePreset = (preset) => {
    setSelectedPreset(preset);
    if (preset.amount > 0) setTargetAmount(preset.amount);
    setMonths(preset.months);
    setGoalName(preset.label !== 'Custom goal' ? preset.label : '');
  };

  const handleSave = () => {
    // FIX MEDIUM: Validate minimum meaningful goal amount
    if (!targetAmount || targetAmount < 100 || !months) return;
    // FIX MEDIUM: Prevent duplicate goals with same name and amount
    const isDuplicate = savedGoals.some(g =>
      g.name === (goalName || selectedPreset.label) && g.targetAmount === targetAmount
    );
    if (isDuplicate) return;
    const newGoal = {
      id:            Date.now(),
      name:          goalName || selectedPreset.label,
      icon:          selectedPreset.icon,
      targetAmount,
      months,
      currentSaved,
      returnRate,
      requiredSIP,
      createdAt:     new Date().toLocaleDateString('en-IN'),
    };
    if (onCreateGoal) {
      onCreateGoal(newGoal).catch(() => {});
    } else {
      setSavedGoals(g => [...g, newGoal]);
    }
  };

  const handleDelete = (id) => {
    if (onDeleteGoal) {
      onDeleteGoal(id).catch(() => {});
    } else {
      setSavedGoals(g => g.filter(goal => goal.id !== id));
    }
    if (activeGoal?.id === id) setActiveGoal(null);
  };

  const handleSelectSaved = (goal) => {
    setActiveGoal(goal);
    setTargetAmount(goal.targetAmount);
    setMonths(goal.months);
    setCurrentSaved(goal.currentSaved);
    setReturnRate(goal.returnRate);
    setGoalName(goal.name);
    const preset = GOAL_PRESETS.find(p => p.label === goal.name) || GOAL_PRESETS[6];
    setSelectedPreset({ ...preset, icon: goal.icon });
  };

  // How many months to reach goal with existing savings alone (no SIP)
  const monthsNoSIP = useMemo(() => {
    // FIX: Guard three edge cases:
    // 1. currentSaved >= targetAmount → already done, 0 months
    // 2. currentSaved <= 0 → can't grow from 0 with compound interest alone → Infinity
    // 3. Result is negative (currentSaved > targetAmount handled above) → shouldn't happen
    if (currentSaved <= 0) return Infinity;
    if (currentSaved >= targetAmount) return 0;
    const r = returnRate / 100 / 12;
    if (r <= 0) {
      // No return: savings never grow → Infinity (user needs SIP regardless)
      return Infinity;
    }
    const months = Math.ceil(Math.log(targetAmount / currentSaved) / Math.log(1 + r));
    // Sanity cap: if result is negative or unreasonably large, return Infinity
    return (months > 0 && months < 10000) ? months : Infinity;
  }, [targetAmount, currentSaved, returnRate]);

  return (
    <div className="goal-planner animate-in">
      <h1 className="page-title">🎯 Goal Planner</h1>
      <p className="page-sub">
        Set a savings goal — we'll tell you exactly how much to invest monthly to get there.
      </p>

      {/* Saved goals */}
      {savedGoals.length > 0 && (
        <div className="card saved-goals-section">
          <div className="sg-title">📋 Your Goals</div>
          <div className="saved-goals-list">
            {savedGoals.map(g => (
              <SavedGoalRow
                key={g.id} goal={g}
                onDelete={handleDelete}
                onSelect={handleSelectSaved}
              />
            ))}
          </div>
        </div>
      )}

      <div className="gp-layout">
        {/* Left: Goal setup */}
        <div className="gp-left">
          <div className="card gp-setup">
            <div className="gp-setup-title">Set Your Goal</div>

            {/* Preset grid */}
            <div className="preset-label">What are you saving for?</div>
            <div className="presets-grid">
              {GOAL_PRESETS.map(p => (
                <GoalCard
                  key={p.label}
                  goal={p}
                  isActive={selectedPreset.label === p.label}
                  onSelect={handlePreset}
                />
              ))}
            </div>

            {/* Goal details */}
            <div className="gp-fields">
              <div className="field">
                <label>Goal Name</label>
                <input
                  value={goalName}
                  onChange={e => setGoalName(e.target.value)}
                  placeholder={selectedPreset.label}
                />
              </div>
              <div className="field">
                <label>Target Amount (₹)</label>
                <div className="amount-input-wrap">
                  <span className="ai-prefix">₹</span>
                  <input
                    type="number" min="100" max="100000000" value={targetAmount}
                    onChange={e => setTargetAmount(Math.min(100_000_000, Number(e.target.value) || 0))}
                    className="amount-input"
                  />
                </div>
              </div>
              <div className="field">
                <label>Time to achieve: {months} months ({(months/12).toFixed(1)} years)</label>
                <input
                  type="range" min="3" max="120" value={months}
                  onChange={e => setMonths(Math.max(1, Number(e.target.value) || 1))}
                />
                <div className="month-marks">
                  {[6,12,24,36,60,120].map(m => (
                    <button
                      key={m}
                      className={`chip ${months === m ? 'active' : ''}`}
                      style={{ fontSize: 11, padding: '2px 8px' }}
                      onClick={() => setMonths(m)}
                    >
                      {m < 12 ? `${m}mo` : `${m/12}yr`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label>Already saved (₹)</label>
                <input
                  type="number" min="0" max="100000000" value={currentSaved}
                  onChange={e => setCurrentSaved(Math.min(100_000_000, Number(e.target.value) || 0))}
                />
              </div>
              <div className="field">
                <label>Expected return</label>
                <div className="return-opts">
                  {RETURN_OPTIONS.map(r => (
                    <button
                      key={r.value}
                      className={`chip ${returnRate === r.value ? 'active' : ''}`}
                      onClick={() => setReturnRate(r.value)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button className="btn btn-primary save-goal-btn" onClick={handleSave}>
              💾 Save This Goal
            </button>
          </div>
        </div>

        {/* Right: Results */}
        <div className="gp-right">
          {/* SIP required card */}
          <div className="card sip-result-card">
            <div className="src-label">Monthly SIP Required</div>
            <div className="src-amount">
              {requiredSIP <= 0
                ? '₹0 — You already have enough!'
                : `₹${requiredSIP.toLocaleString('en-IN')}/month`}
            </div>
            <div className="src-breakdown">
              <div className="src-row">
                <span>Goal</span>
                <span>₹{targetAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="src-row">
                <span>Already saved</span>
                <span>₹{currentSaved.toLocaleString('en-IN')}</span>
              </div>
              <div className="src-row">
                <span>Time frame</span>
                <span>{months} months</span>
              </div>
              <div className="src-row">
                <span>Annual return</span>
                <span>{returnRate}%</span>
              </div>
              {hitMonth && (
                <div className="src-row" style={{ color: 'var(--green)', fontWeight: 700 }}>
                  <span>Goal reached at</span>
                  <span>Month {hitMonth.month} ({hitMonth.label})</span>
                </div>
              )}
            </div>

            {/* Without SIP comparison */}
            {currentSaved > 0 && currentSaved < targetAmount && (
              <div className="src-compare">
                <div className="src-cmp-row">
                  <span>Without SIP (savings alone)</span>
                  <span style={{ color: 'var(--yellow)' }}>
                    {/* FIX: Show readable text when monthsNoSIP is Infinity */}
                    {isFinite(monthsNoSIP) ? `~${monthsNoSIP} months` : 'Not achievable without SIP'}
                  </span>
                </div>
                <div className="src-cmp-row">
                  <span>With ₹{requiredSIP}/mo SIP</span>
                  <span className="pos">{months} months ✅</span>
                </div>
                <div className="src-saving">
                  💡 {isFinite(monthsNoSIP)
                    ? `SIP saves you ${Math.max(0, monthsNoSIP - months)} months!`
                    : 'SIP is the fastest way to reach this goal!'}
                </div>
              </div>
            )}
          </div>

          {/* Progress chart */}
          {progressData.length > 1 && (
            <div className="card gp-chart-card">
              <div className="gp-chart-title">Your Savings Journey</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={progressData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22d3a5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#22d3a5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e2334" strokeDasharray="4 4" vertical={false}/>
                  <XAxis dataKey="label" tick={{ fill:'#8b98c4', fontSize:10 }} tickLine={false} axisLine={false} interval="preserveStartEnd"/>
                  <YAxis tick={{ fill:'#8b98c4', fontSize:10 }} tickLine={false} axisLine={false}
                    tickFormatter={v => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : `₹${(v/1000).toFixed(0)}K`} width={54}/>
                  <Tooltip content={<CustomTooltip />}/>
                  <ReferenceLine y={targetAmount} stroke="#fbbf24" strokeDasharray="4 3" strokeWidth={1.5}
                    label={{ value:'Goal', fill:'#fbbf24', fontSize:10, position:'right' }}/>
                  <Area type="monotone" dataKey="balance" name="Savings" stroke="#22d3a5" strokeWidth={2.5}
                    fill="url(#balG)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
              <div className="gp-chart-note">
                🟡 Yellow line = your target · 🟢 Green curve = savings with SIP
              </div>
            </div>
          )}

          {/* Suggested stocks */}
          <div className="card gp-stocks">
            <div className="gps-title">
              📈 Recommended Stocks for This Goal
              <span className="gps-sub">
                {months < 12 ? 'Short-term: low risk only' : months < 36 ? 'Medium-term: mixed risk' : 'Long-term: growth focus'}
              </span>
            </div>
            <div className="gps-list">
              {suggestedStocks.slice(0, 4).map(s => {
                const canAfford = s.price <= currentSaved;
                return (
                  <div key={s.ticker} className="gps-row">
                    <div className="gps-ticker">{s.ticker}</div>
                    <div className="gps-name">{s.name}</div>
                    <div className="gps-price">₹{s.price}</div>
                    <span className={`risk-badge risk-${s.risk}`} style={{ fontSize: 10 }}>{s.risk}</span>
                    <span className="pos" style={{ fontSize: 12, fontWeight: 600 }}>+{s.roi1y}%</span>
                    {!canAfford && (
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                        Need ₹{(s.price - currentSaved).toFixed(0)} more
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <button className="btn btn-secondary gps-btn" onClick={() => setPage('stocks')}>
              See All Stocks →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
