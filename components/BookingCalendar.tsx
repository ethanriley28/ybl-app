'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  slotMinutes: number;                         // 30 or 60
  onPickSlot?: (startLocal: Date) => void;     // fills the form when user taps "Open"
};

type Row = { start_ts: string; end_ts: string };

const HOURS = [17, 17.5, 18, 18.5, 19, 19.5, 20]; // 5:00p .. 8:00p half hours

function startOfWeekLocal(d: Date) {
  const x = new Date(d);
  const dow = x.getDay(); // 0=Sun
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - dow);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function fmtDayHeader(d: Date) {
  const day = d.toLocaleDateString(undefined, { weekday: 'short' });
  const m = d.toLocaleDateString(undefined, { month: 'short' });
  const dd = d.getDate();
  return { day, m, dd };
}
function timePartsToDate(base: Date, hourFrac: number) {
  const h = Math.floor(hourFrac);
  const m = hourFrac % 1 ? 30 : 0;
  const x = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);
  return x;
}

export default function BookingCalendar({ slotMinutes, onPickSlot }: Props) {
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [rows, setRows] = useState<Row[]>([]);

  const weekStart = useMemo(() => startOfWeekLocal(viewDate), [viewDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Fetch bookings that start within this week (simple & fast)
  useEffect(() => {
    const fetcher = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('start_ts,end_ts')
        .gte('start_ts', weekStart.toISOString())
        .lt('start_ts', weekEnd.toISOString());

      if (!error && data) setRows(data as Row[]);
    };
    fetcher();
  }, [weekStart, weekEnd]);

  function isBooked(slotStartLocal: Date, slotEndLocal: Date) {
    for (const r of rows) {
      const bStart = new Date(r.start_ts); // interpreted as the correct instant, in local zone
      const bEnd = new Date(r.end_ts);
      if (bStart < slotEndLocal && bEnd > slotStartLocal) return true; // overlap
    }
    return false;
  }

  const headerStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderRight: '1px solid #0b1220',
    color: '#cbd5e1',
    textAlign: 'center',
  };
  const cellStyle: React.CSSProperties = {
    height: 42,
    borderRight: '1px solid #0b1220',
    borderTop: '1px solid #0b1220',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    cursor: 'pointer',
  };

  return (
    <div style={{ border: '1px solid #0b1220', borderRadius: 12, overflow: 'hidden', background: '#050a12' }}>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: 8 }}>
        <button onClick={() => setViewDate(new Date())} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #0b1220', background: '#0b0b0b', color: '#e5e7eb' }}>today</button>
        <button onClick={() => setViewDate(addDays(viewDate, -7))} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #0b1220', background: '#0b0b0b', color: '#e5e7eb' }}>{'<'}</button>
        <button onClick={() => setViewDate(addDays(viewDate, +7))} style={{ padding: '4px 8px', borderRadius: 8, border: '1px solid #0b1220', background: '#0b0b0b', color: '#e5e7eb' }}>{'>'}</button>
      </div>

      {/* Header row (time column + 7 day columns) */}
      <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(7, 1fr)' }}>
        <div style={{ ...headerStyle, textAlign: 'left' }} />
        {days.map((d) => {
          const { day, m, dd } = fmtDayHeader(d);
          return (
            <div key={d.toDateString()} style={headerStyle}>
              <div style={{ fontWeight: 700 }}>{day}</div>
              <div style={{ fontSize: 12, color: '#93a4b8' }}>{m} {dd}</div>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '90px repeat(7, 1fr)' }}>
        {HOURS.map((hourFrac) => {
          const labelH = Math.floor(hourFrac);
          const labelM = hourFrac % 1 ? ':30' : ':00';
          return (
            <React.Fragment key={hourFrac}>
              {/* left time label */}
              <div style={{ ...cellStyle, justifyContent: 'flex-end', paddingRight: 8, fontFamily: 'monospace' }}>
                {labelH > 12 ? labelH - 12 : labelH}{labelM} PM
              </div>

              {/* seven day cells */}
              {days.map((d) => {
                const slotStartLocal = timePartsToDate(d, hourFrac);
                const slotEndLocal = new Date(slotStartLocal.getTime() + slotMinutes * 60_000);
                const booked = isBooked(slotStartLocal, slotEndLocal);

                return (
                  <div
                    key={d.toDateString() + hourFrac}
                    style={{
                      ...cellStyle,
                      background: booked ? '#7f1d1d' : '#0f3b33',
                      color: '#e5e7eb',
                    }}
                    onClick={() => {
                      if (booked) return;
                      onPickSlot?.(slotStartLocal);
                    }}
                  >
                    {booked ? 'Booked' : 'Open'}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ padding: '8px 10px', fontSize: 12, color: '#93a4b8' }}>
        Green = openings · Red = booked. Tap a green time to fill the form above, then press <b>Add Booking</b>.
      </div>
    </div>
  );
}
