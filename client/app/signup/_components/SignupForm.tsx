'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Globe, GitBranch, MessageSquare } from 'lucide-react';

import { useAuthStore } from '@/store/authStore';

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const signupWithEmail = useAuthStore((s) => s.signupWithEmail);
  const loginWithProvider = useAuthStore((s) => s.loginWithProvider);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signupWithEmail(name, email, password);
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = (provider: 'google' | 'github' | 'discord') => {
    loginWithProvider(provider);
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-8 flex max-w-[64px] items-center justify-center rounded-full bg-brand/10 p-3 text-brand">
          <User className="size-6" strokeWidth={1.6} />
        </div>

        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">Create account</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Join Krittim AI. Sync your chats across devices.
        </p>

        {/* OAuth options */}
        <div className="space-y-2 mb-8">
          <button
            type="button"
            onClick={() => handleOAuth('google')}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-hairline bg-surface text-sm font-medium text-foreground outline-none transition-colors hover:border-brand/30 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <Globe className="size-5" strokeWidth={2} />
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('github')}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-hairline bg-surface text-sm font-medium text-foreground outline-none transition-colors hover:border-brand/30 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <GitBranch className="size-5" strokeWidth={2} />
            Continue with GitHub
          </button>
          <button
            type="button"
            onClick={() => handleOAuth('discord')}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-hairline bg-surface text-sm font-medium text-foreground outline-none transition-colors hover:border-brand/30 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <MessageSquare className="size-5" strokeWidth={2} />
            Continue with Discord
          </button>
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-hairline"></span>
          </div>
          <span className="relative px-4 text-xs font-medium text-muted-foreground">Or create with email</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" strokeWidth={1.6} />
              <input
                type="text"
                id="name"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="h-11 w-full rounded-xl border border-hairline bg-surface pl-11 pr-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/20"
              />
            </div>
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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 8 chars)"
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
            {isLoading ? <span className="flex items-center gap-1.5"><span className="animate-spin h-4 w-4" /> Creating account…</span> : 'Create account'}
          </button>
        </form>

        <p className="mt-8 text-xs text-center text-muted-foreground">
          Already have an account?{' '}
          <a href="/login" className="font-medium text-brand hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
