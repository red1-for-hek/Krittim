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

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface Provider {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

function completionUrl(baseUrl: string): string {
  return baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/chat/completions`;
}

// Round-robin index for Groq keys
let groqKeyIndex = 0;

function getGroqProviders(mode: ReasoningMode): Provider[] {
  const keys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
  ].filter(Boolean) as string[];

  if (!keys.length) return [];

  // Start from current round-robin index, wrap around
  const configuredModel = process.env.GROQ_MODEL?.trim();
  const model =
    mode === 'fast'
      ? 'openai/gpt-oss-20b'
      : mode === 'thinking'
        ? 'openai/gpt-oss-120b'
        : configuredModel && configuredModel !== '...' ? configuredModel : 'openai/gpt-oss-20b';
  const ordered = [...keys.slice(groqKeyIndex), ...keys.slice(0, groqKeyIndex)];
  groqKeyIndex = (groqKeyIndex + 1) % keys.length;

  return ordered.map((apiKey, i) => ({
    name: `groq-${i + 1}`,
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey,
    model,
  }));
}

function getProviders(modelId: ModelId, mode: ReasoningMode, hasImage: boolean): Provider[] {
  const xkiroBase = process.env.XKIRO_BASE_URL ?? 'https://api.xkiro.com/v1';

  // R1 Xenon providers — qwen3.8-max via xKiro, then apinex fallback
  const xenon: Provider[] = [
    {
      name: 'xKiro-1',
      baseUrl: xkiroBase,
      apiKey: process.env.XKIRO_API_KEY_1 ?? '',
      model: process.env.XKIRO_MODEL ?? 'qwen/qwen3.8-max:free',
    },
    {
      name: 'xKiro-2',
      baseUrl: xkiroBase,
      apiKey: process.env.XKIRO_API_KEY_2 ?? '',
      model: process.env.XKIRO_MODEL ?? 'qwen/qwen3.8-max:free',
    },
    {
      name: 'apinex',
      baseUrl: process.env.APINEX_BASE_URL ?? 'https://api.apinex.bond/v1',
      apiKey: process.env.APINEX_API_KEY ?? '',
      model: process.env.APINEX_MODEL ?? 'deepseek-v4.1-flash',
    },
  ];

  // S1 text uses Groq only. Image turns use xKiro's multimodal model.
  const neon: Provider[] = hasImage
    ? [{
        name: 'xKiro-image',
        baseUrl: xkiroBase,
        apiKey: process.env.XKIRO_API_KEY_image ?? '',
        model: process.env.XKIRO_MODEL ?? 'qwen/qwen3.8-max:free',
      }]
    : getGroqProviders(mode);

  if (modelId === 'r1_xenon') return [...xenon, ...neon];
  return neon;
}

/**
 * Generate an image via xKiro (sensenova-u1.5-lite).
 * Returns the image URL or base64 data from the response.
 */
export async function generateImage(prompt: string): Promise<string> {
  const xkiroBase = process.env.XKIRO_BASE_URL ?? 'https://api.xkiro.com/v1';
  const keys = [process.env.XKIRO_API_KEY_image].filter(Boolean) as string[];

  let lastError: Error | null = null;

  for (const apiKey of keys) {
    try {
      const res = await fetch(completionUrl(xkiroBase), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.XKIRO_IMAGE_MODEL ?? 'sensenova/sensenova-u1.5-lite',
          messages: [{ role: 'user', content: prompt }],
          stream: false,
        }),
      });

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`xKiro image → HTTP ${res.status}`);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        lastError = new Error(`xKiro image → HTTP ${res.status}: ${body.slice(0, 120)}`);
        continue;
      }

      const json = await res.json();
      // Response may be image URL or base64 in content
      const content: string = json.choices?.[0]?.message?.content ?? '';
      if (!content) throw new Error('Empty image response');
      return content;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('Image generation failed');
}

function buildSystemPrompt(mode: ReasoningMode): string {
  const base =
    'You are Krittim, a premium AI assistant built by BNMPC ITC. Be concise, precise, and genuinely helpful.';
  if (mode === 'thinking')
    return `${base} Think step by step before answering. Show your reasoning clearly.`;
  if (mode === 'fast') return `${base} Answer quickly and directly. No preamble.`;
  return base;
}

/**
 * Streams tokens from the first available provider.
 * Calls onChunk for each token, onDone when complete.
 * Throws if every provider fails.
 */
export async function streamCompletion(
  modelId: ModelId,
  mode: ReasoningMode,
  messages: ChatMessage[],
  hasImage: boolean,
  onChunk: (chunk: string) => void,
  onDone: (provider: string, model: string) => void,
): Promise<void> {
  const providers = getProviders(modelId, mode, hasImage);
  const fullMessages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(mode) },
    ...messages,
  ];

  let lastError: Error | null = null;

  for (const provider of providers) {
    if (!provider.apiKey) continue; // skip unconfigured

    try {
      const res = await fetch(completionUrl(provider.baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,



        },
        body: JSON.stringify({
          model: provider.model,
          messages: fullMessages,
          stream: true,
          temperature: mode === 'fast' ? 0.3 : mode === 'thinking' ? 0.7 : 0.5,
          max_tokens: mode === 'thinking' ? 4096 : 2048,
        }),
      });

      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`${provider.name} → HTTP ${res.status}`);
        console.warn(`[ai] ${provider.name} rate-limited or down (${res.status}), trying next`);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        lastError = new Error(`${provider.name} → HTTP ${res.status}: ${body.slice(0, 120)}`);
        console.warn(`[ai] ${provider.name} error:`, lastError.message);
        continue;
      }

      if (!res.body) throw new Error(`${provider.name} returned no body`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const content: string | undefined = parsed.choices?.[0]?.delta?.content;
            if (content) onChunk(content);
          } catch {
            // malformed SSE chunk — skip
          }
        }
      }

      onDone(provider.name, provider.model);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[ai] ${provider.name} threw:`, lastError.message);
    }
  }

  throw lastError ?? new Error('All AI providers exhausted');
}
