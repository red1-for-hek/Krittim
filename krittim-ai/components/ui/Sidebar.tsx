'use client';

import { AnimatePresence, motion, type Variants } from 'framer-motion';
import {
  BrainCircuit,
  Atom,
  Check,
  ChevronDown,
  LayoutGrid,
  MessagesSquare,
  PanelLeftClose,
  Search,
  Settings2,
  Sparkles,
  SquarePen,
  WandSparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useId, useState } from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { MODEL_OPTIONS, type HistoryGroup, type ModelId } from '@/lib/types';
import { useChatStore } from '@/store/chatStore';

/* ----------------------------- local mock data ---------------------------- */

const HISTORY: HistoryGroup[] = [
  {
    label: 'Today',
    items: [
      { id: 'h1', title: 'Refactor auth middleware in Next.js', pinned: true },
      { id: 'h2', title: 'Vector DB benchmark: pgvector vs Qdrant' },
      { id: 'h3', title: 'Draft launch copy for Krittim v2' },
    ],
  },
  {
    label: 'Yesterday',
    items: [
      { id: 'h4', title: 'Explain KV-cache in transformer inference' },
      { id: 'h5', title: 'SQL window functions cheat-sheet' },
    ],
  },
  {
    label: 'Previous 7 days',
    items: [
      { id: 'h6', title: 'Festival stage plan — BNMPC IT Club' },
      { id: 'h7', title: 'Rust vs Go for edge functions' },
      { id: 'h8', title: 'Critique my portfolio case study' },
    ],
  },
];

const MODEL_ICONS: Record<ModelId, LucideIcon> = {
  auto: Sparkles,
  fast: Zap,
  thinking: BrainCircuit,
};

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

