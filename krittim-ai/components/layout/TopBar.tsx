'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Atom, Check, ChevronDown, Sparkles } from 'lucide-react';
import { useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MODEL_OPTIONS, MOCK_USER, type ModelId } from '@/lib/types';
import { useChatStore } from '@/store/chat-store';

/* ------------------------------ Model switcher ---------------------------- */

export function ModelSwitcher() {
  const model = useChatStore((s) => s.model);
  const setModel = useChatStore((s) => s.setModel);
  const active = MODEL_OPTIONS.find((m) => m.id === model) ?? MODEL_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="group flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-muted-foreground outline-none transition-all duration-200 hover:border-white/15 hover:text-foreground data-[state=open]:border-brand/40 data-[state=open]:text-foreground data-[state=open]:shadow-[0_0_20px_-6px_oklch(0.72_0.17_278/60%)]"
        >
          <span className="text-brand">
            {active.id === 'auto' ? (
              <Sparkles className="size-3.5" strokeWidth={1.9} />
            ) : active.id === 'fast' ? (
              <Atom className="size-3.5" strokeWidth={1.9} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="size-3.5">
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" strokeLinecap="round" />
              </svg>
            )}
          </span>
          <span>{active.name}</span>
          <ChevronDown className="size-3 opacity-50 transition-transform duration-200 group-data-[state=open]:rotate-180" strokeWidth={2.2} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 rounded-2xl border-white/10 bg-popover/85 p-1.5 backdrop-blur-2xl">
        <div className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
          Reasoning engine
        </div>
        {MODEL_OPTIONS.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onSelect={() => setModel(m.id)}
            className="items-start gap-3 rounded-xl px-2.5 py-2.5"
          >
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-brand">
              {m.id === 'auto' ? (
                <Sparkles className="size-3.5" strokeWidth={1.9} />
              ) : m.id === 'fast' ? (
                <Atom className="size-3.5" strokeWidth={1.9} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="size-3.5">
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" strokeLinecap="round" />
                </svg>
              )}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="flex items-center gap-2 text-sm font-medium">
                {m.name}
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-1.5 py-px text-[10px] font-normal text-muted-foreground">
                  {m.tagline}
                </span>
              </span>
              <span className="text-xs leading-snug text-muted-foreground">{m.description}</span>
            </div>
            <AnimatePresence>
              {model === m.id && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className="ml-auto mt-1 text-brand"
                >
                  <Check className="size-4" strokeWidth={2.2} />
                </motion.span>
              )}
            </AnimatePresence>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* -------------------------------- Mock user ------------------------------- */

export function ProfileButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="group relative rounded-full outline-none ring-offset-2 ring-offset-background transition-transform duration-200 hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-brand/60 active:scale-95"
          aria-label={`${MOCK_USER.name} — account menu (mock profile)`}
        >
          <span className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-brand via-brand-soft to-brand opacity-40 blur-[6px] transition-opacity duration-300 group-hover:opacity-70" />
          <Avatar className="relative size-8 border border-white/10">
            <AvatarFallback className="bg-gradient-to-br from-brand/80 to-brand-soft/80 font-sans text-[11px] font-semibold tracking-wide text-white">
              {MOCK_USER.initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 z-10 size-2.5 rounded-full border-2 border-background bg-emerald-400 shadow-[0_0_8px_oklch(0.75_0.15_160/80%)]" />
        </button>
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
      {/* Sidebar toggle (hamburger-style rail button) */}
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
          animate={{ opacity: titleHovered && messageCount > 0 ? 1 : 0, height: titleHovered && messageCount > 0 ? 14 : 0 }}
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
