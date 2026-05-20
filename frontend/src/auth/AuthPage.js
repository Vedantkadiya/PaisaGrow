/**
 * AuthPage.js — Login, Sign-up & Forgot-Password screens for PaisaGrow
 * CHANGE: Added "Continue with Google" via Google Identity Services (GIS)
 * CHANGE: Fixed forgot-password dev-mode to show clickable reset link
 * CHANGE: Simplified ResetPasswordForm to use single combined token
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import './AuthPage.css';

// ── Password strength meter ────────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8)          score++;
  if (password.length >= 12)         score++;
  if (/[A-Z]/.test(password))        score++;
  if (/[0-9]/.test(password))        score++;
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

// ── Google Auth Button ─────────────────────────────────────────────────────────
// Uses Google Identity Services (GIS) renderButton to display the official
// Google-branded button. Falls back gracefully if GIS hasn't loaded yet.
function GoogleAuthButton({ onCredential }) {
  const containerRef = useRef(null);
  const [gisReady, setGisReady]   = useState(false);
  const [gisError, setGisError]   = useState('');
  const [loading,  setLoading]    = useState(false);
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  const initGIS = useCallback(() => {
    if (!window.google?.accounts?.id || !containerRef.current || !clientId) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        setLoading(true);
        setGisError('');
        const result = await onCredential(response.credential);
        setLoading(false);
        if (result?.error) setGisError(result.error);
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: false,
    });

    // Render the official Google button inside our container
    window.google.accounts.id.renderButton(containerRef.current, {
      theme: 'filled_black',   // dark background — fits our dark UI
      size: 'large',
      type: 'standard',
      shape: 'rectangular',
      text: 'continue_with',
      logo_alignment: 'left',
      width: containerRef.current.offsetWidth || 340,
    });

    setGisReady(true);
  }, [clientId, onCredential]);

  useEffect(() => {
    if (!clientId) return;          // no client ID → hide button entirely

    if (window.google?.accounts?.id) {
      initGIS();
      return;
    }

    // GIS script is async — poll until available (max ~3s)
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      if (window.google?.accounts?.id) {
        clearInterval(poll);
        initGIS();
      } else if (attempts > 15) {
        clearInterval(poll);
        setGisError('Google Sign-In failed to load. Check your connection.');
      }
    }, 200);
    return () => clearInterval(poll);
  }, [clientId, initGIS]);

  // Don't render anything if no client ID is configured
  if (!clientId) return null;

  return (
    <div className="google-auth-wrap">
      {/* Auth divider */}
      <div className="auth-divider">
        <span>or</span>
      </div>

      {gisError && (
        <div className="auth-error" role="alert" style={{ marginBottom: 10 }}>
          ⚠️ {gisError}
        </div>
      )}

      {/* GIS renders the actual Google button into this div */}
      <div
        ref={containerRef}
        className={`google-btn-container ${loading ? 'google-btn-loading' : ''}`}
        aria-label="Continue with Google"
      />

      {/* Show spinner overlay while GIS loads or credential is being verified */}
      {(!gisReady || loading) && (
        <div className="google-btn-placeholder">
          <span className="auth-spinner" style={{ borderTopColor: '#4285F4' }} />
          <span>{loading ? 'Signing in…' : 'Loading Google Sign-In…'}</span>
        </div>
      )}
    </div>
  );
}

// ── Login Form ────────────────────────────────────────────────────────────────
function LoginForm({ onSwitch, onForgot }) {
  const { login, googleLogin } = useAuth();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    const res = await login({ email, password, remember });
    setLoading(false);
    if (res.error) setError(res.error);
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    const res = await googleLogin(credential);
    if (res?.error) setError(res.error);
    return res;
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-logo">🌿</div>
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-subtitle">Sign in to your PaisaGrow account</p>

      {error && <div className="auth-error" role="alert">⚠️ {error}</div>}

      <div className="auth-field">
        <label htmlFor="login-email">Email</label>
        <input id="login-email" type="email" autoComplete="email"
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

      {/* ── Continue with Google ── */}
      <GoogleAuthButton onCredential={handleGoogleCredential} />

      <p className="auth-switch" style={{ marginTop: 16 }}>
        Don't have an account?{' '}
        <button type="button" className="auth-link" onClick={onSwitch}>Create account</button>
      </p>
    </form>
  );
}

