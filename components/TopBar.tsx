// components/TopBar.tsx
'use client';
import React from 'react';
import { supabase } from '@/lib/supabaseClient'; // if this import path errors, use: import { supabase } from '../lib/supabaseClient';

const allowedCoachEmails = ['rileyethan5@gmail.com']; // <-- put your coach email(s) here

export default function TopBar() {
  const [email, setEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleSignOut() {
    try { await supabase.auth.signOut(); } catch {}
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('ert_') || k.startsWith('ybl_'))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    window.location.href = '/auth';
  }

  const isCoach = email ? allowedCoachEmails.includes(email) : false;

  return (
    <div
      style={{
        borderBottom: '1px solid #e5e7eb',
        padding: '10px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <a href="/scheduler" style={{ fontWeight: 700, textDecoration: 'none', color: '#111' }}>
        Ethan Riley Training
      </a>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <a href="/pricing" style={{ textDecoration: 'none', color: '#111' }}>Pricing</a>

        {isCoach && (
          <>
            <a href="/coach/subscriptions" style={{ textDecoration: 'none', color: '#111' }}>Coach</a>
            <a href="/coach/calendar" style={{ textDecoration: 'none', color: '#111' }}>Coach Calendar</a>
          </>
        )}

        <a href="/register" style={{ textDecoration: 'none', color: '#111' }}>Register Athlete</a>

        <button
          onClick={handleSignOut}
          style={{
            padding: '6px 10px',
            borderRadius: 10,
            border: '1px solid #111',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
