'use client';

import * as React from 'react';

type Props = {
  athleteId: string | null;
  athleteName: string | null;
  dateStr: string;
  timeStr: string;
  setDateStr: (v: string) => void;
  setTimeStr: (v: string) => void;
  slotMinutes: number;
  setSlotMinutes: (n: number) => void;
  onBooked: () => void;
};

export default function CreateBookingPanel(props: Props) {
  const {
    athleteId,
    athleteName,
    dateStr,
    timeStr,
    setDateStr,
    setTimeStr,
    slotMinutes,
    setSlotMinutes,
    onBooked,
  } = props;

  const [note, setNote] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  function addMinutes(d: Date, n: number) {
    const nd = new Date(d);
    nd.setMinutes(nd.getMinutes() + n);
    return nd;
  }

  async function handleCreate() {
    setMsg(null);

    if (!athleteId || !athleteName) {
      setMsg('Pick an athlete first.');
      return;
    }
    if (!dateStr || !timeStr) {
      setMsg('Pick a date and time.');
      return;
    }

    // local -> ISO
    const [hh, mm] = timeStr.split(':').map((x) => parseInt(x, 10));
    const [y, m, d] = dateStr.split('-').map((x) => parseInt(x, 10));
    const startLocal = new Date(y, m - 1, d, hh, mm, 0, 0);
    const endLocal = addMinutes(startLocal, slotMinutes);

    const startISO = new Date(
      startLocal.getTime() - startLocal.getTimezoneOffset() * 60000
    ).toISOString();
    const endISO = new Date(
      endLocal.getTime() - endLocal.getTimezoneOffset() * 60000
    ).toISOString();

    try {
      setSaving(true);

      // 1) conflict check (server uses UTC)
      const conflictRes = await fetch(
        `/api/bookings/conflict?start=${encodeURIComponent(
          startISO
        )}&end=${encodeURIComponent(endISO)}`
      );
      const conflict = await conflictRes.json();
      if (conflict?.conflict) {
        setMsg('That time is already booked. Pick another slot.');
        return;
      }

      // 2) create
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athlete_id: athleteId,
          athlete_name: athleteName,
          start_ts: startISO,
          end_ts: endISO,
          note,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setMsg(json?.error || 'Could not create booking.');
        return;
      }

      setMsg('Booked!');
      setNote('');
      onBooked(); // tells the calendar to re-fetch
      setTimeout(() => setMsg(null), 2000);
    } catch (e: any) {
      setMsg(e?.message || 'Network error.');
    } finally {
      setSaving(false);
    }
  }

  const cardStyle: React.CSSProperties = {
    border: '1px solid #0f172a',
    background: '#0b0f1a',
    borderRadius: 14,
    padding: 16,
  };

  const label: React.CSSProperties = { color: '#93a4b8', fontSize: 12 };
  const input: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #111827',
    background: '#0b0f1a',
    color: '#e5e7eb',
    outline: 'none',
  };

  return (
    <div className="ert-card ert-create" style={cardStyle}>
      {/* Date + Time in a 2-col layout that collapses on mobile */}
      <div className="ert-create-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <div style={label}>Date</div>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            style={input}
          />
        </div>

        <div>
          <div style={label}>Time</div>
          <input
            type="time"
            value={timeStr}
            step={1800}
            onChange={(e) => setTimeStr(e.target.value)}
            style={input}
          />
        </div>

        {/* duration buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setSlotMinutes(30)}
            className="ert-btn"
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #111827',
              background: slotMinutes === 30 ? '#134e4a' : '#0b0f1a',
              color: '#e5e7eb',
              cursor: 'pointer',
            }}
          >
            30 minutes
          </button>
          <button
            type="button"
            onClick={() => setSlotMinutes(60)}
            className="ert-btn"
            style={{
              flex: 1,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid #111827',
              background: slotMinutes === 60 ? '#134e4a' : '#0b0f1a',
              color: '#e5e7eb',
              cursor: 'pointer',
            }}
          >
            60 minutes
          </button>
        </div>

        {/* note */}
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={label}>Note (optional)</div>
          <input
            className="note-input"
            placeholder="e.g., focus on hitting / fielding"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={input}
          />
        </div>

        {/* submit */}
        <div style={{ gridColumn: '1 / -1' }}>
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="add-btn"
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              background: '#111827',
              color: '#e5e7eb',
              border: '1px solid #1f2937',
              cursor: 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Add Booking'}
          </button>
          {msg && (
            <div style={{ color: msg === 'Booked!' ? '#22c55e' : '#f87171', marginTop: 8, fontSize: 14 }}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
