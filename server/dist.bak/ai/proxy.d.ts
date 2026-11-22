/**
 * AI Proxy — model routing + provider fallback + SSE streaming.
 *
 * R1 Xenon:  xKiro key-1 → xKiro key-2 → apinex.bond → fallback to S1 Neon chain
 * S1 Neon:   Groq (5 keys round-robin)
 * Image Gen: xKiro image key (XKIRO_API_KEY_image)
 *
 * All providers speak OpenAI-compatible /chat/completions.
 * On 429 / 5xx / network error → immediately try next provider.
 */
export type ModelId = 'r1_xenon' | 's1_neon' | 'image_gen';
export type ReasoningMode = 'auto' | 'fast' | 'thinking';
export type ResponseStyle = 'concise' | 'balanced' | 'thorough';
export interface StreamOptions {
    /** Standing user instructions (ChatGPT "custom instructions"-style). */
    customInstructions?: string;
    /** How long/detailed answers should be. */
    responseStyle?: ResponseStyle;
}
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
/**
 * Generate an image.
 * Tries xKiro's dedicated image endpoint first, then falls back to
 * Pollinations.ai (free, no API key required) so image gen never hard-fails.
 * Returns an image URL.
 */
export declare function generateImage(prompt: string): Promise<string>;
/**
 * Streams tokens from the first available provider.
 * Calls onChunk for each token, onDone when complete.
 * Throws if every provider fails.
 */
export declare function streamCompletion(modelId: ModelId, mode: ReasoningMode, messages: ChatMessage[], hasImage: boolean, onChunk: (chunk: string) => void, onDone: (provider: string, model: string) => void, opts?: StreamOptions): Promise<void>;
