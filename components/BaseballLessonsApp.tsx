// components/BaseballLessonsApp.tsx
'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabaseClient';
import BookingCalendar from '@/components/BookingCalendar';

type Athlete = { id: string; full_name: string | null };

function addMinutes(d: Date, mins: number) { return new Date(d.getTime() + mins * 60000); }
function toLocalDateInputValue(d = new Date()) {
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return t.toISOString().slice(0, 10); // yyyy-mm-dd
}
function combineLocalDateTime(dateStr: string, timeStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const dt = new Date();
  dt.setFullYear(y, (m ?? 1) - 1, d ?? 1);
  dt.setHours(hh ?? 0, mm ?? 0, 0, 0);
  return dt;
}

export default function BaseballLessonsApp() {
  // redirect to /auth if logged out
  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) window.location.href = '/auth';
    })();
  }, []);

  // athletes
  const [athletes, setAthletes] = React.useState<Athlete[]>([]);
  const [athleteId, setAthleteId] = React.useState<string>('');
  const [loadingAthletes, setLoadingAthletes] = React.useState(true);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('athletes')
          .select('id, full_name')
          .order('full_name', { ascending: true });
        if (error) throw error;
        setAthletes((data ?? []) as Athlete[]);
      } catch (e: any) {
        setLoadErr(e?.message || 'Failed to load athletes');
      } finally {
        setLoadingAthletes(false);
      }
    })();
  }, []);

  // booking form state
  const [bkDate, setBkDate]   = React.useState(toLocalDateInputValue());
  const [bkTime, setBkTime]   = React.useState('17:00'); // 5:00 PM
  const [bkLength, setBkLen]  = React.useState<number>(60); // 30 or 60
  const [bkNote, setBkNote]   = React.useState('');
  const [saving, setSaving]   = React.useState(false);
  const [msg, setMsg]         = React.useState<string | null>(null);
  const [err, setErr]         = React.useState<string | null>(null);

  async function handleAddBooking() {
    setMsg(null); setErr(null);
    if (!athleteId) { setErr('Please select an athlete.'); return; }
    if (!bkDate || !bkTime) { setErr('Pick a date and time.'); return; }

    const start = combineLocalDateTime(bkDate, bkTime);
    const end   = addMinutes(start, bkLength);

    try {
      setSaving(true);
      const { error } = await supabase.from('bookings').insert({
        athlete_id: athleteId,
        start_time: start.toISOString(),
        end_time:   end.toISOString(),
        note: bkNote,
        status: 'confirmed',
      });
      if (error) throw error;
      setMsg('Booked! The slot will turn red in the calendar.');
      setBkNote('');
    } catch (e: any) {
      setErr(e?.message || 'Booking failed.');
    } finally {
      setSaving(false);
    }
  }

  // styles
  const card  = { border:'1px solid #e5e7eb', borderRadius:12, padding:16, background:'#fff', color:'#111' } as const;
  const input = { width:'100%', padding:'10px 12px', borderRadius:10, border:'1px solid #d1d5db', background:'#fff', color:'#111' } as const;
  const btnPrimary = { padding:'10px 14px', borderRadius:10, border:'1px solid #111', background:'#111', color:'#fff', fontWeight:800, cursor:'pointer' } as const;
  const btnToggle  = (active:boolean) => ({ flex:1, padding:'10px 12px', borderRadius:10, border:active?'2px solid #111':'1px solid #d1d5db', background:active?'#f3f4f6':'#fff', cursor:'pointer', fontWeight:800 } as React.CSSProperties);

  return (
    <main style={{ minHeight:'100dvh', background:'#0b0b0b', color:'#fff' }}>
      <div style={{ maxWidth:1100, margin:'24px auto', padding:'0 16px', display:'grid', gap:16 }}>

        {/* Athlete picker */}
        <div style={card}>
          <div style={{ display:'grid', gap:12 }}>
            <label style={{ display:'grid', gap:6, maxWidth:520 }}>
              <span style={{ fontSize:12, color:'#6b7280' }}>Athlete</span>
              <select value={athleteId} onChange={e=>setAthleteId(e.target.value)} style={input}>
                <option value="">— Select athlete —</option>
                {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name || 'Unnamed'}</option>)}
              </select>
            </label>
            {loadingAthletes && <div style={{ color:'#94a3b8' }}>Loading athletes…</div>}
            {loadErr && <div style={{ color:'#fecaca' }}>{loadErr}</div>}
          </div>
        </div>

        {/* Create Booking */}
        <div style={{ display:'grid', gap:12 }}>
          <div style={{ fontWeight:700, fontSize:18 }}>Create Booking</div>
          <div style={card}>
            <div style={{ display:'grid', gap:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, maxWidth:520 }}>
                <label style={{ display:'grid', gap:6 }}>
                  <span style={{ fontSize:12, color:'#6b7280' }}>Date</span>
                  <input type="date" value={bkDate} onChange={e=>setBkDate(e.target.value)} style={input} />
                </label>
                <label style={{ display:'grid', gap:6 }}>
                  <span style={{ fontSize:12, color:'#6b7280' }}>Time</span>
                  <input type="time" value={bkTime} onChange={e=>setBkTime(e.target.value)} step={300} style={input} />
                </label>
              </div>

              <div style={{ display:'flex', gap:8, maxWidth:520 }}>
                <button type="button" onClick={()=>setBkLen(30)} style={btnToggle(bkLength===30)}>30 minutes</button>
                <button type="button" onClick={()=>setBkLen(60)} style={btnToggle(bkLength===60)}>60 minutes</button>
              </div>

              <label style={{ display:'grid', gap:6, maxWidth:520 }}>
                <span style={{ fontSize:12, color:'#6b7280' }}>Note (optional)</span>
                <input type="text" placeholder="e.g., focus on hitting / fielding" value={bkNote} onChange={e=>setBkNote(e.target.value)} style={input} />
              </label>

              <div>
                <button type="button" onClick={handleAddBooking} disabled={saving} style={{ ...btnPrimary, opacity:saving?0.7:1 }}>
                  {saving ? 'Booking…' : 'Add Booking'}
                </button>
              </div>

              {msg && <div style={{ color:'#bbf7d0' }}>{msg}</div>}
              {err && <div style={{ color:'#fecaca' }}>{err}</div>}
            </div>
          </div>

          {/* Calendar under the form */}
          <BookingCalendar
            athleteId={null}          // selection mode; booking happens via the form
            slotMinutes={bkLength}    // 30 or 60
            onPickSlot={(start) => {
              const yyyy = start.getFullYear();
              const mm = String(start.getMonth() + 1).padStart(2, '0');
              const dd = String(start.getDate()).padStart(2, '0');
              const hh = String(start.getHours()).padStart(2, '0');
              const mi = String(start.getMinutes()).padStart(2, '0');
              setBkDate(`${yyyy}-${mm}-${dd}`);
              setBkTime(`${hh}:${mi}`);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
          <div style={{ color:'#94a3b8', fontSize:12 }}>
            Green = openings · Red = booked. Tap a green time to fill the form above, then press <b>Add Booking</b>.
          </div>
        </div>
      </div>
    </main>
  );
}
