'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TopBar() {
  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  const link = (href: string, label: string) => (
    <a
      key={href}
      href={href}
      style={{
        padding: '8px 12px',
        borderRadius: 10,
        border: '1px solid #374151',
        background: '#0f172a',
        color: '#fff',
        textDecoration: 'none',
        whiteSpace: 'nowrap'
      }}
    >
      {label}
    </a>
  );

  return (
    <header style={{ background: '#0b0b0b', borderBottom: '1px solid #111' }}>
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}
      >
        <a
          href="/scheduler"
          style={{ color: '#fff', fontWeight: 800, fontSize: 20, textDecoration: 'none' }}
        >
          Ethan Riley Training
        </a>

        {/* Scrollable on mobile so everything stays visible */}
        <nav style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {link('/pricing', 'Pricing')}
          {link('/scheduler', 'Schedule')}
          {link('/metrics', 'Metrics')}
          {link('/register', 'Register Athlete')}
          {link('/profile', 'Profile')}
          <button
            onClick={handleSignOut}
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              border: '1px solid #374151',
              background: '#fff',
              color: '#0b0b0b',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer'
            }}
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
