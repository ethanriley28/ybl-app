'use client';

import React, { useEffect, useMemo, useState } from 'react';
import BookingCalendar from '@/components/BookingCalendar';
import { supabase } from '@/lib/supabaseClient';

type Athlete = { id: string; full_name: string | null };

export default function BaseballLessonsApp() {
  // ----- form state -----
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [athleteName, setAthleteName] = useState<string>('');
  const [bkDate, setBkDate] = useState(''); // YYYY-MM-DD
  const [bkTime, setBkTime] = useState(''); // HH:mm
  const [slotMinutes, setSlotMinutes] = useState<number>(30); // 30 or 60
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // bump to refetch events

  // load athletes for the logged-in parent
  useEffect(() => {
    let on = true;
    (async () => {
      const { data, error } = await fetch('/api/athletes', { cache: 'no-store' }).then(r => r.json());
      if (!on) return;
      if (error) {
        console.error(error);
        setAthletes([]);
        return;
      }
      const rows = (data || []) as Athlete[];
      setAthletes(rows);
      // prefill selection if empty
      if (!athleteId && rows.length > 0) {
        setAthleteId(rows[0].id);
        setAthleteName(rows[0].full_name || '');
      }
    })();
    return () => { on = false; };
  }, []); // once

  // keep athleteName in sync with chosen athleteId
  useEffect(() => {
    if (!athleteId) return;
    const a = athletes.find(x => x.id === athleteId);
    setAthleteName(a?.full_name || '');
  }, [athleteId, athletes]);

  // helper: make ISO strings from local date & time
  const startEndISO = useMemo(() => {
    if (!bkDate || !bkTime) return { startISO: '', endISO: '' };
    // Construct a local Date from the date+time inputs
    const [yyyy, mm, dd] = bkDate.split('-').map(Number);
    const [HH, MM] = bkTime.split(':').map(Number);
    const start = new Date(yyyy, (mm - 1), dd, HH, MM, 0, 0); // local time
    const end = new Date(start.getTime() + slotMinutes * 60 * 1000);
    return { startISO: start.toISOString(), endISO: end.toISOString() };
  }, [bkDate, bkTime, slotMinutes]);

  async function submitBooking() {
    try {
      if (!athleteName || !bkDate || !bkTime) {
        alert('Please select athlete, date and time.');
        return;
      }
      setSubmitting(true);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          athleteId,
          athleteName,
          startISO: startEndISO.startISO,
          endISO: startEndISO.endISO,
          note: note || '',
        }),
      });
      const json = await res.json();

      if (!json.ok) {
        alert(json.error || 'Failed to create booking');
        return;
      }

      // success → calendar turns red immediately
      setRefreshKey(k => k + 1);
      // optional: clear the note
      setNote('');
      alert('Booking created!');
    } catch (e) {
      console.error(e);
      alert('Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* ---- Booking form ---- */}
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 16,
          background: '#fff',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>
          Create a Booking
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          {/* Athlete */}
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Athlete</span>
            <select
              value={athleteId ?? ''}
              onChange={(e) => setAthleteId(e.target.value || null)}
              style={inpStyle}
            >
              <option value="">— Select athlete —</option>
              {Array.isArray(athletes) &&
                athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.full_name || '(No name)'}
                  </option>
                ))}
            </select>
          </label>

          {/* Length */}
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Length</span>
            <select
              value={slotMinutes}
              onChange={(e) => setSlotMinutes(parseInt(e.target.value, 10))}
              style={inpStyle}
            >
              <option value={30}>30 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </label>

          {/* Date */}
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Date</span>
            <input
              type="date"
              value={bkDate}
              onChange={(e) => setBkDate(e.target.value)}
              style={inpStyle}
            />
          </label>

          {/* Time */}
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Time</span>
            <input
              type="time"
              value={bkTime}
              onChange={(e) => setBkTime(e.target.value)}
              style={inpStyle}
              step={60 * 30} // 30-minute steps
            />
          </label>

          {/* Note (full width) */}
          <label style={{ display: 'grid', gap: 6, gridColumn: '1 / -1' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Note (optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{ ...inpStyle, resize: 'vertical' }}
              placeholder="Anything helpful for the session..."
            />
          </label>

          {/* Submit (full width) */}
          <div style={{ gridColumn: '1 / -1' }}>
            <button
              onClick={submitBooking}
              disabled={submitting}
              style={btnStyle}
            >
              {submitting ? 'Saving…' : 'Add Booking'}
            </button>
          </div>
        </div>

        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 8 }}>
          Tip: you can also tap a time slot on the calendar below—date & time will
          auto-fill here.
        </div>
      </div>

      {/* ---- Calendar ---- */}
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 8,
          background: '#fff',
          overflow: 'hidden',
        }}
      >
        <BookingCalendar
          slotMinutes={slotMinutes}
          refreshKey={refreshKey}
          onPickSlot={(start) => {
            // write picked slot back into the form inputs
            const yyyy = start.getFullYear();
            const mm = String(start.getMonth() + 1).padStart(2, '0');
            const dd = String(start.getDate()).padStart(2, '0');
            const hh = String(start.getHours()).padStart(2, '0');
            const min = String(start.getMinutes()).padStart(2, '0');
            setBkDate(`${yyyy}-${mm}-${dd}`);
            setBkTime(`${hh}:${min}`);
          }}
        />
      </div>
    </div>
  );
}

/** simple styles */
const inpStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#111827',
};

const btnStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #111827',
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
};
