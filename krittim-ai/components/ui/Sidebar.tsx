'use client';

import { AnimatePresence, motion, type Variants } from 'framer-motion';
import {
  Atom,
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

/* ------------------------------ constants --------------------------------- */

const SPRING = { type: 'spring', stiffness: 320, damping: 32, mass: 0.9 } as const;

/* ------------------------------ text reveal ------------------------------- */

const parent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
};

const child: Variants = {
  hidden: { opacity: 0, y: 14, filter: 'blur(6px)' },
  show: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 260, damping: 26 },
  },
};

export function RevealText({ text, className }: { text: string; className?: string }) {
  const words = text.split(' ');
  return (
    <motion.span
      className={className}
      variants={parent}
      initial="hidden"
      animate="show"
      aria-label={text}
    >
      {words.map((word, i) => (
        <span key={word + i} className="inline-block overflow-hidden align-bottom">
          <motion.span variants={child} className="inline-block">
            {word}
            {i < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/* -------------------------------- Sidebar --------------------------------- */

interface SidebarProps {
  /** Optional callback so AppShell can react to nav intents (e.g. close drawer). */
  onNavigate?: (id: string) => void;
}

/** Shared panel used by both the desktop rail and the mobile slide-over drawer. */
function SidebarPanel({ onNavigate, variant }: SidebarProps & { variant: 'desktop' | 'mobile' }) {
  const collapsed = variant === 'mobile' ? false : useChatStore((s) => !s.sidebarOpen);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);
  const createChat = useChatStore((s) => s.createChat);
  const setSettingsOpen = useChatStore((s) => s.setSettingsOpen);

  const [activeNav, setActiveNav] = useState<string>('new');

  const openNewChat = () => {
    createChat(null);
    setActiveNav('new');
    onNavigate?.('new');
    if (variant === 'desktop') setSidebarOpen(true);
  };

  const navClasses = (isActive: boolean, isCollapsed?: boolean) =>
    cn(
      'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand/50',
      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      isCollapsed && 'justify-center px-0',
    );

  const NavButton = ({
    id,
    label,
    icon: Icon,
    isCollapsed,
    onClick,
    trailing,
  }: {
    id: string;
    label: string;
    icon: LucideIcon;
    isCollapsed?: boolean;
    onClick?: () => void;
    trailing?: React.ReactNode;
  }) => {
    const handle = () => {
      setActiveNav(id);
      onNavigate?.(id);
      onClick?.();
    };

    const content = (
      <>
        {activeNav === id && (
          <motion.span
            layoutId={`nav-active-pill-${variant}`}
            className="absolute inset-0 rounded-xl border border-hairline bg-surface-hover"
            transition={SPRING}
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
              <button
                type="button"
                onClick={handle}
                aria-label={label}
                className={navClasses(activeNav === id, true)}
              />
            }
          >
            {content}
          </TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }

    return (
      <button type="button" onClick={handle} className={navClasses(activeNav === id)}>
        {content}
      </button>
    );
  };

  return (
    <motion.aside
      initial={false}
      animate={variant === 'desktop' ? { width: collapsed ? 64 : 240 } : { width: 240 }}
      transition={SPRING}
      className={cn(
        'glass-panel relative h-full flex-col overflow-hidden',
        variant === 'desktop' ? 'z-30 hidden w-[240px] shrink-0 md:flex' : 'flex w-full flex-1',
      )}
    >
      {/* ---- Brand header ---- */}
      <div className={cn('flex items-center gap-2.5 px-4 pt-4 pb-2', collapsed && 'justify-center')}>
        <button
          type="button"
          onClick={() => (variant === 'desktop' ? setSidebarOpen(collapsed) : undefined)}
          aria-label="Krittim AI — home"
          className="flex items-center gap-2.5 rounded-xl outline-none transition-transform duration-200 active:scale-95"
        >
          <span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand via-brand to-brand-soft shadow-[0_0_20px_-4px_oklch(0.72_0.17_278/70%)]">
            <Atom className="size-4 text-white" strokeWidth={2} />
          </span>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.span
                key="brand"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
                className="whitespace-nowrap font-serif-display text-[18px] italic tracking-tight text-aurora"
              >
                Krittim&nbsp;AI
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* ---- Primary actions ---- */}
      <div className={cn('mt-2 space-y-1 px-3', collapsed && 'px-2')}>
        <NavButton
          id="new"
          label="New Chat"
          icon={SquarePen}
          isCollapsed={collapsed}
          onClick={openNewChat}
          trailing={
            <kbd className="rounded-md border border-white/10 bg-surface-soft px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          }
        />
        <NavButton
          id="settings"
          label="Settings"
          icon={Settings2}
          isCollapsed={collapsed}
          onClick={() => {
            setSettingsOpen(true);
            onNavigate?.('settings');
          }}
        />
      </div>

      {/* ---- Projects (collapsible group) ---- */}
      {!collapsed && (
        <div className="mt-3">
          <ProjectsSection />
        </div>
      )}

      {/* ---- Chats (search + grouped history) ---- */}
      {!collapsed ? (
        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          <div className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
            <MessagesSquare className="mr-1.5 inline size-3 -translate-y-px" strokeWidth={1.8} />
            All Chats
          </div>
          <ChatList />
        </div>
      ) : (
        <div className="flex-1" />
      )}


      {/* ---- Footer ---- */}
      <div className={cn('border-t border-hairline p-3', collapsed && 'flex justify-center')}>
        {!collapsed ? (
          <div className="flex items-center gap-2 px-1 text-[11px] text-muted-foreground/60">
            <Sparkles className="size-3" strokeWidth={1.8} />
            <span>
              Crafted by{' '}
              <span className="font-serif-display italic text-muted-foreground">BNMPC IT Club</span>
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
    </motion.aside>
  );
}

/** Desktop rail with spring width-collapse. */
export function Sidebar({ onNavigate }: SidebarProps) {
  return <SidebarPanel onNavigate={onNavigate} variant="desktop" />;
}

/** Full panel rendered inside the AppShell mobile slide-over drawer. */
export function MobileSidebar({ onNavigate }: SidebarProps) {
  return <SidebarPanel onNavigate={onNavigate} variant="mobile" />;
}
