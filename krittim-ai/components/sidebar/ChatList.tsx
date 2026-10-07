'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Pencil, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { bucketFor, useChatStore } from '@/store/chatStore';
import type { Chat } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

/* ------------------------------ small utils ------------------------------- */

const relativeTime = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function timeAgo(timestamp: number): string {
  const diff = timestamp - Date.now();
  const minutes = Math.round(diff / 60_000);
  if (Math.abs(minutes) < 60) return relativeTime.format(minutes || -1, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relativeTime.format(hours, 'hour');
  return relativeTime.format(Math.round(hours / 24), 'day');
}

/* --------------------------------- row ------------------------------------ */

function ChatRow({ chat }: { chat: Chat }) {
  const isActive = useChatStore((s) => s.activeChatId === chat.id);
  const selectChat = useChatStore((s) => s.selectChat);
  const renameChat = useChatStore((s) => s.renameChat);
  const deleteChat = useChatStore((s) => s.deleteChat);

  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(chat.title);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming) {
      setDraft(chat.title);
      // Focus + select once the inline input mounts.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [renaming, chat.title]);

  const commitRename = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== chat.title) renameChat(chat.id, trimmed);
    setRenaming(false);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className="group/row relative"
    >
      {isActive && (
        <motion.span
          layoutId="chat-active-pill"
          className="absolute inset-0 rounded-xl border border-brand/20 bg-brand/[0.10] shadow-[inset_0_0_20px_oklch(0.72_0.17_278/8%)]"
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        />
      )}

      <div className="relative flex items-center gap-1 pr-1">
        {renaming ? (
          <form
            className="flex min-w-0 flex-1 items-center gap-1 px-3 py-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              commitRename();
            }}
          >
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => e.key === 'Escape' && setRenaming(false)}
              aria-label={`Rename chat — ${chat.title}`}
              className="w-full min-w-0 rounded-md border border-brand/40 bg-black/40 px-2 py-1 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            />
            <button
              type="submit"
              aria-label="Confirm rename"
              className="grid size-6 shrink-0 place-items-center rounded-md text-emerald-400 transition-colors hover:bg-surface-hover"
            >
              <Check className="size-3.5" strokeWidth={2.4} />
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              onClick={() => selectChat(chat.id)}
              className={cn(
                'flex min-w-0 flex-1 items-center gap-2 rounded-xl px-3 py-1.5 text-left text-[13px] outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-brand/40',
                isActive ? 'text-foreground' : 'text-muted-foreground group-hover/row:text-foreground',
              )}
            >
              {chat.pinned && (
                <span className="size-1.5 shrink-0 rounded-full bg-brand shadow-[0_0_8px_oklch(0.72_0.17_278/80%)]" />
              )}
              <span className="truncate">{chat.title}</span>
              {/* timestamp collapses on hover so action icons have room */}
              <span
                className={cn(
                  'ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/50 transition-opacity duration-150 group-hover/row:opacity-0',
                  isActive && 'text-brand-soft/70',
                )}
              >
                {timeAgo(chat.updatedAt)}
              </span>
            </button>

            {/* hover actions — rename & delete */}
            <div
              className={cn(
                'flex shrink-0 items-center gap-0.5 transition-all duration-150',
                'pointer-events-none opacity-0 group-hover/row:pointer-events-auto group-hover/row:opacity-100',
                'focus-within:pointer-events-auto focus-within:opacity-100',
              )}
            >
              <button
                type="button"
                aria-label={`Rename chat — ${chat.title}`}
                onClick={() => setRenaming(true)}
                className="grid size-6 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40 active:scale-90"
              >
                <Pencil className="size-3" strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label={`Delete chat — ${chat.title}`}
                onClick={() => setConfirmingDelete(true)}
                className="grid size-6 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-red-500/15 hover:text-red-400 focus-visible:ring-2 focus-visible:ring-red-500/40 active:scale-90"
              >
                <X className="size-3" strokeWidth={2.4} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* two-step destructive confirmation — nothing deletes on a stray click */}
      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Delete this chat?"
        description={
          <>
            “{chat.title}” and every message inside it will be removed from this browser.
            This action cannot be undone.
          </>
        }
        confirmLabel="Delete chat"
        destructive
        onConfirm={() => deleteChat(chat.id)}
      />
    </motion.li>
  );
}

