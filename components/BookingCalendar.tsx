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

  // fetch occupied from API
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

  // compute green “open” slots from weekly hours minus occupied
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

  // events to render (OPEN first so BOOKED can override color)
  const openEvents = available.slice(0, 1000).map(s => ({
    start: s.start,
    end: s.end,
    title: 'Open',
    backgroundColor: '#0e4f43',  // deep green like your screenshot
    borderColor: '#0e4f43',
    textColor: '#eafaf4',
    display: 'block' as const,   // fill entire slot
    overlap: false,
    extendedProps: { kind: 'open' as const },
  }));

  const bookedEvents = occupied.map(o => ({
    start: new Date(o.start),
    end: new Date(o.end),
    title: 'Booked',
    backgroundColor: '#b91c1c',  // red
    borderColor: '#991b1b',
    textColor: '#ffffff',
    display: 'block' as const,
    overlap: false,
    extendedProps: { kind: 'booked' as const },
  }));

  return (
    <div>
      {/* Styles matching your “full-green cells + dark header + two-line day headers” look */}
      <style jsx global>{`
        /* Card border/rails come from your page container; this polishes FC internals */
        .fc .fc-toolbar.fc-header-toolbar {
          background: #0b0b0b;
          padding: 6px 10px;
          border-radius: 8px 8px 0 0;
        }
        .fc .fc-toolbar-title { color: #e5e7eb; font-weight: 800; }
        .fc .fc-button {
          background: #0f172a; border: 1px solid #0f172a; color: #fff; border-radius: 8px;
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active { background: #0f172a; }
        .fc .fc-col-header-cell {
          background: #0b0b0b;   /* dark header row */
        }
        .fc .fc-col-header-cell-cushion {
          display: flex; flex-direction: column; align-items: center;
          font-weight: 800; line-height: 1.1; color: #e5e7eb !important;
        }
        .fc .fc-col-header-cell-cushion .fc-day-line-1 { font-size: 13px; }
        .fc .fc-col-header-cell-cushion .fc-day-line-2 { font-size: 12px; color: #9ca3af; font-weight: 700; }
        .fc .fc-timegrid-slot-label { color: #e5e7eb; }
        .fc-theme-standard .fc-scrollgrid,
        .fc-theme-standard td, .fc-theme-standard th { border-color: #1f2937; }
        .fc .fc-timegrid-now-indicator-line { border-color: #f59e0b; }
        /* Remove selection highlight so green stays solid */
        .fc .fc-highlight { background: transparent; }
        /* Event fills the whole slot with square corners */
        .fc .fc-timegrid-event { border-radius: 0; }
        /* Hide default event time text—only show 'Open'/'Booked' */
        .fc .fc-event-time { display: none; }
      `}</style>

      {loading && <div style={{ color:'#94a3b8', padding: 8 }}>Loading…</div>}
      {err && <div style={{ color:'#fecaca', padding: 8 }}>Error: {err}</div>}

      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        height="auto"
        allDaySlot={false}
        slotMinTime="17:00:00"               // 5:00 PM
        slotMaxTime="20:30:00"               // 8:30 PM
        nowIndicator
        selectable={false}
        slotDuration={slotMinutes === 60 ? '01:00:00' : '00:30:00'}
        eventOrder="-start"
        headerToolbar={{ start: 'title', center: '', end: 'today prev,next' }}
        // Two-line day header: “Mon” (bold) on top, “Aug 25” below (muted)
        dayHeaderContent={(arg) => {
          const d = arg.date;
          const top  = d.toLocaleDateString(undefined, { weekday: 'short' }); // Mon
          const bot  = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); // Aug 25
          const wrap = document.createElement('div');
          const l1 = document.createElement('span');
          const l2 = document.createElement('span');
          l1.className = 'fc-day-line-1';
          l2.className = 'fc-day-line-2';
          l1.textContent = top;
          l2.textContent = bot;
          wrap.appendChild(l1);
          wrap.appendChild(l2);
          return { domNodes: [wrap] };
        }}
        slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
        events={[...openEvents, ...bookedEvents]} // OPEN first so BOOKED overrides color
        eventContent={(arg) => {
          const kind = (arg.event.extendedProps as any)?.kind;
          const label = kind === 'booked' ? 'Booked' : 'Open';
          const el = document.createElement('div');
          el.style.fontWeight = '800';
          el.style.fontSize = '12px';
          el.style.padding = '2px 6px';
          el.textContent = label;
          return { domNodes: [el] };
        }}
        dateClick={(info) => {
          // clicking a green cell background
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
