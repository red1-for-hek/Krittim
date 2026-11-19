'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const { hydrateSession, isAuthenticated, checking } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      await hydrateSession();
      if (cancelled) return;
      setReady(true);
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [hydrateSession]);

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace('/login');
    }
  }, [ready, isAuthenticated, router]);

  // Same shell on server and client during hydration → no mismatch.
  if (!ready || checking) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-background">
        <div className="animate-pulse rounded-full bg-brand/10 p-3 text-brand">
          <svg
            className="size-6"
            strokeWidth={1.6}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path strokeLinecap="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0Z" />
          </svg>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="relative min-h-dvh w-full overflow-hidden">
      <AppShell />
    </main>
  );
}
