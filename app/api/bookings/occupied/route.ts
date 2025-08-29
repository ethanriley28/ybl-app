// app/api/bookings/occupied/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') || new Date().toISOString();
    const to =
      searchParams.get('to') ||
      new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(); // +30d

    // your schema uses start_ts / end_ts
    const { data, error } = await admin
      .from('bookings')
      .select('start_ts, end_ts')
      .gte('start_ts', from)
      .lte('end_ts', to);

    if (error) throw error;

    const occupied = (data || []).map((b: any) => ({
      start: b.start_ts,
      end: b.end_ts,
    }));

    return NextResponse.json({ ok: true, occupied });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 });
  }
}
