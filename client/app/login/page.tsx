'use client';

import { Suspense, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { LoginForm } from './_components/LoginForm';

export default function LoginPage() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { hydrateSession } = useAuthStore.getState();
      await hydrateSession();
      setChecked(true);
    };
    void check();
  }, []);

  if (!checked) {
    return (
      <div className="flex min-h-dvh w-full items-center justify-center bg-background">
        <div className="animate-pulse rounded-full bg-brand/10 p-3 text-brand">
          <svg className="size-6" strokeWidth={1.6} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0Z" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex min-h-dvh w-full items-center justify-center bg-background">
        <div className="animate-pulse rounded-full bg-brand/10 p-3 text-brand">
          <svg className="size-6" strokeWidth={1.6} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0Z" />
          </svg>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
