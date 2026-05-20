/**
 * api.js — PaisaGrow API client
 * All requests go through Django REST Framework backend.
 */

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// FIX HIGH: Derive auth base once — avoids the fragile BASE_URL.replace('/api', '') pattern
// that breaks if the host URL contains /api anywhere else (e.g. https://api.mysite.com/api)
const AUTH_BASE = BASE_URL.endsWith('/api')
  ? BASE_URL.slice(0, -4)   // strip trailing /api
  : BASE_URL.replace(/\/api.*$/, '');

// ── Token storage ─────────────────────────────────────────────────────────────
export function getAccessToken()  { return localStorage.getItem('pg_access'); }
export function getRefreshToken() { return localStorage.getItem('pg_refresh'); }
export function setTokens({ access, refresh }) {
  localStorage.setItem('pg_access', access);
  if (refresh) localStorage.setItem('pg_refresh', refresh);
}
export function clearTokens() {
  localStorage.removeItem('pg_access');
  localStorage.removeItem('pg_refresh');
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch(path, options = {}, retry = true) {
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Try to refresh if 401
  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return apiFetch(path, options, false);
    clearTokens();
    window.dispatchEvent(new Event('pg:logout'));
    return res;
  }

  return res;
}

async function tryRefresh() {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    // FIX HIGH: Use AUTH_BASE instead of BASE_URL.replace('/api', '') which breaks
    // when the host URL itself contains /api (e.g. https://api.example.com/api)
    const res = await fetch(`${AUTH_BASE}/api/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens({ access: data.access, refresh: data.refresh });
    return true;
  } catch {
    return false;
  }
}

async function handleResponse(res) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // FIX MEDIUM: DRF error objects can be nested arrays/objects.
    // Object.values(data).flat().join(' ') renders them as "[object Object]".
    // This recursive extractor flattens all nested DRF error messages correctly.
    const extractMessages = (obj) => {
      if (typeof obj === 'string') return obj;
      if (Array.isArray(obj)) return obj.map(extractMessages).join(' ');
      if (obj && typeof obj === 'object') return Object.values(obj).map(extractMessages).join(' ');
      return String(obj);
    };
    const msg =
      data.detail ||
      data.error ||
      extractMessages(data) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  async register({ name, email, password }) {
    const res = await apiFetch('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ first_name: name, email, password, password2: password }),
    }, false);
    return handleResponse(res);
  },

  async login({ email, password }) {
    // FIX HIGH: Use AUTH_BASE consistently — same fix as tryRefresh above
    const res = await fetch(`${AUTH_BASE}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password }),
    });
    return handleResponse(res);
  },

  async me() {
    const res = await apiFetch('/auth/me/');
    return handleResponse(res);
  },

  async updateProfile({ first_name }) {
    const res = await apiFetch('/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify({ first_name }),
    });
    return handleResponse(res);
  },

  async changePassword({ currentPassword, newPassword }) {
    const res = await apiFetch('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
    return handleResponse(res);
  },

  // ── Google OAuth ────────────────────────────────────────────────────────────
  // Sends the Google ID token (credential) received from Google Identity Services
  // to our backend, which verifies it and returns our own JWT pair.
  async googleLogin({ credential }) {
    const res = await fetch(`${AUTH_BASE}/api/auth/google/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    return handleResponse(res);
  },

  async forgotPassword({ email }) {
    const res = await fetch(`${AUTH_BASE}/api/auth/forgot-password/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return handleResponse(res);
  },

  async resetPassword({ uid, token, newPassword }) {
    // Support both old uid+token format and new signed token format
    const body = uid ? { uid, token, new_password: newPassword } : { token, new_password: newPassword };
    const res = await fetch(`${AUTH_BASE}/api/auth/reset-password/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  async deleteAccount({ password }) {
    const res = await apiFetch('/auth/me/', {
      method: 'DELETE',
      // Send refresh so the backend can blacklist it on account deletion
      body: JSON.stringify({ password, refresh: getRefreshToken() }),
    });
    return handleResponse(res);
  },
};

// ── Budget ────────────────────────────────────────────────────────────────────
export const budget = {
  async get() {
    const res = await apiFetch('/budget/');
    return handleResponse(res);
  },
  async set(value) {
    const res = await apiFetch('/budget/', {
      method: 'PATCH',
      body: JSON.stringify({ budget: value }),
    });
    return handleResponse(res);
  },
};

// ── Wallet ────────────────────────────────────────────────────────────────────
export const wallet = {
  async deposit({ amount, method, description }) {
    const res = await apiFetch('/wallet/deposit/', {
      method: 'POST',
      body: JSON.stringify({ amount, method, description }),
    });
    return handleResponse(res);
  },
  async withdraw({ amount, method, description }) {
    const res = await apiFetch('/wallet/withdraw/', {
      method: 'POST',
      body: JSON.stringify({ amount, method, description }),
    });
    return handleResponse(res);
  },
  async transactions() {
    const res = await apiFetch('/wallet/transactions/');
    return handleResponse(res);
  },
};

// ── Portfolio ─────────────────────────────────────────────────────────────────
export const portfolio = {
  async list() {
    const res = await apiFetch('/portfolio/');
    return handleResponse(res);
  },
  async buy(holding) {
    const res = await apiFetch('/portfolio/', {
      method: 'POST',
      body: JSON.stringify(holding),
    });
    return handleResponse(res);
  },
  async sell(id, { qty, price }) {
    const res = await apiFetch(`/portfolio/${id}/?qty=${qty}&price=${price}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },
};

// ── Watchlist ─────────────────────────────────────────────────────────────────
export const watchlist = {
  async list() {
    const res = await apiFetch('/watchlist/');
    return handleResponse(res);
  },
  async add(item) {
    const res = await apiFetch('/watchlist/', {
      method: 'POST',
      body: JSON.stringify(item),
    });
    return handleResponse(res);
  },
  async update(id, data) {
    const res = await apiFetch(`/watchlist/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  async remove(id) {
    const res = await apiFetch(`/watchlist/${id}/`, { method: 'DELETE' });
    return handleResponse(res);
  },
};

// ── Goals ─────────────────────────────────────────────────────────────────────
export const goals = {
  async list() {
    const res = await apiFetch('/goals/');
    return handleResponse(res);
  },
  async create(goal) {
    const res = await apiFetch('/goals/', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
    return handleResponse(res);
  },
  async update(id, data) {
    const res = await apiFetch(`/goals/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  async remove(id) {
    const res = await apiFetch(`/goals/${id}/`, { method: 'DELETE' });
    return handleResponse(res);
  },
};

// ── SIP ───────────────────────────────────────────────────────────────────────
export const sip = {
  async getSettings() {
    const res = await apiFetch('/sip/settings/');
    return handleResponse(res);
  },
  async saveSettings(data) {
    const res = await apiFetch('/sip/settings/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  async getLogs() {
    const res = await apiFetch('/sip/logs/');
    return handleResponse(res);
  },
  async addLog(log) {
    const res = await apiFetch('/sip/logs/', {
      method: 'POST',
      body: JSON.stringify(log),
    });
    return handleResponse(res);
  },
  async removeLog(id) {
    const res = await apiFetch(`/sip/logs/${id}/`, { method: 'DELETE' });
    return handleResponse(res);
  },
};

// ── Daily Tracker ─────────────────────────────────────────────────────────────
export const tracker = {
  async list(params = {}) {
    const q = new URLSearchParams(params).toString();
    const res = await apiFetch(`/tracker/${q ? '?' + q : ''}`);
    return handleResponse(res);
  },
  async add(entry) {
    const res = await apiFetch('/tracker/', {
      method: 'POST',
      body: JSON.stringify(entry),
    });
    return handleResponse(res);
  },
  async update(id, data) {
    const res = await apiFetch(`/tracker/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
  async remove(id) {
    const res = await apiFetch(`/tracker/${id}/`, { method: 'DELETE' });
    return handleResponse(res);
  },
};

// ── Portfolio extras (Item 20, 26) ────────────────────────────────────────────
export async function exportPortfolioCsv() {
  const res = await apiFetch('/portfolio/export/');
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'portfolio.csv';
  // Must append to DOM for Firefox compatibility (Chrome works without it)
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportTransactionsCsv() {
  const res = await apiFetch('/wallet/transactions/export/');
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'transactions.csv';
  // Must append to DOM for Firefox compatibility (Chrome works without it)
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function getPortfolioSummary() {
  const res = await apiFetch('/portfolio/summary/');
  return handleResponse(res);
}

export async function getLeaderboard() {
  const res = await apiFetch('/leaderboard/');
  return handleResponse(res);
}

// ── Logout (Item 9) ───────────────────────────────────────────────────────────
export async function logoutApi(refresh) {
  try {
    const token = getAccessToken();
    await fetch(`${BASE_URL}/auth/logout/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ refresh }),
    });
  } catch (_) {
    // Best effort
  }
}
