'use client';

import * as React from 'react';
import TopBar from '@/components/TopBar';
import { supabase } from '@/lib/supabaseClient';

type Athlete = { id: string; full_name: string | null };

type MetricRow = {
  id: string;
  date: string;             // ISO string
  exit_velo: number | null;
  hand_speed: number | null;
  bat_speed: number | null;
  pitch_velo: number | null;
  of_velo: number | null;
  if_velo: number | null;
  sixty_time: number | null;
  pop_time: number | null;
  notes: string | null;
};

export default function MetricsPage() {
  const [userId, setUserId] = React.useState<string | null>(null);
  const [athletes, setAthletes] = React.useState<Athlete[]>([]);
  const [athleteName, setAthleteName] = React.useState('');
  const [approved, setApproved] = React.useState<boolean | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [rows, setRows] = React.useState<MetricRow[]>([]);

  // form state
  const [dateStr, setDateStr] = React.useState<string>(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [exitVelo, setExitVelo] = React.useState<string>('');
  const [handSpeed, setHandSpeed] = React.useState<string>('');
  const [batSpeed, setBatSpeed] = React.useState<string>('');
  const [pitchVelo, setPitchVelo] = React.useState<string>('');
  const [ofVelo, setOfVelo] = React.useState<string>('');
  const [ifVelo, setIfVelo] = React.useState<string>('');
  const [sixtyTime, setSixtyTime] = React.useState<string>('');
  const [popTime, setPopTime] = React.useState<string>('');
  const [notes, setNotes] = React.useState<string>('');

  // get user + athletes
  React.useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;

      const { data: a } = await supabase
        .from('athletes')
        .select('id, full_name')
        .eq('user_id', uid)
        .order('full_name', { ascending: true });

      setAthletes(a ?? []);
    })();
  }, []);

  // load approval + metrics when athlete changes
  React.useEffect(() => {
    if (!athleteName || !userId) return;
    setLoading(true);

    // check approval
    fetch('/api/approvals?athlete=' + encodeURIComponent(athleteName))
      .then((r) => r.json())
      .then((j) => setApproved(Boolean(j.approved)))
      .catch(() => setApproved(false))
      .finally(() => {});

    // load metrics
    (async () => {
      const { data, error } = await supabase
        .from('metrics')
        .select(
          'id, date, exit_velo, hand_speed, bat_speed, pitch_velo, of_velo, if_velo, sixty_time, pop_time, notes'
        )
        .eq('user_id', userId)
        .eq('athlete_name', athleteName)
        .order('date', { ascending: false });

      if (!error) setRows((data as MetricRow[]) ?? []);
      setLoading(false);
    })();
  }, [athleteName, userId]);

  async function addMetric() {
    if (!userId || !athleteName) return;
    setSaving(true);
    const iso = new Date(dateStr + 'T00:00:00').toISOString();

    const payload = {
      user_id: userId,
      athlete_name: athleteName,
      date: iso,
      exit_velo: nv(exitVelo),
      hand_speed: nv(handSpeed),
      bat_speed: nv(batSpeed),
      pitch_velo: nv(pitchVelo),
      of_velo: nv(ofVelo),
      if_velo: nv(ifVelo),
      sixty_time: nv(sixtyTime),
      pop_time: nv(popTime),
      notes: notes || null
    };

    const { data, error } = await supabase.from('metrics').insert(payload).select().single();
    setSaving(false);
    if (error) {
      alert('Could not save: ' + error.message);
      return;
    }
    setRows((prev) => [data as MetricRow, ...prev]);
    // clear numeric inputs for convenience
    setExitVelo('');
    setHandSpeed('');
    setBatSpeed('');
    setPitchVelo('');
    setOfVelo('');
    setIfVelo('');
    setSixtyTime('');
    setPopTime('');
    setNotes('');
  }

  return (
    <>
      <TopBar />
      <main style={{ maxWidth: 1100, margin: '20px auto', padding: '0 16px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Metrics</h1>

        {/* Athlete picker */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 13, color: '#9ca3af' }}>Athlete</label>
          <select
            value={athleteName}
            onChange={(e) => setAthleteName(e.target.value)}
            style={selectStyle}
          >
            <option value="">— Select athlete —</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.full_name ?? ''}>
                {a.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Approval pill */}
        {athleteName && (
          <div style={{ marginBottom: 16 }}>
            {approved ? (
              <span style={pill('#065f46', '#d1fae5')}>Approved (metrics unlocked)</span>
            ) : (
              <span style={pill('#7f1d1d', '#fee2e2')}>Not approved</span>
            )}
          </div>
        )}

        {/* Form */}
        <section
          style={{
            border: '1px solid #1f2937',
            borderRadius: 12,
            padding: 16,
            marginBottom: 18,
            background: '#0b0b0b'
          }}
        >
          <h2 style={{ fontWeight: 700, marginBottom: 10 }}>Add Entry</h2>
          {!athleteName ? (
            <div style={{ color: '#9ca3af', fontSize: 14 }}>Pick an athlete to continue.</div>
          ) : !approved ? (
            <div style={{ color: '#9ca3af', fontSize: 14 }}>
              Metrics are locked. Ask coach to approve this athlete.
            </div>
          ) : (
            <>
              <div
                style={{
                  display: 'grid',
                  gap: 8,
                  gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))'
                }}
              >
                <label style={labelRow}>
                  <span>Date</span>
                  <input
                    type="date"
                    value={dateStr}
                    onChange={(e) => setDateStr(e.target.value)}
                    style={inputStyle}
                  />
                </label>

                <Num label="Exit velo" v={exitVelo} set={setExitVelo} />
                <Num label="Hand speed" v={handSpeed} set={setHandSpeed} />
                <Num label="Bat speed" v={batSpeed} set={setBatSpeed} />
                <Num label="Pitch velo" v={pitchVelo} set={setPitchVelo} />
                <Num label="OF velo" v={ofVelo} set={setOfVelo} />
                <Num label="IF velo" v={ifVelo} set={setIfVelo} />
                <Num label="60 time (s)" v={sixtyTime} set={setSixtyTime} />
                <Num label="Pop time (s)" v={popTime} set={setPopTime} />

                <label style={{ gridColumn: '1 / -1', display: 'grid', gap: 6 }}>
                  <span style={small}>Notes (optional)</span>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., focus on hand path / timing"
                    style={inputStyle}
                  />
                </label>
              </div>

              <button
                onClick={addMetric}
                disabled={saving}
                style={{
                  marginTop: 12,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: '1px solid #111',
                  background: '#111827',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                {saving ? 'Saving…' : 'Add Entry'}
              </button>
            </>
          )}
        </section>

        {/* Recent entries */}
        <section
          style={{
            border: '1px solid #1f2937',
            borderRadius: 12,
            padding: 16,
            background: '#0b0b0b'
          }}
        >
          <h2 style={{ fontWeight: 700, marginBottom: 10 }}>Recent Entries</h2>
          {!athleteName ? (
            <div style={{ color: '#9ca3af', fontSize: 14 }}>Pick an athlete.</div>
          ) : loading ? (
            <div style={{ color: '#9ca3af', fontSize: 14 }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 14 }}>No entries yet.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {rows.map((m) => (
                <div
                  key={m.id}
                  style={{
                    border: '1px solid #1f2937',
                    borderRadius: 10,
                    padding: 10,
                    background: '#0f172a'
                  }}
                >
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>
                    {new Date(m.date).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.4 }}>
                    EV {show(m.exit_velo)} • Hand {show(m.hand_speed)} • Bat {show(m.bat_speed)} • P{' '}
                    {show(m.pitch_velo)} • OF {show(m.of_velo)} • IF {show(m.if_velo)} • 60{' '}
                    {show(m.sixty_time)}s • Pop {show(m.pop_time)}s
                  </div>
                  {m.notes && <div style={{ fontSize: 14, marginTop: 4 }}>{m.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

/* ---------- tiny helpers / styles ---------- */

function nv(s: string) {
  const v = s.trim();
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function show(v: number | null) {
  return v == null ? '—' : String(v);
}

const small: React.CSSProperties = { fontSize: 12, color: '#9ca3af' };
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #1f2937',
  background: '#0b1b22',
  color: '#e5e7eb'
};
const selectStyle = inputStyle;

const labelRow: React.CSSProperties = { display: 'grid', gap: 6 };

function Num({
  label,
  v,
  set
}: {
  label: string;
  v: string;
  set: (s: string) => void;
}) {
  return (
    <label style={labelRow}>
      <span style={small}>{label}</span>
      <input
        inputMode="decimal"
        value={v}
        onChange={(e) => set(e.target.value)}
        style={inputStyle}
        placeholder="—"
      />
    </label>
  );
}

function pill(bg: string, fg: string): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '6px 10px',
    borderRadius: 999,
    background: fg,
    color: bg,
    fontSize: 12,
    fontWeight: 700
  };
}
