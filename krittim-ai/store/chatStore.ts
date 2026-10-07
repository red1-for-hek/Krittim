import { create } from 'zustand';

import type { ChatMessage, ModelId, ThemePreference } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/*  Krittim AI — global client state (Zustand)                                 */
/*                                                                            */
/*  Single source of truth for: sidebar chrome, the active reasoning model,   */
/*  the mock conversation, streaming-style assistant replies and settings.    */
/* -------------------------------------------------------------------------- */

let counter = 0;
const uid = (): string => `msg_${Date.now().toString(36)}_${(counter++).toString(36)}`;

/** Deterministic mock reply generator — swap for a real API in pass 3. */
function mockReply(prompt: string): string {
  const t = prompt.trim();

  if (/^hi\b|^hello\b|^hey\b/i.test(t)) {
    return [
      `Hey Dev — good to see you. I'm **Krittim**, your reasoning partner.`,
      ``,
      `Here's what I can do right now:`,
      ``,
      `- Write and review production code`,
      `- Explain systems end-to-end (try *RAG*, *vector search*, *KV caches*)`,
      `- Draft launch copy, plans and specs`,
      ``,
      `Drop a file or paste a snippet whenever you're ready.`,
    ].join('\n');
  }

  if (/code|function|bug|typescript|react|hook|component/i.test(t)) {
    return [
      `Happy to dig in. Here's the pattern I'd reach for — a typed hook with proper effect cleanup:`,
      ``,
      '```tsx',
      `import { useEffect, useRef, useState } from 'react';`,
      ``,
      `export function useDebouncedValue<T>(value: T, delay = 300): T {`,
      `  const [debounced, setDebounced] = useState(value);`,
      `  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);`,
      ``,
      `  useEffect(() => {`,
      `    timer.current = setTimeout(() => setDebounced(value), delay);`,
      `    return () => clearTimeout(timer.current); // no stale closures`,
      `  }, [value, delay]);`,
      ``,
      `  return debounced;`,
      `}`,
      '```',
      ``,
      `Three things this gets right:`,
      ``,
      `1. **Cleanup on every keystroke** — the old timer is cancelled before a new one starts.`,
      `2. **Generic over \`T\`** — works for strings, ids, or whole filter objects.`,
      `3. **No state duplication** — the debounced value is derived, never synced by hand.`,
      ``,
      `Paste your failing snippet and I'll review it line by line.`,
    ].join('\n');
  }

  if (/explain|what is|how does|rag|retrieval|vector|transformer|llm/i.test(t)) {
    return [
      `Great question. Here's the short version of **Retrieval-Augmented Generation**:`,
      ``,
      `| Stage | What happens | Why it matters |`,
      `| --- | --- | --- |`,
      `| 1. Ingest | Documents are chunked & embedded into vectors | Semantics survive in geometry |`,
      `| 2. Retrieve | The query embeds, nearest chunks are fetched | Grounds the model in *your* data |`,
      `| 3. Generate | Chunks are injected into the prompt as context | Answers cite reality, not memory |`,
      ``,
      `The trade-off is latency vs. faithfulness: retrieval adds ~50–200ms but slashes hallucination rates dramatically. Teams usually tune it with hybrid search — BM25 for exact terms, dense vectors for meaning, fused with reciprocal rank.`,
      ``,
      `Want me to sketch a minimal RAG pipeline in TypeScript?`,
    ].join('\n');
  }

  return [
    `Understood — here's how I'd structure that:`,
    ``,
    `1. **Clarify the goal** — one sentence, verifiable outcome.`,
    `2. **Map the constraints** — time, budget, technical edges.`,
    `3. **Draft the smallest step** that produces a measurable result.`,
    ``,
    `Give me a little more context and I'll tailor the plan — or switch me to **Thinking** mode above if this deserves deeper reasoning.`,
  ].join('\n');
}

/* ---------------------------------- types --------------------------------- */

export interface ChatState {
  /* chrome */
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  /* model switcher */
  model: ModelId;
  setModel: (model: ModelId) => void;

  /* conversation */
  chatTitle: string;
  messages: ChatMessage[];
  isResponding: boolean;

