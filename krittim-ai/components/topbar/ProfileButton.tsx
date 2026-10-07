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
import { CURRENT_USER } from '@/lib/types';
import { useChatStore } from '@/store/chatStore';

/**
 * ProfileButton — Account & Workspace surface in the top bar.
 * Gradient avatar opens a frosted glass dropdown for the enterprise account.
 */
export function ProfileButton() {
  const setSettingsOpen = useChatStore((s) => s.setSettingsOpen);
  const resetAllData = useChatStore((s) => s.resetAllData);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Account menu — ${CURRENT_USER.name}`}
            className="group rounded-full outline-none transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-brand/60 active:scale-95"
          />
        }
      >
        <Avatar className="size-8 ring-1 ring-white/10 transition-all duration-300 group-hover:ring-brand/50 group-data-popup-open:ring-brand/70">
          <div className="grid size-full place-items-center bg-gradient-to-br from-brand via-brand to-brand-soft text-[11px] font-semibold text-white">
            <span className="font-serif-display italic">K</span>
          </div>
          <AvatarFallback>{CURRENT_USER.initials}</AvatarFallback>
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
            {CURRENT_USER.initials}
            <motion.span
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="absolute -bottom-px -right-px size-3 rounded-full border-2 border-popover bg-emerald-400 shadow-[0_0_10px_oklch(0.75_0.17_155/80%)]"
            />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-foreground">{CURRENT_USER.name}</span>
            <span className="truncate text-xs text-muted-foreground">{CURRENT_USER.email}</span>
          </span>
        </DropdownMenuLabel>

        <div className="p-1.5">
          <DropdownMenuItem
            onSelect={() => setSettingsOpen(true)}
            className="gap-2.5 rounded-lg"
          >
            <UserRound className="size-4 text-muted-foreground" strokeWidth={1.9} />
            Account & Workspace
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
            onSelect={() => setSettingsOpen(true)}
            className="gap-2.5 rounded-lg text-brand focus:bg-brand/10 focus:text-brand focus:**:text-brand!"
          >
            <Crown className="size-4" strokeWidth={1.9} />
            Enterprise Plan
            <Check className="ml-auto size-3.5 text-brand opacity-100" />
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={() => resetAllData()}
            className="gap-2.5 rounded-lg text-muted-foreground hover:text-red-400 focus:text-red-400"
          >
            <LogOut className="size-4" strokeWidth={1.9} />
            Reset Session
          </DropdownMenuItem>
        </div>

        <p className="border-t border-hairline px-3.5 py-2 text-[10px] text-muted-foreground/60">
          <span className="font-serif-display italic">{CURRENT_USER.plan}</span>
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
