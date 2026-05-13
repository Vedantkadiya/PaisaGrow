/**
 * AuthPage.js — Login, Sign-up & Forgot-Password screens for PaisaGrow
 */
import React, { useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import './AuthPage.css';

// ── Password strength meter ───────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8)         score++;
  if (password.length >= 12)        score++;
  if (/[A-Z]/.test(password))       score++;
  if (/[0-9]/.test(password))       score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const label = ['Very Weak','Weak','Fair','Good','Strong'][Math.min(score-1,4)] || 'Very Weak';
  const color = ['#f4536c','#f4536c','#fbbf24','#22d3a5','#22d3a5'][Math.min(score-1,4)] || '#f4536c';

  return (
    <div className="pw-strength">
      <div className="pw-bars">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="pw-bar" style={{ background: i <= score ? color : 'var(--bg3)' }} />
        ))}
      </div>
      <span style={{ color, fontSize:11 }}>{label}</span>
    </div>
  );
}

// ── Login Form ────────────────────────────────────────────────────────────────
function LoginForm({ onSwitch, onForgot }) {
  const { login } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const emailRef = useRef();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    const res = await login({ email, password, remember });
    setLoading(false);
    if (res.error) setError(res.error);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-logo">🌿</div>
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-subtitle">Sign in to your PaisaGrow account</p>

      {error && <div className="auth-error" role="alert">⚠️ {error}</div>}

      <div className="auth-field">
        <label htmlFor="login-email">Email</label>
        <input id="login-email" ref={emailRef} type="email" autoComplete="email"
          value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com" disabled={loading} autoFocus />
      </div>

      <div className="auth-field">
        <label htmlFor="login-pw" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span>Password</span>
          <button type="button" className="auth-link" style={{ fontSize:12 }} onClick={onForgot}>
            Forgot password?
          </button>
        </label>
        <div className="pw-wrap">
          <input id="login-pw" type={showPw ? 'text' : 'password'}
            autoComplete="current-password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your password" disabled={loading} />
          <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'}>
            {showPw ? '🙈' : '👁'}
          </button>
        </div>
      </div>

      <div className="auth-row">
        <label className="auth-check">
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
          <span>Remember me</span>
        </label>
      </div>

      <button type="submit" className="auth-btn" disabled={loading}>
        {loading ? <span className="auth-spinner"/> : 'Sign In'}
      </button>

      <p className="auth-switch">
        Don't have an account?{' '}
        <button type="button" className="auth-link" onClick={onSwitch}>Create account</button>
      </p>
    </form>
  );
}

// ── Sign Up Form ──────────────────────────────────────────────────────────────
function SignUpForm({ onSwitch }) {
  const { signUp } = useAuth();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim() || !password || !confirm) {
      setError('Please fill in all fields'); return;
    }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    const res = await signUp({ name, email, password });
    setLoading(false);
    if (res.error) setError(res.error);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-logo">🌿</div>
      <h1 className="auth-title">Create account</h1>
      <p className="auth-subtitle">Start your smart investing journey</p>

      {error && <div className="auth-error" role="alert">⚠️ {error}</div>}

      <div className="auth-field">
        <label htmlFor="su-name">Full Name</label>
        <input id="su-name" type="text" autoComplete="name" value={name}
          onChange={e => setName(e.target.value)} placeholder="Your name"
          disabled={loading} autoFocus />
      </div>

      <div className="auth-field">
        <label htmlFor="su-email">Email</label>
        <input id="su-email" type="email" autoComplete="email" value={email}
          onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
          disabled={loading} />
      </div>

      <div className="auth-field">
        <label htmlFor="su-pw">Password</label>
        <div className="pw-wrap">
          <input id="su-pw" type={showPw ? 'text' : 'password'} autoComplete="new-password"
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Min 8 chars, 1 uppercase, 1 number" disabled={loading} />
          <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'}>
            {showPw ? '🙈' : '👁'}
          </button>
        </div>
        <PasswordStrength password={password} />
      </div>

      <div className="auth-field">
        <label htmlFor="su-confirm">Confirm Password</label>
        <input id="su-confirm" type="password" autoComplete="new-password"
          value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder="Repeat password" disabled={loading} />
        {confirm && password !== confirm && (
          <span className="auth-field-err">Passwords don't match</span>
        )}
      </div>

      <p className="auth-terms">
        By creating an account you agree to our{' '}
        <span className="auth-link">Terms of Service</span> and{' '}
        <span className="auth-link">Privacy Policy</span>.
        Your data is securely saved to your account.
      </p>

      <button type="submit" className="auth-btn" disabled={loading}>
        {loading ? <span className="auth-spinner"/> : 'Create Account'}
      </button>

      <p className="auth-switch">
        Already have an account?{' '}
        <button type="button" className="auth-link" onClick={onSwitch}>Sign in</button>
      </p>
    </form>
  );
}

