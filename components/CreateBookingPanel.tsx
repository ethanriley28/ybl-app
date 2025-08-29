// components/CreateBookingPanel.tsx
'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  athleteId: string | null;
  athleteName: string | null;
  slotMinutes: number;
  setSlotMinutes: (m: number) => void;
  onBooked: () => void; // refresh calendar
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function todayISO() {
  const d = new Date(); d.setHours(0,0,0,0);
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export default function CreateBookingPanel({
  athleteId,
  athleteName,
  slotMinutes,
  setSlotMinutes,
  onBooked,
}: Props) {
  const [date, setDate] = React.useState<string>(todayISO());
  const [time, setTime] = React.useState<string>('17:00'); // 5:00 PM default
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!athleteId || !athleteName) {
      setMsg('Pick an athlete first.'); return;
    }

    // build start/end
    const [hh, mm] = time.split(':').map(Number);
    const y = Number(date.slice(0, 4));
    const m = Number(date.slice(5, 7)) - 1;
    const d = Number(date.slice(8, 10));
    const start = new Date(y, m, d, hh, mm, 0, 0);
    const end = new Date(start.getTime() + slotMinutes * 60000);
    const startISO = start.toISOString();
    const endISO = end.toISOString();

    try {
      setBusy(true);

      // 1) PREVENT OVERLAPS (server query): start < newEnd AND end > newStart
      const { data: conflicts, error: conflictErr } = await supabase
        .from('bookings')
        .select('id', { count: 'exact', head: false })
        .lt('start_ts', endISO)
        .gt('end_ts', startISO)
        .limit(1);

      if (conflictErr) throw conflictErr;
      if ((conflicts?.length ?? 0) > 0) {
        setMsg('That time is already booked. Pick another slot.');
        return;
      }

      // 2) INSERT
      const user = await supabase.auth.getUser();
      const user_id = user.data.user?.id ?? null;

      const { error } = await supabase.from('bookings').insert({
        user_id,
        athlete_id: athleteId,
        athlete_name: athleteName,
        start_ts: startISO,
        end_ts: endISO,
        note: note || null,
      });

      if (error) throw error;

      setMsg('Booked!');
      // let Postgres commit & read back
      setTimeout(() => onBooked(), 250);
    } catch (err: any) {
      setMsg(err?.message || 'Could not add booking');
    } finally {
      setBusy(false);
    }
  }

  const btn = (m: number, label: string) => (
    <button
      type="button"
      onClick={() => setSlotMinutes(m)}
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        border: '1px solid #222',
        background: slotMinutes === m ? '#111' : '#0b0b0b',
        color: '#e5e7eb',
        fontWeight: 800,
        width: 180
      }}
    >
      {label}
    </button>
  );

  const fieldWrap: React.CSSProperties = {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', maxWidth: '100%', boxSizing: 'border-box',
    padding: '12px 14px', borderRadius: 10,
    border: '1px solid #222', background: '#0f172a', color: '#e5e7eb',
    fontWeight: 700, outline: 'none'
  };

  return (
    <form onSubmit={handleSubmit} style={{
      border: '1px solid #1f2937',
      borderRadius: 12,
      background: '#0b0b0b',
      padding: 16,
      marginTop: 12,
      overflow: 'hidden' // keep children inside
    }}>
      <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 18 }}>Create Booking</div>

      {/* Date + Time */}
      <div style={fieldWrap}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Time</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            step={60 * 30}
            style={inputStyle}
          />
        </label>
      </div>

      {/* Durations */}
      <div style={{ display: 'flex', gap: 12, margin: '12px 0' }}>
        {btn(30, '30 minutes')}
        {btn(60, '60 minutes')}
      </div>

      {/* Note */}
      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>Note (optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g., focus on hitting / fielding"
          style={inputStyle}
        />
      </label>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="submit"
          disabled={!athleteId || busy}
          style={{
            padding: '12px 16px', borderRadius: 10,
            background: '#111', border: '1px solid #111',
            color: '#fff', fontWeight: 800, cursor: 'pointer',
            opacity: (!athleteId || busy) ? .6 : 1
          }}
        >
          {busy ? 'Adding…' : 'Add Booking'}
        </button>
        {msg && <span style={{ color: '#9ca3af', fontSize: 14 }}>{msg}</span>}
      </div>
    </form>
  );
}