// ── Sign Up Form ──────────────────────────────────────────────────────────────
function SignUpForm({ onSwitch }) {
  const { signUp, googleLogin } = useAuth();
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

  const handleGoogleCredential = async (credential) => {
    setError('');
    const res = await googleLogin(credential);
    if (res?.error) setError(res.error);
    return res;
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-logo">🌿</div>
      <h1 className="auth-title">Create account</h1>
      <p className="auth-subtitle">Start your smart investing journey</p>

      {error && <div className="auth-error" role="alert">⚠️ {error}</div>}

      {/* ── Continue with Google (at top for sign-up — reduces friction) ── */}
      <GoogleAuthButton onCredential={handleGoogleCredential} />

      <div className="auth-divider" style={{ marginTop: 0 }}>
        <span>or sign up with email</span>
      </div>

      <div className="auth-field">
        <label htmlFor="su-name">Full Name</label>
        <input id="su-name" type="text" autoComplete="name" value={name}
          onChange={e => setName(e.target.value)} placeholder="Your name"
          disabled={loading} />
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
  // dev_link: backend returns this only when no SMTP is configured (dev mode)
  const [devLink, setDevLink] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email'); return; }
    setLoading(true);
    const res = await forgotPassword({ email });
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setSent(true);
    // Backend returns dev_link only in dev mode (no SMTP configured)
    if (res.dev_link) setDevLink(res.dev_link);
  };

  if (sent) {
    return (
      <div className="auth-form">
        <div className="auth-logo">📧</div>
        <h1 className="auth-title">Check your email</h1>
        <p className="auth-subtitle">
          If <strong>{email}</strong> has an account, we've sent a password reset link
          valid for <strong>1 hour</strong>.
        </p>

        {/* ── Dev-mode panel: shown only when no SMTP is configured ── */}
        {devLink && (
          <div className="dev-mode-box">
            <div className="dev-mode-label">
              🛠 Dev Mode — No email server configured
            </div>
            <p className="dev-mode-body">
              Your app isn't sending real emails yet. Click the button below to
              reset your password directly, or copy the link for testing.
            </p>
            <div className="dev-mode-link">
              {devLink}
            </div>
            <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
              <button
                className="auth-btn"
                style={{ flex:1, margin:0, background:'var(--gold)', color:'#0a0f1a', fontSize:13 }}
                onClick={() => {
                  // Extract token from the dev link and go straight to reset form
                  const url = new URL(devLink);
                  const token = url.searchParams.get('token');
                  onResetReady({ token });
                }}>
                Reset Password Now →
              </button>
              <button
                className="auth-btn"
                style={{ flex:1, margin:0, background:'var(--bg3)', color:'var(--text2)', border:'1px solid var(--border2)', fontSize:13 }}
                onClick={() => navigator.clipboard?.writeText(devLink)}>
                📋 Copy Link
              </button>
            </div>
            <div className="dev-mode-hint">
              To send real emails: set <code>EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend</code> and
              configure Gmail SMTP in your <code>.env</code> file.
            </div>
          </div>
        )}

        {!devLink && (
          <>
            <div className="auth-sent-tips">
              <p>📬 Didn't receive it? Check your spam folder.</p>
              <p>🔁 <button type="button" className="auth-link" onClick={() => { setSent(false); setDevLink(null); }}>
                  Send again
                </button>
              </p>
            </div>
          </>
        )}

        <p className="auth-switch" style={{ marginTop: 16 }}>
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
        Enter your email and we'll send a reset link valid for 1 hour.
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
// CHANGE: Now uses a single combined "token" field (not separate uid+token).
// The reset link in the email contains ?token=COMBINED_TOKEN which this form accepts.
function ResetPasswordForm({ prefillToken, onBack, onDone }) {
  const { resetPassword } = useAuth();
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
    if (!token.trim())  { setError('Please enter your reset token'); return; }
    if (!newPw)         { setError('Please enter a new password'); return; }
    if (newPw.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPw !== confPw) { setError('Passwords do not match'); return; }
    setLoading(true);
    // CHANGE: pass token only (no separate uid) — backend uses combined token
    const res = await resetPassword({ token, newPassword: newPw });
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
      <p className="auth-subtitle">
        {prefillToken
          ? 'Choose a new password for your account.'
          : 'Paste the reset token from your email and choose a new password.'}
      </p>

      {error && <div className="auth-error" role="alert">⚠️ {error}</div>}

      {/* Show confirmation when token is pre-filled from dev mode */}
      {prefillToken && (
        <div className="auth-token-ok">
          ✓ Reset token loaded — choose a new password below
        </div>
      )}

      {/* Only show token field if not pre-filled */}
      {!prefillToken && (
        <div className="auth-field">
          <label htmlFor="reset-token">Reset Token</label>
          <input id="reset-token" type="text" value={token}
            onChange={e => setToken(e.target.value.trim())}
            placeholder="Paste token from email" disabled={loading} autoFocus />
          <span className="auth-field-hint">
            Tip: open the link from your email — it fills this automatically.
          </span>
        </div>
      )}

      <div className="auth-field">
        <label htmlFor="reset-newpw">New Password</label>
        <div className="pw-wrap">
          <input id="reset-newpw" type={showPw ? 'text' : 'password'} autoComplete="new-password"
            value={newPw} onChange={e => setNewPw(e.target.value)}
            placeholder="Min 8 chars, 1 uppercase, 1 number" disabled={loading}
            autoFocus={!!prefillToken} />
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
  const [mode,    setMode]    = useState('login');   // 'login'|'signup'|'forgot'|'reset'
  const [resetToken, setResetToken] = useState('');

  // CHANGE: goToReset now accepts a single token (not separate uid+token)
  const goToReset = ({ token = '' } = {}) => {
    setResetToken(token);
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
            prefillToken={resetToken}
            onBack={() => setMode('forgot')}
            onDone={() => setMode('login')}
          />
        )}
      </div>
      <p className="auth-footer">
        PaisaGrow v2.0 · Smart Investing for Beginners · Your data is synced to your account
      </p>
    </div>
  );
}
