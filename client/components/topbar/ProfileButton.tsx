'use client';

import { UserRound, LogOut, Settings2, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

/**
 * ProfileButton — top-right auth surface.
 * Logged out: Log in + Sign up buttons navigate to dedicated pages.
 * Logged in: avatar — clicking opens the Profile page directly.
 */
export function ProfileButton() {
  const { user, isAuthenticated, checking, logout } = useAuthStore();
  const router = useRouter();

  if (checking && !isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-16 animate-pulse rounded-lg bg-surface-soft" />
        <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-soft" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="h-9 rounded-lg px-3 text-[13px] font-medium text-muted-foreground outline-none transition-all duration-200 hover:bg-surface-hover hover:text-foreground active:scale-95"
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => router.push('/signup')}
          className="h-9 rounded-lg bg-gradient-to-br from-brand to-brand-soft px-4 text-[13px] font-semibold text-white shadow-[0_0_16px_-4px_var(--brand)] outline-none transition-all duration-200 hover:brightness-110 active:scale-95"
        >
          Sign up
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.push('/profile')}
      aria-label={`Open profile — ${user?.name}`}
      className="group relative grid size-9 place-items-center rounded-full outline-none transition-all duration-200 hover:border-brand/40 hover:ring-2 hover:ring-brand/40 focus-visible:ring-2 focus-visible:ring-brand/60 active:scale-95"
    >
      <span className="absolute -inset-px rounded-full border border-brand/20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-soft text-[11px] font-semibold text-white relative z-10 transition-all duration-200 group-hover:scale-110">
        {user?.initials ?? '?'}
      </span>
    </button>
  );
}