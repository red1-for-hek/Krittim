'use client';

import { motion } from 'framer-motion';
import {
  Check,
  LogOut,
  Crown,
  Settings2,
  UserRound,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MOCK_USER } from '@/lib/types';
import { useChatStore } from '@/store/chatStore';

/**
 * ProfileButton — mock auth surface in the top bar.
 * Gradient avatar opens a glass dropdown for the demo account:
 * identity header · Profile · Settings · Upgrade to Pro · Log out (disabled).
 */
export function ProfileButton() {
  const setSettingsOpen = useChatStore((s) => s.setSettingsOpen);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Account menu — ${MOCK_USER.name}`}
            className="group rounded-full outline-none transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-brand/60 active:scale-95"
          />
        }
      >
        <Avatar className="size-8 ring-1 ring-white/10 transition-all duration-300 group-hover:ring-brand/50 group-data-popup-open:ring-brand/70">
          {/* Demo account has no photo — luminous "K" monogram stands in. */}
          <div className="grid size-full place-items-center bg-gradient-to-br from-brand via-brand to-brand-soft text-[11px] font-semibold text-white">
            <span className="font-serif-display italic">K</span>
          </div>
          <AvatarFallback>{MOCK_USER.initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 overflow-hidden rounded-2xl border-white/10 bg-popover/80 p-0 backdrop-blur-xl shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)]"
      >
        {/* ---- identity header ---- */}
        <DropdownMenuLabel className="flex items-center gap-3 border-b border-hairline bg-surface px-3.5 py-3">
          <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand via-brand to-brand-soft text-xs font-semibold text-white">
            {MOCK_USER.initials}
            <motion.span
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="absolute -bottom-px -right-px size-3 rounded-full border-2 border-popover bg-emerald-400 shadow-[0_0_10px_oklch(0.75_0.17_155/80%)]"
            />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-foreground">{MOCK_USER.name}</span>
            <span className="truncate text-xs text-muted-foreground">{MOCK_USER.email}</span>
          </span>
        </DropdownMenuLabel>

        <div className="p-1.5">
          <DropdownMenuItem
            onSelect={() => {
              /* Demo build — profile page lands with the backend. */
            }}
            className="gap-2.5 rounded-lg"
          >
            <UserRound className="size-4 text-muted-foreground" strokeWidth={1.9} />
            Profile
            <DropdownMenuShortcut className="rounded-md border border-white/10 bg-surface-soft px-1.5 py-0.5 font-mono text-[9px] normal-case tracking-normal text-muted-foreground/70">
              soon
            </DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => setSettingsOpen(true)}
            className="gap-2.5 rounded-lg"
          >
            <Settings2 className="size-4 text-muted-foreground" strokeWidth={1.9} />
            Settings
            <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="mx-1 my-1.5" />

          <DropdownMenuItem
            onSelect={() => {
              /* Mock upgrade intent — swap for billing checkout when wired up. */
            }}
            className="gap-2.5 rounded-lg text-brand focus:bg-brand/10 focus:text-brand focus:**:text-brand!"
          >
            <Crown className="size-4" strokeWidth={1.9} />
            Upgrade to Pro
            <Check className="ml-auto size-3.5 opacity-0" />
          </DropdownMenuItem>

          <DropdownMenuItem disabled className="gap-2.5 rounded-lg">
            <LogOut className="size-4" strokeWidth={1.9} />
            Log out
            <DropdownMenuShortcut>mock</DropdownMenuShortcut>
          </DropdownMenuItem>
        </div>

        <p className="border-t border-hairline px-3.5 py-2 text-[10px] text-muted-foreground/60">
          <span className="font-serif-display italic">{MOCK_USER.plan}</span>
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
