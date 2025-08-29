// app/api/bookings/conflict/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uses service-role key on the server so we can see all bookings for overlap checks
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

// Overlap rule: existing.start < newEnd  AND  existing.end > newStart
export async function POST(req: NextRequest) {
  try {
    const { startISO, endISO } = await req.json();
    if (!startISO || !endISO) {
      return NextResponse.json({ ok: false, error: 'Bad payload' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('bookings')
      .select('id', { head: false })
      .lt('start_ts', endISO)
      .gt('end_ts', startISO)
      .limit(1);

    if (error) throw error;

    const conflict = (data?.length ?? 0) > 0;
    return NextResponse.json({ ok: true, conflict });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Conflict check failed' }, { status: 500 });
  }
}