// ── Forgot Password Form ──────────────────────────────────────────────────────
function ForgotPasswordForm({ onBack, onResetReady }) {
  const { forgotPassword } = useAuth();
  const [email,   setEmail]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [devInfo, setDevInfo] = useState(null); // { token, uid } only in dev mode

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email'); return; }
    setLoading(true);
    const res = await forgotPassword({ email });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setSent(true);
    // If backend returns dev_token/dev_uid (dev mode), store them
    if (res.dev_token && res.dev_uid) {
      setDevInfo({ token: res.dev_token, uid: res.dev_uid });
    }
  };

  if (sent) {
    return (
      <div className="auth-form">
        <div className="auth-logo">📧</div>
        <h1 className="auth-title">Check your email</h1>
        <p className="auth-subtitle">
          If <strong>{email}</strong> has an account, we've sent a reset link.
        </p>

        {/* Dev-mode hint — shows the token so you can test without SMTP */}
        {devInfo && (
          <div style={{
            background: 'rgba(255,194,58,.08)', border: '1px solid rgba(255,194,58,.25)',
            borderRadius: 12, padding: '14px 16px', marginBottom: 20,
          }}>
            <div style={{ fontSize:11, fontWeight:700, color:'var(--gold)', fontFamily:'var(--font-head)',
              textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>
              🛠 Dev Mode — No email server configured
            </div>
            <div style={{ fontSize:12, color:'var(--text2)', marginBottom:8 }}>
              Copy these values to reset your password:
            </div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text1)',
              background:'var(--bg3)', borderRadius:8, padding:'10px 12px', wordBreak:'break-all' }}>
              <div style={{ marginBottom:6 }}><span style={{color:'var(--text3)'}}>Token: </span>{devInfo.token}</div>
              <div><span style={{color:'var(--text3)'}}>UID: </span>{devInfo.uid}</div>
            </div>
            <button
              className="auth-btn"
              style={{ marginTop:14, background:'var(--gold)', color:'#0a0f1a', fontSize:13 }}
              onClick={() => onResetReady({ uid: devInfo.uid, token: devInfo.token })}>
              Continue to Reset Password →
            </button>
          </div>
        )}

        {!devInfo && (
          <button
            className="auth-btn"
            style={{ marginTop:8 }}
            onClick={() => onResetReady({})}>
            Enter Reset Code →
          </button>
        )}

        <p className="auth-switch">
          <button type="button" className="auth-link" onClick={onBack}>← Back to Sign In</button>
        </p>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-logo">🔑</div>
      <h1 className="auth-title">Forgot password?</h1>
      <p className="auth-subtitle">
        Enter your email and we'll send you a reset link.
      </p>

      {error && <div className="auth-error" role="alert">⚠️ {error}</div>}

      <div className="auth-field">
        <label htmlFor="forgot-email">Email address</label>
        <input id="forgot-email" type="email" autoComplete="email"
          value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com" disabled={loading} autoFocus />
      </div>

      <button type="submit" className="auth-btn" disabled={loading}>
        {loading ? <span className="auth-spinner"/> : 'Send Reset Link'}
      </button>

      <p className="auth-switch">
        Remembered it?{' '}
        <button type="button" className="auth-link" onClick={onBack}>Back to Sign In</button>
      </p>
    </form>
  );
}

