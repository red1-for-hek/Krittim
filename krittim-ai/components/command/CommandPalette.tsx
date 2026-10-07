'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpDown,
  BrainCircuit,
  CornerDownLeft,
  MessagesSquare,
  Search,
  Settings2,
  Sparkles,
  SquarePen,
  SunMoon,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { MODEL_OPTIONS, type ModelId } from '@/lib/types';
import { cn } from '@/lib/utils';
import { toggleTheme, useChatStore } from '@/store/chatStore';

/* -------------------------------------------------------------------------- */
/*  CommandPalette — ⌘K / Ctrl+K                                              */
/*                                                                            */
/*  Fuzzy-filtered action list with full keyboard navigation (↑ ↓ Enter Esc),  */
/*  grouped into Commands · Models · Chats. Opens over a blurred scrim with a  */
/*  spring scale-in; every row fires a real store intent — no dead ends.       */
/* -------------------------------------------------------------------------- */

const SPRING = { type: 'spring', stiffness: 420, damping: 34, mass: 0.9 } as const;

const MODEL_ICONS: Record<ModelId, LucideIcon> = {
  auto: Sparkles,
  fast: Zap,
  thinking: BrainCircuit,
};

interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  keywords: string;
  group: 'Commands' | 'Chats' | 'Models';
  icon: LucideIcon;
  shortcut?: string;
  run: () => void;
}

/** Subsequence fuzzy match ("nwc" hits "New Chat") — cheap and good enough for ~20 rows. */
function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  if (!q) return true;
  const t = text.toLowerCase();
  let i = 0;
  for (const ch of t) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
}

