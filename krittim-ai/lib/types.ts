import type { LucideIcon } from "lucide-react";

/* ---------------------------------- Chat ---------------------------------- */

export type MessageRole = "user" | "assistant";

/** Lightweight, serialisable descriptor for an attached file (preview only — nothing is uploaded yet). */
export interface AttachmentMeta {
  name: string;
  size: number;
  type: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  /** Which model produced this answer (assistant only). */
  model?: ModelId;
  pending?: boolean;
  /** Files attached to this turn (mock — UI preview only). */
  attachments?: AttachmentMeta[];
}

/* -------------------------------- Chats ----------------------------------- */

export interface Chat {
  id: string;
  title: string;
  projectId?: string | null;
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  emoji: string;
  color: string; // tailwind gradient stops, e.g. 'from-violet-500 to-fuchsia-500'
}

/* --------------------------------- Models --------------------------------- */

export type ModelId = "auto" | "fast" | "thinking";

export interface ModelOption {
  id: ModelId;
  name: string;
  tagline: string;
  description: string;
}

export const MODEL_OPTIONS: readonly ModelOption[] = [
  {
    id: "auto",
    name: "Krittim Auto",
    tagline: "Balanced",
    description: "Routes every prompt to the right engine automatically.",
  },
  {
    id: "fast",
    name: "Krittim Fast",
    tagline: "Lightning",
    description: "Snappy responses for everyday questions and quick drafts.",
  },
  {
    id: "thinking",
    name: "Krittim Thinking",
    tagline: "Deep reasoning",
    description: "Extended chain-of-thought for math, code and hard problems.",
  },
] as const;

/* -------------------------------- Settings -------------------------------- */

export type ThemePreference = "dark" | "light" | "system";

export interface SettingsState {
  theme: ThemePreference;
  aiMemory: boolean;
  streamResponses: boolean;
}

/* -------------------------------- Sidebar --------------------------------- */

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

/* ------------------------------ Mock profile ------------------------------ */

export interface MockUser {
  name: string;
  email: string;
  handle: string;
  plan: string;
  initials: string;
}

export const MOCK_USER: MockUser = {
  name: "Demo User",
  email: "demo@krittim.ai",
  handle: "@demo",
  plan: "Free · BNMPC IT Club",
  initials: "DU",
};

/* ------------------------------ persistence ------------------------------- */

/** Keys of ChatState that are written to localStorage via the zustand persist middleware. */
export const PERSISTED_STATE_KEYS = [
  "chats",
  "projects",
  "activeChatId",
  "messagesByChatId",
  "model",
  "sidebarOpen",
  "projectsCollapsed",
  "theme",
  "aiMemory",
  "streamResponses",
] as const;

/** localStorage entry holding the resolved + preferred theme (read by the inline script in layout). */
export const THEME_STORAGE_KEY = "krittim-theme";
