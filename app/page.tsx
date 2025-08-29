'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      router.replace(session ? '/scheduler' : '/auth');
    })();
  }, [router]);

  // No UI needed—immediately routes to the right page.
  return null;
}
