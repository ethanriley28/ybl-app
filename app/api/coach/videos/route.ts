// app/api/coach/videos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSupabase, isCoachEmail } from '@/lib/supabaseServer';

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE! // server: bypass RLS after coach check
);

export async function POST(req: NextRequest) {
  const server = getServerSupabase();
  const { data: { user } } = await server.auth.getUser();
  if (!user || !isCoachEmail(user.email)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const { athleteId, title, url } = await req.json().catch(() => ({}));
  if (!athleteId || !url) {
    return NextResponse.json({ ok: false, error: 'bad payload' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('athlete_videos')
    .insert({ athlete_id: athleteId, title: title || null, url, uploaded_by: user.id })
    .select('id')
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}
