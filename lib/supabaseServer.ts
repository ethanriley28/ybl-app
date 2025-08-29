// lib/supabaseServer.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Resend } from 'resend';

/**
 * Server-side Supabase client (reads auth cookies on the request)
 */
export function getServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set() {},
        remove() {},
      },
    }
  );
}

/**
 * Check if a user email is a coach.
 * Set COACH_EMAILS="coach1@email.com,coach2@email.com" in env.
 */
export function isCoachEmail(email?: string | null): boolean {
  if (!email) return false;
  const list = (process.env.COACH_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

/**
 * Optional: send email via Resend when a new video is added.
 * If RESEND_API_KEY is not set, this is a no-op.
 * MAIL_FROM can be like: "Ethan Riley Training <coach@ethanrileytraining.com>"
 */
export async function sendParentEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return; // do nothing if Resend isn't configured
  const { Resend } = (await import('resend')) as { Resend: typeof import('resend').Resend };
  const resend: Resend = new Resend(key);
  await resend.emails.send({
    from: process.env.MAIL_FROM || 'coach@ethanrileytraining.com',
    to,
    subject,
    html,
  });
}
