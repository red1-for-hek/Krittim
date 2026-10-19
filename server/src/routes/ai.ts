import { Router, type Response } from 'express';
import { z } from 'zod';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { streamCompletion, generateImage, type ModelId, type ReasoningMode, type ChatMessage } from '../ai/proxy.js';

const router = Router();
router.use(requireAuth);

const streamSchema = z.object({
  slug: z.string().min(1),
  modelId: z.enum(['r1_xenon', 's1_neon', 'image_gen']).default('s1_neon'),
  reasoningMode: z.enum(['auto', 'fast', 'thinking']).default('auto'),
  message: z.string().min(1).max(32_000),
  hasImage: z.boolean().default(false),
  webSearch: z.boolean().default(false),
});

/**
 * POST /api/ai/stream
 * Body: { slug, modelId, reasoningMode, message }
 *
 * SSE events:
 *   data: {"type":"chunk","content":"..."}
 *   data: {"type":"done","provider":"groq","modelId":"llama-3.3-70b"}
 *   data: [DONE]
 *   data: {"type":"error","message":"..."}
 */
router.post('/stream', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = streamSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { slug, modelId, reasoningMode, message, hasImage, webSearch } = parsed.data;

  let chat = await Chat.findOne({ slug, userId: req.userId });
  if (!chat) {
    const existingChat = await Chat.findOne({ slug }).select({ userId: 1 }).lean();
    if (existingChat) {
      res.status(404).json({ error: 'Chat not found' });
      return;
    }
    chat = await Chat.create({
      slug,
      userId: req.userId,
      title: 'New Chat',
      modelId,
      reasoningMode,
    });
  }

  await Message.create({ chatId: chat._id, role: 'user', content: message });

  // Auto-title on first real message
  if (chat.title === 'New Chat') {
    const title = message.length > 50 ? `${message.slice(0, 50).trimEnd()}…` : message;
    await Chat.findByIdAndUpdate(chat._id, { title, modelId, reasoningMode });
  } else {
    await Chat.findByIdAndUpdate(chat._id, { modelId, reasoningMode, updatedAt: new Date() });
  }

  // Last 20 messages for context
  const history = await Message.find({ chatId: chat._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  const contextMessages: ChatMessage[] = history
    .reverse()
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let fullContent = '';

  try {
    if (webSearch) {
      res.write(`data: ${JSON.stringify({ type: 'status', content: 'searching' })}\n\n`);
      const query = message.replace(/^search the web for\s*/i, '').trim();
      const searchResponse = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'Krittim/1.0' },
      });
      const html = await searchResponse.text();
      const sources = [...html.matchAll(/result__a[^>]+href="([^"]+)"[^>]*>([^<]+)/g)]
        .slice(0, 5)
        .map((match) => ({ url: match[1], title: match[2].replace(/&amp;/g, '&') }));
      if (sources.length) res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);
      contextMessages.push({
        role: 'system',
        content: `Web sources for this request:\n${sources.map((source) => `${source.title}: ${source.url}`).join('\n')}`,
      });
    }
    res.write(`data: ${JSON.stringify({ type: 'status', content: 'thinking' })}\n\n`);
    await streamCompletion(
      modelId as ModelId,
      reasoningMode as ReasoningMode,
      contextMessages,
      hasImage,
      (chunk) => {
        fullContent += chunk;
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      },
      (provider, providerModel) => {
        res.write(`data: ${JSON.stringify({ type: 'done', provider, modelId: providerModel })}\n\n`);
        res.write('data: [DONE]\n\n');
      },
    );

    await Message.create({ chatId: chat._id, role: 'assistant', content: fullContent, modelId, reasoningMode });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'All providers failed';
    res.write(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`);
    res.write('data: [DONE]\n\n');
  } finally {
    res.end();
  }
});

/**
 * POST /api/ai/image
 * Body: { slug, prompt }
 * Returns: { imageContent: string }
 */
router.post('/image', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = z.object({
    slug: z.string().min(1),
    prompt: z.string().min(1).max(2000),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { slug, prompt } = parsed.data;

  const chat = await Chat.findOne({ slug, userId: req.userId });
  if (!chat) { res.status(404).json({ error: 'Chat not found' }); return; }

  await Message.create({ chatId: chat._id, role: 'user', content: prompt });

  try {
    const imageContent = await generateImage(prompt);
    await Message.create({ chatId: chat._id, role: 'assistant', content: imageContent, modelId: 'image_gen' });
    res.json({ imageContent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Image generation failed';
    res.status(502).json({ error: msg });
  }
});

export default router;
