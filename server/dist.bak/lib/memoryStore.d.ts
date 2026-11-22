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
    attachments: {
        name: string;
        size: number;
        type: string;
        url?: string;
    }[];
    sources?: {
        index: number;
        title: string;
        url: string;
        snippet?: string;
    }[];
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
export declare const memoryStore: MemoryStore;
export declare const memId: () => string;
export declare function defaultSettings(): MemUser['settings'];
export {};
