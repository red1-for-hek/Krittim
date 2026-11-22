import crypto from 'node:crypto';

export interface MemUser {
  _id: string;
  name: string;
  email: string;
  passwordHash?: string;
  avatarUrl?: string;
  dateOfBirth?: string;
  provider: 'google' | 'github' | 'discord' | 'email';
  providerId?: string;
  plan: 'free' | 'pro' | 'enterprise';
  refreshToken?: string;
  settings: {
    theme: 'dark' | 'light' | 'system';
    model: string;
    reasoningMode: string;
    enterToSend: boolean;
    streamResponses: boolean;
    aiMemory: boolean;
    responseStyle: 'concise' | 'balanced' | 'thorough';
    customInstructions: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MemChat {
  _id: string;
  slug: string;
  userId: string;
  title: string;
  modelId: string;
  reasoningMode: string;
  projectId?: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemMessage {
  _id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  modelId?: string;
  reasoningMode?: string;
  attachments: { name: string; size: number; type: string; url?: string }[];
  sources?: { index: number; title: string; url: string; snippet?: string }[];
  createdAt: Date;
}

export interface MemProject {
  _id: string;
  userId: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MemoryStore {
  users: Map<string, MemUser>;
  chats: Map<string, MemChat>;
  messages: Map<string, MemMessage[]>;
  projects: Map<string, MemProject>;
}

const g = globalThis as unknown as { __krittimMemoryStore?: MemoryStore };

export const memoryStore: MemoryStore = (g.__krittimMemoryStore ??= {
  users: new Map(),
  chats: new Map(),
  messages: new Map(),
  projects: new Map(),
});

export const memId = (): string => crypto.randomBytes(12).toString('hex');

export function defaultSettings(): MemUser['settings'] {
  return {
    theme: 'dark',
    model: 's1_neon',
    reasoningMode: 'auto',
    enterToSend: true,
    streamResponses: true,
    aiMemory: true,
    responseStyle: 'balanced',
    customInstructions: '',
  };
}
