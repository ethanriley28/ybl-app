// app/scheduler/page.tsx
'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import BookingCalendar from '@/components/BookingCalendar';
import CreateBookingPanel from '@/components/CreateBookingPanel';
import TopBar from '@/components/TopBar';

type Athlete = { id: string; full_name: string | null };

export default function SchedulerPage() {
  const [dateStr, setDateStr] = React.useState<string>(() => {
  const t = new Date();
  const mm = String(t.getMonth() + 1).padStart(2, '0');
  const dd = String(t.getDate()).padStart(2, '0');
  return `${t.getFullYear()}-${mm}-${dd}`;
});
const [timeStr, setTimeStr] = React.useState<string>('17:00');
const [slotMinutes, setSlotMinutes] = React.useState<number>(30);

// bump this to refetch the calendar after booking
const [refreshKey, setRefreshKey] = React.useState(0);

  React.useEffect(() => {
    let on = true;
    (async () => {
      // If you already have /api/athletes, you can fetch that instead.
      const { data, error } = await supabase
        .from('athletes')
        .select('id, full_name')
        .order('full_name', { ascending: true });

      if (!on) return;
      if (error) { console.error(error); setAthletes([]); }
      else setAthletes((data || []) as Athlete[]);
    })();
    return () => { on = false; };
  }, []);

  const onPick = (d: Date) => {
    // When user taps a green slot, fill date/time fields above
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');

    const dateEl = document.querySelector<HTMLInputElement>('input[type="date"]');
    const timeEl = document.querySelector<HTMLInputElement>('input[type="time"]');
    if (dateEl) dateEl.value = `${yyyy}-${mm}-${dd}`;
    if (timeEl) timeEl.value = `${hh}:${mi}`;
  };

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      <TopBar />

      {/* Athlete select */}
      <div style={{
        border: '1px solid #1f2937', borderRadius: 12, background: '#0b0b0b',
        padding: 16, marginTop: 12
      }}>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6 }}>Athlete</div>
        <select
          value={athleteId ?? ''}
          onChange={(e) => {
            const id = e.target.value || null;
            setAthleteId(id);
            const name = athletes.find(a => a.id === id)?.full_name ?? null;
            setAthleteName(name);
          }}
          style={{
            width: '100%', padding: '12px 14px', borderRadius: 10,
            border: '1px solid #222', background: '#0f172a', color: '#e5e7eb',
            fontWeight: 700
          }}
        >
          <option value="">— Select athlete —</option>
          {athletes.map(a => (
            <option key={a.id} value={a.id}>{a.full_name ?? 'Unnamed'}</option>
          ))}
        </select>
      </div>

      {/* Create Booking */}
      <CreateBookingPanel
        athleteId={athleteId}
        athleteName={athleteName}
       dateStr={dateStr}
  timeStr={timeStr}
  setDateStr={setDateStr}
  setTimeStr={setTimeStr}
  slotMinutes={slotMinutes}
  setSlotMinutes={setSlotMinutes}
  onBooked={() => setRefreshKey((x) => x + 1)}
/>

      {/* Calendar */}
      <section style={{
        border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden',
        background: '#0b0b0b', marginTop: 16
      }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #1f2937', fontWeight: 800 }}>
          See openings
        </div>
        <div style={{ padding: 12 }}>
         <BookingCalendar
  slotMinutes={slotMinutes}
  refreshKey={refreshKey}
  onPickSlot={(startLocal) => {
    const y = startLocal.getFullYear();
    const m = String(startLocal.getMonth() + 1).padStart(2, '0');
    const d = String(startLocal.getDate()).padStart(2, '0');
    const hh = String(startLocal.getHours()).padStart(2, '0');
    const mm = String(startLocal.getMinutes()).padStart(2, '0');
    setDateStr(`${y}-${m}-${d}`);
    setTimeStr(`${hh}:${mm}`);
  }}
/>
          <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 8 }}>
            Green = openings · Red = booked. Tap a green time to fill the form above, then press <b>Add Booking</b>.
          </div>
        </div>
      </section>
    </main>
  );
}
