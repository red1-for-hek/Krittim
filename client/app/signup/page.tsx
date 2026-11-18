'use client';

import { Suspense, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { SignupForm } from './_components/SignupForm';

export default function SignupPage() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { hydrateSession, isAuthenticated } = useAuthStore.getState();
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
            <path strokeLinecap="round" d="M12 2v20" />
            <path strokeLinecap="round" d="M7 13h10l-2-3-2 3" />
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
            <path strokeLinecap="round" d="M12 2v20" />
            <path strokeLinecap="round" d="M7 13h10l-2-3-2 3" />
          </svg>
        </div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
