import { Router, type Request, type Response } from 'express';
import { z } from 'zod';

const router: Router = Router();

export type TestProviderId =
  | 'xkiro_1'
  | 'xkiro_2'
  | 'xkiro_image_chat'
  | 'xkiro_image_gen'
  | 'groq_1'
  | 'groq_2'
  | 'groq_3'
  | 'groq_4'
  | 'groq_5'
  | 'apinex';

interface ProviderSpec {
  id: TestProviderId;
  label: string;
  group: 'xKiro' | 'Groq' | 'Apinex';
  envVar: string;
  endpointType: 'chat' | 'image';
  getBaseUrl: () => string;
  getDefaultModel: () => string;
  getApiKey: () => string;
}

const PROVIDERS: ProviderSpec[] = [
  {
    id: 'xkiro_1',
    label: 'xKiro Key 1 (R1 Xenon)',
    group: 'xKiro',
    envVar: 'XKIRO_API_KEY_1',
    endpointType: 'chat',
    getBaseUrl: () => (process.env.XKIRO_BASE_URL ?? 'https://api.xkiro.com/v1').replace(/\/$/, ''),
    getDefaultModel: () => process.env.XKIRO_MODEL?.trim() || 'qwen/qwen3.8-max:free',
    getApiKey: () => process.env.XKIRO_API_KEY_1?.trim() ?? '',
  },
  {
    id: 'xkiro_2',
    label: 'xKiro Key 2 (R1 Xenon)',
    group: 'xKiro',
    envVar: 'XKIRO_API_KEY_2',
    endpointType: 'chat',
    getBaseUrl: () => (process.env.XKIRO_BASE_URL ?? 'https://api.xkiro.com/v1').replace(/\/$/, ''),
    getDefaultModel: () => process.env.XKIRO_MODEL?.trim() || 'qwen/qwen3.8-max:free',
    getApiKey: () => process.env.XKIRO_API_KEY_2?.trim() ?? '',
  },
  {
    id: 'xkiro_image_chat',
    label: 'xKiro Image Key (Multimodal Chat)',
    group: 'xKiro',
    envVar: 'XKIRO_API_KEY_image',
    endpointType: 'chat',
    getBaseUrl: () => (process.env.XKIRO_BASE_URL ?? 'https://api.xkiro.com/v1').replace(/\/$/, ''),
    getDefaultModel: () => process.env.XKIRO_MODEL?.trim() || 'qwen/qwen3.8-max:free',
    getApiKey: () => process.env.XKIRO_API_KEY_image?.trim() ?? '',
  },
  {
    id: 'xkiro_image_gen',
    label: 'xKiro Image Gen (/images/generations)',
    group: 'xKiro',
    envVar: 'XKIRO_API_KEY_image',
    endpointType: 'image',
    getBaseUrl: () => (process.env.XKIRO_BASE_URL ?? 'https://api.xkiro.com/v1').replace(/\/$/, ''),
    getDefaultModel: () => process.env.XKIRO_IMAGE_MODEL?.trim() || 'sensenova/sensenova-u1.5-lite',
    getApiKey: () => process.env.XKIRO_API_KEY_image?.trim() ?? '',
  },
  {
    id: 'groq_1',
    label: 'Groq Key 1 (S1 Neon)',
    group: 'Groq',
    envVar: 'GROQ_API_KEY_1',
    endpointType: 'chat',
    getBaseUrl: () => 'https://api.groq.com/openai/v1',
    getDefaultModel: () => {
      const m = process.env.GROQ_MODEL?.trim();
      return m && m !== '...' ? m : 'openai/gpt-oss-20b';
    },
    getApiKey: () => process.env.GROQ_API_KEY_1?.trim() ?? '',
  },
  {
    id: 'groq_2',
    label: 'Groq Key 2 (S1 Neon)',
    group: 'Groq',
    envVar: 'GROQ_API_KEY_2',
    endpointType: 'chat',
    getBaseUrl: () => 'https://api.groq.com/openai/v1',
    getDefaultModel: () => {
      const m = process.env.GROQ_MODEL?.trim();
      return m && m !== '...' ? m : 'openai/gpt-oss-20b';
    },
    getApiKey: () => process.env.GROQ_API_KEY_2?.trim() ?? '',
  },
  {
    id: 'groq_3',
    label: 'Groq Key 3 (S1 Neon)',
    group: 'Groq',
    envVar: 'GROQ_API_KEY_3',
    endpointType: 'chat',
    getBaseUrl: () => 'https://api.groq.com/openai/v1',
    getDefaultModel: () => {
      const m = process.env.GROQ_MODEL?.trim();
      return m && m !== '...' ? m : 'openai/gpt-oss-20b';
    },
    getApiKey: () => process.env.GROQ_API_KEY_3?.trim() ?? '',
  },
  {
    id: 'groq_4',
    label: 'Groq Key 4 (S1 Neon)',
    group: 'Groq',
    envVar: 'GROQ_API_KEY_4',
    endpointType: 'chat',
    getBaseUrl: () => 'https://api.groq.com/openai/v1',
    getDefaultModel: () => {
      const m = process.env.GROQ_MODEL?.trim();
      return m && m !== '...' ? m : 'openai/gpt-oss-20b';
    },
    getApiKey: () => process.env.GROQ_API_KEY_4?.trim() ?? '',
  },
  {
    id: 'groq_5',
    label: 'Groq Key 5 (S1 Neon)',
    group: 'Groq',
    envVar: 'GROQ_API_KEY_5',
    endpointType: 'chat',
    getBaseUrl: () => 'https://api.groq.com/openai/v1',
    getDefaultModel: () => {
      const m = process.env.GROQ_MODEL?.trim();
      return m && m !== '...' ? m : 'openai/gpt-oss-20b';
    },
    getApiKey: () => process.env.GROQ_API_KEY_5?.trim() ?? '',
  },
  {
    id: 'apinex',
    label: 'Apinex (Fallback Provider)',
    group: 'Apinex',
    envVar: 'APINEX_API_KEY',
    endpointType: 'chat',
    getBaseUrl: () => (process.env.APINEX_BASE_URL ?? 'https://api.apinex.bond/v1').replace(/\/$/, ''),
    getDefaultModel: () => process.env.APINEX_MODEL?.trim() || 'deepseek-v4.1-flash',
    getApiKey: () => process.env.APINEX_API_KEY?.trim() ?? '',
  },
];

