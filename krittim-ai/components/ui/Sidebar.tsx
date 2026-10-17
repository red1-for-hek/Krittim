'use client';

import {
  Atom,
  ChevronLeft,
  MessagesSquare,
  Settings2,
  Sparkles,
  SquarePen,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

import { ChatList, ProjectsSection } from '@/components/sidebar/ChatList';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chatStore';

interface SidebarProps {
  onNavigate?: (id: string) => void;
}

interface NavButtonProps {
  label: string;
  icon: LucideIcon;
  isCollapsed?: boolean;
  isActive: boolean;
  variant: 'desktop' | 'mobile';
  onClick?: () => void;
  trailing?: React.ReactNode;
}

function NavButton({ label, icon: Icon, isCollapsed, isActive, variant, onClick, trailing }: NavButtonProps) {
  const cls = cn(
    'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand/50',
    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
    isCollapsed && 'justify-center px-0',
  );

  const inner = (
    <>
      {isActive && (
        <span
          className={cn(
            'absolute inset-0 rounded-xl border border-hairline',
            variant === 'desktop' ? 'bg-surface-hover' : 'bg-surface-hover',
          )}
        />
      )}
      <Icon className="relative z-10 size-4 shrink-0" strokeWidth={1.8} />
      {!isCollapsed && <span className="relative z-10 truncate">{label}</span>}
      {!isCollapsed && trailing && <span className="relative z-10 ml-auto">{trailing}</span>}
    </>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button type="button" onClick={onClick} aria-label={label} className={cls} />
          }
        >
          {inner}
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function SidebarPanel({ onNavigate, variant }: SidebarProps & { variant: 'desktop' | 'mobile' }) {
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const collapsed = variant === 'mobile' ? false : !sidebarOpen;
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);
  const createChat = useChatStore((s) => s.createChat);
  const setSettingsOpen = useChatStore((s) => s.setSettingsOpen);

  const [activeNav, setActiveNav] = useState('new');

  const openNewChat = () => {
    createChat(null);
    setActiveNav('new');
    onNavigate?.('new');
    if (variant === 'desktop') setSidebarOpen(true);
  };

  return (
    <aside
      className={cn(
        'glass-panel sidebar-glide relative h-full flex-col overflow-hidden',
        variant === 'desktop' ? 'z-30 hidden w-[240px] shrink-0 md:flex' : 'flex w-full flex-1',
        collapsed && variant === 'desktop' && 'w-[64px]',
      )}
      style={variant === 'desktop' ? { width: collapsed ? 64 : 240 } : undefined}
    >
      {/* brand + collapse */}
      <div className={cn('flex items-center gap-2.5 px-4 pb-2 pt-4', collapsed && 'justify-center px-2')}>
        <button
          type="button"
          onClick={() => variant === 'desktop' && setSidebarOpen(collapsed)}
          aria-label="Krittim AI — home"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl outline-none transition-transform duration-150 active:scale-95"
        >
          <span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand via-brand to-brand-soft shadow-[0_0_20px_-4px_oklch(0.62_0.18_155/70%)]">
            <Atom className="size-4 text-white" strokeWidth={2} />
          </span>
          {!collapsed && (
            <span className="anim-fade-in truncate whitespace-nowrap font-sans text-[17px] font-semibold tracking-tight text-foreground">
              Krittim AI
            </span>
          )}
        </button>
        {variant === 'desktop' && (
          <button
            type="button"
            onClick={() => setSidebarOpen(collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="grid size-8 shrink-0 place-items-center rounded-xl text-muted-foreground outline-none transition-colors duration-150 hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/50 active:scale-95"
          >
            <ChevronLeft
              className={cn('size-4 transition-transform duration-200', collapsed && 'rotate-180')}
              strokeWidth={2}
            />
          </button>
        )}
      </div>

      {/* primary actions */}
      <div className={cn('mt-2 space-y-1 px-3', collapsed && 'px-2')}>
        <NavButton
          label="New Chat"
          icon={SquarePen}
          isCollapsed={collapsed}
          isActive={activeNav === 'new'}
          variant={variant}
          onClick={openNewChat}
          trailing={
            <kbd className="rounded-md border border-white/10 bg-surface-soft px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          }
        />
        <NavButton
          label="Settings"
          icon={Settings2}
          isCollapsed={collapsed}
          isActive={activeNav === 'settings'}
          variant={variant}
          onClick={() => {
            setActiveNav('settings');
            setSettingsOpen(true);
            onNavigate?.('settings');
          }}
        />
      </div>

      {!collapsed && (
        <div className="mt-3">
          <ProjectsSection />
        </div>
      )}

      {!collapsed ? (
        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          <div className="px-6 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
            <MessagesSquare className="mr-1.5 inline size-3 -translate-y-px" strokeWidth={1.8} />
            All Chats
          </div>
          <ChatList />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* footer */}
      <div className={cn('border-t border-hairline p-3', collapsed && 'flex justify-center')}>
        {!collapsed ? (
          <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground/60">
            <Sparkles className="size-3 shrink-0" strokeWidth={1.8} />
            <span className="truncate">
              Crafted by <span className="font-serif-display italic text-muted-foreground">BNMPC IT Club</span>
            </span>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="grid size-8 place-items-center rounded-lg text-muted-foreground/60" />
              }
            >
              <Sparkles className="size-3.5" strokeWidth={1.8} />
            </TooltipTrigger>
            <TooltipContent side="right">Krittim AI · BNMPC IT Club</TooltipContent>
          </Tooltip>
        )}
      </div>
    </aside>
  );
}

export function Sidebar({ onNavigate }: SidebarProps) {
  return <SidebarPanel onNavigate={onNavigate} variant="desktop" />;
}

export function MobileSidebar({ onNavigate }: SidebarProps) {
  return <SidebarPanel onNavigate={onNavigate} variant="mobile" />;
}
