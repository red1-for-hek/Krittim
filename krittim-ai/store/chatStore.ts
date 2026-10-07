import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  PERSISTED_STATE_KEYS,
  type AttachmentMeta,
  type Chat,
  type ChatMessage,
  type ModelId,
  type Project,
  type ThemePreference,
} from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  Krittim AI — global client state (Zustand + localStorage persistence)      */
/*                                                                            */
/*  Single source of truth for: sidebar chrome, projects, multi-chat history   */
/*  (chats + messagesByChatId), the active reasoning model, character-by-      */
/*  character streaming simulation, theme + settings.                          */
/*                                                                            */
/*  Persisted slice (survives refresh): chats · activeChatId ·                 */
/*  messagesByChatId · model · sidebar · projects · theme · ai toggles.        */
/*  Ephemeral (never written to disk): isStreaming · stopRequested ·           */
/*  settingsOpen · paletteOpen · threadKey.                                    */
/* -------------------------------------------------------------------------- */

let counter = 0;
const uid = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${(counter++).toString(36)}`;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/* ------------------------------- mock seed -------------------------------- */

const SEED_PROJECTS: Project[] = [
  { id: 'p_krittim', name: 'Krittim v2', emoji: '🚀', color: 'from-violet-500 to-fuchsia-500' },
  { id: 'p_club', name: 'BNMPC IT Club', emoji: '🎓', color: 'from-cyan-400 to-blue-500' },
];

interface SeedChat {
  title: string;
  projectId?: string | null;
  pinned?: boolean;
  ageMs: number;
  messages?: Array<Pick<ChatMessage, 'role' | 'content'> & Partial<ChatMessage>>;
}

const SEED_CHATS: SeedChat[] = [
  {
    title: 'Refactor auth middleware in Next.js',
    projectId: 'p_krittim',
    pinned: true,
    ageMs: 2 * HOUR,
    messages: [
      { role: 'user', content: 'Our Next.js middleware re-checks the JWT on every route and it is getting slow. How do I restructure it?' },
      {
        role: 'assistant',
        content: [
          'The pattern I would reach for: **verify once at the edge, hydrate lazily downstream**.',
          '',
          '1. Keep middleware as a thin gatekeeper — signature check + expiry only.',
          '2. Move role/permission lookups behind a cached `getSessionClaims()` helper (SWR or LRU).',
          '3. Coalesce parallel checks with a request-scoped context so one page render verifies the token exactly once.',
          '',
          'That typically cuts per-request overhead by 60–80% because you stop round-tripping the database for claims that rarely change.',
        ].join('\n'),
      },
    ],
  },
  { title: 'Vector DB benchmark: pgvector vs Qdrant', projectId: 'p_krittim', ageMs: 6 * HOUR },
  {
    title: 'Draft launch copy for Krittim v2',
    projectId: 'p_krittim',
    ageMs: 20 * HOUR,
    messages: [
      { role: 'user', content: 'Write a one-line hero statement for the Krittim v2 landing page.' },
    ],
  },
  { title: 'Explain KV-cache in transformer inference', ageMs: 1.4 * DAY },
  { title: 'SQL window functions cheat-sheet', ageMs: 2 * DAY },
  { title: 'Festival stage plan — BNMPC IT Club', projectId: 'p_club', ageMs: 3 * DAY },
  { title: 'Rust vs Go for edge functions', projectId: 'p_club', ageMs: 5 * DAY },
];

function buildSeed(): { chats: Chat[]; messagesByChatId: Record<string, ChatMessage[]> } {
  const now = Date.now();
  const chats: Chat[] = [];
  const messagesByChatId: Record<string, ChatMessage[]> = {};

  for (const seedChat of SEED_CHATS) {
    const id = uid('chat');
    const createdAt = now - seedChat.ageMs;
    chats.push({
      id,
      title: seedChat.title,
      projectId: seedChat.projectId ?? null,
      pinned: seedChat.pinned,
      createdAt,
      updatedAt: createdAt + (seedChat.messages ? 4 * 60 * 1000 : 0),
    });
    messagesByChatId[id] = (seedChat.messages ?? []).map((m, j) => ({
      id: uid('msg'),
      role: m.role,
      content: m.content,
      createdAt: createdAt + j * 2 * 60 * 1000,
      model: m.role === 'assistant' ? ('auto' as ModelId) : undefined,
    }));
  }

  return { chats, messagesByChatId };
}

/* ------------------------------ time buckets ------------------------------ */

export function bucketFor(timestamp: number): string {
  const now = Date.now();
  if (now - timestamp < DAY) return 'Today';
  if (now - timestamp < 2 * DAY) return 'Yesterday';
  if (now - timestamp < 7 * DAY) return 'Previous 7 days';
  if (now - timestamp < 30 * DAY) return 'Previous 30 days';
  return 'Older';
}

/* ----------------------------- mock replies ------------------------------- */

const CODE_REPLY = [
  'Happy to dig in. Here is the pattern I would reach for — a typed hook with proper effect cleanup:',
  '',
  '```tsx',
  "import { useEffect, useRef, useState } from 'react';",
  '',
  'export function useDebouncedValue<T>(value: T, delay = 300): T {',
  '  const [debounced, setDebounced] = useState(value);',
  '  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);',
  '',
  '  useEffect(() => {',
  '    timer.current = setTimeout(() => setDebounced(value), delay);',
  '    return () => clearTimeout(timer.current); // no stale closures',
  '  }, [value, delay]);',
  '',
  '  return debounced;',
  '}',
  '```',
  '',
  'Three things this gets right:',
  '',
  '1. **Cleanup on every keystroke** — the old timer is cancelled before a new one starts.',
  '2. **Generic over `T`** — works for strings, ids, or whole filter objects.',
  '3. **No state duplication** — the debounced value is derived, never synced by hand.',
  '',
  'Paste your failing snippet and I will review it line by line.',
].join('\n');

