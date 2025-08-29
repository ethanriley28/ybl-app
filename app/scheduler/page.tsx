'use client';

import React, { useEffect, useMemo, useState } from 'react';
import BookingCalendar from '@/components/BookingCalendar';
import TopBar from '@/components/TopBar';
import { supabase } from '@/lib/supabaseClient';

type Athlete = { id: string; full_name: string | null };

function toYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// Accepts “5:00 PM”, “05:00 pm”, or “17:00” → returns “HH:mm”
function toHHMM(input: string): string {
  const s = input.trim();
  // 24h already?
  if (/^\d{2}:\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)$/i);
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const min = m[2];
  const suffix = m[3].toLowerCase();
  if (suffix.startsWith('p') && h !== 12) h += 12;
  if (suffix.startsWith('a') && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min}`;
}

// Add minutes to a Date
function addMin(d: Date, min: number) {
  return new Date(d.getTime() + min * 60_000);
}

export default function SchedulerPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [athleteId, setAthleteId] = useState<string>('');
  const [athleteName, setAthleteName] = useState<string>('');

  // form state
  const [dateStr, setDateStr] = useState<string>(() => toYYYYMMDD(new Date()));
  const [timeHHMM, setTimeHHMM] = useState<string>('17:00'); // 5:00 PM in 24h
  const [slotMinutes, setSlotMinutes] = useState<number>(30);
  const [note, setNote] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // load athletes for this user
  useEffect(() => {
    let on = true;
    (async () => {
      const res = await fetch('/api/athletes', { cache: 'no-store' }).catch(() => null);
      if (!res || !res.ok) { if (on) setAthletes([]); return; }
      const data = await res.json().catch(() => []);
      if (on) setAthletes(Array.isArray(data) ? data : []);
    })();
    return () => { on = false; };
  }, []);

  // keep selected athlete name handy
  useEffect(() => {
    const found = athletes.find(a => a.id === athleteId);
    setAthleteName(found?.full_name || '');
  }, [athleteId, athletes]);

  // calendar → form: when a green cell is tapped
  const onPickFromCalendar = (dt: Date) => {
    // dt is a real Date in local time
    setDateStr(toYYYYMMDD(dt));
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    setTimeHHMM(`${hh}:${mm}`);
    // scroll form into view on phones
    const el = document.getElementById('create-booking-card');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const canSubmit = athleteId && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && /^\d{2}:\d{2}$/.test(toHHMM(timeHHMM));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!canSubmit) {
      setError('Please pick an athlete, date and time.');
      return;
    }

    // build local Date from date + time (24h)
    const hhmm = toHHMM(timeHHMM);
    const startLocal = new Date(`${dateStr}T${hhmm}:00`);
    const endLocal = addMin(startLocal, slotMinutes);

    // conflict check via API (keeps server as source of truth)
    const params = new URLSearchParams({
      start: startLocal.toISOString(),
      end: endLocal.toISOString(),
    });
    const conflict = await fetch(`/api/bookings/conflict?${params.toString()}`).then(r => r.json()).catch(() => ({ conflict: false }));
    if (conflict?.conflict) {
      setError('That time is already booked. Pick another slot.');
      return;
    }

    // create booking
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      setError('You must be signed in.');
      return;
    }

    const { error: insErr } = await supabase
      .from('bookings')
      .insert({
        user_id: user.user.id,
        athlete_id: athleteId,
        athlete_name: athleteName || null,
        start_ts: startLocal.toISOString(),
        end_ts: endLocal.toISOString(),
        note: note || null,
      });

    if (insErr) {
      console.error(insErr);
      setError(insErr.message || 'Could not save booking.');
      return;
    }

    // refresh calendar & clear note
    setNote('');
    setRefreshKey(k => k + 1);
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 16px 40px' }}>
      <TopBar />

      <h1 style={{ fontSize: 24, fontWeight: 700, margin: '16px 0 8px' }}>Create a Booking</h1>

      <form
        id="create-booking-card"
        onSubmit={handleSubmit}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 12,
          background: '#0b1220',
          border: '1px solid #1f2937',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16
        }}
      >
        {/* athlete */}
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: '#9ca3af', fontSize: 12 }}>Athlete</span>
          <select
            value={athleteId}
            onChange={(e) => setAthleteId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 10,
              border: '1px solid #374151',
              background: '#0f172a',
              color: '#e5e7eb'
            }}
          >
            <option value="">— Select athlete —</option>
            {athletes.map(a => (
              <option key={a.id} value={a.id}>{a.full_name || '(No name)'}</option>
            ))}
          </select>
        </label>

        {/* date & time row – on mobile they stack, desktop they go side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#9ca3af', fontSize: 12 }}>Date</span>
            <input
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px',
                borderRadius: 10,
                border: '1px solid #374151',
                background: '#0f172a',
                color: '#e5e7eb'
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ color: '#9ca3af', fontSize: 12 }}>Time</span>
            <input
              type="time"
              step={slotMinutes * 60}          // 30-min or 60-min wheel
              value={toHHMM(timeHHMM)}          // always store/display as HH:mm
              onChange={(e) => setTimeHHMM(toHHMM(e.target.value))}
              style={{
                width: '100%',
                padding: '12px 12px',
                borderRadius: 10,
                border: '1px solid #374151',
                background: '#0f172a',
                color: '#e5e7eb'
              }}
            />
          </label>
        </div>

        {/* quick duration buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={() => setSlotMinutes(30)}
            style={{
              flex: '0 0 auto',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #374151',
              background: slotMinutes === 30 ? '#065f46' : '#0f172a',
              color: '#fff'
            }}
          >
            30 minutes
          </button>
          <button
            type="button"
            onClick={() => setSlotMinutes(60)}
            style={{
              flex: '0 0 auto',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid #374151',
              background: slotMinutes === 60 ? '#065f46' : '#0f172a',
              color: '#fff'
            }}
          >
            60 minutes
          </button>
        </div>

        {/* note */}
        <label style={{ display: 'grid', gap: 6 }}>
          <span style={{ color: '#9ca3af', fontSize: 12 }}>Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., focus on hitting / fielding"
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 10,
              border: '1px solid #374151',
              background: '#0f172a',
              color: '#e5e7eb'
            }}
          />
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid #111',
              background: canSubmit ? '#111' : '#1f2937',
              color: '#fff',
              cursor: canSubmit ? 'pointer' : 'not-allowed'
            }}
          >
            Add Booking
          </button>

          {!!error && (
            <span style={{ color: '#ef4444', fontSize: 14 }}>{error}</span>
          )}
        </div>
      </form>

      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '8px 0 10px' }}>See openings</h2>

      <BookingCalendar
        slotMinutes={slotMinutes}
        refreshKey={refreshKey}
        onPickSlot={onPickFromCalendar}
      />

      <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>
        Tip: click any <span style={{ color: '#10b981' }}>green</span> slot to fill the form,
        then press <strong>Add Booking</strong>. Booked slots show in <span style={{ color: '#ef4444' }}>red</span>.
      </div>
    </main>
  );
}
