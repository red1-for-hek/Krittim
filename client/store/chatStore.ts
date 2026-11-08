import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { expireSession, getApiBaseUrl, refreshAccessToken } from '@/store/authStore';

import {
  PERSISTED_STATE_KEYS,
  type AttachmentMeta,
  type Chat,
  type ChatMessage,
  type ModelId,
  type Project,
  type ReasoningMode,
  type ResponseStyle,
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

/* ------------------------------ time buckets ------------------------------ */

export function bucketFor(timestamp: number, now: number): string {
  if (now - timestamp < DAY) return 'Today';
  if (now - timestamp < 2 * DAY) return 'Yesterday';
  if (now - timestamp < 7 * DAY) return 'Previous 7 days';
  if (now - timestamp < 30 * DAY) return 'Previous 30 days';
  return 'Older';
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

  /* composer tools + personalization (persisted) */
  webSearch: boolean;
  setWebSearch: (on: boolean) => void;
  imageMode: boolean;
  setImageMode: (on: boolean) => void;
  customInstructions: string;
  setCustomInstructions: (text: string) => void;
  responseStyle: ResponseStyle;
  setResponseStyle: (style: ResponseStyle) => void;

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

  /* projects (folders) */
  createProject: (name: string, emoji?: string, color?: string) => string;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  assignChatToProject: (chatId: string, projectId: string | null) => void;
  addMessage: (
    chatId: string,
    message: Omit<ChatMessage, 'id' | 'createdAt'> & Partial<Pick<ChatMessage, 'id' | 'createdAt'>>,
  ) => string;

  /* streaming simulation */
  sendMessage: (content: string, attachments?: AttachmentMeta[], options?: { webSearch?: boolean }) => void;
  stopStreaming: () => void;
  /** Re-answer the last user turn (drops the trailing assistant reply). */
  regenerate: () => void;
  /** Edit a user message in place and re-run the conversation from there. */
  editAndResend: (messageId: string, newContent: string) => void;

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

/* Module-level handle so an in-flight SSE stream can be interrupted without living inside React. */
let roundTripTimer: ReturnType<typeof setTimeout> | null = null;
let aiController: AbortController | null = null;
const apiBaseUrl = getApiBaseUrl();

const cancelInflight = () => {
  if (roundTripTimer) clearTimeout(roundTripTimer);
  roundTripTimer = null;
};

/** Immutably patch the streaming assistant bubble with a transform. */
const patchAssistant = (chatId: string, messageId: string, fn: (m: ChatMessage) => ChatMessage) =>
  useChatStore.setState((s) => ({
    messagesByChatId: {
      ...s.messagesByChatId,
      [chatId]: (s.messagesByChatId[chatId] ?? []).map((m) => (m.id === messageId ? fn(m) : m)),
    },
  }));

interface StreamEvent {
  type: string;
  content?: string;
  stage?: ChatMessage['status'];
  detail?: string;
  sources?: { index: number; title: string; url: string; snippet?: string }[];
  url?: string;
  message?: string;
}

/**
 * Shared SSE consumer for send / regenerate / edit. Handles the full event
 * vocabulary: staged status (searching→reading→synthesizing→thinking),
 * grounded sources, streamed chunks, and image results.
 */
function runStream(chatId: string, assistantId: string, body: Record<string, unknown>): void {
  const controller = new AbortController();
  aiController = controller;

  const request = (token: string | null) =>
    fetch(`${apiBaseUrl}/api/ai/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

  void (async () => {
    try {
      let token = typeof window !== 'undefined' ? localStorage.getItem('krittim-access-token') : null;
      let response = await request(token);
      if (response.status === 401) {
        token = await refreshAccessToken();
        if (token) response = await request(token);
      }
      if (!response.ok || !response.body) {
        const raw = await response.text().catch(() => '');
        let message = `AI request failed (${response.status})`;
        try {
          const json = JSON.parse(raw) as { error?: string | { formErrors?: string[] } };
          if (typeof json.error === 'string') message = json.error;
          else if (json.error?.formErrors?.[0]) message = json.error.formErrors[0];
        } catch {
          if (raw) message = raw.slice(0, 200);
        }
        if (response.status === 401) { expireSession(); throw new Error('SESSION_EXPIRED'); }
        throw new Error(message);
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
          let event: StreamEvent;
          try { event = JSON.parse(data); } catch { continue; }

          if (event.type === 'chunk' && event.content) {
            patchAssistant(chatId, assistantId, (m) => ({ ...m, content: m.content + event.content, status: undefined, statusDetail: undefined }));
          } else if (event.type === 'status') {
            patchAssistant(chatId, assistantId, (m) => ({ ...m, status: event.stage, statusDetail: event.detail }));
          } else if (event.type === 'sources') {
            patchAssistant(chatId, assistantId, (m) => ({ ...m, sources: event.sources }));
          } else if (event.type === 'image' && event.url) {
            patchAssistant(chatId, assistantId, (m) => ({ ...m, content: `![generated image](${event.url})`, status: undefined, statusDetail: undefined }));
          } else if (event.type === 'error') {
            throw new Error(event.message ?? 'AI provider failed');
          }
        }
      }
      useChatStore.setState({ isStreaming: false, stopRequested: false });
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        useChatStore.setState((state) => ({
          messagesByChatId: {
            ...state.messagesByChatId,
            [chatId]: (state.messagesByChatId[chatId] ?? []).filter(
              (item) => !(item.role === 'assistant' && item.id === assistantId && item.content === ''),
            ),
          },
        }));
        const message = error instanceof Error ? error.message : 'AI request failed';
        if (message === 'SESSION_EXPIRED') {
          useChatStore.setState({ isStreaming: false, stopRequested: false });
          return;
        }
        toast.error(
          message.includes('Failed to fetch')
            ? `Cannot reach the AI server at ${apiBaseUrl || 'the current site'}`
            : message,
        );
      }
      useChatStore.setState({ isStreaming: false, stopRequested: false });
    } finally {
      aiController = null;
    }
  })();
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => {
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

    /* ------------------------- tools + personalization ------------------ */
    webSearch: false,
    setWebSearch: (webSearch) => set((s) => ({ webSearch, imageMode: webSearch ? false : s.imageMode })),
    imageMode: false,
    setImageMode: (imageMode) => set((s) => ({ imageMode, webSearch: imageMode ? false : s.webSearch })),
    customInstructions: '',
    setCustomInstructions: (customInstructions) => set({ customInstructions }),
    responseStyle: 'balanced',
    setResponseStyle: (responseStyle) => set({ responseStyle }),

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

    /* ----------------------------- projects ----------------------------- */

    createProject: (name, emoji = '📁', color = 'from-brand to-brand-soft') => {
      const id = uid('proj');
      const now = Date.now();
      const project: Project = { id, name: name.trim() || 'New Project', emoji, color, createdAt: now, updatedAt: now };
      set((s) => ({ projects: [...s.projects, project], projectsCollapsed: false }));
      toast.success('Project created', { description: `“${project.name}” is ready.` });
      return id;
    },

    renameProject: (id, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, name: trimmed, updatedAt: Date.now() } : p)) }));
    },

    deleteProject: (id) => {
      const project = get().projects.find((p) => p.id === id);
      set((s) => ({
        projects: s.projects.filter((p) => p.id !== id),
        // Unassign chats rather than deleting them.
        chats: s.chats.map((c) => (c.projectId === id ? { ...c, projectId: null } : c)),
      }));
      toast.success('Project deleted', { description: project ? `“${project.name}” removed — its chats were kept.` : undefined });
    },

    assignChatToProject: (chatId, projectId) => {
      set((s) => ({ chats: s.chats.map((c) => (c.id === chatId ? { ...c, projectId } : c)) }));
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
      const { isStreaming, model, reasoningMode, webSearch, imageMode, customInstructions, responseStyle } = get();
      const trimmed = content.trim();
      if (!trimmed || isStreaming) return;

      // If no active chat yet, create one and navigate to its slug
      let chatId = get().activeChatId;
      if (!chatId) {
        chatId = get().createChat(null);
      }

      const chat = get().chats.find((item) => item.id === chatId);
      if (!chat) {
        toast.error('Unable to start chat');
        return;
      }

      const useSearch = options?.webSearch ?? webSearch;
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

      if (typeof window !== 'undefined' && window.location.pathname === '/') {
        window.history.pushState({}, '', `/chat/${chat.slug}`);
      }

      const assistantId = uid('msg');
      get().addMessage(chatId, {
        id: assistantId,
        role: 'assistant',
        content: '',
        model,
        mode: reasoningMode,
        status: imageMode ? 'generating' : useSearch ? 'searching' : 'thinking',
      });

      runStream(chatId, assistantId, {
        slug: chat.slug,
        modelId: model,
        reasoningMode,
        message: trimmed,
        hasImage: attachments?.some((file) => file.type.startsWith('image/')) ?? false,
        webSearch: useSearch,
        mode: imageMode ? 'image' : 'chat',
        customInstructions: customInstructions || undefined,
        responseStyle,
        attachments: attachments?.map((a) => ({ name: a.name, size: a.size, type: a.type })),
      });
    },

    stopStreaming: () => {
      if (!get().isStreaming) return;
      set({ stopRequested: true });
      cancelInflight();
      aiController?.abort();
      aiController = null;
      set((s) => ({
        isStreaming: false,
        stopRequested: false,
        messagesByChatId: Object.fromEntries(
          Object.entries(s.messagesByChatId).map(([id, msgs]) => [
            id,
            msgs.filter((m) => !(m.role === 'assistant' && m.content === '')),
          ]),
        ),
      }));
    },

    regenerate: () => {
      const { activeChatId, messagesByChatId, isStreaming, model, reasoningMode, webSearch, imageMode, customInstructions, responseStyle } = get();
      if (!activeChatId || isStreaming) return;
      const msgs = messagesByChatId[activeChatId] ?? [];
      let lastUserIndex = -1;
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'user') { lastUserIndex = i; break; }
      }
      if (lastUserIndex === -1) return;
      const lastUser = msgs[lastUserIndex];
      const chat = get().chats.find((c) => c.id === activeChatId);
      if (!chat) return;

      // Drop the trailing assistant reply (everything after the last user turn).
      set((s) => ({
        messagesByChatId: { ...s.messagesByChatId, [activeChatId]: msgs.slice(0, lastUserIndex + 1) },
        isStreaming: true,
        stopRequested: false,
      }));

      const assistantId = uid('msg');
      get().addMessage(activeChatId, { id: assistantId, role: 'assistant', content: '', model, mode: reasoningMode, status: 'thinking' });

      runStream(activeChatId, assistantId, {
        slug: chat.slug,
        modelId: model,
        reasoningMode,
        message: lastUser.content,
        hasImage: lastUser.attachments?.some((f) => f.type.startsWith('image/')) ?? false,
        webSearch,
        mode: imageMode ? 'image' : 'chat',
        regenerate: true,
        customInstructions: customInstructions || undefined,
        responseStyle,
        attachments: lastUser.attachments?.map((a) => ({ name: a.name, size: a.size, type: a.type })),
      });
    },

    editAndResend: (messageId, newContent) => {
      const { activeChatId, messagesByChatId, isStreaming, model, reasoningMode, webSearch, imageMode, customInstructions, responseStyle } = get();
      if (!activeChatId || isStreaming) return;
      const trimmed = newContent.trim();
      if (!trimmed) return;
      const msgs = messagesByChatId[activeChatId] ?? [];
      const index = msgs.findIndex((m) => m.id === messageId);
      if (index === -1 || msgs[index].role !== 'user') return;
      const chat = get().chats.find((c) => c.id === activeChatId);
      if (!chat) return;

      // Rewrite the user turn and discard everything after it.
      const edited: ChatMessage = { ...msgs[index], content: trimmed };
      const kept = [...msgs.slice(0, index), edited];
      set((s) => ({
        messagesByChatId: { ...s.messagesByChatId, [activeChatId]: kept },
        isStreaming: true,
        stopRequested: false,
      }));

      const assistantId = uid('msg');
      get().addMessage(activeChatId, { id: assistantId, role: 'assistant', content: '', model, mode: reasoningMode, status: 'thinking' });

      runStream(activeChatId, assistantId, {
        slug: chat.slug,
        modelId: model,
        reasoningMode,
        message: trimmed,
        hasImage: edited.attachments?.some((f) => f.type.startsWith('image/')) ?? false,
        webSearch,
        mode: imageMode ? 'image' : 'chat',
        regenerate: true,
        customInstructions: customInstructions || undefined,
        responseStyle,
        attachments: edited.attachments?.map((a) => ({ name: a.name, size: a.size, type: a.type })),
      });
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