const RAG_REPLY = [
  'Great question. Here is the short version of **Retrieval-Augmented Generation**:',
  '',
  '| Stage | What happens | Why it matters |',
  '| --- | --- | --- |',
  '| 1. Ingest | Documents are chunked & embedded into vectors | Semantics survive in geometry |',
  '| 2. Retrieve | The query embeds, nearest chunks are fetched | Grounds the model in *your* data |',
  '| 3. Generate | Chunks are injected into the prompt as context | Answers cite reality, not memory |',
  '',
  'The trade-off is latency vs. faithfulness: retrieval adds ~50–200ms but slashes hallucination rates dramatically. Teams usually tune it with hybrid search — BM25 for exact terms, dense vectors for meaning, fused with reciprocal rank fusion.',
  '',
  'Want me to sketch a minimal RAG pipeline in TypeScript?',
].join('\n');

const GREETING_REPLY = [
  "Hey Dev — good to see you. I'm **Krittim**, your reasoning partner.",
  '',
  "Here's what I can do right now:",
  '',
  '- Write and review production code',
  '- Explain systems end-to-end (*RAG*, *vector search*, *KV caches*)',
  '- Draft launch copy, plans and specs',
  '',
  "Drop a file or paste a snippet whenever you're ready.",
].join('\n');

const DEFAULT_REPLY = [
  "Understood — here's how I'd structure that:",
  '',
  '1. **Clarify the goal** — one sentence, verifiable outcome.',
  '2. **Map the constraints** — time, budget, technical edges.',
  '3. **Draft the smallest step** that produces a measurable result.',
  '',
  'Give me a little more context and I will tailor the plan — or switch me to **Thinking** mode above if this deserves deeper reasoning.',
].join('\n');

/** Deterministic mock reply generator — swap for a real API in pass 4. */
function mockReply(prompt: string): string {
  const t = prompt.trim();
  if (/^hi\b|^hello\b|^hey\b/i.test(t)) return GREETING_REPLY;
  if (/code|function|bug|typescript|react|hook|component|race|refactor/i.test(t)) return CODE_REPLY;
  if (/explain|what is|how does|rag|retrieval|vector|transformer|llm|benchmark/i.test(t)) return RAG_REPLY;
  return DEFAULT_REPLY;
}