function RevealText({ text, className }: { text: string; className?: string }) {
  return (
    <motion.span
      className={className}
      variants={parent}
      initial="hidden"
      animate="show"
      aria-label={text}
    >
      {text.split(' ').map((word, i) => (
        <span key={word + i} className="inline-block overflow-hidden align-bottom">
          <motion.span variants={child} className="inline-block">
            {word}
            {i < text.split(' ').length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/* -------------------------------- Sidebar --------------------------------- */

interface SidebarProps {
  /** Optional callback so AppShell can react to nav intents. */
  onNavigate?: (id: string) => void;
}

/** Shared panel used by both the desktop rail and the mobile drawer. */
function SidebarPanel({
  onNavigate,
  variant,
}: SidebarProps & { variant: 'desktop' | 'mobile' }) {
  const sidebarOpen = variant === 'mobile' ? true : useChatStore((s) => s.sidebarOpen);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);
  const newChat = useChatStore((s) => s.newChat);
  const model = useChatStore((s) => s.model);
  const setSettingsOpen = useChatStore((s) => s.setSettingsOpen);
  const setModel = useChatStore((s) => s.setModel);

  const [activeNav, setActiveNav] = useState<string>('new');
  const [query, setQuery] = useState('');
  const searchId = useId();

  const filtered = query.trim()
    ? HISTORY.map((g) => ({
        ...g,
        items: g.items.filter((it) =>
          it.title.toLowerCase().includes(query.trim().toLowerCase()),
        ),
      })).filter((g) => g.items.length > 0)
    : HISTORY;

  const navClasses = (isActive: boolean, collapsedNow?: boolean) =>
    cn(
      'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand/50',
      isActive ? 'bg-white/[0.07] text-foreground' : 'text-muted-foreground hover:bg-white/[0.05] hover:text-foreground',
      collapsedNow && 'justify-center px-0',
    );

  const NavButton = ({
    id,
    label,
    icon: Icon,
    collapsed,
    onClick,
    trailing,
  }: {
    id: string;
    label: string;
    icon: LucideIcon;
    collapsed?: boolean;
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
            layoutId="nav-active-pill"
            className="absolute inset-0 rounded-xl border border-white/[0.06] bg-white/[0.06]"
            transition={SPRING}
          />
        )}
        <Icon className="relative z-10 size-4 shrink-0" strokeWidth={1.8} />
        {!collapsed && <span className="relative z-10 truncate">{label}</span>}
        {!collapsed && trailing && <span className="relative z-10 ml-auto">{trailing}</span>}
      </>
    );

    if (collapsed) {
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
          <TooltipContent side="right" className="glass-panel border border-white/10">
            {label}
          </TooltipContent>
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
      animate={variant === 'desktop' ? { width: sidebarOpen ? 280 : 68 } : { width: 280 }}
      transition={SPRING}
      className={cn(
        'glass-panel relative h-full flex-col overflow-hidden',
        variant === 'desktop' ? 'z-30 hidden w-[280px] shrink-0 md:flex' : 'flex w-full flex-1',
      )}
    >
      {/* ---- Brand header ---- */}
      <div className={cn('flex items-center gap-2.5 px-4 pt-4 pb-2', !sidebarOpen && 'justify-center')}>
        <button
          type="button"
          onClick={() => (variant === 'desktop' ? setSidebarOpen(!sidebarOpen) : undefined)}
          aria-label="Krittim AI — home"
          className="flex items-center gap-2.5 rounded-xl outline-none transition-transform duration-200 active:scale-95"
        >
          <span className="relative grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand via-brand to-brand-soft shadow-[0_0_20px_-4px_oklch(0.72_0.17_278/70%)]">
            <Atom className="size-4 text-white" strokeWidth={2} />
          </span>
          <AnimatePresence initial={false}>
            {sidebarOpen && (
              <motion.span
                key="brand"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.18 }}
                className="whitespace-nowrap font-serif-display text-[19px] italic tracking-tight text-aurora"
              >
                Krittim&nbsp;AI
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        {variant === 'desktop' && sidebarOpen && (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Collapse sidebar"
                  className="ml-auto grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
                />
              }
            >
              <PanelLeftClose className="size-4" strokeWidth={1.8} />
            </TooltipTrigger>
            <TooltipContent>Collapse sidebar</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* ---- Primary actions ---- */}
      <div className={cn('mt-2 space-y-1 px-3', !sidebarOpen && 'px-2')}>
        <NavButton
          id="new"
          label="New Chat"
          icon={SquarePen}
          collapsed={!sidebarOpen}
          onClick={newChat}
          trailing={
            <kbd className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          }
        />
        <NavButton id="search" label="Search" icon={Search} collapsed={!sidebarOpen} />
        <NavButton id="projects" label="Projects" icon={LayoutGrid} collapsed={!sidebarOpen} />
      </div>

      {/* ---- Search field (expanded only) ---- */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            key="search-field"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden px-3"
          >
            <div className="relative pt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" strokeWidth={1.8} />
              <Input
                id={searchId}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations…"
                className="h-9 rounded-xl border-white/[0.07] bg-white/[0.04] pl-9 text-sm placeholder:text-muted-foreground/70 focus-visible:border-brand/40 focus-visible:ring-brand/20"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Workspace sections ---- */}
      <div className={cn('mt-4 space-y-1 px-3', !sidebarOpen && 'px-2')}>
        <div className={cn('px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60', !sidebarOpen && 'sr-only')}>
          Workspace
        </div>
        <NavButton id="chats" label="All Chats" icon={MessagesSquare} collapsed={!sidebarOpen} />
        <NavButton id="settings" label="Settings" icon={Settings2} collapsed={!sidebarOpen} onClick={() => setSettingsOpen(true)} />
      </div>

      {/* ---- Model switcher ---- */}
      <div className={cn('mt-3 px-3', !sidebarOpen && 'px-2')}>
        <DropdownMenu>
          <DropdownMenuTrigger
              render={<button
              type="button"
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-white/[0.06] hover:text-foreground data-popup-open:bg-white/[0.06] data-popup-open:text-foreground',
                !sidebarOpen && 'justify-center px-0',
              )} />}
            >
              {(() => {
                const Icon = MODEL_ICONS[model];
                return <Icon className="size-4 shrink-0 text-brand" strokeWidth={1.8} />;
              })()}
              {sidebarOpen && (
                <>
                  <span className="truncate font-medium">
                    {MODEL_OPTIONS.find((m) => m.id === model)?.name ?? 'Auto'} mode
                  </span>
                  <ChevronDown className="ml-auto size-3.5 shrink-0 opacity-60" strokeWidth={2} />
                </>
              )}
            </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="w-64 rounded-2xl border-white/10 bg-popover/80 backdrop-blur-xl">
            {MODEL_OPTIONS.map((m) => {
              const Icon = MODEL_ICONS[m.id];
              return (
                <DropdownMenuItem
                  key={m.id}
                  onSelect={() => setModel(m.id)}
                  className="items-start gap-2.5 rounded-lg py-2"
                >
                  <Icon className="mt-0.5 size-4 text-brand" strokeWidth={1.8} />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.description}</span>
                  </div>
                  {model === m.id && <Check className="ml-auto mt-0.5 size-4 text-brand" />}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ---- History ---- */}
      <div className={cn('mt-4 flex-1 overflow-y-auto px-3 pb-3', !sidebarOpen && 'px-2')}>
        {sidebarOpen && filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <WandSparkles className="size-5 text-muted-foreground/60" strokeWidth={1.6} />
            <p className="text-xs text-muted-foreground">
              No conversations match “{query}”.
              <br />
              Try a different phrase.
            </p>
          </div>
        ) : (
          filtered.map((group) => (
            <div key={group.label}>
              <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate?.(item.id)}
                      className="group flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[13px] text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
                    >
                      <span className="truncate">{item.title}</span>
                      {item.pinned ? (
                        <span className="ml-auto size-1.5 shrink-0 rounded-full bg-brand shadow-[0_0_8px_oklch(0.72_0.17_278/80%)]" />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {/* ---- Footer ---- */}
      <div className={cn('border-t border-white/[0.06] p-3', !sidebarOpen && 'flex justify-center')}>
        {sidebarOpen ? (
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

/** Full panel rendered inside the AppShell mobile drawer. */
export function MobileSidebar({ onNavigate }: SidebarProps) {
  return <SidebarPanel onNavigate={onNavigate} variant="mobile" />;
}

export { RevealText };
