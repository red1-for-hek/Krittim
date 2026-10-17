/**
 * AI Proxy — model routing + provider fallback + SSE streaming.
 *
 * R1 Xenon:  xKiro key-1 → xKiro key-2 → apinex.bond → fallback to S1 Neon chain
 * S1 Neon:   Groq → Together AI → OpenRouter (free models)
 *
 * All providers speak OpenAI-compatible /chat/completions with stream=true.
 * On 429 / 5xx / network error → immediately try next provider.
 */

export type ModelId = 'r1_xenon' | 's1_neon';
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

function getProviders(modelId: ModelId): Provider[] {
  // R1 Xenon providers — xKiro with 2 keys for rotation, then apinex fallback
  const xenon: Provider[] = [
    {
      name: 'xKiro-1',
      baseUrl: process.env.XKIRO_BASE_URL ?? 'https://api.xkiro.com/v1',
      apiKey: process.env.XKIRO_API_KEY_1 ?? '',
      model: process.env.XKIRO_MODEL ?? 'muse-spark-1.3',
    },
    {
      name: 'xKiro-2',
      baseUrl: process.env.XKIRO_BASE_URL ?? 'https://api.xkiro.com/v1',
      apiKey: process.env.XKIRO_API_KEY_2 ?? '',
      model: process.env.XKIRO_MODEL ?? 'muse-spark-1.3',
    },
    {
      name: 'apinex',
      baseUrl: process.env.APINEX_BASE_URL ?? 'https://api.apinex.bond/v1',
      apiKey: process.env.APINEX_API_KEY ?? '',
      model: process.env.APINEX_MODEL ?? 'deepseek-v4.1-flash',
    },
  ];

  // S1 Neon providers — all free tier, no credit card needed
  const neon: Provider[] = [
    {
      // Groq: completely free, very high limits, ultra fast
      name: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY ?? '',
      model: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',
    },
    {
      // Together AI: $1 free credit, no card, fast
      name: 'together',
      baseUrl: 'https://api.together.xyz/v1',
      apiKey: process.env.TOGETHER_API_KEY ?? '',
      model: process.env.TOGETHER_MODEL ?? 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    },
    {
      // OpenRouter: free models available, no card for free tier
      name: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY ?? '',
      model: process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct:free',
    },
  ];

  // R1 Xenon: try xenon providers first, then fall through to neon as last resort
  if (modelId === 'r1_xenon') return [...xenon, ...neon];
  return neon;
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
  onChunk: (chunk: string) => void,
  onDone: (provider: string, model: string) => void,
): Promise<void> {
  const providers = getProviders(modelId);
  const fullMessages: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(mode) },
    ...messages,
  ];

  let lastError: Error | null = null;

  for (const provider of providers) {
    if (!provider.apiKey) continue; // skip unconfigured

    try {
      const res = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${provider.apiKey}`,
          // OpenRouter requires these headers
          'HTTP-Referer': process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
          'X-Title': 'Krittim AI',
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
