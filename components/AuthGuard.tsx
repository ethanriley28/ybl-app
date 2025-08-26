// components/AuthGuard.tsx
'use client';
import React from 'react';
import { supabase } from '@/lib/supabaseClient'; // if this path errors, use: import { supabase } from '../lib/supabaseClient';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    let active = true;
    async function run() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setOk(true);
      } else {
        setOk(false);
        window.location.href = '/auth';
      }
    }
    run();
    return () => { active = false; };
  }, []);

  if (ok === null) return <div style={{ padding: 24 }}>Loading…</div>;
  return <>{children}</>;
}
