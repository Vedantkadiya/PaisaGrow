import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../api';

export default function Leaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getLeaderboard()
      .then(d => setData(Array.isArray(d) ? d : []))
      .catch(() => setError("Could not load leaderboard. Make sure you are logged in."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--teal)', borderRadius: '50%', animation: 'spin .7s linear infinite', margin: '0 auto' }} />
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ color: 'var(--text)', marginBottom: 8 }}>🏆 Leaderboard</h1>
      <p style={{ color: 'var(--text2)', marginBottom: 24, fontSize: 14 }}>
        Top 10 traders by simulated 1-year return. Names are anonymized.
      </p>

      {error && <div style={{ color: 'var(--red)', padding: '12px', background: 'var(--red-bg)', borderRadius: 8, marginBottom: 16 }}>{error}</div>}

      {data && data.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📊</div>
          <h3 style={{ color: 'var(--text)' }}>No traders yet</h3>
          <p style={{ color: 'var(--text2)' }}>Be the first to buy stocks and appear here!</p>
        </div>
      )}

      {data && data.length > 0 && (
        <div style={{ background: 'var(--card)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 100px', background: 'var(--bg3)', padding: '12px 20px', fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            <span>Rank</span>
            <span>Trader</span>
            <span style={{ textAlign: 'right' }}>Return %</span>
          </div>
          {data.map(row => (
            <div key={row.rank} style={{
              display: 'grid', gridTemplateColumns: '60px 1fr 100px',
              padding: '14px 20px',
              borderBottom: '1px solid var(--border)',
              background: row.is_me ? 'rgba(34,211,165,0.07)' : 'transparent',
              alignItems: 'center',
            }}>
              <span style={{ fontWeight: 700, color: row.rank <= 3 ? 'var(--gold)' : 'var(--text3)', fontSize: row.rank <= 3 ? 18 : 14 }}>
                {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
              </span>
              <span style={{ color: row.is_me ? 'var(--teal)' : 'var(--text)', fontWeight: row.is_me ? 700 : 400 }}>
                {row.name} {row.is_me && <span style={{ fontSize: 11, color: 'var(--teal)' }}>← You</span>}
              </span>
              <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600, color: row.return_pct >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {row.return_pct >= 0 ? '+' : ''}{row.return_pct}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
