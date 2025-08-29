// app/coach/videos/page.tsx
'use client';

import * as React from 'react';
import TopBar from '@/components/TopBar';
import { supabase } from '@/lib/supabaseClient';

type Athlete = { id: string; full_name: string | null };

export default function CoachVideosPage() {
  const [athletes, setAthletes] = React.useState<Athlete[]>([]);
  const [athleteId, setAthleteId] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [file, setFile] = React.useState<File | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // Require session
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/auth'; return; }
        // List all athletes via coach API
        const res = await fetch('/api/coach/athletes', { cache: 'no-store' });
        if (!res.ok) throw new Error('Forbidden or failed to load athletes');
        const j = await res.json();
        setAthletes(j.athletes || []);
      } catch (e: any) {
        setErr(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleUpload() {
    if (!athleteId) { setErr('Choose an athlete'); return; }
    if (!file) { setErr('Pick a video file'); return; }
    setErr(null); setMsg(null); setUploading(true);

    try {
      const safeName = file.name.replace(/\s+/g, '_');
      const key = `${athleteId}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase
        .storage.from('videos')
        .upload(key, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('videos').getPublicUrl(key);
      const url = pub.publicUrl;

      // Tell server to create DB row (coach-only)
      const res = await fetch('/api/coach/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athleteId, title, url }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Failed to save video record');
      }

      setMsg('Uploaded!');
      setTitle('');
      setFile(null);
      (document.getElementById('file-input') as HTMLInputElement | null)?.value = '';
    } catch (e: any) {
      setErr(e?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <main style={{ minHeight: '100dvh', background: '#0b0b0b', color: '#fff' }}>
      <TopBar />
      <div style={{ maxWidth: 900, margin: '24px auto', padding: '0 16px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Coach · Upload Video</h1>

        {loading && <div style={{ color: '#94a3b8' }}>Loading…</div>}
        {err && <div style={{ color: '#fecaca' }}>{err}</div>}

        {!loading && !err && (
          <div style={{ display: 'grid', gap: 12, maxWidth: 700, background: '#111', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 14, color: '#cbd5e1' }}>Athlete</span>
              <select
                value={athleteId}
                onChange={(e) => setAthleteId(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #374151', background: '#0b1220', color: '#fff' }}
              >
                <option value="">— Select athlete —</option>
                {athletes.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name || 'Unnamed'}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 14, color: '#cbd5e1' }}>Title (optional)</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Load move drill 8/27"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #374151', background: '#0b1220', color: '#fff' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontSize: 14, color: '#cbd5e1' }}>Video file (.mp4/.mov)</span>
              <input
                id="file-input"
                type="file"
                accept="video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ color: '#cbd5e1' }}
              />
              <div style={{ color: '#94a3b8', fontSize: 12 }}>
                Tip: keep under ~200MB for smoother upload/stream.
              </div>
            </label>

            <button
              onClick={handleUpload}
              disabled={uploading}
              style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #111', background: '#fff', color: '#111', fontWeight: 800, cursor: 'pointer' }}
            >
              {uploading ? 'Uploading…' : 'Upload & Save'}
            </button>

            {msg && <div style={{ color: '#bbf7d0' }}>{msg}</div>}
            {err && <div style={{ color: '#fecaca' }}>{err}</div>}
          </div>
        )}
      </div>
    </main>
  );
}