/* ---------------------------- projects group ------------------------------ */

/** Collapsible project section — each project folds open to reveal its chats. */
export function ProjectsSection() {
  const projects = useChatStore((s) => s.projects);
  const chats = useChatStore((s) => s.chats);
  const collapsed = useChatStore((s) => s.projectsCollapsed);
  const toggleCollapsed = useChatStore((s) => s.toggleProjectsCollapsed);
  const createChat = useChatStore((s) => s.createChat);

  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>(
    Object.fromEntries(projects.map((p) => [p.id, true])),
  );

  return (
    <div className="px-3">
      {/* section header — click to collapse the whole group */}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        className="group/head flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 outline-none transition-colors hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <motion.span
          animate={{ rotate: collapsed ? -90 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="grid place-items-center"
        >
          <ChevronDownIcon />
        </motion.span>
        Projects
        <span className="ml-auto rounded-full bg-surface-hover px-1.5 py-0.5 font-mono text-[9px] normal-case tracking-normal text-muted-foreground/70">
          {projects.length}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="projects-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ul className="space-y-0.5 pb-1">
              {projects.map((project) => {
                const projectChats = chats.filter((c) => c.projectId === project.id);
                const isOpen = openProjects[project.id];

                return (
                  <li key={project.id}>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenProjects((prev) => ({ ...prev, [project.id]: !prev[project.id] }))
                        }
                        aria-expanded={isOpen}
                        className="group/proj flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[13px] text-muted-foreground outline-none transition-colors hover:bg-surface-soft hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40"
                      >
                        <span
                          className={cn(
                            'grid size-5 shrink-0 place-items-center rounded-md bg-gradient-to-br text-[10px]',
                            project.color,
                          )}
                        >
                          {project.emoji}
                        </span>
                        <span className="truncate font-medium">{project.name}</span>
                        <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/50">
                          {projectChats.length}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`New chat in ${project.name}`}
                        onClick={() => createChat(project.id)}
                        className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 outline-none transition-all hover:bg-surface-hover hover:text-foreground focus-visible:opacity-100 group-hover/proj:opacity-100 active:scale-90"
                      >
                        <PlusIcon />
                      </button>
                    </div>

                    <AnimatePresence initial={false}>
                      {isOpen && projectChats.length > 0 && (
                        <motion.ul
                          key={`${project.id}-chats`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                          className="ml-4 overflow-hidden border-l border-hairline pl-1"
                        >
                          {projectChats
                            .slice()
                            .sort((a, b) => b.updatedAt - a.updatedAt)
                            .map((chat) => (
                              <ChatRow key={chat.id} chat={chat} />
                            ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-3">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="size-3">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------- chat list -------------------------------- */

const BUCKET_ORDER = ['Today', 'Yesterday', 'Previous 7 days', 'Previous 30 days', 'Older'] as const;

/**
 * ChatList — searchable, grouped, live-updating conversation history.
 * Active chat gets a spring "layoutId" pill; rows expose rename/delete on hover.
 * Project-owned chats are hidden here (they live inside ProjectsSection).
 */
export function ChatList() {
  const chats = useChatStore((s) => s.chats);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const visible = (q ? chats.filter((c) => c.title.toLowerCase().includes(q)) : chats).filter(
    (c) => !c.projectId,
  );

  const groups = BUCKET_ORDER.map((label) => ({
    label,
    items: visible
      .filter((c) => bucketFor(c.updatedAt) === label)
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.updatedAt - a.updatedAt),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* search */}
      <div className="px-3 pb-1">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.8}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations…"
            aria-label="Search conversations"
            className="h-9 w-full rounded-xl border border-hairline bg-surface-soft pl-9 pr-8 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/20"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <X className="size-3" strokeWidth={2.2} />
            </button>
          )}
        </div>
      </div>

      {/* grouped rows */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Search className="size-5 text-muted-foreground/50" strokeWidth={1.6} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {query ? (
                <>
                  No conversations match “{query}”.
                  <br />
                  Try a different phrase.
                </>
              ) : (
                <>
                  No conversations yet.
                  <br />
                  Start a new chat above.
                </>
              )}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-1">
              <div className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                <AnimatePresence initial={false}>
                  {group.items.map((chat) => (
                    <ChatRow key={chat.id} chat={chat} />
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
