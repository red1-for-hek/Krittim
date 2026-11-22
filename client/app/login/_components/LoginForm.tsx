'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, GitBranch, MessageSquare, Globe, Hexagon, Loader2 } from 'lucide-react';

import AnimatedMeshBackground from '@/components/layout/AnimatedMeshBackground';
import { useAuthStore } from '@/store/authStore';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loginWithEmail = useAuthStore((s) => s.loginWithEmail);
  const loginWithProvider = useAuthStore((s) => s.loginWithProvider);

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

  const handleOAuth = (provider: 'google' | 'github' | 'discord') => {
    loginWithProvider(provider);
  };

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center px-4 py-10">
      <AnimatedMeshBackground />

      <div className="glass-panel relative z-10 w-full max-w-md rounded-2xl p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-soft text-white shadow-[0_0_24px_-6px_var(--brand)]">
            <Hexagon className="size-6" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your Krittim AI workspace.
          </p>
        </div>

        {/* OAuth options */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-hairline bg-surface-soft text-sm font-medium text-foreground outline-none transition-colors hover:border-brand/40 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <Globe className="size-4 text-brand" strokeWidth={2} />
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('github')}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-hairline bg-surface-soft text-sm font-medium text-foreground outline-none transition-colors hover:border-brand/40 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <GitBranch className="size-4 text-brand" strokeWidth={2} />
            Continue with GitHub
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('discord')}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-hairline bg-surface-soft text-sm font-medium text-foreground outline-none transition-colors hover:border-brand/40 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <MessageSquare className="size-4 text-brand" strokeWidth={2} />
            Continue with Discord
          </button>
        </div>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-hairline" />
          <span className="text-xs font-medium text-muted-foreground">Or continue with email</span>
          <span className="h-px flex-1 bg-hairline" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
              <input
                type="email"
                id="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="h-11 w-full rounded-xl border border-hairline bg-surface-soft pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/20"
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
              <input
                type="password"
                id="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="h-11 w-full rounded-xl border border-hairline bg-surface-soft pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-brand/20"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/[0.08] px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand via-brand to-brand-soft text-sm font-semibold text-white shadow-[0_0_24px_-6px_var(--brand)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
