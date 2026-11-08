'use client';

import { Menu, MessagesSquare, SquarePen } from 'lucide-react';

import { ModelSwitcher } from '@/components/topbar/ModelSwitcher';
import { ProfileButton } from '@/components/topbar/ProfileButton';
import { selectActiveChat, useChatStore } from '@/store/chatStore';

/**
 * TopBar — sticky frosted header.
 * Left: mobile menu · model switcher. Middle: chat title + count + streaming badge.
 * Right: new chat · profile/auth.
 */
export function TopBar() {
  const activeChat = useChatStore(selectActiveChat);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const messageCount = useChatStore(
    (s) => (s.activeChatId ? s.messagesByChatId[s.activeChatId]?.length ?? 0 : 0),
  );
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);
  const startNewChat = useChatStore((s) => s.startNewChat);

  return (
    <header className="glass-bar sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 px-3 md:px-4">
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
        className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-95 md:hidden"
      >
        <Menu className="size-5" strokeWidth={1.9} />
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <ModelSwitcher />
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
        <div key={activeChat?.id ?? 'none'} className="anim-fade-in flex min-w-0 items-center gap-2.5">
          <MessagesSquare className="size-4 shrink-0 text-muted-foreground/60" strokeWidth={1.8} />
          <h1 className="truncate text-sm font-medium tracking-tight text-foreground">
            {activeChat?.title ?? 'Krittim AI'}
          </h1>
        </div>

        {messageCount > 0 && (
          <span className="hidden shrink-0 rounded-full border border-hairline bg-surface-soft px-2 py-0.5 font-mono text-[10px] text-muted-foreground/70 sm:block">
            {messageCount} msg{messageCount === 1 ? '' : 's'}
          </span>
        )}

        {isStreaming && (
          <span className="anim-fade-in flex shrink-0 items-center gap-1.5 rounded-full border border-brand/25 bg-brand/10 px-2.5 py-0.5 text-[10px] font-medium text-brand-soft">
            <span className="pulse-dot size-1.5 rounded-full bg-brand shadow-[0_0_8px_oklch(0.62_0.18_155/90%)]" />
            streaming
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => startNewChat()}
          aria-label="New chat"
          title="New chat"
          className="grid size-9 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-95"
        >
          <SquarePen className="size-[18px]" strokeWidth={1.9} />
        </button>
        <ProfileButton />
      </div>
    </header>
  );
}
