// app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient'; // if this errors, use: import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session) {
        router.replace('/scheduler');
      } else {
        router.replace('/auth');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  // Tiny placeholder while we decide where to send them
  return null;
}
