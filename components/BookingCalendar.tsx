// components/BookingCalendar.tsx
'use client';

import * as React from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

type Occupied = { start: string; end: string };

type Props = {
  slotMinutes: number;            // 30 or 60
  daysAhead?: number;             // default 21
  refreshKey?: number;            // bump to refetch after booking
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

  // fetch occupied
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

  // build available slots from weekly hours – remove occupied
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

  // events to render (green = open filling ENTIRE slot, red = booked)
  const bookedEvents = occupied.map(o => ({
    start: new Date(o.start),
    end: new Date(o.end),
    title: 'Booked',
    backgroundColor: '#dc2626',
    borderColor: '#b91c1c',
    textColor: '#ffffff',
    display: 'block' as const,  // full cell fill
    overlap: false,
    extendedProps: { kind: 'booked' as const },
  }));

  const openEvents = available.slice(0, 1000).map(s => ({
    start: s.start,
    end: s.end,
    title: 'Open',
    backgroundColor: '#0a3f34',      // deep green
    borderColor: '#0a3f34',
    textColor: '#d1fae5',
    display: 'block' as const,       // full cell fill
    overlap: false,
    extendedProps: { kind: 'open' as const },
  }));

  return (
    <div>
      {/* Styles to match your “full-green” look with two-line day headers */}
      <style jsx global>{`
        .fc .fc-toolbar-title { color: #e5e7eb; font-weight: 800; }
        .fc .fc-toolbar.fc-header-toolbar {
          background: #0b0b0b; padding: 6px 8px; border-radius: 8px 8px 0 0;
        }
        .fc .fc-button { background: #111; border: 1px solid #111; }
        .fc .fc-col-header-cell { background: #0b0b0b; }
        .fc .fc-col-header-cell-cushion {
          color: #e5e7eb !important; font-weight: 700; line-height: 1.1;
          display: flex; flex-direction: column; align-items: center;
        }
        .fc .fc-timegrid-slot-label { color: #e5e7eb; }
        .fc-theme-standard .fc-scrollgrid,
        .fc-theme-standard td, .fc-theme-standard th { border-color: #1f2937; }
        .fc .fc-timegrid-now-indicator-line { border-color: #f59e0b; }
        /* Remove tan selection/drag highlights */
        .fc .fc-highlight { background: transparent; }
        /* Make event boxes fill the whole slot visually */
        .fc .fc-timegrid-event { border-radius: 0; }
        /* Hide default event time text; we only show 'Open'/'Booked' labels */
        .fc .fc-event-time { display: none; }
      `}</style>

      {loading && <div style={{ color:'#94a3b8', padding: 8 }}>Loading…</div>}
      {err && <div style={{ color:'#fecaca', padding: 8 }}>Error: {err}</div>}

      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        height="auto"
        allDaySlot={false}
        slotMinTime="17:00:00"               // 5 PM
        slotMaxTime="20:30:00"               // 8:30 PM
        nowIndicator
        selectable={false}
        slotDuration={slotMinutes === 60 ? '01:00:00' : '00:30:00'}
        eventOrder="-start"
        headerToolbar={{ start: 'title', center: '', end: 'today prev,next' }}
        dayHeaderFormat={{ weekday: 'short', month: 'short', day: 'numeric' }}
        slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
        events={[...openEvents, ...bookedEvents]}  // put OPEN first so red overrides
        eventContent={(arg) => {
          const kind = (arg.event.extendedProps as any)?.kind;
          const label = kind === 'booked' ? 'Booked' : 'Open';
          const el = document.createElement('div');
          el.style.fontWeight = '800';
          el.style.fontSize = '12px';
          el.style.padding = '2px 4px';
          el.textContent = label;
          return { domNodes: [el] };
        }}
        dateClick={(info) => {
          // allow tapping a green gap (not only the event box)
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
