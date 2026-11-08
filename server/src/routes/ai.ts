import { Router, type Response } from 'express';
import { z } from 'zod';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  streamCompletion,
  generateImage,
  type ModelId,
  type ReasoningMode,
  type ResponseStyle,
  type ChatMessage,
} from '../ai/proxy.js';
import { research, needsSearch } from '../ai/search.js';

const router = Router();
router.use(requireAuth);

/* ------------------------------ limits ---------------------------------- */

const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 MB per file
const MAX_ATTACHMENTS_PER_DAY = 5; // free-tier abuse guard
const MAX_FILES_PER_MESSAGE = 5;

const streamSchema = z.object({
  slug: z.string().min(1),
  modelId: z.enum(['r1_xenon', 's1_neon', 'image_gen']).default('s1_neon'),
  reasoningMode: z.enum(['auto', 'fast', 'thinking']).default('auto'),
  message: z.string().min(1).max(32_000),
  hasImage: z.boolean().default(false),
  webSearch: z.boolean().default(false),
  mode: z.enum(['chat', 'image']).default('chat'),
  /** When true, the user turn already exists (regenerate/edit) — don't re-store it. */
  regenerate: z.boolean().default(false),
  customInstructions: z.string().max(4000).optional(),
  responseStyle: z.enum(['concise', 'balanced', 'thorough']).optional(),
  attachments: z
    .array(z.object({ name: z.string().min(1).max(255), size: z.number().nonnegative(), type: z.string().max(120) }))
    .max(MAX_FILES_PER_MESSAGE)
    .optional(),
});

/** SSE event writer (newline-delimited JSON, `data:` framed). */
function send(res: Response, event: unknown): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * POST /api/ai/stream
 *
 * SSE events:
 *   {"type":"status","stage":"searching|reading|synthesizing|thinking","detail"?:string}
 *   {"type":"sources","sources":[{index,title,url,snippet}]}
 *   {"type":"chunk","content":"…"}
 *   {"type":"image","url":"…"}
 *   {"type":"done","provider":"…","modelId":"…"}
 *   {"type":"error","message":"…"}
 *   data: [DONE]
 */