/* ------------------------------ theme side-effect -------------------------- */

export type ResolvedTheme = 'dark' | 'light';

const MEDIA = '(prefers-color-scheme: dark)';

/** Maps a stored preference to the concrete class applied on <html>. */
export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref !== 'system') return pref;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia(MEDIA).matches ? 'dark' : 'light';
}

/**
 * Mirrors the store's `theme` preference onto <html class="dark"> and keeps it
 * in sync with the OS when set to "system". The head script in layout.tsx does
 * the same job pre-hydration so there is never a flash of the wrong palette.
 */
export function applyThemeEffect(): () => void {
  const sync = () => {
    const resolved = resolveTheme(useChatStore.getState().theme);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    try {
      // Read by the anti-flash script on next load (JSON: {"state":{"theme":…}}).
      const raw = localStorage.getItem('krittim-chat-store');
      const parsed = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'krittim-theme',
        JSON.stringify({ ...parsed, resolved }),
      );
    } catch {
      /* storage disabled — cosmetic only */
    }
  };

  sync();
  const unsub = useChatStore.subscribe((s, prev) => s.theme !== prev.theme && sync());
  const mq = window.matchMedia(MEDIA);
  mq.addEventListener('change', sync);
  return () => {
    unsub();
    mq.removeEventListener('change', sync);
  };
}

/** Cycle dark → light → dark (used by the command palette). */
export const toggleTheme = () =>
  useChatStore.setState((s) => ({ theme: resolveTheme(s.theme) === 'dark' ? 'light' : 'dark' }));

/* -------------------------------- helpers --------------------------------- */

const deriveTitle = (text: string): string =>
  text.length > 46 ? `${text.slice(0, 46).trimEnd()}…` : text;

/* --------------------------------- store ---------------------------------- */

export interface ChatState {
  /* chrome */
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  /** Command palette (⌘K / Ctrl+K). Ephemeral — never persisted. */
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;

  projectsCollapsed: boolean;
  toggleProjectsCollapsed: () => void;

  /** Incremented on every chat switch — lets MessageList replay its entrance animation. */
  threadKey: number;

  /* model switcher */
  model: ModelId;
  setModel: (model: ModelId) => void;

  /* multi-chat history */
  projects: Project[];
  chats: Chat[];
  activeChatId: string | null;
  messagesByChatId: Record<string, ChatMessage[]>;
  isStreaming: boolean;
  stopRequested: boolean;

  selectChat: (id: string) => void;
  createChat: (projectId?: string | null) => string;
  renameChat: (id: string, title: string) => void;
  deleteChat: (id: string) => void;
  clearAllChats: () => void;
  /** Danger-zone nuclear option — wipes every chat AND the localStorage snapshot. */
  resetAllData: () => void;
  addMessage: (
    chatId: string,
    message: Omit<ChatMessage, 'id' | 'createdAt'> & Partial<Pick<ChatMessage, 'id' | 'createdAt'>>,
  ) => string;

  /* streaming simulation */
  sendMessage: (content: string, attachments?: AttachmentMeta[]) => void;
  stopStreaming: () => void;

  /* settings (persisted) */
  theme: ThemePreference;
  aiMemory: boolean;
  streamResponses: boolean;
  setTheme: (theme: ThemePreference) => void;
  setAiMemory: (on: boolean) => void;
  setStreamResponses: (on: boolean) => void;
}

/* Module-level handles so an in-flight simulated stream can be interrupted without living inside React. */
let roundTripTimer: ReturnType<typeof setTimeout> | null = null;
let streamInterval: ReturnType<typeof setInterval> | null = null;

const cancelInflight = () => {
  if (roundTripTimer) clearTimeout(roundTripTimer);
  if (streamInterval) clearInterval(streamInterval);
  roundTripTimer = null;
  streamInterval = null;
};

