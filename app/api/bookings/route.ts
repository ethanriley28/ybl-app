// app/api/bookings/route.ts
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdmin } from '@supabase/supabase-js';

// Server env (Vercel Project Settings → Environment Variables)
const SUPA_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const SUPA_ANON = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const SUPA_SERVICE = (process.env.SUPABASE_SERVICE_ROLE || '').trim();

// Coach emails: either from env (comma-separated) or hardcoded fallback
const allowedCoachEmails = (process.env.COACH_EMAILS || 'rileyethan5@gmail.com')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

type BookingRow = {
  id: string;
  user_id: string;
  athlete_id: string | null;
  athlete_name: string;
  start_ts: string;
  end_ts: string;
  note: string | null;
  created_at: string;
};

function isCoach(email?: string | null) {
  return !!email && allowedCoachEmails.includes(email);
}

function getCookieAuth() {
  const cookieStore = cookies();
  const supa = createServerClient(SUPA_URL, SUPA_ANON, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
  return supa;
}

function getAdmin() {
  return createAdmin(SUPA_URL, SUPA_SERVICE);
}

// ---------- GET (coach only): list bookings, optional from/to ----------
export async function GET(req: NextRequest) {
  try {
    if (!SUPA_URL || !SUPA_ANON || !SUPA_SERVICE) {
      return NextResponse.json({ ok: false, error: 'Missing env' }, { status: 200 });
    }

    const supaAuth = getCookieAuth();
    const { data: auth } = await supaAuth.auth.getUser();
    const user = auth?.user;
    if (!user || !isCoach(user.email)) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const admin = getAdmin();
    let q = admin
      .from('bookings')
      .select('id,user_id,athlete_id,athlete_name,start_ts,end_ts,note,created_at')
      .order('start_ts', { ascending: true });

    if (from) q = q.gte('start_ts', new Date(from).toISOString());
    if (to) q = q.lt('start_ts', new Date(to).toISOString());

    const { data, error } = await q;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    return NextResponse.json({ ok: true, bookings: (data || []) as BookingRow[] }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 200 });
  }
}

// ---------- POST (parent): create a booking ----------
export async function POST(req: NextRequest) {
  try {
    if (!SUPA_URL || !SUPA_ANON || !SUPA_SERVICE) {
      return NextResponse.json({ ok: false, error: 'Missing env' }, { status: 200 });
    }

    const supaAuth = getCookieAuth();
    const { data: auth } = await supaAuth.auth.getUser();
    const user = auth?.user;
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as {
      athleteId?: string;
      athleteName?: string;
      startISO?: string;
      endISO?: string;
      note?: string;
    };

    if (!body.athleteName || !body.startISO || !body.endISO) {
      return NextResponse.json({ ok: false, error: 'Bad payload' }, { status: 400 });
    }

    const admin = getAdmin();
    const { error } = await admin.from('bookings').insert({
      user_id: user.id,
      athlete_id: body.athleteId ?? null,
      athlete_name: body.athleteName,
      start_ts: new Date(body.startISO).toISOString(),
      end_ts: new Date(body.endISO).toISOString(),
      note: body.note ?? null,
    });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 200 });
  }
}

// ---------- PATCH (coach): reschedule by id ----------
export async function PATCH(req: NextRequest) {
  try {
    if (!SUPA_URL || !SUPA_ANON || !SUPA_SERVICE) {
      return NextResponse.json({ ok: false, error: 'Missing env' }, { status: 200 });
    }

    const supaAuth = getCookieAuth();
    const { data: auth } = await supaAuth.auth.getUser();
    const user = auth?.user;
    if (!user || !isCoach(user.email)) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const { id, startISO, endISO } = (await req.json()) as { id?: string; startISO?: string; endISO?: string };
    if (!id || !startISO || !endISO) {
      return NextResponse.json({ ok: false, error: 'Bad payload' }, { status: 400 });
    }

    const admin = getAdmin();
    const { error } = await admin
      .from('bookings')
      .update({
        start_ts: new Date(startISO).toISOString(),
        end_ts: new Date(endISO).toISOString(),
      })
      .eq('id', id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 200 });
  }
}

// ---------- DELETE (coach): delete by id ----------
export async function DELETE(req: NextRequest) {
  try {
    if (!SUPA_URL || !SUPA_ANON || !SUPA_SERVICE) {
      return NextResponse.json({ ok: false, error: 'Missing env' }, { status: 200 });
    }

    const supaAuth = getCookieAuth();
    const { data: auth } = await supaAuth.auth.getUser();
    const user = auth?.user;
    if (!user || !isCoach(user.email)) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });

    const admin = getAdmin();
    const { error } = await admin.from('bookings').delete().eq('id', id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 200 });
  }
}
