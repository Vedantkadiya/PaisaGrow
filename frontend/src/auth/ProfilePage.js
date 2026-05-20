/**
 * ProfilePage.js — User profile, settings, password change, account deletion
 */
import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { clearAllData } from '../hooks/useLocalStorage';

const Card = ({ title, children }) => (
  <div style={{
    background: 'var(--bg2)', border: '1px solid var(--border)',
    borderRadius: 14, padding: 'clamp(14px, 4vw, 24px)', marginBottom: 16
  }}>
    <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 15,
      color: 'var(--text1)', marginBottom: 18, paddingBottom: 12,
      borderBottom: '1px solid var(--border)' }}>{title}</div>
    {children}
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)',
      fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '.04em',
      marginBottom: 6 }}>{label}</label>
    {children}
  </div>
);

const Input = ({ style, ...props }) => (
  <input style={{
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '10px 14px', color: 'var(--text1)', fontSize: 14,
    outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color .18s',
    ...style,
  }} {...props} />
);

const Btn = ({ danger, children, ...rest }) => (
  <button style={{
    padding: '12px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', minHeight: 44,
    fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13,
    background: danger ? 'rgba(244,83,108,.12)' : 'var(--teal)',
    color: danger ? 'var(--red)' : '#0a0f1a',
    transition: 'opacity .18s',
  }} onMouseOver={e => e.currentTarget.style.opacity='.8'}
     onMouseOut={e  => e.currentTarget.style.opacity='1'} {...rest}>
    {children}
  </button>
);

const Alert = ({ type, msg }) => !msg ? null : (
  <div style={{
    padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13,
    background: type === 'error' ? 'rgba(244,83,108,.1)' : 'rgba(34,211,165,.1)',
    border: `1px solid ${type === 'error' ? 'rgba(244,83,108,.3)' : 'rgba(34,211,165,.3)'}`,
    color: type === 'error' ? 'var(--red)' : 'var(--teal)',
  }}>{msg}</div>
);

export default function ProfilePage({ onBack }) {
  const { user, logout, changePassword, updateProfile, deleteAccount } = useAuth();

  // Guard: if user is somehow null (race with logout event), go back
  if (!user) { onBack(); return null; }

  // Profile
  const [name, setName]       = useState(user?.name || '');
  const [profileMsg, setProfileMsg] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password
  const [curPw, setCurPw]     = useState('');
  const [newPw, setNewPw]     = useState('');
  const [confPw, setConfPw]   = useState('');
  const [pwMsg, setPwMsg]     = useState(null);
  const [pwLoading, setPwLoading] = useState(false);

  // Delete
  const [delPw, setDelPw]     = useState('');
  const [delMsg, setDelMsg]   = useState(null);
  const [delLoading, setDelLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleProfile = async (e) => {
    e.preventDefault();
    // PROFILE FIX: browser `required` fires only on native submit, not after
    // e.preventDefault(). Guard here so the API call is never made with an
    // empty name, which would return a 400 from UpdateProfileSerializer.
    if (!name.trim()) {
      setProfileMsg({ type: 'error', msg: 'Name cannot be empty.' });
      return;
    }
    setProfileLoading(true);
    setProfileMsg(null);
    const res = await updateProfile({ name: name.trim() });
    setProfileLoading(false);
    setProfileMsg(res.error
      ? { type: 'error', msg: res.error }
      : { type: 'success', msg: 'Profile updated successfully!' }
    );
  };

  const handlePwChange = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confPw) { setPwMsg({ type: 'error', msg: 'New passwords do not match' }); return; }
    setPwLoading(true);
    const res = await changePassword({ currentPassword: curPw, newPassword: newPw });
    setPwLoading(false);
    setPwMsg(res.error
      ? { type: 'error', msg: res.error }
      : { type: 'success', msg: 'Password changed successfully!' }
    );
    if (!res.error) { setCurPw(''); setNewPw(''); setConfPw(''); }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDelLoading(true);
    const res = await deleteAccount({ password: delPw });
    setDelLoading(false);
    if (res.error) setDelMsg({ type: 'error', msg: res.error });
  };

  const handleResetData = () => {
    if (window.confirm('Reset ALL portfolio data? This cannot be undone.')) {
      clearAllData(user?.id);  // pass userId so pg_access/pg_refresh are NOT wiped by clearAllData (AuthContext clears them via clearTokens)
      window.location.reload();
    }
  };

  return (
    {/* RESPONSIVE FIX: fluid container, mobile padding */}
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '0 4px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onBack} style={{
          background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '6px 14px', color: 'var(--text2)', cursor: 'pointer', fontSize: 13,
          fontFamily: 'var(--font-head)'
        }}>← Back</button>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800,
          color: 'var(--text1)', margin: 0 }}>Account Settings</h2>
      </div>

      {/* Profile */}
      <Card title="👤 Profile">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--teal), var(--blue))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#0a0f1a', flexShrink: 0,
          }}>{((user?.name || user?.email || '?')[0] || '?').toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 15 }}>{user?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{user?.email}</div>
          </div>
        </div>
        <Alert {...(profileMsg || {})} />
        <form onSubmit={handleProfile}>
          <Field label="Full Name">
            <Input value={name} onChange={e => setName(e.target.value)} required />
          </Field>
          <Field label="Email">
            <Input value={user?.email} disabled style={{ opacity: .5 }} />
          </Field>
          <Btn type="submit" disabled={profileLoading}>{profileLoading ? 'Saving…' : 'Save Changes'}</Btn>
        </form>
      </Card>

      {/* Password */}
      <Card title="🔒 Change Password">
        <Alert {...(pwMsg || {})} />
        <form onSubmit={handlePwChange}>
          <Field label="Current Password">
            <Input type="password" value={curPw} onChange={e => setCurPw(e.target.value)} required autoComplete="current-password" />
          </Field>
          <Field label="New Password">
            <Input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} required autoComplete="new-password" placeholder="Min 8 chars, 1 uppercase, 1 number" />
          </Field>
          <Field label="Confirm New Password">
            <Input type="password" value={confPw} onChange={e => setConfPw(e.target.value)} required autoComplete="new-password" />
          </Field>
          <Btn type="submit" disabled={pwLoading}>{pwLoading ? 'Saving…' : 'Change Password'}</Btn>
        </form>
      </Card>

      {/* Data */}
      <Card title="💾 Data & Privacy">
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
          Your portfolio data (budget, holdings, goals, SIP logs) is securely saved to your account on our server, so it's available on any device. You can reset your local cache or delete your account at any time.
        </p>
        <Btn onClick={handleResetData} style={{ marginRight: 12 }}>🗑 Reset Portfolio Data</Btn>
        <Btn onClick={logout} danger>Sign Out</Btn>
      </Card>

      {/* Danger Zone */}
      <Card title="⚠️ Danger Zone">
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.6 }}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <Alert {...(delMsg || {})} />
        {confirmDelete ? (
          <form onSubmit={handleDelete}>
            <Field label="Enter your password to confirm deletion">
              <Input type="password" value={delPw} onChange={e => setDelPw(e.target.value)}
                required placeholder="Your current password" />
            </Field>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn type="submit" danger disabled={delLoading}>{delLoading ? 'Deleting…' : '⚠️ Permanently Delete Account'}</Btn>
              <Btn type="button" onClick={() => { setConfirmDelete(false); setDelPw(''); setDelMsg(null); }}>Cancel</Btn>
            </div>
          </form>
        ) : (
          <Btn danger onClick={() => setConfirmDelete(true)}>Delete Account</Btn>
        )}
      </Card>
    </div>
  );
}
