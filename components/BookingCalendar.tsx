'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

type Occupied = { start: string; end: string; status: string | null };

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun … 6 Sat
  const diff = (day + 6) % 7; // make Monday=0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - diff);
  return x;
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function toISO(d: Date) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString(); }
function fmtDate(d: Date) { return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function fmtTime(d: Date) { return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }

export default function BookingCalendar({
  slotMinutes,
  onPickSlot,
}: {
  slotMinutes: number;
  onPickSlot?: (start: Date) => void;
}) {
  const [weekStart, setWeekStart] = React.useState(() => startOfWeek(new Date()));
  const [busy, setBusy] = React.useState<Occupied[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    const from = toISO(weekStart);
    const to = toISO(addDays(weekStart, 7));
    const { data, error } = await supabase
      .from('bookings')
      .select('start_time, end_time, status')
      .gte('start_time', from)
      .lt('start_time', to);
    if (error) setErr(error.message);
    setBusy((data ?? []).map(r => ({ start: (r as any).start_time, end: (r as any).end_time, status: (r as any).status })));
    setLoading(false);
  }
  React.useEffect(() => { load(); /* reload when week or slot size changes */ }, [weekStart, slotMinutes]);

  function slotIsBooked(s: Date, e: Date) {
    const sMs = s.getTime(), eMs = e.getTime();
    return busy.some(b => {
      const bs = new Date(b.start).getTime();
      const be = new Date(b.end).getTime();
      return sMs < be && eMs > bs; // overlap = booked
    });
  }

  const days = [0, 1, 2, 3, 4].map(i => addDays(weekStart, i)); // Mon–Fri
  const rows: Date[] = [];
  {
    const base = new Date(weekStart); base.setHours(17, 0, 0, 0); // 5:00 PM
    const end = new Date(weekStart);  end.setHours(20, 0, 0, 0);  // 8:00 PM
    for (let t = new Date(base); t < end; t = new Date(t.getTime() + slotMinutes * 60000)) {
      rows.push(new Date(t));
    }
  }

  return (
    <div style={{ border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden', background: '#0b0b0b' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#111', color: '#fff' }}>
        <div style={{ fontWeight: 700 }}>{fmtDate(days[0])} – {fmtDate(addDays(weekStart, 6))}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} style={navBtn}>today</button>
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} style={navBtn}>‹</button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} style={navBtn}>›</button>
        </div>
      </div>

      {/* column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${days.length}, 1fr)`, borderBottom: '1px solid #1f2937' }}>
        <div style={cellHeader} />
        {days.map(d => (
          <div key={d.toISOString()} style={cellHeader}>
            {d.toLocaleDateString(undefined, { weekday: 'short' })}
            <div style={{ fontSize: 12, opacity: .8 }}>{fmtDate(d)}</div>
          </div>
        ))}
      </div>

      {/* grid */}
      <div>
        {rows.map((rowStart, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: `120px repeat(${days.length}, 1fr)` }}>
            <div style={cellTime}>{fmtTime(rowStart)}</div>
            {days.map((d, ci) => {
              const s = new Date(d); s.setHours(rowStart.getHours(), rowStart.getMinutes(), 0, 0);
              const e = new Date(s.getTime() + slotMinutes * 60000);
              const booked = slotIsBooked(s, e);
              return (
                <button
                  key={ci}
                  disabled={booked}
                  onClick={() => onPickSlot?.(s)}
                  title={booked ? 'Booked' : 'Available'}
                  style={{
                    ...cellSlot,
                    background: booked ? '#7f1d1d' : '#064e3b',
                    color: '#fff',
                    cursor: booked ? 'not-allowed' : 'pointer'
                  }}
                >
                  {booked ? 'Booked' : 'Open'}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {loading && <div style={{ padding: 8, color: '#94a3b8' }}>Loading…</div>}
      {err && <div style={{ padding: 8, color: '#fecaca' }}>{err}</div>}
    </div>
  );
}

const navBtn: React.CSSProperties = { padding: '6px 8px', border: '1px solid #374151', borderRadius: 8, background: '#0f172a', color: '#fff', cursor: 'pointer' };
const cellHeader: React.CSSProperties = { padding: '10px', borderRight: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', fontWeight: 600, textAlign: 'center' };
const cellTime: React.CSSProperties = { padding: '8px 10px', borderRight: '1px solid #1f2937', borderBottom: '1px dashed #1f2937', color: '#9ca3af', fontSize: 12 };
const cellSlot: React.CSSProperties = { padding: '6px', borderRight: '1px solid #1f2937', borderBottom: '1px dashed #1f2937' };