router.post('/stream', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = streamSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { slug, modelId, reasoningMode, message, hasImage, webSearch, mode, regenerate, customInstructions, responseStyle, attachments } = parsed.data;

  // ---- upload limits (server-enforced) ----
  if (attachments && attachments.length > 0) {
    const tooBig = attachments.find((a) => a.size > MAX_ATTACHMENT_BYTES);
    if (tooBig) {
      res.status(413).json({ error: `“${tooBig.name}” exceeds the 8 MB per-file limit.` });
      return;
    }
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const userChats = await Chat.find({ userId: req.userId }).select('_id').lean();
    const uploadsToday = await Message.countDocuments({
      role: 'user',
      chatId: { $in: userChats.map((c) => c._id) },
      createdAt: { $gte: startOfDay },
      'attachments.0': { $exists: true },
    });
    if (uploadsToday >= MAX_ATTACHMENTS_PER_DAY) {
      res.status(429).json({ error: `Daily upload limit reached (${MAX_ATTACHMENTS_PER_DAY}/day on the free plan).` });
      return;
    }
  }

  let chat = await Chat.findOne({ slug, userId: req.userId });
  if (!chat) {
    const existingChat = await Chat.findOne({ slug }).select({ userId: 1 }).lean();
    if (existingChat) { res.status(404).json({ error: 'Chat not found' }); return; }
    chat = await Chat.create({ slug, userId: req.userId, title: 'New Chat', modelId, reasoningMode });
  }

  if (!regenerate) {
    await Message.create({
      chatId: chat._id,
      role: 'user',
      content: message,
      attachments: attachments ?? [],
    });
  }

  if (chat.title === 'New Chat') {
    const title = message.length > 50 ? `${message.slice(0, 50).trimEnd()}…` : message;
    await Chat.findByIdAndUpdate(chat._id, { title, modelId, reasoningMode });
  } else {
    await Chat.findByIdAndUpdate(chat._id, { modelId, reasoningMode, updatedAt: new Date() });
  }

  // Last 20 messages for context
  const history = await Message.find({ chatId: chat._id }).sort({ createdAt: -1 }).limit(20).lean();
  const contextMessages: ChatMessage[] = history.reverse().map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const streamOpts = { customInstructions, responseStyle: responseStyle as ResponseStyle | undefined };

  /* ----------------------------- image mode ----------------------------- */
  if (mode === 'image') {
    send(res, { type: 'status', stage: 'generating', detail: 'Sketching your image' });
    try {
      const imageUrl = await generateImage(message);
      send(res, { type: 'image', url: imageUrl });
      send(res, { type: 'done', provider: 'xkiro-image', modelId: 'image_gen' });
      res.write('data: [DONE]\n\n');
      await Message.create({
        chatId: chat._id,
        role: 'assistant',
        content: `![generated image](${imageUrl})`,
        modelId: 'image_gen',
      });
    } catch (err) {
      send(res, { type: 'error', message: err instanceof Error ? err.message : 'Image generation failed' });
      res.write('data: [DONE]\n\n');
    } finally {
      res.end();
    }
    return;
  }

  /* ------------------------- research (auto/toggle) --------------------- */
  let sources: { index: number; title: string; url: string; snippet: string }[] = [];
  const shouldSearch = webSearch || needsSearch(message);

  if (shouldSearch) {
    send(res, { type: 'status', stage: 'searching', detail: 'Searching the web' });
    try {
      const { sources: found, context } = await research(message);
      sources = found;
      if (sources.length) {
        send(res, { type: 'sources', sources });
        send(res, { type: 'status', stage: 'reading', detail: `Reading ${sources.length} source${sources.length === 1 ? '' : 's'}` });
      }
      if (context) {
        contextMessages.push({
          role: 'system',
          content:
            `You have live web results for the user's question. Use them to answer accurately and cite sources inline as [1], [2], … matching the numbers below. If the results don't cover it, say so and answer from knowledge, clearly marking uncertainty.\n\nWEB RESULTS:\n${context}`,
        });
      } else {
        send(res, { type: 'status', stage: 'reading', detail: 'No strong sources found — answering from knowledge' });
      }
    } catch {
      send(res, { type: 'status', stage: 'reading', detail: 'Search unavailable — answering from knowledge' });
    }
  }

  /* ----------------------------- stream answer -------------------------- */
  send(res, { type: 'status', stage: 'thinking', detail: shouldSearch ? 'Synthesizing an answer' : 'Thinking' });

  let fullContent = '';
  try {
    await streamCompletion(
      modelId as ModelId,
      reasoningMode as ReasoningMode,
      contextMessages,
      hasImage,
      (chunk) => {
        fullContent += chunk;
        send(res, { type: 'chunk', content: chunk });
      },
      (provider, providerModel) => {
        send(res, { type: 'done', provider, modelId: providerModel });
        res.write('data: [DONE]\n\n');
      },
      streamOpts,
    );
    await Message.create({
      chatId: chat._id,
      role: 'assistant',
      content: fullContent,
      modelId,
      reasoningMode,
      sources: sources.length ? sources : undefined,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'All providers failed';
    send(res, { type: 'error', message: msg });
    res.write('data: [DONE]\n\n');
  } finally {
    res.end();
  }
});

/**
 * POST /api/ai/image
 * Body: { slug, prompt }  →  { imageContent }
 */
router.post('/image', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = z.object({ slug: z.string().min(1), prompt: z.string().min(1).max(2000) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { slug, prompt } = parsed.data;

  const chat = await Chat.findOne({ slug, userId: req.userId });
  if (!chat) { res.status(404).json({ error: 'Chat not found' }); return; }

  await Message.create({ chatId: chat._id, role: 'user', content: prompt });

  try {
    const imageContent = await generateImage(prompt);
    await Message.create({ chatId: chat._id, role: 'assistant', content: `![generated image](${imageContent})`, modelId: 'image_gen' });
    res.json({ imageContent });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : 'Image generation failed' });
  }
});

export default router;
