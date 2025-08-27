// app/profile/page.tsx
'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import TopBar from '@/components/TopBar';

type AthleteRow = {
  id: string;
  full_name: string | null;
  age: number | null;
  position: string | null;
  throws: 'R' | 'L' | null;
  bats: 'R' | 'L' | 'S' | null;
  school: string | null;
  photo_url: string | null;
  grad_year: number | null;
  jersey_number: number | null;
  height_in: number | null;
  weight_lb: number | null;
};

type VideoRow = {
  id: string;
  title: string | null;
  url: string;
  created_at: string;
};

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #374151',
  background: '#0b1220',
  color: '#fff',
};

export default function ProfilePage() {
  const [athletes, setAthletes] = React.useState<AthleteRow[]>([]);
  const [selectedId, setSelectedId] = React.useState<string>('');
  const [form, setForm] = React.useState<Partial<AthleteRow>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [videos, setVideos] = React.useState<VideoRow[]>([]);
  const [vErr, setVErr] = React.useState<string | null>(null);
  const [vLoading, setVLoading] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data, error } = await supabase
          .from('athletes')
          .select('id, full_name, age, position, throws, bats, school, photo_url, grad_year, jersey_number, height_in, weight_lb')
          .order('full_name', { ascending: true });
        if (error) throw error;
        setAthletes((data ?? []) as AthleteRow[]);
      } catch (e: any) {
        setErr(e?.message || 'Failed to load athletes');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load form when athlete changes
  React.useEffect(() => {
    const a = athletes.find((x) => x.id === selectedId);
    if (!a) { setForm({}); setVideos([]); return; }
    setForm({
      age: a.age ?? null,
      position: a.position ?? '',
      throws: (a.throws as any) ?? null,
      bats: (a.bats as any) ?? null,
      school: a.school ?? '',
      photo_url: a.photo_url ?? null,
      grad_year: a.grad_year ?? null,
      jersey_number: a.jersey_number ?? null,
      height_in: a.height_in ?? null,
      weight_lb: a.weight_lb ?? null,
    });

    // Fetch videos for this athlete (RLS ensures only owner can read)
    (async () => {
      setVLoading(true); setVErr(null);
      try {
        const { data, error } = await supabase
          .from('athlete_videos')
          .select('id, title, url, created_at')
          .eq('athlete_id', a.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setVideos((data ?? []) as VideoRow[]);
      } catch (e: any) {
        setVErr(e?.message || 'Failed to load videos');
      } finally {
        setVLoading(false);
      }
    })();
  }, [selectedId, athletes]);

  async function saveProfile() {
    if (!selectedId) { setErr('Pick an athlete first'); return; }
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      const payload = {
        age: form.age ?? null,
        position: (form.position || '').trim() || null,
        throws: form.throws ?? null,
        bats: form.bats ?? null,
        school: (form.school || '').trim() || null,
        photo_url: form.photo_url ?? null,
        grad_year: form.grad_year ?? null,
        jersey_number: form.jersey_number ?? null,
        height_in: form.height_in ?? null,
        weight_lb: form.weight_lb ?? null,
      };
      const { error } = await supabase
        .from('athletes')
        .update(payload)
        .eq('id', selectedId);
      if (error) throw error;
      setMsg('Saved!');
    } catch (e: any) {
      setErr(e?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  async function onPickPhoto(file: File) {
    if (!selectedId) { setErr('Pick an athlete first'); return; }
    setUploading(true);
    setErr(null);
    setMsg(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      const uid = userData.user?.id || 'unknown';
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${uid}/${selectedId}.${ext}`;

      const { error: upErr } = await supabase
        .storage.from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = pub.publicUrl;

      const { error: updErr } = await supabase
        .from('athletes')
        .update({ photo_url: url })
        .eq('id', selectedId);
      if (updErr) throw updErr;

      setForm((f) => ({ ...f, photo_url: url }));
      setMsg('Photo updated!');
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
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Athlete Profile</h1>

        {/* Athlete selector */}
        <label style={{ display: 'grid', gap: 6, maxWidth: 420, marginBottom: 16 }}>
          <span style={{ fontSize: 14, color: '#cbd5e1' }}>Athlete</span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ ...inputBase, background: '#0b1220' }}
          >
            <option value="">— Select athlete —</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name || 'Unnamed'}
              </option>
            ))}
          </select>
        </label>

        {/* Form */}
        {selectedId ? (
          <div
            style={{
              display: 'grid',
              gap: 16,
              maxWidth: 720,
              border: '1px solid #222',
              borderRadius: 12,
              padding: 16,
              background: '#111',
            }}
          >
            {/* Photo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden', border: '1px solid #374151', background: '#0b1220' }}>
                {form.photo_url ? (
                  <img src={form.photo_url} alt="Player headshot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: 12 }}>
                    No photo
                  </div>
                )}
              </div>
              <label style={{ display: 'inline-block' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files && e.target.files[0] && onPickPhoto(e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <span
                  style={{
                    display: 'inline-block',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid #374151',
                    background: '#0f172a',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {uploading ? 'Uploading…' : 'Upload Photo'}
                </span>
              </label>
            </div>

            {/* Basics */}
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              {/* age/position/throws/bats/school ... (unchanged) */}
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>Age</span>
                <input
                  type="number" min={4} max={25}
                  value={form.age ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, age: e.target.value ? Number(e.target.value) : null }))}
                  style={inputBase}
                  placeholder="e.g., 14"
                />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>Position</span>
                <select
                  value={form.position ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  style={inputBase}
                >
                  <option value="">— Select —</option>
                  <option>P</option><option>C</option>
                  <option>1B</option><option>2B</option><option>3B</option><option>SS</option>
                  <option>LF</option><option>CF</option><option>RF</option>
                  <option>INF</option><option>OF</option><option>Utility</option>
                </select>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>Throwing hand</span>
                <select
                  value={form.throws ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, throws: (e.target.value || null) as any }))}
                  style={inputBase}
                >
                  <option value="">— Select —</option>
                  <option value="R">Right (R)</option>
                  <option value="L">Left (L)</option>
                </select>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>Bats</span>
                <select
                  value={form.bats ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, bats: (e.target.value || null) as any }))}
                  style={inputBase}
                >
                  <option value="">— Select —</option>
                  <option value="R">Right (R)</option>
                  <option value="L">Left (L)</option>
                  <option value="S">Switch (S)</option>
                </select>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>School (MS/HS/College)</span>
                <input
                  type="text"
                  value={form.school ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))}
                  style={inputBase}
                  placeholder="e.g., Franklin High School"
                />
              </div>
            </div>

            {/* New fields */}
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>Grad Year</span>
                <input
                  type="number" min={2000} max={2040}
                  value={form.grad_year ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, grad_year: e.target.value ? Number(e.target.value) : null }))}
                  style={inputBase}
                  placeholder="e.g., 2029"
                />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>Jersey #</span>
                <input
                  type="number" min={0} max={99}
                  value={form.jersey_number ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, jersey_number: e.target.value ? Number(e.target.value) : null }))}
                  style={inputBase}
                  placeholder="e.g., 12"
                />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>Height (inches)</span>
                <input
                  type="number" min={36} max={90}
                  value={form.height_in ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, height_in: e.target.value ? Number(e.target.value) : null }))}
                  style={inputBase}
                  placeholder="e.g., 68"
                />
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <span style={{ fontSize: 14, color: '#cbd5e1' }}>Weight (lb)</span>
                <input
                  type="number" min={50} max={350}
                  value={form.weight_lb ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, weight_lb: e.target.value ? Number(e.target.value) : null }))}
                  style={inputBase}
                  placeholder="e.g., 155"
                />
              </div>
            </div>

            <div>
              <button
                onClick={saveProfile}
                disabled={saving}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid #111',
                  background: '#fff',
                  color: '#111',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
              {msg && <span style={{ marginLeft: 10, color: '#bbf7d0' }}>{msg}</span>}
              {err && <span style={{ marginLeft: 10, color: '#fecaca' }}>{err}</span>}
            </div>

            {/* Videos list */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Videos</div>
              {vLoading && <div style={{ color: '#94a3b8' }}>Loading videos…</div>}
              {vErr && <div style={{ color: '#fecaca' }}>{vErr}</div>}
              {!vLoading && !vErr && videos.length === 0 && (
                <div style={{ color: '#94a3b8' }}>No videos yet.</div>
              )}
              <div style={{ display: 'grid', gap: 12 }}>
                {videos.map(v => (
                  <div key={v.id} style={{ border: '1px solid #222', borderRadius: 10, padding: 12, background: '#0f172a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontWeight: 700 }}>{v.title || 'Untitled video'}</div>
                      <div style={{ color: '#94a3b8', fontSize: 12 }}>
                        {new Date(v.created_at).toLocaleString()}
                      </div>
                    </div>
                    <video
                      controls
                      src={v.url}
                      style={{ width: '100%', borderRadius: 8, background: '#000' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          !loading && (
            <div style={{ color: '#94a3b8' }}>Pick an athlete to edit their profile.</div>
          )
        )}

        {loading && <div style={{ color: '#94a3b8' }}>Loading…</div>}
      </div>
    </main>
  );
}
