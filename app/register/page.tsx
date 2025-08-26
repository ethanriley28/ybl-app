'use client';
import React from 'react';
import { supabase } from '@/lib/supabaseClient'; // if this path errors, use: import { supabase } from '../../lib/supabaseClient';
import AuthGuard from '@/components/AuthGuard';
import TopBar from '@/components/TopBar';

export default function RegisterAthletePage() {
  const [name, setName] = React.useState('');
  const [msg, setMsg] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const trimmed = name.trim();
    if (!trimmed) { setMsg('Enter an athlete name.'); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/auth'; return; }
      const { error } = await supabase
        .from('athletes')
        .insert({ user_id: user.id, name: trimmed });
      if (error) setMsg(error.message);
      else { setMsg('Registered!'); setName(''); }
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard>
      <TopBar />
      <main style={{ maxWidth: 720, margin: '24px auto', padding: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Register Athlete</h1>
        <p style={{ marginTop: 8, color: '#374151' }}>
          Add your athlete so you can book sessions and track metrics.
        </p>

        <form onSubmit={onSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginTop: 16 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Athlete name (e.g., Aiden J.)"
            aria-label="Athlete name"
            style={{ padding: 10, borderRadius: 10, border: '1px solid #d1d5db' }}
          />
          <button
            type="submit"
            disabled={saving}
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #111', background: '#111', color: '#fff', minWidth: 120 }}
          >
            {saving ? 'Saving…' : 'Register'}
          </button>
        </form>

        {msg && (
          <div aria-live="polite" role="status" style={{ marginTop: 10 }}>
            {msg}
          </div>
        )}

        <a href="/scheduler" style={{ display: 'inline-block', marginTop: 24, padding: '10px 14px', border: '1px solid #111', borderRadius: 10, textDecoration: 'none', color: '#111' }}>
          Back to Scheduler
        </a>
      </main>
    </AuthGuard>
  );
}
