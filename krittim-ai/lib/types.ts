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
  /** Which reasoning mode produced this answer (assistant only). */
  mode?: ReasoningMode;
  pending?: boolean;
  /** Files attached to this turn. */
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

export type ModelId = "r1_xenon" | "s1_neon";
export type ReasoningMode = "auto" | "fast" | "thinking";

export interface ModelOption {
  id: ModelId;
  name: string;
  tagline: string;
  description: string;
}

export const MODEL_OPTIONS: readonly ModelOption[] = [
  {
    id: "r1_xenon",
    name: "Krittim R1 Xenon",
    tagline: "Flagship",
    description: "Flagship model of Krittim for complex tasks",
  },
  {
    id: "s1_neon",
    name: "Krittim S1 Neon",
    tagline: "Speed & Daily",
    description: "Best for general daily tasks",
  },
] as const;

export interface ModeOption {
  id: ReasoningMode;
  name: string;
  tagline: string;
}

export const MODE_OPTIONS: readonly ModeOption[] = [
  { id: "auto", name: "Auto", tagline: "Balanced" },
  { id: "fast", name: "Lightning", tagline: "Fast" },
  { id: "thinking", name: "Thinking", tagline: "Deep Reasoning" },
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

/* ------------------------------ User Profile ------------------------------ */

export interface UserProfile {
  name: string;
  email: string;
  handle: string;
  plan: string;
  initials: string;
}

export type MockUser = UserProfile;

export const CURRENT_USER: UserProfile = {
  name: "BNMPC IT Club",
  email: "core@bnmpc-it.org",
  handle: "@bnmpc_it",
  plan: "Pro Enterprise · Krittim AI",
  initials: "KI",
};

export const MOCK_USER: UserProfile = CURRENT_USER;

/* ------------------------------ persistence ------------------------------- */

/** Keys of ChatState that are written to localStorage via the zustand persist middleware. */
export const PERSISTED_STATE_KEYS = [
  "chats",
  "projects",
  "activeChatId",
  "messagesByChatId",
  "model",
  "reasoningMode",
  "sidebarOpen",
  "projectsCollapsed",
  "theme",
  "aiMemory",
  "streamResponses",
] as const;

/** localStorage entry holding the resolved + preferred theme (read by the inline script in layout). */
export const THEME_STORAGE_KEY = "krittim-theme";
