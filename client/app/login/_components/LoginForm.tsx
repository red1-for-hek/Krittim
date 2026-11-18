'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock } from 'lucide-react';

import { useAuthStore } from '@/store/authStore';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loginWithEmail = useAuthStore((s) => s.loginWithEmail);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await loginWithEmail(email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-8 flex max-w-[64px] items-center justify-center rounded-full bg-brand/10 p-3 text-brand">
          <Lock className="size-6" strokeWidth={1.6} />
        </div>

        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Sign in to your Krittim account to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={1.6} />
              <input
                type="email"
                id="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="h-11 w-full rounded-xl border border-hairline bg-surface pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/20"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={1.6} />
              <input
                type="password"
                id="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-11 w-full rounded-xl border border-hairline bg-surface pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/20"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/[0.04] px-4 py-3 text-sm text-red-400">{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-transparent bg-gradient-to-br from-brand via-brand to-brand-soft text-sm font-semibold text-white shadow-[0_0_24px_-6px_var(--brand)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {isLoading ? <span className="flex items-center gap-1.5"><span className="animate-spin h-4 w-4" /> Signing in…</span> : 'Sign in'}
          </button>
        </form>

        <p className="mt-8 text-xs text-center text-muted-foreground">
          Don't have an account?{' '}
          <a href="/signup" className="font-medium text-brand hover:underline">
            Create an account
          </a>
        </p>
      </div>
    </div>
  );
}
