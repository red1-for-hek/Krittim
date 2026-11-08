'use client';

import { Loader2, TriangleAlert } from 'lucide-react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuthStore } from '@/store/authStore';

/**
 * /auth/callback — landing page for the OAuth redirect.
 *
 * The server bounces the browser here with the JWT pair in the URL *fragment*
 * (#access_token=…&refresh_token=…), which is never sent to servers or logged.
 * We parse it, store the tokens, verify the session, then clean the address bar
 * and drop the user into the app.
 */
function CallbackContent() {
  const router = useRouter();
  const complete = useAuthStore((s) => s.completeOAuthFromCallback);
  const fail = useAuthStore((s) => s.failOAuth);
  const [error, setError] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const run = async () => {
      const hash = window.location.hash.replace(/^#/, '');
      const params = new URLSearchParams(hash);
      const access = params.get('access_token');
      const refresh = params.get('refresh_token');
      const oauthError = params.get('error');

      // Strip the fragment immediately so tokens never linger in history.
      window.history.replaceState(null, '', window.location.pathname);

      if (oauthError || !access || !refresh) {
        fail(oauthError ?? 'missing tokens');
        setError(oauthError ? decodeURIComponent(oauthError) : 'Login did not complete. Please try again.');
        return;
      }

      try {
        await complete(access, refresh);
        router.replace('/');
      } catch {
        setError('We could not verify your session. Please try logging in again.');
      }
    };

    void run();
  }, [complete, fail, router]);

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[320px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-[100px]"
        style={{
          background:
            'conic-gradient(from 120deg, oklch(0.62 0.18 155 / 55%), oklch(0.7 0.14 175 / 35%), oklch(0.55 0.16 135 / 45%), oklch(0.62 0.18 155 / 55%))',
        }}
      />
      <div className="anim-scale-in flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-hairline bg-popover/80 p-8 text-center shadow-[0_30px_80px_-30px_black] backdrop-blur-xl">
        <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-soft text-lg font-bold text-white shadow-[0_0_24px_-6px_var(--brand)]">
          {error ? <TriangleAlert className="size-6" /> : 'K'}
        </span>
        {error ? (
          <>
            <h1 className="text-lg font-semibold tracking-tight text-foreground">Sign-in failed</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => router.replace('/')}
              className="mt-1 h-10 rounded-xl bg-gradient-to-br from-brand to-brand-soft px-4 text-sm font-semibold text-white outline-none transition-all hover:brightness-110 active:scale-95"
            >
              Back to Krittim
            </button>
          </>
        ) : (
          <>
            <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
              <Loader2 className="size-4 animate-spin text-brand" />
              Signing you in…
            </h1>
            <p className="text-sm text-muted-foreground">Securely completing authentication.</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackContent />
    </Suspense>
  );
}
