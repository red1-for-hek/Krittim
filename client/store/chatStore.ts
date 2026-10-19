import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';

import {
  PERSISTED_STATE_KEYS,
  type AttachmentMeta,
  type Chat,
  type ChatMessage,
  type ModelId,
  type Project,
  type ReasoningMode,
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

/** Generates a URL-safe slug like `chat-a3f9b2c1` */
const generateSlug = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = 'chat-';
  for (let i = 0; i < 8; i++) slug += chars[Math.floor(Math.random() * chars.length)];
  return slug;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/* ------------------------------- mock seed -------------------------------- */

/* ------------------------------ time buckets ------------------------------ */

export function bucketFor(timestamp: number, now: number): string {
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
    document.documentElement.classList.toggle('light', resolved === 'light');
    document.documentElement.style.colorScheme = resolved;
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

  /* model & reasoning switcher */
  model: ModelId;
  setModel: (model: ModelId) => void;
  reasoningMode: ReasoningMode;
  setReasoningMode: (mode: ReasoningMode) => void;

  /* multi-chat history */
  projects: Project[];
  chats: Chat[];
  activeChatId: string | null;
  messagesByChatId: Record<string, ChatMessage[]>;
  isStreaming: boolean;
  stopRequested: boolean;

  selectChat: (id: string) => void;
  createChat: (projectId?: string | null) => string;
  startNewChat: () => void;
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
  sendMessage: (content: string, attachments?: AttachmentMeta[], options?: { webSearch?: boolean }) => void;
  stopStreaming: () => void;

  /* settings (persisted) */
  theme: ThemePreference;
  aiMemory: boolean;
  streamResponses: boolean;
  enterToSend: boolean;
  showTimestamps: boolean;
  setTheme: (theme: ThemePreference) => void;
  setAiMemory: (on: boolean) => void;
  setStreamResponses: (on: boolean) => void;
  setEnterToSend: (on: boolean) => void;
  setShowTimestamps: (on: boolean) => void;
}

/* Module-level handles so an in-flight simulated stream can be interrupted without living inside React. */
let roundTripTimer: ReturnType<typeof setTimeout> | null = null;
let streamInterval: ReturnType<typeof setInterval> | null = null;
let aiController: AbortController | null = null;
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

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

    projectsCollapsed: true,
    toggleProjectsCollapsed: () => set((s) => ({ projectsCollapsed: !s.projectsCollapsed })),

    threadKey: 0,

    /* ------------------------------ model & mode ------------------------ */
     model: 's1_neon',
    setModel: (model) => set({ model }),
    reasoningMode: 'auto',
    setReasoningMode: (reasoningMode) => set({ reasoningMode }),

    /* ---------------------------- history ------------------------------- */
    projects: [],
    chats: [],
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
      const current = get();
      const activeMessages = current.activeChatId ? current.messagesByChatId[current.activeChatId] ?? [] : [];
      if (current.activeChatId && activeMessages.length === 0) {
        return current.activeChatId;
      }
      const id = uid('chat');
      const now = Date.now();
      const chat: Chat = { id, slug: generateSlug(), title: 'New Chat', projectId, createdAt: now, updatedAt: now };
      set((s) => ({
        chats: [chat, ...s.chats.filter((item) => (s.messagesByChatId[item.id] ?? []).length > 0)],
        messagesByChatId: { ...Object.fromEntries(Object.entries(s.messagesByChatId).filter(([chatKey]) => (s.messagesByChatId[chatKey] ?? []).length > 0)), [id]: [] },
        activeChatId: id,
        isStreaming: false,
        stopRequested: false,
        threadKey: s.threadKey + 1,
      }));
      return id;
    },

    startNewChat: () => {
      cancelInflight();
      set((s) => {
        const emptyIds = new Set(
          s.chats.filter((chat) => (s.messagesByChatId[chat.id] ?? []).length === 0).map((chat) => chat.id),
        );
        return {
          chats: s.chats.filter((chat) => !emptyIds.has(chat.id)),
          messagesByChatId: Object.fromEntries(
            Object.entries(s.messagesByChatId).filter(([id]) => !emptyIds.has(id)),
          ),
          activeChatId: null,
          isStreaming: false,
          stopRequested: false,
          threadKey: s.threadKey + 1,
        };
      });
      if (typeof window !== 'undefined') window.history.pushState({}, '', '/');
    },

    renameChat: (id, title) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      set((s) => ({
        chats: s.chats.map((c) =>
          c.id === id ? { ...c, title: trimmed, updatedAt: Date.now() } : c,
        ),
      }));
      toast.success('Chat renamed');
    },

    deleteChat: (id) => {
      if (get().activeChatId === id) cancelInflight();
      const title = get().chats.find((c) => c.id === id)?.title ?? 'Chat';
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
      toast.success('Chat deleted', { description: `“${title}” is gone for good.` });
    },

    clearAllChats: () => {
      cancelInflight();
      set({
        chats: [],
        messagesByChatId: {},
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
      try {
        localStorage.removeItem('krittim-theme');
      } catch {
        /* storage disabled — cosmetic only */
      }
      toast.success('Local storage cleared', {
        description: 'Every chat and preference was wiped from this browser.',
      });
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
        sources: message.sources,
        status: message.status,
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
    sendMessage: (content, attachments, options) => {
      const { isStreaming, model, reasoningMode } = get();
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      // If no active chat yet, create one and navigate to its slug
      let chatId = get().activeChatId;
      if (!chatId) {
        chatId = get().createChat(null);
      }

      cancelInflight();
      const chat = get().chats.find((item) => item.id === chatId);
      if (!chat) {
        toast.error('Unable to start chat');
        return;
      }

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
      get().addMessage(chatId, { id: assistantId, role: 'assistant', content: '', model, mode: reasoningMode });
      const controller = new AbortController();
      roundTripTimer = setTimeout(() => undefined, 0);
      void (async () => {
        try {
          const response = await fetch(`${apiBaseUrl}/api/ai/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(typeof window !== 'undefined' && localStorage.getItem('krittim-access-token')
                ? { Authorization: `Bearer ${localStorage.getItem('krittim-access-token')}` }
                : {}),
            },
            body: JSON.stringify({ slug: chat.slug, modelId: model, reasoningMode, message: trimmed, hasImage: attachments?.some((file) => file.type.startsWith('image/')) ?? false, webSearch: options?.webSearch ?? false }),
            signal: controller.signal,
          });
          if (!response.ok || !response.body) {
            const body = await response.text().catch(() => '');
            throw new Error(`AI request failed (${response.status}): ${body || 'empty response'}`);
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              const event = JSON.parse(data) as { type: string; content?: string; sources?: { title: string; url: string }[]; message?: string };
              if (event.type === 'chunk' && event.content) {
                if (typeof window !== 'undefined' && window.location.pathname === '/') {
                  window.history.pushState({}, '', `/chat/${chat.slug}`);
                }
                const current = useChatStore.getState().messagesByChatId[chatId]?.find((item) => item.id === assistantId)?.content ?? '';
                patchMessageContent(chatId, assistantId, current + event.content);
              } else if (event.type === 'sources') {
                useChatStore.setState((state) => ({ messagesByChatId: { ...state.messagesByChatId, [chatId]: state.messagesByChatId[chatId].map((item) => item.id === assistantId ? { ...item, sources: event.sources } : item) } }));
              } else if (event.type === 'status') {
                useChatStore.setState((state) => ({ messagesByChatId: { ...state.messagesByChatId, [chatId]: state.messagesByChatId[chatId].map((item) => item.id === assistantId ? { ...item, status: event.content as 'searching' | 'thinking' } : item) } }));
              } else if (event.type === 'error') throw new Error(event.message ?? 'AI provider failed');
            }
          }
          useChatStore.setState({ isStreaming: false, stopRequested: false });
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            useChatStore.setState((state) => {
              const messages = { ...state.messagesByChatId };
              delete messages[chatId];
              return {
                chats: state.chats.filter((item) => item.id !== chatId),
                messagesByChatId: messages,
                activeChatId: null,
              };
            });
            if (typeof window !== 'undefined') window.history.pushState({}, '', '/');
            const message = error instanceof Error ? error.message : 'AI request failed';
            toast.error(message.includes('Failed to fetch') ? `Cannot reach AI server at ${apiBaseUrl}` : message);
          }
          useChatStore.setState({ isStreaming: false, stopRequested: false });
        }
      })();
      aiController = controller;
    },

    stopStreaming: () => {
      if (!get().isStreaming) return;
      // Flag + hard-cancel: whichever timer is mid-flight stops appending.
      set({ stopRequested: true });
      cancelInflight();
      aiController?.abort();
      aiController = null;
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
    enterToSend: true,
    showTimestamps: true,
    setTheme: (theme) => set({ theme }),
    setAiMemory: (aiMemory) => set({ aiMemory }),
    setStreamResponses: (streamResponses) => set({ streamResponses }),
    setEnterToSend: (enterToSend) => set({ enterToSend }),
    setShowTimestamps: (showTimestamps) => set({ showTimestamps }),
    };
  },
  {
    name: 'krittim-chat-store',
    version: 2,
    // Whitelist — ephemeral chrome (streams, modals, threadKey) never hits localStorage.
    partialize: (state) =>
      Object.fromEntries(PERSISTED_STATE_KEYS.map((key) => [key, state[key]])) as Partial<ChatState>,
  },
  ),
);

/* -------------------------------- selectors ------------------------------- */

const EMPTY_MESSAGES: ChatMessage[] = [];

export const selectActiveMessages = (s: ChatState): ChatMessage[] =>
  (s.activeChatId && s.messagesByChatId[s.activeChatId])
    ? s.messagesByChatId[s.activeChatId]
    : EMPTY_MESSAGES;

export const selectActiveChat = (s: ChatState): Chat | null =>
  s.chats.find((c) => c.id === s.activeChatId) ?? null;

export const selectChatBySlug = (slug: string) => (s: ChatState): Chat | null =>
  s.chats.find((c) => c.slug === slug) ?? null;