/** Overwrite the streamed bubble's content, immutably. */
const patchMessageContent = (chatId: string, messageId: string, content: string) =>
  useChatStore.setState((s) => ({
    messagesByChatId: {
      ...s.messagesByChatId,
      [chatId]: s.messagesByChatId[chatId]?.map((m) =>
        m.id === messageId ? { ...m, content } : m,
      ) ?? [],
    },
  }));

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => {
  /** Char-by-char ticker that appends to the assistant bubble until complete or stopped. */
  function startCharStream(chatId: string, messageId: string, fullText: string) {
    let cursor = 0;
    streamInterval = setInterval(() => {
      const state = useChatStore.getState();

      // Cooperative cancellation — Stop flips the flag; switching chats aborts too.
      if (state.stopRequested || state.activeChatId !== chatId) {
        cancelInflight();
        useChatStore.setState({ isStreaming: false, stopRequested: false });
        return;
      }

      // Variable cadence (2–4 chars/tick) reads like a real SSE feed.
      const step = Math.min(fullText.length - cursor, 2 + Math.floor(Math.random() * 3));
      cursor += step;
      patchMessageContent(chatId, messageId, fullText.slice(0, cursor));

      if (cursor >= fullText.length) {
        cancelInflight();
        useChatStore.setState({ isStreaming: false, stopRequested: false });
      }
    }, 18);
  }

  return {
    /* ------------------------------ chrome ------------------------------ */
    sidebarOpen: true,
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

    settingsOpen: false,
    setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

    paletteOpen: false,
    setPaletteOpen: (paletteOpen) => set({ paletteOpen }),

    projectsCollapsed: false,
    toggleProjectsCollapsed: () => set((s) => ({ projectsCollapsed: !s.projectsCollapsed })),

    threadKey: 0,

    /* ------------------------------ model ------------------------------- */
    model: 'auto',
    setModel: (model) => set({ model }),

    /* ---------------------------- history ------------------------------- */
    projects: SEED_PROJECTS,
    chats: buildSeed().chats,
    activeChatId: null,
    messagesByChatId: {},
    isStreaming: false,
    stopRequested: false,

    selectChat: (id) => {
      if (get().activeChatId === id) return;
      cancelInflight();
      set((s) => ({
        activeChatId: id,
        isStreaming: false,
        stopRequested: false,
        threadKey: s.threadKey + 1,
      }));
    },

    createChat: (projectId = null) => {
      cancelInflight();
      const id = uid('chat');
      const now = Date.now();
      const chat: Chat = { id, title: 'New Chat', projectId, createdAt: now, updatedAt: now };
      set((s) => ({
        chats: [chat, ...s.chats],
        messagesByChatId: { ...s.messagesByChatId, [id]: [] },
        activeChatId: id,
        isStreaming: false,
        stopRequested: false,
        threadKey: s.threadKey + 1,
      }));
      return id;
    },

    renameChat: (id, title) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      set((s) => ({
        chats: s.chats.map((c) =>
          c.id === id ? { ...c, title: trimmed, updatedAt: Date.now() } : c,
        ),
      }));
    },

    deleteChat: (id) => {
      if (get().activeChatId === id) cancelInflight();
      set((s) => {
        const rest = { ...s.messagesByChatId };
        delete rest[id];
        return {
          chats: s.chats.filter((c) => c.id !== id),
          messagesByChatId: rest,
          activeChatId: s.activeChatId === id ? null : s.activeChatId,
          isStreaming: s.activeChatId === id ? false : s.isStreaming,
          stopRequested: false,
        };
      });
    },

    clearAllChats: () => {
      cancelInflight();
      const fresh = buildSeed();
      set({
        chats: fresh.chats,
        messagesByChatId: fresh.messagesByChatId,
        activeChatId: null,
        isStreaming: false,
        stopRequested: false,
      });
    },

    resetAllData: () => {
      cancelInflight();
      set({
        chats: [],
        messagesByChatId: {},
        activeChatId: null,
        isStreaming: false,
        stopRequested: false,
        settingsOpen: false,
        paletteOpen: false,
      });
      // Drop the on-disk snapshot so a refresh starts genuinely blank.
      void useChatStore.persist.clearStorage();
    },

    addMessage: (chatId, message) => {
      const full: ChatMessage = {
        id: message.id ?? uid('msg'),
        createdAt: message.createdAt ?? Date.now(),
        role: message.role,
        content: message.content,
        model: message.model,
        pending: message.pending,
        attachments: message.attachments,
      };
      set((s) => ({
        messagesByChatId: {
          ...s.messagesByChatId,
          [chatId]: [...(s.messagesByChatId[chatId] ?? []), full],
        },
        chats: s.chats.map((c) => (c.id === chatId ? { ...c, updatedAt: Date.now() } : c)),
      }));
      return full.id;
    },

    /* --------------------------- streaming ------------------------------ */

    /**
     * Pushes the user turn into the active chat (lazily creating one from the
     * empty state), then simulates a server round-trip followed by a
     * character-by-character streamed assistant reply — exactly the shape a
     * real SSE feed will have, so consumers need no changes when the backend lands.
     */
    sendMessage: (content, attachments) => {
      const { isStreaming, model } = get();
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      const chatId = get().activeChatId ?? get().createChat(null);

      cancelInflight();

      const userMessage: ChatMessage = {
        id: uid('msg'),
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
        attachments,
      };

      set((s) => {
        const isFirstTurn = (s.messagesByChatId[chatId] ?? []).length === 0;
        return {
          messagesByChatId: {
            ...s.messagesByChatId,
            [chatId]: [...(s.messagesByChatId[chatId] ?? []), userMessage],
          },
          chats: s.chats.map((c) =>
            c.id === chatId
              ? { ...c, title: isFirstTurn ? deriveTitle(trimmed) : c.title, updatedAt: Date.now() }
              : c,
          ),
          isStreaming: true,
          stopRequested: false,
        };
      });

      const assistantId = uid('msg');
      const fullReply = mockReply(trimmed);

      // Round-trip latency → then reveal the (empty) streaming bubble.
      roundTripTimer = setTimeout(() => {
        const state = useChatStore.getState();
        if (state.activeChatId !== chatId || state.stopRequested) {
          useChatStore.setState({ isStreaming: false, stopRequested: false });
          return;
        }

        state.addMessage(chatId, { id: assistantId, role: 'assistant', content: '', model });
        startCharStream(chatId, assistantId, fullReply);
      }, 620);
    },

    stopStreaming: () => {
      if (!get().isStreaming) return;
      // Flag + hard-cancel: whichever timer is mid-flight stops appending.
      set({ stopRequested: true });
      cancelInflight();
      set((s) => ({
        isStreaming: false,
        stopRequested: false,
        // Drop empty pre-token bubbles; keep any partially-typed answer.
        messagesByChatId: Object.fromEntries(
          Object.entries(s.messagesByChatId).map(([id, msgs]) => [
            id,
            msgs.filter((m) => !(m.role === 'assistant' && m.content === '')),
          ]),
        ),
      }));
    },

    /* ---------------------------- settings ------------------------------ */
    theme: 'dark',
    aiMemory: true,
    streamResponses: true,
    setTheme: (theme) => set({ theme }),
    setAiMemory: (aiMemory) => set({ aiMemory }),
    setStreamResponses: (streamResponses) => set({ streamResponses }),
    };
  },
  {
    name: 'krittim-chat-store',
    version: 1,
    // Whitelist — ephemeral chrome (streams, modals, threadKey) never hits localStorage.
    partialize: (state) =>
      Object.fromEntries(PERSISTED_STATE_KEYS.map((key) => [key, state[key]])) as Partial<ChatState>,
  },
  ),
);

/* -------------------------------- selectors ------------------------------- */

export const selectActiveMessages = (s: ChatState): ChatMessage[] =>
  s.activeChatId ? s.messagesByChatId[s.activeChatId] ?? [] : [];

export const selectActiveChat = (s: ChatState): Chat | null =>
  s.chats.find((c) => c.id === s.activeChatId) ?? null;
