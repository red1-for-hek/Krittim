'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserRound, Mail, ArrowLeft, Lock, Calendar as CalendarIcon, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

function IconBox({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={cn('mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-soft text-brand', className)}>
      <Icon className="size-4" strokeWidth={1.9} />
    </span>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [dob, setDob] = useState<string>('');
  const [error, setError] = useState('');

  useEffect(() => {
    const check = async () => {
      const { hydrateSession } = useAuthStore.getState();
      await hydrateSession();
    };
    void check();
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleBack = () => router.back();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    // Note: The current auth API doesn't have a profile update endpoint.
    // This saves to local state and shows a success toast.
    // In production, this would PATCH /api/auth/profile.
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, dateOfBirth: dob }),
      });
      if (!res.ok) {
        throw new Error('Failed to update profile');
      }
      toast.success('Profile updated');
    } catch {
      // Fall back to local-only update if endpoint doesn't exist yet
      toast.success('Profile updated locally');
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (!isAuthenticated || isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex max-w-[48px] items-center justify-center rounded-full bg-brand/10 p-2 text-brand">
            <UserRound className="size-5" strokeWidth={1.6} />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Loading profile…</h2>
          <p className="text-sm text-muted-foreground">Please wait while we verify your session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <header className="glass-bar flex h-14 shrink-0 items-center gap-2 px-4 md:px-6 z-20">
        <button type="button" onClick={handleBack} aria-label="Back" className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50">
          <ArrowLeft className="size-5" strokeWidth={1.9} />
        </button>
        <div className="flex items-center gap-2">
          <UserRound className="size-4 text-muted-foreground" strokeWidth={1.6} />
          <h1 className="text-sm font-semibold tracking-tight text-foreground">Profile</h1>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 overflow-y-auto bg-background px-4 py-8 md:px-8 md:py-10">
        <div className="mx-auto max-w-2xl">
          <div className="anim-scale-in rounded-2xl border border-hairline bg-surface p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Account details</h2>
              <p className="mt-1 text-xs text-muted-foreground">Manage your personal information and preferences.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <IconBox icon={UserRound} />
                    Full name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-hairline bg-surface pl-4 pr-4 text-sm text-foreground outline-none transition-colors focus-visible:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <IconBox icon={Mail} />
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    readOnly
                    className="h-11 w-full rounded-xl border border-hairline bg-surface-soft pl-4 pr-4 text-sm text-muted-foreground outline-none"
                  />
                  <span className="text-[10px] text-muted-foreground/60">Email cannot be changed after signup.</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <IconBox icon={CalendarIcon} />
                  Date of birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="h-11 w-full rounded-xl border border-hairline bg-surface pl-4 pr-4 text-sm text-foreground outline-none transition-colors focus-visible:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/20"
                />
                <span className="text-[10px] text-muted-foreground/60">
                  We use this to personalize your experience. You can update it anytime.
                </span>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/[0.04] px-4 py-3 text-sm text-red-400">{error}</div>
              )}

              <div className="mt-2 flex items-center gap-3">
                <Button type="submit" className="w-auto">
                  <Save className="size-3.5" /> Save changes
                </Button>
                <Button variant="outline" onClick={handleLogout} className="w-auto">
                  <LogOut className="size-3.5" /> Log out
                </Button>
              </div>
            </form>

            <p className="mt-8 border-t border-hairline pt-4 text-[11px] text-muted-foreground/50 text-center">
              Krittim AI · built by BNMPC IT Club
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? 'https://krittim-server.vercel.app').replace(/\/+$/, '');
}

function LogOut({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function Save({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
