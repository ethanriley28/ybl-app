// lib/supabaseServer.ts
// Minimal server-side Supabase client that avoids Next 15 cookies typing.
// Uses SERVICE ROLE if available (server-only), otherwise falls back to ANON.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function supabaseServer(): SupabaseClient {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_* key');
  }
  return createClient(url, key);
}

export type { SupabaseClient } from '@supabase/supabase-js';
