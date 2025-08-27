// app/auth/reset/page.tsx
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Supabase will set a recovery session when the user arrives via the email link.
  // We just show the form and call updateUser.
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (!password || password.length < 6) return setErr('Password must be at least 6 characters');
    if (password !== confirm) return setErr('Passwords do not match');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setErr(error.message);
    setMsg('Password updated! Redirecting…');
    setTimeout(() => router.replace('/scheduler'), 1000);
  }

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16, background: '#0b0b0b', color: '#fff' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#111', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Set a new password</h1>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 14, color: '#cbd5e1' }}>New password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #374151', background: '#0b1220', color: '#fff' }}
            />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 14, color: '#cbd5e1' }}>Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #374151', background: '#0b1220', color: '#fff' }}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #111', background: '#fff', color: '#111', fontWeight: 800, cursor: 'pointer' }}
          >
            {loading ? 'Saving…' : 'Save new password'}
          </button>
        </form>
        {err && <div style={{ marginTop: 12, color: '#fecaca', fontSize: 14 }}>{err}</div>}
        {msg && <div style={{ marginTop: 12, color: '#bbf7d0', fontSize: 14 }}>{msg}</div>}
      </div>
    </main>
  );
}
