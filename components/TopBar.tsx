// components/TopBar.tsx
'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

const btnLinkStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '8px 12px',
  borderRadius: 10,
  border: '1px solid #374151',
  background: '#0f172a',
  color: '#ffffff',
  textDecoration: 'none',
  fontWeight: 700,
  lineHeight: 1.2,
};

export default function TopBar() {
  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = '/auth';
    }
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: '#0b0b0b',
        borderBottom: '1px solid #222',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap', // allows wrapping on small screens
        }}
      >
        {/* Brand (clickable) */}
        <a
          href="/scheduler"
          style={{
            color: '#ffffff',
            textDecoration: 'none',
            fontWeight: 900,
            fontSize: 18,
            letterSpacing: 0.3,
            lineHeight: 1.2,
          }}
          aria-label="Go to Scheduler"
        >
          Ethan Riley Training
        </a>

        {/* Nav buttons */}
        <nav
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <a href="/pricing" style={btnLinkStyle}>
            Pricing
          </a>
          <a href="/register" style={btnLinkStyle}>
            Register Athlete
          </a>
        </nav>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          style={{
            padding: '8px 12px',
            borderRadius: 10,
            border: '1px solid #111',
            background: '#ffffff',
            color: '#111111',
            fontWeight: 800,
            cursor: 'pointer',
            lineHeight: 1.2,
          }}
          aria-label="Sign out"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
