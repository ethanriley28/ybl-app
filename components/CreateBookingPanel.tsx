'use client';

import React, { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  athleteId: string | null;
  athleteName: string | null;
  slotMinutes: number;
  setSlotMinutes: React.Dispatch<React.SetStateAction<number>>;
  onBooked?: () => void;
};

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function addMinutesISO(local: Date, minutes: number): string {
  return new Date(local.getTime() + minutes * 60_000).toISOString();
}

export default function CreateBookingPanel({
  athleteId,
  athleteName,
  slotMinutes,
  setSlotMinutes,
  onBooked,
}: Props) {
  const todayLocal = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
  }, []);

  const [dateStr, setDateStr] = useState<string>(todayLocal);
  const [timeStr, setTimeStr] = useState<string>('17:00');
  const [note, setNote] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>('');

  async function handleAdd() {
    setMsg('');
    if (!athleteId) {
      setMsg('Pick an athlete first.');
      return;
    }
    setSaving(true);
    try {
      // Local -> UTC ISO
      const [y, m, d] = dateStr.split('-').map(Number);
      const [hh, mm] = timeStr.split(':').map(Number);
      const startLocal = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
      const startISO = startLocal.toISOString();
      const endISO = addMinutesISO(startLocal, slotMinutes);

      // 1) Conflict check (POST supported by our API)
      const r = await fetch('/api/bookings/conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startISO, endISO }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || !j?.ok) {
        setMsg(j?.error || 'Could not check availability.');
        return;
      }
      if (j.conflict) {
        setMsg('That time is already booked. Pick another slot.');
        return;
      }

      // 2) Insert booking
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase.from('bookings').insert({
        user_id: user?.id ?? null,
        athlete_id: athleteId,
        athlete_name: athleteName,
        start_ts: startISO,
        end_ts: endISO,
        note: note || null,
      });
      if (error) {
        setMsg(error.message || 'Insert failed.');
        return;
      }

      setMsg('Booked!');
      setNote('');
      onBooked?.();
    } finally {
      setSaving(false);
    }
  }

  const inputBase: React.CSSProperties = {
    width: 220,
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid #0f172a',
    background: '#0b0f1a',
    color: '#e5e7eb',
    outline: 'none',
  };

  return (
    <div style={{ border: '1px solid #0b1220', borderRadius: 12, padding: 14, background: '#050a12' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#93a4b8' }}>Date</span>
          <input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} style={inputBase} />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#93a4b8' }}>Time</span>
          <input
            type="time"
            value={timeStr}
            onChange={(e) => setTimeStr(e.target.value)}
            step={1800}
            style={inputBase}
          />
        </label>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setSlotMinutes(30)}
            style={{
              ...inputBase,
              width: 160,
              cursor: 'pointer',
              background: slotMinutes === 30 ? '#0b3b2a' : '#0b0f1a',
              border: slotMinutes === 30 ? '1px solid #1f6b53' : inputBase.border,
            }}
          >
            30 minutes
          </button>
          <button
            onClick={() => setSlotMinutes(60)}
            style={{
              ...inputBase,
              width: 160,
              cursor: 'pointer',
              background: slotMinutes === 60 ? '#0b3b2a' : '#0b0f1a',
              border: slotMinutes === 60 ? '1px solid #1f6b53' : inputBase.border,
            }}
          >
            60 minutes
          </button>
        </div>

        <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
          <span style={{ fontSize: 12, color: '#93a4b8' }}>Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., focus on hitting / fielding"
            style={{ ...inputBase, width: '100%' }}
          />
        </label>
      </div>

      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          onClick={handleAdd}
          disabled={saving}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #0f172a',
            background: '#0b0b0b',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {saving ? 'Saving…' : 'Add Booking'}
        </button>
        {msg && <div style={{ fontSize: 13, color: msg === 'Booked!' ? '#16a34a' : '#ef4444' }}>{msg}</div>}
      </div>
    </div>
  );
}