  addMessage: (message: Omit<ChatMessage, 'id' | 'createdAt'> & Partial<Pick<ChatMessage, 'id' | 'createdAt'>>) => string;
  clearMessages: () => void;
  newChat: () => void;
  sendMessage: (content: string) => void;
  stopResponse: () => void;

  /* settings (mock persistence) */
  theme: ThemePreference;
  aiMemory: boolean;
  streamResponses: boolean;
  setTheme: (theme: ThemePreference) => void;
  setAiMemory: (on: boolean) => void;
  setStreamResponses: (on: boolean) => void;
}

/* --------------------------------- store ---------------------------------- */

/** Handle for the in-flight simulated stream so it can be interrupted. */
let streamTimer: ReturnType<typeof setInterval> | null = null;
let responseTimer: ReturnType<typeof setTimeout> | null = null;

const cancelInflight = () => {
  if (streamTimer) clearInterval(streamTimer);
  if (responseTimer) clearTimeout(responseTimer);
  streamTimer = null;
  responseTimer = null;
};

export const useChatStore = create<ChatState>((set, get) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

  model: 'auto',
  setModel: (model) => set({ model }),

  chatTitle: 'New Conversation',
  messages: [],
  isResponding: false,

  addMessage: (message) => {
    const full: ChatMessage = {
      id: message.id ?? uid(),
      createdAt: message.createdAt ?? Date.now(),
      role: message.role,
      content: message.content,
      model: message.model,
      pending: message.pending,
    };
    set((s) => ({ messages: [...s.messages, full] }));
    return full.id;
  },

  clearMessages: () => {
    cancelInflight();
    set({ messages: [], chatTitle: 'New Conversation', isResponding: false });
  },

  newChat: () => {
    cancelInflight();
    set({ messages: [], chatTitle: 'New Conversation', isResponding: false });
  },

  /**
   * Pushes the user turn, then simulates a server round-trip followed by a
   * token-by-token streamed assistant reply (word-chunk ticker) — exactly the
   * shape a real SSE feed will have, so MessageList needs no changes later.
   */
  sendMessage: (content) => {
    const { isResponding, model } = get();
    const trimmed = content.trim();
    if (!trimmed || isResponding) return;

    cancelInflight();

    const userMessage: ChatMessage = {
      id: uid(),
      role: 'user',
      content: trimmed,
      createdAt: Date.now(),
    };

    set((s) => ({
      messages: [...s.messages, userMessage],
      isResponding: true,
      chatTitle:
        s.messages.length === 0
          ? trimmed.length > 42
            ? `${trimmed.slice(0, 42).trimEnd()}…`
            : trimmed
          : s.chatTitle,
    }));

    const assistantId = uid();
    const fullReply = mockReply(trimmed);

    // Round-trip latency → then reveal the (empty) streaming bubble.
    responseTimer = setTimeout(() => {
      set((s) => ({
        messages: [
          ...s.messages,
          { id: assistantId, role: 'assistant', content: '', createdAt: Date.now(), model },
        ],
      }));

      // Stream word-by-word like an SSE feed.
      const words = fullReply.split(/(\s+)/); // keep whitespace tokens
      let cursor = 0;
      streamTimer = setInterval(() => {
        // Emit 1–3 words per tick for a natural cadence.
        const step = Math.min(words.length - cursor, 2 + Math.floor(Math.random() * 2));
        cursor += step;
        const partial = words.slice(0, cursor).join('');
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantId ? { ...m, content: partial } : m,
          ),
        }));

        if (cursor >= words.length) {
          cancelInflight();
          set({ isResponding: false });
        }
      }, 45);
    }, 650);
  },

  stopResponse: () => {
    if (!get().isResponding) return;
    cancelInflight();
    set((s) => ({
      isResponding: false,
      // Drop an empty streaming bubble; keep any partially-typed answer.
      messages: s.messages.filter((m) => !(m.role === 'assistant' && m.content === '')),
    }));
  },

  /* settings */
  theme: 'dark',
  aiMemory: true,
  streamResponses: true,
  setTheme: (theme) => set({ theme }),
  setAiMemory: (aiMemory) => set({ aiMemory }),
  setStreamResponses: (streamResponses) => set({ streamResponses }),
}));
