import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { Project } from '../models/Project.js';

const router = Router();

/* -------------------------------------------------------------
   DELETE /api/cleanup/me
   Wipe everything belonging to the authenticated user:
   messages → chats → projects → user account.
   Useful for a fresh start before a presentation.
------------------------------------------------------------- */

router.delete('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId!;

  try {
    // 1. Find all chats for this user
    const userChats = await Chat.find({ userId }).select('_id').lean();
    const chatIds = userChats.map((c) => c._id);

    // 2. Delete all messages in those chats
    await Message.deleteMany({ chatId: { $in: chatIds } });

    // 3. Delete all chats
    await Chat.deleteMany({ userId });

    // 4. Unassign projects (set projectId to null on chats already deleted)
    await Project.deleteMany({ createdBy: userId });

    // 5. Delete the user account
    await User.findByIdAndDelete(userId);

    res.json({ ok: true, message: 'All your data has been wiped.' });
  } catch (err) {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

/* -------------------------------------------------------------
   DELETE /api/cleanup/all
   WIPE EVERYTHING in the database (all users, chats, messages, projects).
   Protected by the CLEANUP_SECRET env var — set it in Vercel before using.
------------------------------------------------------------- */

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

  try {
    await Message.deleteMany({});
    await Chat.deleteMany({});
    await Project.deleteMany({});
    await User.deleteMany({});
    res.json({ ok: true, message: 'Database wiped clean.' });
  } catch (err) {
    res.status(500).json({ error: 'Full wipe failed.' });
  }
});

export default router;
