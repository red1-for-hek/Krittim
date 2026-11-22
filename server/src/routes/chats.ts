import { Router, type Response } from 'express';
import { z } from 'zod';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { isDbConnected } from '../lib/db.js';
import { memId, memoryStore } from '../lib/memoryStore.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { generateSlug } from '../lib/slug.js';

const router: Router = Router();
router.use(requireAuth);

// ── List chats ────────────────────────────────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isDbConnected()) {
    const chats = [...memoryStore.chats.values()]
      .filter((c) => c.userId === req.userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    res.json({ chats });
    return;
  }
  const chats = await Chat.find({ userId: req.userId }).sort({ updatedAt: -1 }).lean();
  res.json({ chats });
});

// ── Create chat ───────────────────────────────────────────────────────────────

const createSchema = z.object({
  modelId: z.enum(['r1_xenon', 's1_neon']).default('s1_neon'),
  reasoningMode: z.enum(['auto', 'fast', 'thinking']).default('auto'),
  projectId: z.string().optional(),
});

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  if (!isDbConnected()) {
    let slug = generateSlug();
    while (memoryStore.chats.has(slug)) slug = generateSlug();
    const now = new Date();
    const chat = {
      _id: memId(),
      slug,
      userId: req.userId!,
      title: 'New Chat',
      modelId: parsed.data.modelId,
      reasoningMode: parsed.data.reasoningMode,
      projectId: parsed.data.projectId,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    };
    memoryStore.chats.set(slug, chat);
    res.status(201).json({ chat });
    return;
  }

  let slug = generateSlug();
  while (await Chat.exists({ slug })) slug = generateSlug();

  const chat = await Chat.create({ ...parsed.data, slug, userId: req.userId });
  res.status(201).json({ chat });
});

// ── Get single chat by slug ───────────────────────────────────────────────────

router.get('/:slug', async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isDbConnected()) {
    const chat = memoryStore.chats.get(String(req.params.slug));
    if (!chat || chat.userId !== req.userId) { res.status(404).json({ error: 'Chat not found' }); return; }
    res.json({ chat });
    return;
  }
  const chat = await Chat.findOne({ slug: req.params.slug, userId: req.userId }).lean();
  if (!chat) { res.status(404).json({ error: 'Chat not found' }); return; }
  res.json({ chat });
});

// ── Rename chat ───────────────────────────────────────────────────────────────

router.patch('/:slug', async (req: AuthRequest, res: Response): Promise<void> => {
  const { title } = req.body as { title?: string };
  if (!title?.trim()) { res.status(400).json({ error: 'title required' }); return; }
  if (!isDbConnected()) {
    const chat = memoryStore.chats.get(String(req.params.slug));
    if (!chat || chat.userId !== req.userId) { res.status(404).json({ error: 'Chat not found' }); return; }
    chat.title = title.trim();
    chat.updatedAt = new Date();
    res.json({ chat });
    return;
  }
  const chat = await Chat.findOneAndUpdate(
    { slug: req.params.slug, userId: req.userId },
    { title: title.trim() },
    { new: true },
  );
  if (!chat) { res.status(404).json({ error: 'Chat not found' }); return; }
  res.json({ chat });
});

// ── Delete chat ───────────────────────────────────────────────────────────────

router.delete('/:slug', async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isDbConnected()) {
    const chat = memoryStore.chats.get(String(req.params.slug));
    if (!chat || chat.userId !== req.userId) { res.status(404).json({ error: 'Chat not found' }); return; }
    memoryStore.chats.delete(chat.slug);
    memoryStore.messages.delete(chat._id);
    res.json({ ok: true });
    return;
  }
  const chat = await Chat.findOneAndDelete({ slug: req.params.slug, userId: req.userId });
  if (!chat) { res.status(404).json({ error: 'Chat not found' }); return; }
  await Message.deleteMany({ chatId: chat._id });
  res.json({ ok: true });
});

// ── Messages ──────────────────────────────────────────────────────────────────

router.get('/:slug/messages', async (req: AuthRequest, res: Response): Promise<void> => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);

  if (!isDbConnected()) {
    const chat = memoryStore.chats.get(String(req.params.slug));
    if (!chat || chat.userId !== req.userId) { res.status(404).json({ error: 'Chat not found' }); return; }
    const all = memoryStore.messages.get(chat._id) ?? [];
    const messages = all.slice((page - 1) * limit, page * limit);
    res.json({ messages });
    return;
  }

  const chat = await Chat.findOne({ slug: req.params.slug, userId: req.userId });
  if (!chat) { res.status(404).json({ error: 'Chat not found' }); return; }

  const messages = await Message.find({ chatId: chat._id })
    .sort({ createdAt: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  res.json({ messages });
});

export default router;
