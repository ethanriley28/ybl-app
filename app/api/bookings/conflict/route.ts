// app/api/bookings/conflict/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We create the client inside the handler after validating env vars,
// so a bad env var doesn't crash the build.
export async function POST(req: NextRequest) {
  try {
    const { startISO, endISO } = await req.json().catch(() => ({} as any));
    if (!startISO || !endISO) {
      return NextResponse.json({ ok: false, error: 'Bad payload' }, { status: 400 });
    }

    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE;

    // Validate env vars to avoid "Invalid URL" at build time
    if (!url || !/^https?:\/\//i.test(url)) {
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_URL is missing or not a valid https URL' },
        { status: 500 }
      );
    }
    if (!serviceKey || /^https?:\/\//i.test(serviceKey)) {
      // If serviceKey looks like a URL, the vars were likely swapped
      return NextResponse.json(
        { ok: false, error: 'SUPABASE_SERVICE_ROLE is missing or looks incorrect' },
        { status: 500 }
      );
    }

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

    // Overlap rule: existing.start < newEnd  AND  existing.end > newStart
    const { data, error } = await supabase
      .from('bookings')
      .select('id', { head: false })
      .lt('start_ts', endISO)
      .gt('end_ts', startISO)
      .limit(1);

    if (error) throw error;

    const conflict = (data?.length ?? 0) > 0;
    return NextResponse.json({ ok: true, conflict }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || 'Conflict check failed' },
      { status: 500 }
    );
  }
}
