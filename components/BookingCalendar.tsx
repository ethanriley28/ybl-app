'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';

type Occupied = { start: string; end: string; status: string | null };

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();              // 0 Sun … 6 Sat
  const diff = (day + 6) % 7;          // Monday = 0
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

  // --- responsive: detect mobile (SSR safe) ---
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 640);
    fn();
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  // Mon–Fri of current week
  const days = React.useMemo(() => [0,1,2,3,4].map(i => addDays(weekStart, i)), [weekStart]);

  // Selected day (for mobile list)
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  React.useEffect(() => {
    // pick today if it’s within the week & Mon–Fri, else Monday
    const today = new Date();
    const end = addDays(weekStart, 7);
    const inWeek = today >= weekStart && today < end && today.getDay() >= 1 && today.getDay() <= 5;
    setSelectedDay(inWeek ? today : days[0]);
  }, [weekStart, days]);

  // Fetch bookings for the week (for coloring)
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
    setBusy((data ?? []).map(r => ({
      start: (r as any).start_time,
      end: (r as any).end_time,
      status: (r as any).status
    })));
    setLoading(false);
  }
  React.useEffect(() => { load(); }, [weekStart, slotMinutes]);

  function slotIsBooked(s: Date, e: Date) {
    const sMs = s.getTime(), eMs = e.getTime();
    return busy.some(b => {
      const bs = new Date(b.start).getTime();
      const be = new Date(b.end).getTime();
      return sMs < be && eMs > bs; // overlap
    });
  }

  // build time rows (5–8 PM)
  const rows: Date[] = React.useMemo(() => {
    const base = new Date(weekStart); base.setHours(17, 0, 0, 0);
    const end  = new Date(weekStart); end.setHours(20, 0, 0, 0);
    const out: Date[] = [];
    for (let t = new Date(base); t < end; t = new Date(t.getTime() + slotMinutes * 60000)) {
      out.push(new Date(t));
    }
    return out;
  }, [weekStart, slotMinutes]);

  // ---------- RENDER ----------
  return (
    <div style={{ border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden', background: '#0b0b0b' }}>
      {/* header with week & nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#111', color: '#fff' }}>
        <div style={{ fontWeight: 700 }}>{fmtDate(days[0])} – {fmtDate(addDays(weekStart, 6))}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} style={navBtn}>today</button>
          <button onClick={() => setWeekStart(addDays(weekStart, -7))} style={navBtn}>‹</button>
          <button onClick={() => setWeekStart(addDays(weekStart, 7))} style={navBtn}>›</button>
        </div>
      </div>

      {/* MOBILE: chips + vertical list of slots */}
      {isMobile ? (
        <div style={{ padding: 10 }}>
          {/* day chips */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
            {days.map(d => {
              const active = selectedDay && d.toDateString() === selectedDay.toDateString();
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDay(d)}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '8px 10px',
                    borderRadius: 9999,
                    border: '1px solid #334155',
                    background: active ? '#0ea5e9' : '#0f172a',
                    color: active ? '#0b0b0b' : '#e5e7eb',
                    fontWeight: 600
                  }}
                >
                  {d.toLocaleDateString(undefined, { weekday: 'short' })} {fmtDate(d)}
                </button>
              );
            })}
          </div>

          {/* slot list for selected day */}
          <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
            {rows.map((rowStart, i) => {
              if (!selectedDay) return null;
              const s = new Date(selectedDay);
              s.setHours(rowStart.getHours(), rowStart.getMinutes(), 0, 0);
              const e = new Date(s.getTime() + slotMinutes * 60000);
              const booked = slotIsBooked(s, e);
              return (
                <button
                  key={i}
                  disabled={booked}
                  onClick={() => onPickSlot?.(s)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid #334155',
                    background: booked ? '#7f1d1d' : '#065f46',
                    color: '#fff',
                    fontSize: 16,
                    textAlign: 'left',
                    opacity: booked ? 0.9 : 1,
                    cursor: booked ? 'not-allowed' : 'pointer'
                  }}
                >
                  {fmtTime(s)} — {booked ? 'Booked' : 'Open'}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        // DESKTOP: week grid (Mon–Fri across, times down)
        <div>
          {/* headers */}
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
                    title={booked ? 'Booked' : 'Open'}
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
      )}

      {loading && <div style={{ padding: 8, color: '#94a3b8' }}>Loading…</div>}
      {err && <div style={{ padding: 8, color: '#fecaca' }}>{err}</div>}
    </div>
  );
}

const navBtn: React.CSSProperties = { padding: '8px 10px', border: '1px solid #374151', borderRadius: 8, background: '#0f172a', color: '#fff', cursor: 'pointer' };
const cellHeader: React.CSSProperties = { padding: '10px', borderRight: '1px solid #1f2937', background: '#0b1220', color: '#e5e7eb', fontWeight: 600, textAlign: 'center' };
const cellTime: React.CSSProperties = { padding: '8px 10px', borderRight: '1px solid #1f2937', borderBottom: '1px dashed #1f2937', color: '#9ca3af', fontSize: 12 };
const cellSlot: React.CSSProperties = { padding: '6px', borderRight: '1px solid #1f2937', borderBottom: '1px dashed #1f2937' };
