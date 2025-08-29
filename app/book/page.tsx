// app/book/page.tsx
'use client';

import * as React from 'react';
import TopBar from '@/components/TopBar';
import { supabase } from '@/lib/supabaseClient';
import BookingCalendar from '@/components/BookingCalendar';

type Athlete = { id: string; full_name: string | null };

export default function BookPage() {
  const [athletes, setAthletes] = React.useState<Athlete[]>([]);
  const [athleteId, setAthleteId] = React.useState<string>('');
  const [slotMinutes, setSlotMinutes] = React.useState<number>(60); // 30 or 60
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) { window.location.href = '/auth'; return; }
        const { data, error } = await supabase
          .from('athletes')
          .select('id, full_name')
          .order('full_name', { ascending: true });
        if (error) throw error;
        setAthletes((data ?? []) as Athlete[]);
      } catch (e: any) {
        setErr(e?.message || 'Failed to load athletes');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const input = { width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid #374151', background:'#0b1220', color:'#fff' } as const;

  return (
    <main style={{ minHeight:'100dvh', background:'#0b0b0b', color:'#fff' }}>
      <TopBar />
      <div style={{ maxWidth: 1000, margin:'24px auto', padding:'0 16px' }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:12 }}>Book a Session</h1>

        {/* Athlete + length */}
        <div style={{ display:'grid', gap:12, maxWidth: 520, marginBottom: 16 }}>
          <label style={{ display:'grid', gap:6 }}>
            <span style={{ fontSize: 14, color: '#cbd5e1' }}>Athlete</span>
            <select value={athleteId} onChange={(e) => setAthleteId(e.target.value)} style={input}>
              <option value="">— Select athlete —</option>
              {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name || 'Unnamed'}</option>)}
            </select>
          </label>

          <label style={{ display:'grid', gap:6 }}>
            <span style={{ fontSize: 14, color: '#cbd5e1' }}>Session length</span>
            <div style={{ display:'flex', gap:8 }}>
              <button
                type="button"
                onClick={() => setSlotMinutes(30)}
                style={{
                  flex:1, padding:'10px 12px', borderRadius:10,
                  border: slotMinutes===30 ? '2px solid #fff' : '1px solid #374151',
                  background: slotMinutes===30 ? '#1f2937' : '#0f172a',
                  color:'#fff', fontWeight:800, cursor:'pointer'
                }}
              >
                30 minutes
              </button>
              <button
                type="button"
                onClick={() => setSlotMinutes(60)}
                style={{
                  flex:1, padding:'10px 12px', borderRadius:10,
                  border: slotMinutes===60 ? '2px solid #fff' : '1px solid #374151',
                  background: slotMinutes===60 ? '#1f2937' : '#0f172a',
                  color:'#fff', fontWeight:800, cursor:'pointer'
                }}
              >
                60 minutes
              </button>
            </div>
          </label>
        </div>

        {loading && <div style={{ color:'#94a3b8' }}>Loading…</div>}
        {err && <div style={{ color:'#fecaca' }}>{err}</div>}

        {athleteId ? (
          <BookingCalendar athleteId={athleteId} slotMinutes={slotMinutes} />
        ) : (
          !loading && <div style={{ color:'#94a3b8' }}>Pick an athlete to see openings.</div>
        )}
      </div>
    </main>
  );
}
