'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabaseClient';

const FullCalendar: any = dynamic(() => import('@fullcalendar/react'), { ssr: false });
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// Styles for FullCalendar
import '@fullcalendar/daygrid/main.css';
import '@fullcalendar/timegrid/main.css';

type BookingRow = {
  id: string;
  athlete_name: string;
  start_ts: string;
  end_ts: string;
  note: string | null;
};

type APIResponse = { ok: boolean; bookings?: BookingRow[]; error?: string };

export default function CoachCalendar() {
  const [events, setEvents] = React.useState<{ id: string; title: string; start: string; end: string }[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const now = new Date();
        const from = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
        const to = new Date(now.getTime() + 60 * 86400000).toISOString().slice(0, 10);

        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        const r = await fetch(`/api/bookings?from=${from}&to=${to}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: 'no-store',
        });
        const json: APIResponse = await r.json();

        if (!active) return;
        if (json.ok && Array.isArray(json.bookings)) {
          setEvents(
            json.bookings.map((b) => ({
              id: b.id,
              title: `${b.athlete_name}${b.note ? ' — ' + b.note : ''}`,
              start: b.start_ts,
              end: b.end_ts,
            }))
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) return <div style={{ marginTop: 16 }}>Loading calendar…</div>;

  return (
    <div style={{ padding: 12 }}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
        height="auto"
        events={events}
        nowIndicator={true}
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
      />
    </div>
  );
}