// Never expose raw secrets to the client — only metadata + configured status.
router.get('/providers', (_req: Request, res: Response): void => {
  const providers = PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    group: p.group,
    envVar: p.envVar,
    endpointType: p.endpointType,
    baseUrl: p.getBaseUrl(),
    defaultModel: p.getDefaultModel(),
    configured: p.getApiKey().length > 0,
  }));
  res.json({ providers });
});

const runSchema = z.object({
  providerId: z.enum([
    'xkiro_1',
    'xkiro_2',
    'xkiro_image_chat',
    'xkiro_image_gen',
    'groq_1',
    'groq_2',
    'groq_3',
    'groq_4',
    'groq_5',
    'apinex',
  ]),
  prompt: z.string().trim().max(500).optional(),
  modelOverride: z.string().trim().max(120).optional(),
});

// Run a single provider directly with STRICTLY ZERO fallback.
router.post('/run', async (req: Request, res: Response): Promise<void> => {
  const parsed = runSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const spec = PROVIDERS.find((p) => p.id === parsed.data.providerId);
  if (!spec) {
    res.status(404).json({ error: 'Unknown providerId' });
    return;
  }

  const apiKey = spec.getApiKey();
  const model = parsed.data.modelOverride?.trim() || spec.getDefaultModel();
  const baseUrl = spec.getBaseUrl();

  if (!apiKey) {
    res.json({
      ok: false,
      providerId: spec.id,
      endpointType: spec.endpointType,
      modelUsed: model,
      httpStatus: null,
      latencyMs: 0,
      error: `API key not configured in environment (${spec.envVar})`,
    });
    return;
  }

  const startedAt = Date.now();

  try {
    if (spec.endpointType === 'image') {
      const imagePrompt = parsed.data.prompt || 'A minimal emerald glass hexagon floating in soft studio light';
      const targetUrl = `${baseUrl}/images/generations`;
      const upstream = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
          model,
          prompt: imagePrompt,
          n: 1,
          size: '1024x1024',
        }),
      });

      const latencyMs = Date.now() - startedAt;
      const rawText = await upstream.text().catch(() => '');

      if (!upstream.ok) {
        res.json({
          ok: false,
          providerId: spec.id,
          endpointType: 'image',
          modelUsed: model,
          httpStatus: upstream.status,
          latencyMs,
          error: `HTTP ${upstream.status} from ${targetUrl}`,
          rawPreview: rawText.slice(0, 600),
        });
        return;
      }

      let imageUrl: string | undefined;
      try {
        const json = JSON.parse(rawText) as {
          data?: Array<{ url?: string; b64_json?: string }>;
          url?: string;
          choices?: Array<{ message?: { content?: string } }>;
        };
        const b64 = json.data?.[0]?.b64_json;
        imageUrl =
          json.data?.[0]?.url ??
          (b64 ? (b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`) : undefined) ??
          json.url ??
          json.choices?.[0]?.message?.content;
      } catch {
        // leave undefined
      }

      if (!imageUrl) {
        res.json({
          ok: false,
          providerId: spec.id,
          endpointType: 'image',
          modelUsed: model,
          httpStatus: upstream.status,
          latencyMs,
          error: 'Upstream returned 200 OK but no image URL/payload was found.',
          rawPreview: rawText.slice(0, 600),
        });
        return;
      }

      res.json({
        ok: true,
        providerId: spec.id,
        endpointType: 'image',
        modelUsed: model,
        httpStatus: upstream.status,
        latencyMs,
        imageUrl,
        rawPreview: rawText.slice(0, 400),
      });
      return;
    }

    const chatPrompt = parsed.data.prompt || 'Reply with exactly: OK and identify your model in one short sentence.';
    const targetUrl = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: chatPrompt }],
        stream: false,
        max_tokens: 180,
        temperature: 0.2,
      }),
    });

    const latencyMs = Date.now() - startedAt;
    const rawText = await upstream.text().catch(() => '');

    if (!upstream.ok) {
      res.json({
        ok: false,
        providerId: spec.id,
        endpointType: 'chat',
        modelUsed: model,
        httpStatus: upstream.status,
        latencyMs,
        error: `HTTP ${upstream.status} from ${targetUrl}`,
        rawPreview: rawText.slice(0, 600),
      });
      return;
    }

    let output = '';
    try {
      const json = JSON.parse(rawText) as {
        choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
      };
      output =
        json.choices?.[0]?.message?.content?.trim() ||
        json.choices?.[0]?.message?.reasoning_content?.trim() ||
        '';
    } catch {
      output = '';
    }

    if (!output) {
      res.json({
        ok: false,
        providerId: spec.id,
        endpointType: 'chat',
        modelUsed: model,
        httpStatus: upstream.status,
        latencyMs,
        error: 'Upstream returned 200 OK but response content was empty.',
        rawPreview: rawText.slice(0, 600),
      });
      return;
    }

    res.json({
      ok: true,
      providerId: spec.id,
      endpointType: 'chat',
      modelUsed: model,
      httpStatus: upstream.status,
      latencyMs,
      output,
      rawPreview: rawText.slice(0, 400),
    });
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : String(err);
    res.json({
      ok: false,
      providerId: spec.id,
      endpointType: spec.endpointType,
      modelUsed: model,
      httpStatus: null,
      latencyMs,
      error: message,
    });
  }
});

export default router;
