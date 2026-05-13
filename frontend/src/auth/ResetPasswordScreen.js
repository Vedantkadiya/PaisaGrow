import React, { useState } from 'react';
import { auth } from '../api';

export default function ResetPasswordScreen() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newPassword || !confirmPassword) { setError('Please fill in all fields.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      await auth.resetPassword({ token, newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg1)', padding:20 }}>
      <div style={{ background:'var(--card)', borderRadius:16, padding:40, maxWidth:400, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,.4)' }}>
        <div style={{ fontSize:40, textAlign:'center', marginBottom:16 }}>🔐</div>
        <h2 style={{ textAlign:'center', color:'var(--text)', marginBottom:24 }}>Reset Password</h2>

        {success ? (
          <div style={{ textAlign:'center' }}>
            <div style={{ color:'var(--teal)', fontSize:40, marginBottom:16 }}>✅</div>
            <p style={{ color:'var(--text2)', marginBottom:24 }}>Password reset successfully. You can now log in.</p>
            <button onClick={() => window.location.href = '/'} style={{ padding:'10px 24px', background:'var(--teal)', border:'none', borderRadius:8, color:'#0a0f1a', fontWeight:700, cursor:'pointer' }}>
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div style={{ color:'var(--red)', background:'var(--red-bg)', padding:'10px 14px', borderRadius:8, marginBottom:16, fontSize:14 }}>{error}</div>}
            <div style={{ marginBottom:16 }}>
              <label style={{ display:'block', color:'var(--text2)', fontSize:13, marginBottom:6 }}>New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Min 8 characters" style={{ width:'100%', padding:'10px 14px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:14, boxSizing:'border-box' }}/>
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ display:'block', color:'var(--text2)', fontSize:13, marginBottom:6 }}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password" style={{ width:'100%', padding:'10px 14px', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:14, boxSizing:'border-box' }}/>
            </div>
            <button type="submit" disabled={loading} style={{ width:'100%', padding:'12px', background:'var(--teal)', border:'none', borderRadius:8, color:'#0a0f1a', fontWeight:700, fontSize:16, cursor:'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
