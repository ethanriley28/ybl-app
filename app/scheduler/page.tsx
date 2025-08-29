'use client';

import * as React from 'react';
import TopBar from '@/components/TopBar';
import BookingCalendar from '@/components/BookingCalendar';
import CreateBookingPanel from '@/components/CreateBookingPanel';
import { supabase } from '@/lib/supabaseClient';

type Athlete = { id: string; full_name: string | null };

export default function SchedulerPage() {
  // --- athlete list + selection ---
  const [athletes, setAthletes] = React.useState<Athlete[]>([]);
  const [athleteId, setAthleteId] = React.useState<string | null>(null);
  const [athleteName, setAthleteName] = React.useState<string | null>(null);

  // --- date/time picked for booking (controlled; calendar fills these) ---
  const [dateStr, setDateStr] = React.useState<string>(() => {
    const t = new Date();
    const mm = String(t.getMonth() + 1).padStart(2, '0');
    const dd = String(t.getDate()).padStart(2, '0');
    return `${t.getFullYear()}-${mm}-${dd}`;
  });
  const [timeStr, setTimeStr] = React.useState<string>('17:00');

  // --- slot length + calendar refresh toggle ---
  const [slotMinutes, setSlotMinutes] = React.useState<number>(30); // 30 or 60
  const [refreshKey, setRefreshKey] = React.useState<number>(0);

  // Load athletes for the dropdown
  React.useEffect(() => {
    let on = true;
    (async () => {
      const { data, error } = await supabase
        .from('athletes')
        .select('id, full_name')
        .order('full_name', { ascending: true });

      if (!on) return;
      if (error) {
        console.error(error);
        setAthletes([]);
      } else {
        setAthletes((data || []) as Athlete[]);
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  return (
    <>
      <TopBar />

      <main style={{ maxWidth: 1120, margin: '20px auto', padding: '0 16px' }}>
        <h1 style={{ fontSize: 22, color: '#e5e7eb', marginBottom: 14 }}>Create a Booking</h1>

        {/* Athlete selector */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            marginBottom: 14,
            flexWrap: 'wrap',
          }}
        >
          <label style={{ color: '#93a4b8', fontSize: 12 }}>Athlete</label>
          <select
            value={athleteId ?? ''}
            onChange={(e) => {
              const id = e.target.value || null;
              setAthleteId(id);
              const a = athletes.find((x) => x.id === id);
              setAthleteName(a?.full_name ?? null);
            }}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #0f172a',
              background: '#0b0f1a',
              color: '#e5e7eb',
              outline: 'none',
              minWidth: 260,
            }}
          >
            <option value="" disabled>
              Select athlete…
            </option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name ?? 'Unnamed'}
              </option>
            ))}
          </select>

          {athleteName && (
            <span style={{ color: '#9ca3af', fontSize: 12 }}>Selected: {athleteName}</span>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            alignItems: 'start',
          }}
        >
          {/* Left: Form */}
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

          {/* Right: Week calendar (green open / red booked) */}
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
        </div>

        <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 10 }}>
          Tip: click any <span style={{ color: '#16a34a' }}>green</span> slot to fill the form, then press{' '}
          <b>Add Booking</b>. Booked slots show in <span style={{ color: '#ef4444' }}>red</span>.
        </div>
      </main>
    </>
  );
}