export function CommandPalette() {
  const open = useChatStore((s) => s.paletteOpen);
  const setOpen = useChatStore((s) => s.setPaletteOpen);
  const createChat = useChatStore((s) => s.createChat);
  const setSettingsOpen = useChatStore((s) => s.setSettingsOpen);
  const setModel = useChatStore((s) => s.setModel);
  const model = useChatStore((s) => s.model);
  const chats = useChatStore((s) => s.chats);
  const selectChat = useChatStore((s) => s.selectChat);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* Reset to a clean slate each time the palette opens. */
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const close = () => setOpen(false);

  const actions = useMemo<PaletteAction[]>(() => {
    const commands: PaletteAction[] = [
      {
        id: 'new-chat',
        label: 'New Chat',
        hint: 'Start a fresh conversation',
        keywords: 'new chat compose start fresh message write',
        group: 'Commands',
        icon: SquarePen,
        shortcut: '⌘⇧O',
        run: () => createChat(null),
      },
      {
        id: 'toggle-theme',
        label: 'Toggle Theme',
        hint: 'Switch between dark and light',
        keywords: 'theme dark light mode appearance contrast',
        group: 'Commands',
        icon: SunMoon,
        shortcut: '⌘J',
        run: toggleTheme,
      },
      {
        id: 'open-settings',
        label: 'Open Settings',
        hint: 'Appearance · AI features · data',
        keywords: 'settings preferences config options danger',
        group: 'Commands',
        icon: Settings2,
        shortcut: '⌘,',
        run: () => setSettingsOpen(true),
      },
    ];

    const models: PaletteAction[] = MODEL_OPTIONS.map((m) => ({
      id: `model-${m.id}`,
      label: `Switch Model: ${m.name.replace('Krittim ', '')}`,
      hint: m.description,
      keywords: `model switch ${m.id} ${m.name} ${m.tagline} engine reasoning`,
      group: 'Models' as const,
      icon: MODEL_ICONS[m.id],
      shortcut: model === m.id ? 'current' : undefined,
      run: () => setModel(m.id),
    }));

    // Top matches jump straight into conversations — Linear-style recents.
    const recent = [...chats]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 6)
      .map<PaletteAction>((c) => ({
        id: `chat-${c.id}`,
        label: c.title,
        hint: 'Open conversation',
        keywords: `chat search conversation ${c.title}`,
        group: 'Chats' as const,
        icon: MessagesSquare,
        run: () => selectChat(c.id),
      }));

    return [...commands, ...models, ...recent];
  }, [chats, createChat, model, selectChat, setModel, setSettingsOpen]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return actions;
    return actions.filter((a) => fuzzyMatch(q, a.label) || fuzzyMatch(q, a.keywords));
  }, [actions, query]);

  // Keep selection in range as the query narrows the list.
  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  const runAction = (action: PaletteAction) => {
    action.run();
    close();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (!filtered.length) return;

    if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runAction(filtered[activeIndex] ?? filtered[0]);
    }
  };

  /* Scroll the highlighted row back into view during keyboard nav. */
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  /* Group the flat filtered list while preserving global highlight indices. */
  const rendered = useMemo(() => {
    const groups: Array<{
      label: PaletteAction['group'];
      items: Array<{ action: PaletteAction; index: number }>;
    }> = [];
    filtered.forEach((action, index) => {
      let group = groups.find((g) => g.label === action.group);
      if (!group) {
        group = { label: action.group, items: [] };
        groups.push(group);
      }
      group.items.push({ action, index });
    });
    return groups;
  }, [filtered]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[18dvh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          {/* Blurred scrim — click to dismiss */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={SPRING}
            className="glass-panel relative w-full max-w-xl overflow-hidden rounded-2xl border-white/10 shadow-[0_40px_140px_-30px_oklch(0_0_0/90%)]"
          >
            {/* ---- search field ---- */}
            <div className="flex items-center gap-3 border-b border-hairline px-4">
              <Search className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.9} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type a command or search chats…"
                aria-label="Search commands"
                className="h-14 w-full min-w-0 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/60"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hidden shrink-0 rounded-md border border-white/10 bg-surface-soft px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
                Esc
              </kbd>
            </div>

            {/* ---- results ---- */}
            <div ref={listRef} className="max-h-[46dvh] overflow-y-auto overscroll-contain p-2">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                  <ArrowUpDown className="size-5 text-muted-foreground/50" strokeWidth={1.6} />
                  <p className="text-sm text-muted-foreground">Nothing matches “{query}”.</p>
                  <p className="text-xs text-muted-foreground/60">
                    Try “new”, “theme”, “fast” or a chat title.
                  </p>
                </div>
              ) : (
                rendered.map((group) => (
                  <div key={group.label} className="mb-1 last:mb-0">
                    <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
                      {group.label}
                    </p>
                    <ul>
                      {group.items.map(({ action, index }) => {
                        const Icon = action.icon;
                        const isActive = index === activeIndex;
                        return (
                          <li key={action.id} data-index={index}>
                            <button
                              type="button"
                              onClick={() => runAction(action)}
                              onMouseMove={() => setActiveIndex(index)}
                              className={cn(
                                'relative flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left outline-none transition-colors duration-100',
                                isActive ? 'text-foreground' : 'text-muted-foreground',
                              )}
                            >
                              {isActive && (
                                <motion.span
                                  layoutId="palette-active"
                                  transition={{ type: 'spring', stiffness: 600, damping: 40 }}
                                  className="absolute inset-0 rounded-xl border border-brand/20 bg-brand/[0.12]"
                                />
                              )}
                              <span
                                className={cn(
                                  'relative grid size-7 shrink-0 place-items-center rounded-lg border transition-colors',
                                  isActive
                                    ? 'border-brand/30 bg-brand/15 text-brand'
                                    : 'border-hairline bg-surface text-muted-foreground',
                                )}
                              >
                                <Icon className="size-3.5" strokeWidth={1.9} />
                              </span>
                              <span className="relative flex min-w-0 flex-col">
                                <span className="truncate text-sm font-medium">{action.label}</span>
                                {action.hint && (
                                  <span className="truncate text-xs text-muted-foreground/70">
                                    {action.hint}
                                  </span>
                                )}
                              </span>
                              {action.shortcut ? (
                                <span
                                  className={cn(
                                    'relative ml-auto shrink-0 font-mono text-[10px]',
                                    action.shortcut === 'current'
                                      ? 'rounded-full border border-brand/25 bg-brand/10 px-2 py-0.5 text-brand-soft'
                                      : 'text-muted-foreground/60',
                                  )}
                                >
                                  {action.shortcut}
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>

            {/* ---- footer hints ---- */}
            <div className="flex items-center gap-4 border-t border-hairline px-4 py-2.5 text-[11px] text-muted-foreground/60">
              <span className="flex items-center gap-1.5">
                <CornerDownLeft className="size-3" strokeWidth={2} /> to select
              </span>
              <span className="flex items-center gap-1.5">
                <ArrowUpDown className="size-3" strokeWidth={2} /> to navigate
              </span>
              <span className="ml-auto font-serif-display italic">Krittim AI</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
