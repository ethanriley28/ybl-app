// app/api/bookings/route.ts
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPA_URL = (process.env.SUPABASE_URL || '').trim();
const SUPA_SERVICE = (process.env.SUPABASE_SERVICE_ROLE || '').trim();

// EDIT: your coach email(s)
const allowedCoachEmails = ['rileyethan5@gmail.com'];

type BookingRow = {
  id: string;
  user_id: string;
  athlete_id: string | null;
  athlete_name: string;
  start_ts: string; // ISO
  end_ts: string;   // ISO
  note: string | null;
  created_at: string;
};

// get user email from a Supabase JWT
async function getUserEmailFromToken(token: string | null) {
  if (!token || !SUPA_URL || !SUPA_SERVICE) return null;
  const svc = createClient(SUPA_URL, SUPA_SERVICE);
  const { data } = await svc.auth.getUser(token);
  return data.user?.email ?? null;
}

// GET (coach only): /api/bookings?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    if (!SUPA_URL || !SUPA_SERVICE) {
      return NextResponse.json({ ok: false, error: 'Missing env' }, { status: 200 });
    }
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    const email = await getUserEmailFromToken(token);

    if (!email || !allowedCoachEmails.includes(email)) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const svc = createClient(SUPA_URL, SUPA_SERVICE);
    let q = svc.from('bookings')
      .select('id,user_id,athlete_id,athlete_name,start_ts,end_ts,note,created_at')
      .order('start_ts', { ascending: true });

    if (from) q = q.gte('start_ts', new Date(from).toISOString());
    if (to)   q = q.lt('start_ts', new Date(to).toISOString());

    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 });

    return NextResponse.json({ ok: true, bookings: (data || []) as BookingRow[] }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 200 });
  }
}

// POST (parents): create a booking
export async function POST(req: NextRequest) {
  try {
    if (!SUPA_URL || !SUPA_SERVICE) {
      return NextResponse.json({ ok: false, error: 'Missing env' }, { status: 200 });
    }
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

    const svc = createClient(SUPA_URL, SUPA_SERVICE);
    const { data: userData } = await svc.auth.getUser(token || '');
    const user = userData.user;
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { athleteId, athleteName, startISO, endISO, note } = (await req.json()) as {
      athleteId?: string;
      athleteName?: string;
      startISO?: string;
      endISO?: string;
      note?: string;
    };

    if (!athleteName || !startISO || !endISO) {
      return NextResponse.json({ ok: false, error: 'Bad payload' }, { status: 400 });
    }

    const { error } = await svc.from('bookings').insert({
      user_id: user.id,
      athlete_id: athleteId ?? null,
      athlete_name: athleteName,
      start_ts: new Date(startISO).toISOString(),
      end_ts: new Date(endISO).toISOString(),
      note: note ?? null,
    });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 200 });
  }
}
