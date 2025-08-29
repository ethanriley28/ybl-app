'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  slotMinutes: number;                  // 30 or 60
  refreshKey?: number;                  // bump to reload after a booking
  onPickSlot?: (dt: Date) => void;      // called when user taps a green slot
};

type Row = { start_ts: string; end_ts: string };

// helper: local midnight
const atMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
// week boundaries (Sun..Sat)
function weekRange(anchor = new Date()) {
  const start = new Date(atMidnight(anchor));
  start.setDate(start.getDate() - start.getDay());     // back to Sunday
  const end = new Date(start);
  end.setDate(start.getDate() + 7);                    // next Sunday (exclusive)
  return { start, end };
}

export default function BookingCalendar({ slotMinutes, refreshKey = 0, onPickSlot }: Props) {
  // which week we’re showing
  const [anchor, setAnchor] = useState<Date>(new Date());
  const { start: weekStart, end: weekEnd } = useMemo(() => weekRange(anchor), [anchor]);

  // fetched bookings for the week
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    let on = true;
    (async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('start_ts,end_ts')
        .gte('start_ts', weekStart.toISOString())
        .lt('start_ts', weekEnd.toISOString());

      if (!on) return;
      if (error) { console.error(error); setRows([]); }
      else setRows(data || []);
    })();
    return () => { on = false; };
  }, [weekStart, weekEnd, refreshKey]);

  // Map of booked keys: YYYY-MM-DDTHH:mm
  const booked = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const s = new Date(r.start_ts);
      const e = new Date(r.end_ts);
      for (let t = new Date(s); t < e; t = new Date(t.getTime() + 30 * 60_000)) {
        const k = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}T${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
        set.add(k);
      }
    }
    return set;
  }, [rows]);

  // display hours: 5:00 PM – 8:00 PM
  const times: string[] = useMemo(() => {
    const out: string[] = [];
    for (let h = 17; h <= 19; h++) {                // 17:00..19:30
      out.push(`${String(h).padStart(2, '0')}:00`);
      out.push(`${String(h).padStart(2, '0')}:30`);
    }
    out.push('20:00');                              // last cell row label
    return out;
  }, []);

  // util
  const dayLabel = (d: Date) =>
    d.toLocaleDateString(undefined, { weekday: 'short' }); // Mon
  const dateLabel = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); // Aug 29

  const weekDays: Date[] = useMemo(() => {
    const arr: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [weekStart]);

  // render
  return (
    <div style={{ border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden', background: '#0b1220' }}>
      {/* toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottom: '1px solid #1f2937' }}>
        <div style={{ color: '#e5e7eb', fontWeight: 600 }}>
          {weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {new Date(weekEnd.getTime() - 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setAnchor(new Date())}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #374151', background: '#0f172a', color: '#e5e7eb' }}
          >today</button>
          <button
            onClick={() => setAnchor(new Date(weekStart.getTime() - 7 * 24 * 60 * 60_000))}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #374151', background: '#0f172a', color: '#e5e7eb' }}
          >&lt;</button>
          <button
            onClick={() => setAnchor(new Date(weekStart.getTime() + 7 * 24 * 60 * 60_000))}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #374151', background: '#0f172a', color: '#e5e7eb' }}
          >&gt;</button>
        </div>
      </div>

      {/* header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '92px repeat(7, 1fr)',
          borderBottom: '1px solid #1f2937',
          background: '#0b1220'
        }}
      >
        <div />
        {weekDays.map((d) => (
          <div key={d.toDateString()} style={{ padding: '10px 6px', textAlign: 'center', borderLeft: '1px solid #1f2937' }}>
            <div style={{ color: '#e5e7eb', fontWeight: 700, fontSize: 16 }}>{dayLabel(d)}</div>
            <div style={{ color: '#9ca3af', fontSize: 12 }}>{dateLabel(d)}</div>
          </div>
        ))}
      </div>

      {/* grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '92px repeat(7, 1fr)' }}>
        {times.slice(0, -1).map((t, rowIdx) => {
          // label col
          const label = (() => {
            const [h, m] = t.split(':').map(Number);
            const d = new Date(); d.setHours(h, m, 0, 0);
            return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
          })();

          return (
            <React.Fragment key={t}>
              <div style={{
                borderTop: '1px solid #1f2937',
                padding: '14px 8px',
                color: '#9ca3af',
                fontSize: 12
              }}>{label}</div>

              {weekDays.map((d) => {
                const cellStart = new Date(d);
                const [hh, mm] = t.split(':').map(Number);
                cellStart.setHours(hh, mm, 0, 0);

                // Is any minute inside this slot booked?
                let isBooked = false;
                for (let off = 0; off < slotMinutes; off += 30) {
                  const k = `${cellStart.getFullYear()}-${String(cellStart.getMonth() + 1).padStart(2, '0')}-${String(cellStart.getDate()).padStart(2, '0')}T${String(cellStart.getHours()).padStart(2, '0')}:${String((cellStart.getMinutes() + off) % 60).padStart(2, '0')}`;
                  if (booked.has(k)) { isBooked = true; break; }
                }

                const bg = isBooked ? '#7f1d1d' : '#065f46';
                const label = isBooked ? 'Booked' : 'Open';

                const onClick = () => {
                  if (isBooked) return;
                  onPickSlot?.(cellStart);
                };

                return (
                  <button
                    key={`${d.toDateString()}-${t}`}
                    onClick={onClick}
                    disabled={isBooked}
                    style={{
                      borderTop: '1px solid #1f2937',
                      borderLeft: '1px solid #1f2937',
                      background: bg,
                      color: '#fff',
                      minHeight: 46,                    // comfy on phones
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: isBooked ? 'default' : 'pointer'
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
