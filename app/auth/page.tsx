// app/auth/page.tsx
'use client';
export const dynamic = 'force-dynamic';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Mode = 'signIn' | 'signUp';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>('signIn');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Allow /auth?mode=signUp
  React.useEffect(() => {
    const m = new URLSearchParams(window.location.search).get('mode');
    if ((m || '').toLowerCase() === 'signup') setMode('signUp');
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.replace('/scheduler');
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setMsg('Account created. You can sign in now.');
        setMode('signIn');
      }
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    const input = prompt('Enter your account email to reset password:')?.trim();
    if (!input) return;
    try {
      setLoading(true);
      setErr(null);
      setMsg(null);
      const { error } = await supabase.auth.resetPasswordForEmail(input, {
        redirectTo: `${location.origin}/auth/reset`,
      });
      if (error) throw error;
      setMsg('Reset link sent. Check your email.');
    } catch (e: any) {
      setErr(e?.message || 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 16,
        background: '#0b0b0b',
        color: '#fff',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#111',
          border: '1px solid #222',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
        }}
      >
        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => setMode('signIn')}
            aria-pressed={mode === 'signIn'}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #333',
              background: mode === 'signIn' ? '#1f2937' : '#0f172a',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signUp')}
            aria-pressed={mode === 'signUp'}
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #333',
              background: mode === 'signUp' ? '#1f2937' : '#0f172a',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Create account
          </button>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
          {mode === 'signIn' ? 'Sign in' : 'Create your account'}
        </h1>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 14, color: '#cbd5e1' }}>Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid #374151',
                background: '#0b1220',
                color: '#fff',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 14, color: '#cbd5e1' }}>Password</span>
            <input
              type="password"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid #374151',
                background: '#0b1220',
                color: '#fff',
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #111',
              background: '#fff',
              color: '#111',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {loading
              ? mode === 'signIn'
                ? 'Signing in…'
                : 'Creating…'
              : mode === 'signIn'
              ? 'Sign in'
              : 'Create account'}
          </button>
        </form>

        {/* Actions under the form */}
        <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
          {/* Forgot password only when signing in */}
          {mode === 'signIn' && (
            <button
              type="button"
              onClick={handleForgot}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #374151',
                background: '#0f172a',
                color: '#cbd5e1',
                cursor: 'pointer',
              }}
            >
              Forgot password?
            </button>
          )}

          {mode === 'signIn' ? (
            <button
              type="button"
              onClick={() => setMode('signUp')}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #374151',
                background: '#0f172a',
                color: '#cbd5e1',
                cursor: 'pointer',
              }}
            >
              Don’t have an account? Create one
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode('signIn')}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid #374151',
                background: '#0f172a',
                color: '#cbd5e1',
                cursor: 'pointer',
              }}
            >
              Already have an account? Sign in
            </button>
          )}
        </div>

        {err && (
          <div style={{ marginTop: 12, color: '#fecaca', fontSize: 14 }}>
            {err}
          </div>
        )}
        {msg && (
          <div style={{ marginTop: 12, color: '#bbf7d0', fontSize: 14 }}>
            {msg}
          </div>
        )}
      </div>
    </main>
  );
}
