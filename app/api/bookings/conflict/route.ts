// app/api/bookings/conflict/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error('SUPABASE_URL is missing or not a valid https URL');
  }
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE is missing');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// Common overlap query: existing.start < newEnd  AND  existing.end > newStart
async function checkConflict(startISO: string, endISO: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .lt('start_ts', endISO)
    .gt('end_ts', startISO)
    .limit(1);

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// GET /api/bookings/conflict?start=...&end=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    if (!start || !end) {
      return NextResponse.json({ ok: false, conflict: false, error: 'Missing start or end' }, { status: 400 });
    }
    const conflict = await checkConflict(new Date(start).toISOString(), new Date(end).toISOString());
    return NextResponse.json({ ok: true, conflict }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, conflict: false, error: e?.message || 'Conflict GET failed' }, { status: 500 });
  }
}

// POST /api/bookings/conflict  { startISO, endISO }
export async function POST(req: NextRequest) {
  try {
    const { startISO, endISO } = await req.json().catch(() => ({} as any));
    if (!startISO || !endISO) {
      return NextResponse.json({ ok: false, conflict: false, error: 'Missing startISO or endISO' }, { status: 400 });
    }
    const conflict = await checkConflict(new Date(startISO).toISOString(), new Date(endISO).toISOString());
    return NextResponse.json({ ok: true, conflict }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, conflict: false, error: e?.message || 'Conflict POST failed' }, { status: 500 });
  }
}
