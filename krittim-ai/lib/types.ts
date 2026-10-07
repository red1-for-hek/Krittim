import type { LucideIcon } from "lucide-react";

/* ---------------------------------- Chat ---------------------------------- */

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  /** Which model produced this answer (assistant only). */
  model?: ModelId;
  pending?: boolean;
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
    name: "Auto",
    tagline: "Balanced",
    description: "Krittim routes each prompt to the right engine automatically.",
  },
  {
    id: "fast",
    name: "Fast",
    tagline: "Low latency",
    description: "Snappy responses for everyday questions and quick drafts.",
  },
  {
    id: "thinking",
    name: "Thinking",
    tagline: "Deep reasoning",
    description: "Extended chain-of-thought for math, code and hard problems.",
  },
] as const;

/* -------------------------------- Sidebar --------------------------------- */

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
}

export interface HistoryGroup {
  label: string;
  items: { id: string; title: string; pinned?: boolean }[];
}

/* ------------------------------ Mock profile ------------------------------ */

export interface MockUser {
  name: string;
  handle: string;
  plan: string;
  initials: string;
}

export const MOCK_USER: MockUser = {
  name: "Dev",
  handle: "@dev",
  plan: "Pro · BNMPC IT Club",
  initials: "DV",
};
