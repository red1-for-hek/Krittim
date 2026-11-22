import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { isDbConnected } from '../lib/db.js';
import { memoryStore } from '../lib/memoryStore.js';
import { User } from '../models/User.js';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { Project } from '../models/Project.js';

const router: Router = Router();

router.delete('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  if (!isDbConnected()) {
    for (const [slug, chat] of memoryStore.chats.entries()) {
      if (chat.userId === userId) {
        memoryStore.messages.delete(chat._id);
        memoryStore.chats.delete(slug);
      }
    }
    for (const [pid, proj] of memoryStore.projects.entries()) {
      if (proj.userId === userId) memoryStore.projects.delete(pid);
    }
    memoryStore.users.delete(userId);
    res.json({ ok: true, message: 'All your data has been wiped.' });
    return;
  }

  try {
    const userChats = await Chat.find({ userId }).select('_id').lean();
    const chatIds = userChats.map((c) => c._id);

    await Message.deleteMany({ chatId: { $in: chatIds } });
    await Chat.deleteMany({ userId });
    await Project.deleteMany({ createdBy: userId });
    await User.findByIdAndDelete(userId);

    res.json({ ok: true, message: 'All your data has been wiped.' });
  } catch {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

const wipeSchema = z.object({ secret: z.string().min(1) });

router.delete('/all', async (req: Request, res: Response): Promise<void> => {
  const secret = process.env.CLEANUP_SECRET;
  if (!secret) {
    res.status(503).json({ error: 'Cleanup is not configured on this server.' });
    return;
  }

  const parsed = wipeSchema.safeParse(req.body);
  if (!parsed.success || parsed.data.secret !== secret) {
    res.status(401).json({ error: 'Invalid cleanup secret.' });
    return;
  }

  if (!isDbConnected()) {
    memoryStore.messages.clear();
    memoryStore.chats.clear();
    memoryStore.projects.clear();
    memoryStore.users.clear();
    res.json({ ok: true, message: 'Database wiped clean.' });
    return;
  }

  try {
    await Message.deleteMany({});
    await Chat.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});
    res.json({ ok: true, message: 'Database wiped clean.' });
  } catch {
    res.status(500).json({ error: 'Full wipe failed.' });
  }
});

export default router;
