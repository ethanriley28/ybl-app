'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  /** length picker in minutes (30 or 60). We still render 30-min cells for clarity */
  slotMinutes: number;
  /** bump this number to force a refetch after booking */
  refreshKey?: number;
  /** called when a green (open) slot is clicked */
  onPickSlot?: (startLocal: Date) => void;
};

type BookingRow = { start_ts: string; end_ts: string };

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Return a local Date that is the Sunday 00:00 of the week containing d */
function startOfWeekSunday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay(); // 0..6 (Sun..Sat)
  x.setDate(x.getDate() - day);
  return x;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function monthShort(n: number) {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][n]!;
}

/** Key for a 30-min cell by local date+time */
function cellKey(dt: Date) {
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

/** Iterate from start (inclusive) to end (exclusive) stepping minutes */
function* rangeByMinutes(start: Date, end: Date, stepMin: number) {
  for (let t = new Date(start); t < end; t = new Date(t.getTime() + stepMin * 60_000)) {
    yield new Date(t);
  }
}

/** Convert a LOCAL date to an ISO UTC string boundary for SQL filtering */
function localToUTCISO(d: Date) {
  return d.toISOString(); // includes 'Z'
}

export default function BookingCalendar({ slotMinutes, refreshKey, onPickSlot }: Props) {
  // which week is shown
  const [cursor, setCursor] = useState<Date>(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });

  const weekStart = useMemo(() => startOfWeekSunday(cursor), [cursor]);
  const weekEnd = useMemo(() => {
    const x = new Date(weekStart);
    x.setDate(x.getDate() + 7);
    return x;
  }, [weekStart]);

  // cells (30-min) we’ll mark as booked
  const [bookedKeys, setBookedKeys] = useState<Set<string>>(new Set());

  // fetch bookings that overlap our visible week (any time between 5–8pm local)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Boundaries for SQL in UTC
      const sqlStart = localToUTCISO(weekStart);
      const sqlEnd = localToUTCISO(weekEnd);

      const { data, error } = await supabase
        .from('bookings')
        .select('start_ts,end_ts')
        .gte('end_ts', sqlStart)   // booking ends after weekStart
        .lt('start_ts', sqlEnd);   // booking starts before weekEnd

      if (cancelled) return;
      if (error || !data) {
        setBookedKeys(new Set());
        return;
      }

      // Turn each booking into 30-min local cell keys between 5:00–8:00 PM
      const next = new Set<string>();
      for (const row of data as BookingRow[]) {
        const s = new Date(row.start_ts); // parsed as local time from UTC instant
        const e = new Date(row.end_ts);

        // march in 30-min chunks
        for (const t of rangeByMinutes(s, e, 30)) {
          const hour = t.getHours();
          const minute = t.getMinutes();
          // Only mark rows we actually render (5–8 PM)
          if (hour < 17 || hour >= 20) continue;
          // snap to 0 or 30 to be safe
          t.setMinutes(minute < 30 ? 0 : 30, 0, 0);
          next.add(cellKey(t));
        }
      }
      setBookedKeys(next);
    })();

    return () => { cancelled = true; };
  }, [weekStart, weekEnd, refreshKey]);

  // hours shown (30-min grid)
  const ROWS: Array<{ label: string; minutes: number }> = [
    { label: '5:00 PM', minutes: 17 * 60 + 0 },
    { label: '5:30 PM', minutes: 17 * 60 + 30 },
    { label: '6:00 PM', minutes: 18 * 60 + 0 },
    { label: '6:30 PM', minutes: 18 * 60 + 30 },
    { label: '7:00 PM', minutes: 19 * 60 + 0 },
    { label: '7:30 PM', minutes: 19 * 60 + 30 },
  ];

  // days (Sun..Sat)
  const DAYS = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekLabel = useMemo(() => {
    const a = DAYS[0];
    const b = DAYS[6];
    return `${monthShort(a.getMonth())} ${a.getDate()} – ${monthShort(b.getMonth())} ${b.getDate()}, ${b.getFullYear()}`;
  }, [DAYS]);

  return (
    <div style={{ border: '1px solid #0b1220', borderRadius: 12, overflow: 'hidden', background: '#050a12' }}>
      {/* header bar with label + nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderBottom: '1px solid #0b1220' }}>
        <div style={{ color: '#cbd5e1', fontSize: 14 }}>{weekLabel}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setCursor(new Date())} style={navBtn}>today</button>
          <button onClick={() => setCursor(d => { const x = new Date(d); x.setDate(x.getDate() - 7); return x; })} style={navBtn}>‹</button>
          <button onClick={() => setCursor(d => { const x = new Date(d); x.setDate(x.getDate() + 7); return x; })} style={navBtn}>›</button>
        </div>
      </div>

      {/* two-line day headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px repeat(7, 1fr)',
          borderBottom: '1px solid #0b1220',
          background: '#0a1220',
        }}
      >
        <div />
        {DAYS.map((d, i) => (
          <div key={i} style={{ padding: '8px 6px', textAlign: 'center' }}>
            <div style={{ color: '#cbd5e1', fontWeight: 700 }}>{DAY_NAMES[d.getDay()]}</div>
            <div style={{ color: '#93a4b8', fontSize: 12 }}>{monthShort(d.getMonth())} {d.getDate()}</div>
          </div>
        ))}
      </div>

      {/* grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '120px repeat(7, 1fr)' }}>
        {ROWS.map((row, rIdx) => {
          return (
            <React.Fragment key={rIdx}>
              {/* time label column */}
              <div style={{ borderRight: '1px solid #0b1220', borderBottom: '1px solid #0b1220', padding: '8px 10px', color: '#9ca3af', fontSize: 12 }}>
                {row.label}
              </div>
              {/* 7 day cells */}
              {DAYS.map((day, cIdx) => {
                const start = new Date(day);
                start.setHours(Math.floor(row.minutes / 60), row.minutes % 60, 0, 0);
                const key = cellKey(start);
                const isBooked = bookedKeys.has(key);

                const bg = isBooked ? '#7a1111' : '#0b3b2a';
                const txt = isBooked ? 'Booked' : 'Open';

                return (
                  <button
                    key={cIdx}
                    onClick={() => {
                      if (!isBooked) onPickSlot?.(start);
                    }}
                    disabled={isBooked}
                    title={txt}
                    style={{
                      border: '1px solid #0b1220',
                      borderLeft: 'none',
                      borderTop: 'none',
                      padding: 0,
                      margin: 0,
                      height: 44,
                      background: bg,
                      color: '#e5e7eb',
                      cursor: isBooked ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                    }}
                  >
                    {txt}
                  </button>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* legend */}
      <div style={{ padding: '8px 10px', color: '#9ca3af', fontSize: 12 }}>
        Green = openings · Red = booked. Tap a green time to fill the form above, then press <b>Add Booking</b>.
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #0b1220',
  background: '#0b0f1a',
  color: '#e5e7eb',
  cursor: 'pointer',
  fontSize: 12,
};