// ── Reset Password Form ───────────────────────────────────────────────────────
function ResetPasswordForm({ prefillUid, prefillToken, onBack, onDone }) {
  const { resetPassword } = useAuth();
  const [uid,      setUid]      = useState(prefillUid   || '');
  const [token,    setToken]    = useState(prefillToken || '');
  const [newPw,    setNewPw]    = useState('');
  const [confPw,   setConfPw]   = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!uid.trim() || !token.trim()) { setError('Please enter your UID and reset token'); return; }
    if (!newPw) { setError('Please enter a new password'); return; }
    if (newPw.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPw !== confPw) { setError('Passwords do not match'); return; }
    setLoading(true);
    const res = await resetPassword({ uid, token, newPassword: newPw });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="auth-form">
        <div className="auth-logo">✅</div>
        <h1 className="auth-title">Password reset!</h1>
        <p className="auth-subtitle">Your password has been updated. You can now sign in.</p>
        <button className="auth-btn" onClick={onDone}>Go to Sign In</button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-logo">🔐</div>
      <h1 className="auth-title">Reset password</h1>
      <p className="auth-subtitle">Enter your reset token and choose a new password.</p>

      {error && <div className="auth-error" role="alert">⚠️ {error}</div>}

      {/* Only show UID/Token fields if not pre-filled */}
      {(!prefillUid || !prefillToken) && (
        <>
          <div className="auth-field">
            <label htmlFor="reset-uid">Account UID</label>
            <input id="reset-uid" type="text" value={uid}
              onChange={e => setUid(e.target.value.trim())}
              placeholder="Paste from email" disabled={loading} />
          </div>
          <div className="auth-field">
            <label htmlFor="reset-token">Reset Token</label>
            <input id="reset-token" type="text" value={token}
              onChange={e => setToken(e.target.value.trim())}
              placeholder="Paste from email" disabled={loading} />
          </div>
        </>
      )}

      {/* Show confirmation when pre-filled from dev mode */}
      {prefillUid && prefillToken && (
        <div style={{
          background:'rgba(34,211,165,.08)', border:'1px solid rgba(34,211,165,.2)',
          borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12,
          color:'var(--teal)', fontFamily:'var(--font-head)',
        }}>
          ✓ Reset token loaded — just choose a new password below
        </div>
      )}

      <div className="auth-field">
        <label htmlFor="reset-newpw">New Password</label>
        <div className="pw-wrap">
          <input id="reset-newpw" type={showPw ? 'text' : 'password'} autoComplete="new-password"
            value={newPw} onChange={e => setNewPw(e.target.value)}
            placeholder="Min 8 chars, 1 uppercase, 1 number" disabled={loading} autoFocus />
          <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'}>
            {showPw ? '🙈' : '👁'}
          </button>
        </div>
        <PasswordStrength password={newPw} />
      </div>

      <div className="auth-field">
        <label htmlFor="reset-confpw">Confirm New Password</label>
        <input id="reset-confpw" type="password" autoComplete="new-password"
          value={confPw} onChange={e => setConfPw(e.target.value)}
          placeholder="Repeat new password" disabled={loading} />
        {confPw && newPw !== confPw && (
          <span className="auth-field-err">Passwords don't match</span>
        )}
      </div>

      <button type="submit" className="auth-btn" disabled={loading}>
        {loading ? <span className="auth-spinner"/> : 'Reset Password'}
      </button>

      <p className="auth-switch">
        <button type="button" className="auth-link" onClick={onBack}>← Back</button>
      </p>
    </form>
  );
}

// ── Auth Page (container) ─────────────────────────────────────────────────────
export default function AuthPage() {
  const [mode,    setMode]    = useState('login');   // 'login' | 'signup' | 'forgot' | 'reset'
  const [resetPrefill, setResetPrefill] = useState({ uid:'', token:'' });

  const goToReset = ({ uid = '', token = '' } = {}) => {
    setResetPrefill({ uid, token });
    setMode('reset');
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-circles">
        <div className="auth-circle c1"/><div className="auth-circle c2"/><div className="auth-circle c3"/>
      </div>
      <div className="auth-card animate-in">
        {mode === 'login'  && <LoginForm   onSwitch={() => setMode('signup')} onForgot={() => setMode('forgot')} />}
        {mode === 'signup' && <SignUpForm  onSwitch={() => setMode('login')} />}
        {mode === 'forgot' && <ForgotPasswordForm onBack={() => setMode('login')} onResetReady={goToReset} />}
        {mode === 'reset'  && (
          <ResetPasswordForm
            prefillUid={resetPrefill.uid}
            prefillToken={resetPrefill.token}
            onBack={() => setMode('forgot')}
            onDone={() => setMode('login')}
          />
        )}
      </div>
      <p className="auth-footer">PaisaGrow v2.0 · Smart Investing for Beginners · Your data is synced to your account</p>
    </div>
  );
}
