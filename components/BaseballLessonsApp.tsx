'use client';

import React from 'react';
import { supabase } from '@/lib/supabaseClient'; // if this errors, use: '../lib/supabaseClient'

/** Types */
type Athlete = { id: string; name: string };
type Entry = {
  id: string;
  athleteId: string;
  athleteName: string;
  dateISO: string;
  exitVelo?: number;
  handSpeed?: number;
  batSpeed?: number;
  pitchVelo?: number;
  ofVelo?: number;
  ifVelo?: number;
  sixtyTime?: number;
  popTime?: number;
  notes?: string;
};
type Booking = {
  id: string;
  athleteId: string;
  athleteName: string;
  dateISO: string;
  note?: string;
};

/** LocalStorage helpers */
const LS_ENTRIES = 'ert_entries_v1';
const LS_SUBSCRIBED = 'ert_sub_v1';
const LS_BOOKINGS = 'ert_bookings_v1';

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/** Main Component */
export default function BaseballLessonsApp() {
  // UI tab
  const [tab, setTab] = React.useState<'booking' | 'metrics'>('metrics');

  // Athletes (loaded from Supabase for the logged-in user)
  const [athletes, setAthletes] = React.useState<Athlete[]>([]);
  const [athleteId, setAthleteId] = React.useState<string>(''); // start empty so placeholder shows

  // Local subscription flag (optional manual unlock)
  const [subscribed, setSubscribed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return loadJSON<boolean>(LS_SUBSCRIBED, false);
  });

  React.useEffect(() => {
    saveJSON(LS_SUBSCRIBED, subscribed);
  }, [subscribed]);

  // Load athletes belonging to the signed-in parent from Supabase
  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: sessionRes } = await supabase.auth.getSession();
        if (!sessionRes.session) return;
        const { data, error } = await supabase
          .from('athletes')
          .select('id,name')
          .order('name', { ascending: true });
        if (!active) return;
        if (!error && Array.isArray(data)) {
          setAthletes(data as Athlete[]);
          // keep placeholder (do not auto-select) so the “— Select athlete —” shows
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Resolve current athlete name (for approvals + labeling)
  const athleteName =
    athletes.find((a) => a.id === athleteId)?.name ?? '';

  // Cloud approval flag from /api/approvals?athlete=Name
  const [approvedCloud, setApprovedCloud] = React.useState<boolean>(false);
  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!athleteName) {
        if (active) setApprovedCloud(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/approvals?athlete=${encodeURIComponent(athleteName)}`,
          { cache: 'no-store' }
        );
        const json = await res.json();
        if (active) setApprovedCloud(!!json.approved);
      } catch {
        if (active) setApprovedCloud(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [athleteName]);

  // Metrics entries (per athlete), persisted locally
  const [entries, setEntries] = React.useState<Entry[]>(() =>
    typeof window === 'undefined' ? [] : loadJSON<Entry[]>(LS_ENTRIES, [])
  );
  React.useEffect(() => {
    saveJSON(LS_ENTRIES, entries);
  }, [entries]);

  const entriesForAthlete = React.useMemo(
    () => entries.filter((e) => e.athleteId === athleteId),
    [entries, athleteId]
  );

  // Booking (simple demo)
  const [bookings, setBookings] = React.useState<Booking[]>(() =>
    typeof window === 'undefined' ? [] : loadJSON<Booking[]>(LS_BOOKINGS, [])
  );
  React.useEffect(() => {
    saveJSON(LS_BOOKINGS, bookings);
  }, [bookings]);

  const bookingsForAthlete = React.useMemo(
    () => bookings.filter((b) => b.athleteId === athleteId),
    [bookings, athleteId]
  );

  // Form state for metrics
  const [form, setForm] = React.useState<{
    exitVelo?: string;
    handSpeed?: string;
    batSpeed?: string;
    pitchVelo?: string;
    ofVelo?: string;
    ifVelo?: string;
    sixtyTime?: string;
    popTime?: string;
    notes?: string;
  }>({});

  function addEntry() {
    if (!athleteId || !athleteName) return;
    const newEntry: Entry = {
      id: crypto.randomUUID(),
      athleteId,
      athleteName,
      dateISO: new Date().toISOString(),
      exitVelo: numOrUndef(form.exitVelo),
      handSpeed: numOrUndef(form.handSpeed),
      batSpeed: numOrUndef(form.batSpeed),
      pitchVelo: numOrUndef(form.pitchVelo),
      ofVelo: numOrUndef(form.ofVelo),
      ifVelo: numOrUndef(form.ifVelo),
      sixtyTime: numOrUndef(form.sixtyTime),
      popTime: numOrUndef(form.popTime),
      notes: form.notes?.trim() || undefined,
    };
    setEntries((prev) => [newEntry, ...prev]);
    setForm({});
  }

  function numOrUndef(v?: string) {
    if (v == null || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }

  // Simple booking add
  const [bkDate, setBkDate] = React.useState<string>('');
  const [bkTime, setBkTime] = React.useState<string>('');
  const [bkNote, setBkNote] = React.useState<string>('');
  function addBooking() {
    if (!athleteId || !athleteName || !bkDate || !bkTime) return;
    const dateISO = new Date(`${bkDate}T${bkTime}:00`).toISOString();
    setBookings((prev) => [
      {
        id: crypto.randomUUID(),
        athleteId,
        athleteName,
        dateISO,
        note: bkNote.trim() || undefined,
      },
      ...prev,
    ]);
    setBkDate('');
    setBkTime('');
    setBkNote('');
  }

  // Unlock condition: cloud approval OR manual subscribe
  const unlocked = approvedCloud || subscribed;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setTab('booking')}
          style={tabBtnStyle(tab === 'booking')}
        >
          Booking
        </button>
        <button
          onClick={() => setTab('metrics')}
          style={tabBtnStyle(tab === 'metrics')}
        >
          Metrics
        </button>
      </div>

      {/* Athlete picker (shared) */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <label style={{ fontSize: 14, color: '#374151' }}>Athlete</label>
        <select
          value={athleteId}
          onChange={(e) => setAthleteId(e.target.value)}
          style={{
            padding: 8,
            borderRadius: 10,
            border: '1px solid #d1d5db',
            minWidth: 220,
          }}
        >
          <option value="">— Select athlete —</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        {/* Small status pill for approvals */}
        {!!athleteName && (
          <span
            style={{
              marginLeft: 8,
              padding: '4px 8px',
              borderRadius: 999,
              border: '1px solid #e5e7eb',
              fontSize: 12,
              color: approvedCloud ? '#065f46' : '#b91c1c',
              background: approvedCloud ? '#ecfdf5' : '#fef2f2',
            }}
          >
            {approvedCloud ? 'Approved' : 'Not approved'}
          </span>
        )}
      </div>

      {/* Empty state if no athlete selected */}
      {!athleteId && (
        <div style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>
          Pick an athlete to continue. Parents add athletes at <a href="/register">/register</a>.
        </div>
      )}

      {/* Booking tab */}
      {tab === 'booking' && !!athleteId && (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 360px' }}>
          {/* Left: create booking */}
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Create Booking</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 10,
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 12,
              }}
            >
              <label style={lblStyle}>
                <div>Date</div>
                <input
                  type="date"
                  value={bkDate}
                  onChange={(e) => setBkDate(e.target.value)}
                  style={inpStyle}
                />
              </label>
              <label style={lblStyle}>
                <div>Time</div>
                <input
                  type="time"
                  value={bkTime}
                  onChange={(e) => setBkTime(e.target.value)}
                  style={inpStyle}
                />
              </label>
              <label style={{ gridColumn: '1 / -1', ...lblStyle }}>
                <div>Note</div>
                <input
                  type="text"
                  placeholder="Optional"
                  value={bkNote}
                  onChange={(e) => setBkNote(e.target.value)}
                  style={inpStyle}
                />
              </label>
              <div style={{ gridColumn: '1 / -1' }}>
                <button onClick={addBooking} style={primaryBtnStyle}>
                  Add Booking
                </button>
              </div>
            </div>
          </div>

          {/* Right: list bookings */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Upcoming</div>
            <div style={{ display: 'grid', gap: 6, maxHeight: 260, overflow: 'auto', paddingRight: 6 }}>
              {bookingsForAthlete.length === 0 && (
                <div style={{ fontSize: 14, color: '#6b7280' }}>No bookings yet.</div>
              )}
              {bookingsForAthlete
                .slice()
                .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
                .map((b) => (
                  <div
                    key={b.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      padding: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        {new Date(b.dateISO).toLocaleString()}
                      </div>
                      {b.note && <div style={{ fontSize: 14 }}>{b.note}</div>}
                    </div>
                    <button
                      onClick={() =>
                        setBookings((prev) => prev.filter((x) => x.id !== b.id))
                      }
                      style={linkBtnStyle}
                      aria-label="Delete booking"
                      title="Delete booking"
                    >
                      Delete
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Metrics tab */}
      {tab === 'metrics' && !!athleteId && (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 360px' }}>
          {/* Left column: form */}
          <div>
            {!unlocked && (
              <div
                style={{
                  border: '1px dashed #d1d5db',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 12,
                  background: '#fafafa',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Metrics Locked</div>
                <div style={{ fontSize: 14, color: '#374151' }}>
                  Ask Coach to approve your athlete to unlock the metrics panel.
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                  (Coach can approve in the Coach → Subscriptions page.)
                </div>
                <div style={{ marginTop: 10 }}>
                  {/* Optional manual toggle (MVP helper) */}
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={subscribed}
                      onChange={(e) => setSubscribed(e.target.checked)}
                    />
                    Temporarily unlock on this device
                  </label>
                </div>
              </div>
            )}

            <fieldset disabled={!unlocked} style={{ opacity: unlocked ? 1 : 0.6 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 10,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                {/* Row 1 */}
                <label style={lblStyle}>
                  <div>Exit Velo (mph)</div>
                  <input
                    inputMode="decimal"
                    value={form.exitVelo ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, exitVelo: e.target.value }))}
                    style={inpStyle}
                    placeholder="e.g., 88"
                  />
                </label>
                <label style={lblStyle}>
                  <div>Hand Speed (mph)</div>
                  <input
                    inputMode="decimal"
                    value={form.handSpeed ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, handSpeed: e.target.value }))}
                    style={inpStyle}
                    placeholder="e.g., 22"
                  />
                </label>

                {/* Row 2 */}
                <label style={lblStyle}>
                  <div>Bat Speed (mph)</div>
                  <input
                    inputMode="decimal"
                    value={form.batSpeed ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, batSpeed: e.target.value }))}
                    style={inpStyle}
                    placeholder="e.g., 72"
                  />
                </label>
                <label style={lblStyle}>
                  <div>Pitching Velo (mph)</div>
                  <input
                    inputMode="decimal"
                    value={form.pitchVelo ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, pitchVelo: e.target.value }))}
                    style={inpStyle}
                    placeholder="e.g., 80"
                  />
                </label>

                {/* Row 3 */}
                <label style={lblStyle}>
                  <div>Outfield Velo (mph)</div>
                  <input
                    inputMode="decimal"
                    value={form.ofVelo ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, ofVelo: e.target.value }))}
                    style={inpStyle}
                    placeholder="e.g., 84"
                  />
                </label>
                <label style={lblStyle}>
                  <div>Infield Velo (mph)</div>
                  <input
                    inputMode="decimal"
                    value={form.ifVelo ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, ifVelo: e.target.value }))}
                    style={inpStyle}
                    placeholder="e.g., 78"
                  />
                </label>

                {/* Row 4 */}
                <label style={lblStyle}>
                  <div>60 Time (s)</div>
                  <input
                    inputMode="decimal"
                    value={form.sixtyTime ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, sixtyTime: e.target.value }))}
                    style={inpStyle}
                    placeholder="e.g., 7.1"
                  />
                </label>
                <label style={lblStyle}>
                  <div>Pop Time (s)</div>
                  <input
                    inputMode="decimal"
                    value={form.popTime ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, popTime: e.target.value }))}
                    style={inpStyle}
                    placeholder="e.g., 2.01"
                  />
                </label>

                {/* Notes */}
                <label style={{ gridColumn: '1 / -1', ...lblStyle }}>
                  <div>Notes</div>
                  <input
                    type="text"
                    placeholder="Optional"
                    value={form.notes ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    style={inpStyle}
                  />
                </label>

                <div style={{ gridColumn: '1 / -1' }}>
                  <button onClick={addEntry} style={primaryBtnStyle} disabled={!unlocked}>
                    Add Entry
                  </button>
                </div>
              </div>
            </fieldset>
          </div>

          {/* Right column: Recent Entries */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Recent Entries</div>

            {entriesForAthlete.length === 0 && (
              <div style={{ fontSize: 14, color: '#6b7280' }}>No entries yet.</div>
            )}

            <div style={{ display: 'grid', gap: 6, maxHeight: 260, overflow: 'auto', paddingRight: 6 }}>
              {entriesForAthlete.map((m) => (
                <div
                  key={m.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {new Date(m.dateISO).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 14 }}>
                      EV {m.exitVelo ?? '—'} • Hand {m.handSpeed ?? '—'} • Bat {m.batSpeed ?? '—'} • P {m.pitchVelo ?? '—'} • OF {m.ofVelo ?? '—'} • IF {m.ifVelo ?? '—'} • 60 {m.sixtyTime ?? '—'}s • Pop {m.popTime ?? '—'}s
                    </div>
                    {m.notes && <div style={{ fontSize: 14, color: '#374151' }}>{m.notes}</div>}
                  </div>
                  <button
                    onClick={() => setEntries((prev) => prev.filter((x) => x.id !== m.id))}
                    style={linkBtnStyle}
                    aria-label="Delete entry"
                    title="Delete entry"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** simple styles */
function tabBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #111',
    background: active ? '#111' : '#fff',
    color: active ? '#fff' : '#111',
    cursor: 'pointer',
    minWidth: 100,
  };
}
const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #111',
  background: '#111',
  color: '#fff',
  cursor: 'pointer',
  minWidth: 140,
};
const linkBtnStyle: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  background: '#fff',
  cursor: 'pointer',
  fontSize: 13,
};
const lblStyle: React.CSSProperties = { fontSize: 13, color: '#374151', display: 'grid', gap: 6 };
const inpStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: '1px solid #d1d5db',
};
