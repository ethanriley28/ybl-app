// app/api/athletes/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

const SUPA_URL = (process.env.SUPABASE_URL || '').trim();
const SUPA_KEY = (process.env.SUPABASE_SERVICE_ROLE || '').trim();
const H = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` };

// GET /api/athletes -> { ok: true, athletes: [...] }
export async function GET() {
  try {
    if (!SUPA_URL || !SUPA_KEY) {
      return NextResponse.json({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' }, { status: 200 });
    }

    // You can change order=created_at.desc to order=name.asc if you prefer
    const r = await fetch(
      `${SUPA_URL}/rest/v1/athletes?select=id,name,created_at&order=created_at.desc`,
      { headers: H, cache: 'no-store' }
    );
    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json({ ok: false, error: data?.message || r.statusText }, { status: 200 });
    }

    return NextResponse.json({ ok: true, athletes: data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
