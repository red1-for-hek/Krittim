'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { ModelSwitcher } from '@/components/topbar/ModelSwitcher';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MOCK_USER } from '@/lib/types';
import { useChatStore } from '@/store/chatStore';

/* -------------------------------- Mock user ------------------------------- */

export function ProfileButton() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="group relative rounded-full outline-none ring-offset-2 ring-offset-background transition-transform duration-200 hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-brand/60 active:scale-95"
            aria-label={`${MOCK_USER.name} — account menu (mock profile)`}
          />
        }
      >
        <span className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-brand via-brand-soft to-brand opacity-40 blur-[6px] transition-opacity duration-300 group-hover:opacity-70" />
        <Avatar className="relative size-8 border border-white/10">
          <AvatarFallback className="bg-gradient-to-br from-brand/80 to-brand-soft/80 font-sans text-[11px] font-semibold tracking-wide text-white">
            {MOCK_USER.initials}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 z-10 size-2.5 rounded-full border-2 border-background bg-emerald-400 shadow-[0_0_8px_oklch(0.75_0.15_160/80%)]" />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="rounded-xl">
        <div className="flex flex-col gap-0.5 py-0.5">
          <span className="text-xs font-semibold">{MOCK_USER.name}</span>
          <span className="text-[11px] text-muted-foreground">{MOCK_USER.plan}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/* --------------------------------- Top bar -------------------------------- */

interface TopBarProps {
  /** Sidebar toggle lives in AppShell so both breakpoints share state. */
  onToggleSidebar: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const chatTitle = useChatStore((s) => s.chatTitle);
  const messageCount = useChatStore((s) => s.messages.length);
  const [titleHovered, setTitleHovered] = useState(false);

  return (
    <header className="glass-bar sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 px-3 md:px-5">
      {/* Sidebar toggle (rail-style button) */}
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        className="grid size-8 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-white/[0.06] hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4.5">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M9 4v16" />
        </svg>
      </button>

      {/* Chat title + subtle status */}
      <div
        className="flex min-w-0 flex-col"
        onMouseEnter={() => setTitleHovered(true)}
        onMouseLeave={() => setTitleHovered(false)}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={chatTitle}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="max-w-[42vw] truncate text-sm font-medium tracking-tight text-foreground md:max-w-md"
          >
            {chatTitle}
          </motion.h1>
        </AnimatePresence>
        <motion.span
          initial={false}
          animate={{
            opacity: titleHovered && messageCount > 0 ? 1 : 0,
            height: titleHovered && messageCount > 0 ? 14 : 0,
          }}
          className="text-[11px] leading-tight text-muted-foreground/70"
        >
          {messageCount} message{messageCount === 1 ? '' : 's'} · Krittim may produce imperfect output
        </motion.span>
      </div>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2.5">
        <ModelSwitcher />
        <div className="hidden h-5 w-px bg-white/10 sm:block" />
        <ProfileButton />
      </div>
    </header>
  );
}
