'use client';

import React from 'react';
import { supabase } from '@/lib/supabaseClient'; // if alias fails, use: import { supabase } from '../../lib/supabaseClient';

export default function AuthPage() {
  const [mode, setMode] = React.useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [msg, setMsg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setMsg(error.message);
        else window.location.href = '/scheduler';
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) setMsg(error.message);
        else {
          // If email confirmation is ON, they must check email. If OFF, they may be auto-signed-in.
          setMsg('Account created. Check email for confirmation if required, then sign in.');
          // Optional: try redirect if session exists
          const { data: s } = await supabase.auth.getSession();
          if (s.session) window.location.href = '/scheduler';
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword() {
    const value = prompt('Enter your email to reset password:')?.trim() || '';
    if (!value) return;
    const { error } = await supabase.auth.resetPasswordForEmail(value, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    alert(error ? error.message : 'Reset link sent! Check your email.');
  }

  return (
    <main style={{ maxWidth: 520, margin: '60px auto', padding: 16 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 10 }}>
        {mode === 'signIn' ? 'Sign in' : 'Create account'}
      </h1>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <label style={{ fontSize: 13, color: '#374151' }}>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #d1d5db', marginTop: 6 }}
            required
          />
        </label>

        <label style={{ fontSize: 13, color: '#374151' }}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #d1d5db', marginTop: 6 }}
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #111',
            background: '#111',
            color: '#fff',
            cursor: 'pointer',
            minWidth: 140
          }}
        >
          {loading ? 'Please wait…' : (mode === 'signIn' ? 'Sign in' : 'Create account')}
        </button>

        {mode === 'signIn' && (
          <button
            type="button"
            onClick={onForgotPassword}
            style={{
              background: 'transparent',
              border: 0,
              color: '#111',
              textDecoration: 'underline',
              marginTop: -4,
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            Forgot password?
          </button>
        )}

        {msg && (
          <div role="status" aria-live="polite" style={{ marginTop: 4 }}>
            {msg}
          </div>
        )}
      </form>

      <div style={{ marginTop: 14, fontSize: 14 }}>
        {mode === 'signIn' ? (
          <>
            Don’t have an account?{' '}
            <button
              type="button"
              onClick={() => (setMode('signUp'), setMsg(null))}
              style={{ background: 'transparent', border: 0, color: '#111', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Create one
            </button>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => (setMode('signIn'), setMsg(null))}
              style={{ background: 'transparent', border: 0, color: '#111', textDecoration: 'underline', cursor: 'pointer' }}
            >
              Sign in
            </button>
          </>
        )}
      </div>

      <a href="/scheduler" style={{ display: 'inline-block', marginTop: 24, textDecoration: 'none', color: '#111' }}>
        ← Back to Scheduler
      </a>
    </main>
  );
}
