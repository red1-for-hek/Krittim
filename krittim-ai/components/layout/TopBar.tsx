'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu, MessagesSquare } from 'lucide-react';

import { ModelSwitcher } from '@/components/topbar/ModelSwitcher';
import { ProfileButton } from '@/components/topbar/ProfileButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { selectActiveChat, useChatStore } from '@/store/chatStore';

const SPRING = { type: 'spring', stiffness: 380, damping: 34, mass: 0.8 } as const;

/**
 * TopBar — frosted glass header.
 * Left: mobile hamburger + desktop expand handle. Center-left: animated chat title.
 * Right: model switcher + mock profile. Sticky so it floats over long threads.
 */
export function TopBar() {
  const activeChat = useChatStore(selectActiveChat);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const messageCount = useChatStore(
    (s) => (s.activeChatId ? s.messagesByChatId[s.activeChatId]?.length ?? 0 : 0),
  );
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);

  return (
    <header className="glass-bar sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 px-3 md:px-4">
      {/* Mobile: open slide-over drawer. Desktop: re-expand a collapsed rail. */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label={sidebarOpen ? 'Toggle sidebar' : 'Open sidebar'}
        className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-95 md:hidden"
      >
        <Menu className="size-[18px]" strokeWidth={1.9} />
      </button>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
              className={cn(
                'hidden size-9 shrink-0 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-95',
                'md:grid',
              )}
            />
          }
        >
          <Menu className="size-[18px]" strokeWidth={1.9} />
        </TooltipTrigger>
        <TooltipContent side="bottom">{sidebarOpen ? 'Collapse' : 'Expand'} sidebar · ⌘[</TooltipContent>
      </Tooltip>

      {/* ---- Chat title — slides/fades whenever the active thread changes ---- */}
      <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeChat?.id ?? 'none'}
            initial={{ opacity: 0, y: 8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={SPRING}
            className="flex min-w-0 items-center gap-2.5"
          >
            <MessagesSquare
              className="size-4 shrink-0 text-muted-foreground/60"
              strokeWidth={1.8}
            />
            <h1 className="truncate text-sm font-medium tracking-tight text-foreground">
              {activeChat?.title ?? 'Krittim AI'}
            </h1>
          </motion.div>
        </AnimatePresence>

        {messageCount > 0 && (
          <span className="hidden shrink-0 rounded-full border border-hairline bg-surface-soft px-2 py-0.5 font-mono text-[10px] text-muted-foreground/70 sm:block">
            {messageCount} msg{messageCount === 1 ? '' : 's'}
          </span>
        )}

        {isStreaming && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={SPRING}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-2.5 py-0.5 text-[10px] font-medium text-brand-soft"
          >
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="size-1.5 rounded-full bg-brand shadow-[0_0_8px_oklch(0.72_0.17_278/90%)]"
            />
            streaming
          </motion.span>
        )}
      </div>

      {/* ---- Right cluster: model + profile ---- */}
      <div className="flex shrink-0 items-center gap-2">
        <ModelSwitcher />
        <ProfileButton />
      </div>
    </header>
  );
}
