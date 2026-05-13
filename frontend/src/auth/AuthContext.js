/**
 * AuthContext.js — PaisaGrow Authentication (Django REST backend)
 *
 * Replaces the previous localStorage-only auth with JWT tokens via Django.
 * All user data is now stored server-side.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { auth as authApi, setTokens, clearTokens, getAccessToken, getRefreshToken, logoutApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);  // true while checking existing session

  // On mount: rehydrate from stored token
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authApi.me()
      .then(u => setUser(u))
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  // Listen for forced logout (401 with no valid refresh)
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('pg:logout', handler);
    return () => window.removeEventListener('pg:logout', handler);
  }, []);

  // ── Sign Up ────────────────────────────────────────────────────────────────
  const signUp = useCallback(async ({ name, email, password }) => {
    if (!name?.trim()) return { error: 'Name is required' };
    if (!email?.trim()) return { error: 'Email is required' };
    if (!password) return { error: 'Password is required' };

    try {
      const data = await authApi.register({ name: name.trim(), email: email.trim().toLowerCase(), password });
      setTokens({ access: data.access, refresh: data.refresh });
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { error: err.message || 'Registration failed' };
    }
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async ({ email, password }) => {
    try {
      const data = await authApi.login({ email: email.trim().toLowerCase(), password });
      setTokens({ access: data.access, refresh: data.refresh });
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { error: err.message || 'Invalid email or password' };
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    await logoutApi(refresh);
    clearTokens();
    setUser(null);
  }, []);

  // ── Change Password ────────────────────────────────────────────────────────
  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }, []);

  // ── Forgot Password ────────────────────────────────────────────────────────
  const forgotPassword = useCallback(async ({ email }) => {
    try {
      const data = await authApi.forgotPassword({ email });
      return { success: true, ...data };
    } catch (err) {
      return { error: err.message };
    }
  }, []);

  // ── Reset Password ─────────────────────────────────────────────────────────
  const resetPassword = useCallback(async ({ uid, token, newPassword }) => {
    try {
      const data = await authApi.resetPassword({ uid, token, newPassword });
      return { success: true, ...data };
    } catch (err) {
      return { error: err.message };
    }
  }, []);

  // ── Update Profile ─────────────────────────────────────────────────────────
  const updateProfile = useCallback(async ({ name }) => {
    try {
      const updated = await authApi.updateProfile({ first_name: name });
      setUser(prev => ({ ...prev, ...updated, name: updated.name }));
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }, []);

  // ── Delete Account ─────────────────────────────────────────────────────────
  const deleteAccount = useCallback(async ({ password }) => {
    try {
      await authApi.deleteAccount({ password });
      clearTokens();
      setUser(null);
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading,
      signUp, login, logout,
      changePassword, forgotPassword, resetPassword,
      updateProfile, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Kept for compatibility — no longer needed (data is server-side) */
export function getUserDataKey(userId, suffix) {
  return `pg_${userId}_${suffix}`;
}
