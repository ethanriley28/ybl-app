// components/BookingCalendar.tsx
'use client';

import * as React from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

type Occupied = { start: string; end: string };

type Props = {
  slotMinutes: number;            // 30 or 60
  daysAhead?: number;             // how many days to show
  refreshKey?: number;            // re-fetch when this changes
  onPickSlot?: (start: Date) => void;
};

function addMinutes(d: Date, mins: number) {
  return new Date(d.getTime() + mins * 60000);
}
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}
function parseWeekly(): Record<string, [string, string][]> {
  try {
    const raw = process.env.NEXT_PUBLIC_COACH_WEEKLY_HOURS as string | undefined;
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function BookingCalendar({
  slotMinutes,
  daysAhead = 21,
  refreshKey,
  onPickSlot,
}: Props) {
  const [occupied, setOccupied] = React.useState<Occupied[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const startRange = React.useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const endRange   = React.useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + daysAhead); return d; }, [daysAhead]);

  // Fetch occupied whenever range or refreshKey changes
  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const from = startRange.toISOString();
        const to   = endRange.toISOString();
        const res  = await fetch(`/api/bookings/occupied?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { cache: 'no-store' });
        const j    = await res.json();
        if (!j.ok) throw new Error(j.error || 'failed');
        if (isMounted) setOccupied(j.occupied || []);
      } catch (e: any) {
        if (isMounted) setErr(e?.message || 'Could not load calendar');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [startRange, endRange, refreshKey]);

  // Build available slots from weekly hours, removing occupied
  const weekly = React.useMemo(() => parseWeekly(), []);
  const available = React.useMemo(() => {
    const out: { start: Date; end: Date }[] = [];
    const now = new Date();
    const occ = occupied.map(o => ({ s: new Date(o.start), e: new Date(o.end) }));
    const cur = new Date(startRange);

    while (cur < endRange) {
      const day = ['sun','mon','tue','wed','thu','fri','sat'][cur.getDay()];
      const windows = (weekly[day] || []) as [string, string][];

      windows.forEach(([from, to]) => {
        const [fh,fm] = from.split(':').map(Number);
        const [th,tm] = to.split(':').map(Number);
        const winStart = new Date(cur); winStart.setHours(fh, fm, 0, 0);
        const winEnd   = new Date(cur); winEnd.setHours(th, tm, 0, 0);

        for (let t = new Date(winStart); addMinutes(t, slotMinutes) <= winEnd; t = addMinutes(t, slotMinutes)) {
          const s = new Date(t);
          const e = addMinutes(s, slotMinutes);
          if (s <= now) continue;
          if (!occ.some(o => overlaps(s, e, o.s, o.e))) out.push({ start: s, end: e });
        }
      });

      cur.setDate(cur.getDate() + 1);
    }

    return out.sort((a,b) => a.start.getTime() - b.start.getTime());
  }, [occupied, weekly, slotMinutes, startRange, endRange]);

  // Events: red = booked, green = open (with label)
  const bookedEvents = occupied.map(o => ({
    start: new Date(o.start),
    end: new Date(o.end),
    title: 'Booked',
    backgroundColor: '#dc2626',
    borderColor: '#b91c1c',
    textColor: '#ffffff',
    display: 'block' as const,
    overlap: false,
    extendedProps: { kind: 'booked' as const },
  }));

  const openEvents = available.slice(0, 600).map(s => ({
    start: s.start,
    end: s.end,
    title: 'Open',
    backgroundColor: 'rgba(34,197,94,.35)', // green-ish
    borderColor: '#16a34a',
    textColor: '#bbf7d0',
    display: 'block' as const,
    overlap: false,
    extendedProps: { kind: 'open' as const },
  }));

  return (
    <div>
      {/* Make sure header/labels are readable regardless of the page theme */}
      <style jsx global>{`
        .fc .fc-toolbar-title { color: #111; font-weight: 800; }
        .fc .fc-button { background: #111; border: 1px solid #111; }
        .fc .fc-button:disabled { opacity: .6; }
        .fc .fc-button-primary:not(:disabled).fc-button-active { background: #111; }
        .fc .fc-col-header-cell-cushion { color: #111 !important; font-weight: 700; }
        .fc .fc-timegrid-slot-label { color: #111; }
        .fc-theme-standard .fc-scrollgrid,
        .fc-theme-standard td, .fc-theme-standard th { border-color: #1f2937; }
        .fc .fc-timegrid-axis-cushion { color: #111; }
      `}</style>

      {loading && <div style={{ color:'#94a3b8', padding: 8 }}>Loading…</div>}
      {err && <div style={{ color:'#fecaca', padding: 8 }}>Error: {err}</div>}

      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        height="auto"
        allDaySlot={false}
        slotMinTime="17:00:00"                // 5 PM
        slotMaxTime="20:30:00"                // 8:30 PM
        nowIndicator
        selectable={false}
        slotDuration={slotMinutes === 60 ? '01:00:00' : '00:30:00'}
        eventOrder="-start"
        // Top toolbar (title + prev/next/today)
        headerToolbar={{ start: 'title', center: '', end: 'today prev,next' }}
        // Show clear day names + dates above each column
        dayHeaderContent={(arg) => {
          const d = arg.date;
          const weekday = d.toLocaleDateString(undefined, { weekday: 'short' }); // Mon
          const month   = d.toLocaleDateString(undefined, { month: 'short' });   // Aug
          const day     = d.getDate();                                            // 28
          const el = document.createElement('div');
          el.style.fontWeight = '700';
          el.textContent = `${weekday} ${month} ${day}`;
          return { domNodes: [el] };
        }}
        // Nice time labels on the left
        slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
        events={[...bookedEvents, ...openEvents]}
        eventContent={(arg) => {
          const kind = (arg.event.extendedProps as any)?.kind;
          const label = kind === 'booked' ? 'Booked' : 'Open';
          const el = document.createElement('div');
          el.style.fontWeight = '700';
          el.style.fontSize = '12px';
          el.style.padding = '2px 4px';
          el.textContent = label;
          return { domNodes: [el] };
        }}
        dateClick={(info) => {
          // Also allow tapping a green background slot (not only the green event)
          const d = new Date(info.date);
          const step = slotMinutes;
          const snapped = new Date(d);
          snapped.setMinutes(Math.floor(d.getMinutes() / step) * step, 0, 0);
          const ok = openEvents.some(e => e.start.getTime() === snapped.getTime());
          if (ok) onPickSlot?.(snapped);
        }}
        eventClick={(info) => {
          const kind = (info.event.extendedProps as any)?.kind;
          if (kind === 'open' && info.event.start) onPickSlot?.(info.event.start);
        }}
      />
    </div>
  );
}
