import { create } from "zustand";
import type { ChatMessage, ModelId } from "@/lib/types";

interface ChatState {
  /* sidebar */
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  /* model switcher */
  model: ModelId;
  setModel: (model: ModelId) => void;

  /* conversation */
  chatTitle: string;
  messages: ChatMessage[];
  isResponding: boolean;

  newChat: () => void;
  sendMessage: (content: string) => void;
}

let counter = 0;
const uid = () => `msg_${Date.now().toString(36)}_${(counter++).toString(36)}`;

/** Deterministic mock reply generator — swap for a real API in pass 2. */
function mockReply(prompt: string): string {
  const trimmed = prompt.trim();
  if (/^hi|^hello|^hey/i.test(trimmed)) {
    return "Hey Dev — good to see you. I'm Krittim, your reasoning partner. Ask me anything, or drop a file and we'll dig into it together.";
  }
  if (/code|function|bug|typescript|react/i.test(trimmed)) {
    return "Happy to help with that. Here's how I'd approach it:\n\n1. Isolate the failing path with a minimal repro.\n2. Check types and boundary conditions first — most React bugs hide in effect cleanup or stale closures.\n3. Refactor toward a pure function, then wire it back into the component.\n\nShare the snippet and I'll review line by line.";
  }
  if (/explain|what is|how does/i.test(trimmed)) {
    return "Great question. In short: it's a trade-off between speed and depth. Fast models optimize for immediate recall, while reasoning models spend extra compute exploring hypotheses before committing to an answer. The best results usually come from matching the engine to the task — which is exactly what Auto mode does under the hood.";
  }
  return "Understood — here's my take:\n\nThat's a problem worth structuring carefully. I'd break it into three passes: clarify the goal, map the constraints, then draft the smallest step that produces a verifiable result. Tell me more about your context and I'll tailor the plan.";
}

export const useChatStore = create<ChatState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  model: "auto",
  setModel: (model) => set({ model }),

  chatTitle: "New Conversation",
  messages: [],
  isResponding: false,

  newChat: () =>
    set({ chatTitle: "New Conversation", messages: [], isResponding: false }),

  sendMessage: (content) => {
    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      content,
      createdAt: Date.now(),
    };

    set((s) => ({
      messages: [...s.messages, userMessage],
      isResponding: true,
      chatTitle:
        s.messages.length === 0
          ? content.length > 42
            ? `${content.slice(0, 42).trimEnd()}…`
            : content
          : s.chatTitle,
    }));

    // Simulated assistant turn — replace with streaming API later.
    const delay = 900 + Math.min(content.length * 12, 1400);
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: mockReply(content),
        createdAt: Date.now(),
        model: "auto",
      };
      set((s) => ({
        messages: [...s.messages, assistantMessage],
        isResponding: false,
      }));
    }, delay);
  },
}));
