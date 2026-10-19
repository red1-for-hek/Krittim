'use client';

import { Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
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

const DISCORD_SVG = (
  <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

type OAuthProvider = 'google' | 'github' | 'discord';

export function AuthModal() {
  const open = useAuthStore((s) => s.authModalOpen);
  const mode = useAuthStore((s) => s.authMode);
  const close = useAuthStore((s) => s.closeAuthModal);
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setMode = useAuthStore((s) => s.openAuthModal);

  const [emailView, setEmailView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const title = mode === 'login' ? 'Welcome back' : 'Create your account';
  const subtitle = mode === 'login' ? 'Log in to sync chats across devices.' : 'Sign up to save chats and sync everywhere.';

  const handleClose = (v: boolean) => {
    if (!v) { close(); setEmailView(false); setEmail(''); setPassword(''); }
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    void login('email', email, password, mode === 'signup').catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : 'Authentication failed');
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-sm rounded-2xl border-white/10 bg-popover/95 p-6 backdrop-blur-xl">
        <DialogHeader className="items-center text-center">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-soft text-lg font-bold text-white shadow-[0_0_24px_-6px_var(--brand)]">
            K
          </span>
          <DialogTitle className="font-sans text-xl font-semibold tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-[13px]">{subtitle}</DialogDescription>
        </DialogHeader>

        {emailView ? (
          <form onSubmit={handleEmailSubmit} className="mt-4 flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-xl border border-hairline bg-surface px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/20"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 w-full rounded-xl border border-hairline bg-surface px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/20"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand to-brand-soft text-sm font-semibold text-white outline-none transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : (mode === 'login' ? 'Log in' : 'Create account')}
            </button>
            {error && <p className="text-center text-xs text-red-400">{error}</p>}
            <button type="button" onClick={() => setEmailView(false)} className="text-center text-[12px] text-muted-foreground transition-colors hover:text-foreground">
              ← Back to all options
            </button>
          </form>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {([
              { provider: 'google' as OAuthProvider, icon: GOOGLE_SVG, label: 'Continue with Google' },
              { provider: 'github' as OAuthProvider, icon: GITHUB_SVG, label: 'Continue with GitHub' },
              { provider: 'discord' as OAuthProvider, icon: DISCORD_SVG, label: 'Continue with Discord' },
            ] as const).map(({ provider, icon, label }) => (
              <button
                key={provider}
                type="button"
                disabled={isLoading}
                onClick={() => login(provider)}
                className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-hairline bg-surface px-3 text-sm font-medium text-foreground outline-none transition-all duration-200 hover:border-brand/40 hover:bg-surface-hover active:scale-[0.98] disabled:opacity-60"
              >
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : icon}
                {label}
              </button>
            ))}

            <div className="relative my-1 flex items-center gap-3">
              <span className="h-px flex-1 bg-hairline" />
              <span className="text-[11px] text-muted-foreground/50">or</span>
              <span className="h-px flex-1 bg-hairline" />
            </div>

            <button
              type="button"
              onClick={() => setEmailView(true)}
              className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-hairline bg-surface px-3 text-sm font-medium text-foreground outline-none transition-all duration-200 hover:border-brand/40 hover:bg-surface-hover active:scale-[0.98]"
            >
              <Mail className="size-4 shrink-0" strokeWidth={1.8} />
              Continue with Email
            </button>
          </div>
        )}

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
