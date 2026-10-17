'use client';

import { LogOut, Settings2, UserRound } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AuthModal } from '@/components/auth/AuthModal';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';

/**
 * ProfileButton — top-right auth surface.
 * Logged out: Log in + Sign up buttons opening AuthModal.
 * Logged in: avatar opening profile menu (profile / settings / sign out).
 */
export function ProfileButton() {
  const { user, isAuthenticated, isLoading, logout, openAuthModal } = useAuthStore();
  const setSettingsOpen = useChatStore((s) => s.setSettingsOpen);

  if (isLoading && !isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-16 animate-pulse rounded-lg bg-surface-soft" />
        <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-soft" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className="h-8 rounded-lg px-3 text-[13px] font-medium text-muted-foreground outline-none transition-all duration-200 hover:bg-surface-hover hover:text-foreground active:scale-95"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => openAuthModal('signup')}
            className="h-8 rounded-lg bg-gradient-to-br from-brand to-brand-soft px-3.5 text-[13px] font-semibold text-white shadow-[0_0_16px_-4px_var(--brand)] outline-none transition-all duration-200 hover:brightness-110 active:scale-95"
          >
            Sign up
          </button>
        </div>
        <AuthModal />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label={`Account menu — ${user?.name}`}
              className="group grid size-8 place-items-center rounded-full outline-none transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-brand/60 active:scale-95"
            />
          }
        >
          <Avatar className="size-8 ring-1 ring-white/10 transition-all duration-200 group-hover:ring-brand/50">
            <div className="grid size-full place-items-center bg-gradient-to-br from-brand to-brand-soft text-[11px] font-semibold text-white">
              {user?.initials}
            </div>
            <AvatarFallback>{user?.initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-60 overflow-hidden rounded-2xl border-white/10 bg-popover/90 p-0 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] backdrop-blur-xl"
        >
          <DropdownMenuLabel className="flex items-center gap-3 border-b border-hairline bg-surface px-3.5 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-soft text-xs font-semibold text-white">
              {user?.initials}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-foreground">{user?.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
            </span>
          </DropdownMenuLabel>

          <div className="p-1.5">
            <DropdownMenuItem onSelect={() => setSettingsOpen(true)} className="gap-2.5 rounded-lg">
              <UserRound className="size-4 text-muted-foreground" strokeWidth={1.9} />
              Profile & Settings
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSettingsOpen(true)} className="gap-2.5 rounded-lg">
              <Settings2 className="size-4 text-muted-foreground" strokeWidth={1.9} />
              Customize Krittim
            </DropdownMenuItem>
            <DropdownMenuSeparator className="mx-1 my-1.5" />
            <DropdownMenuItem
              onSelect={() => logout()}
              className="gap-2.5 rounded-lg text-muted-foreground hover:text-red-400 focus:text-red-400"
            >
              <LogOut className="size-4" strokeWidth={1.9} />
              Log out
            </DropdownMenuItem>
          </div>

          <p className="border-t border-hairline px-3.5 py-2 text-[10px] text-muted-foreground/60">
            {user?.plan}
          </p>
        </DropdownMenuContent>
      </DropdownMenu>
      <AuthModal />
    </>
  );
}
