// lib/supabaseServer.ts
// Minimal server-side Supabase client + helpers that other files import.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Central server client (uses SERVICE ROLE if present, else ANON). */
export function supabaseServer(): SupabaseClient {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or a Supabase key (SERVICE ROLE or ANON).');
  }
  return createClient(url, key);
}

/** Some files import this name; forward to supabaseServer(). */
export function getServerSupabase(): SupabaseClient {
  return supabaseServer();
}

/** Coach allow-list (read from env, with a safe default). */
const COACH_LIST = (process.env.NEXT_PUBLIC_COACH_EMAILS || 'rileyethan5@gmail.com')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

/** Some files import this helper; keep it here. */
export function isCoachEmail(email?: string | null): boolean {
  if (!email) return false;
  return COACH_LIST.includes(email.toLowerCase());
}

export type { SupabaseClient } from '@supabase/supabase-js';
