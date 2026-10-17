'use client';

import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/store/authStore';

const GOOGLE_SVG = (
  <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const GITHUB_SVG = (
  <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true" fill="currentColor">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
  </svg>
);

export function AuthModal() {
  const open = useAuthStore((s) => s.authModalOpen);
  const mode = useAuthStore((s) => s.authMode);
  const close = useAuthStore((s) => s.closeAuthModal);
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setMode = useAuthStore((s) => s.openAuthModal);

  const title = mode === 'login' ? 'Welcome back' : 'Create your account';
  const subtitle = mode === 'login' ? 'Log in to sync chats across devices.' : 'Sign up to save chats and sync everywhere.';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="w-full max-w-sm rounded-2xl border-white/10 bg-popover/95 p-6 backdrop-blur-xl">
        <DialogHeader className="items-center text-center">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-soft text-lg font-bold text-white shadow-[0_0_24px_-6px_var(--brand)]">
            K
          </span>
          <DialogTitle className="font-sans text-xl font-semibold tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-[13px]">{subtitle}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => login('google')}
            className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-hairline bg-surface px-3 text-sm font-medium text-foreground outline-none transition-all duration-200 hover:border-brand/40 hover:bg-surface-hover active:scale-[0.98] disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : GOOGLE_SVG}
            Continue with Google
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={() => login('github')}
            className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-hairline bg-surface px-3 text-sm font-medium text-foreground outline-none transition-all duration-200 hover:border-brand/40 hover:bg-surface-hover active:scale-[0.98] disabled:opacity-60"
          >
            {isLoading ? <Loader2 className="size-4 animate-spin" /> : GITHUB_SVG}
            Continue with GitHub
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground/70">
          By continuing you agree to our Terms and Privacy Policy.
        </p>

        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="mt-2 w-full text-center text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {mode === 'login' ? (
            <>No account? <span className="font-medium text-brand">Sign up</span></>
          ) : (
            <>Have an account? <span className="font-medium text-brand">Log in</span></>
          )}
        </button>
      </DialogContent>
    </Dialog>
  );
}
