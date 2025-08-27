// app/api/athletes/route.ts
export const runtime = 'nodejs';
import { NextResponse } from 'next/server';

const SUPA_URL = (process.env.SUPABASE_URL || '').trim();
const SUPA_KEY = (process.env.SUPABASE_SERVICE_ROLE || '').trim();
const H = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` };

type AthleteRow = {
  id: string;
  name: string;
  coach_code?: string | null;
  created_at?: string | null;
};

// GET /api/athletes -> { ok: true, athletes: AthleteRow[] } | { ok:false, error: string }
export async function GET(req: Request) {
  try {
    if (!SUPA_URL || !SUPA_KEY) {
      return NextResponse.json(
        { ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' },
        { status: 200 }
      );
    }

    const url = new URL(req.url);
    const code = url.searchParams.get('coach_code');
    const filter = code ? `&coach_code=eq.${encodeURIComponent(code)}` : '';

    const r = await fetch(
      `${SUPA_URL}/rest/v1/athletes?select=id,name,coach_code,created_at${filter}&order=name.asc`,
      { headers: H, cache: 'no-store' }
    );

    const text = await r.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // leave data as raw text
    }

    if (!r.ok) {
      const statusText = r.statusText || 'Request failed';
      const errMsg =
        (data &&
          typeof data === 'object' &&
          'message' in data &&
          typeof (data as { message?: unknown }).message === 'string' &&
          (data as { message: string }).message) ||
        text ||
        statusText;
      return NextResponse.json({ ok: false, status: r.status, error: errMsg }, { status: 200 });
    }

    const athletes: AthleteRow[] = Array.isArray(data) ? (data as AthleteRow[]) : [];
    return NextResponse.json({ ok: true, athletes }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 200 });
  }
}
