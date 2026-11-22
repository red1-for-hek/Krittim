import { Router, type Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { isDbConnected } from '../lib/db.js';
import { memoryStore } from '../lib/memoryStore.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router: Router = Router();
router.use(requireAuth);

const settingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).optional(),
  model: z.enum(['r1_xenon', 's1_neon']).optional(),
  reasoningMode: z.enum(['auto', 'fast', 'thinking']).optional(),
  enterToSend: z.boolean().optional(),
  streamResponses: z.boolean().optional(),
  aiMemory: z.boolean().optional(),
  responseStyle: z.enum(['concise', 'balanced', 'thorough']).optional(),
  customInstructions: z.string().max(4000).optional(),
});

router.patch('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  if (!isDbConnected()) {
    const user = req.userId ? memoryStore.users.get(req.userId) : undefined;
    if (user) {
      Object.assign(user.settings, parsed.data);
      user.updatedAt = new Date();
    }
    res.json({ settings: user?.settings });
    return;
  }

  const update = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [`settings.${k}`, v]),
  );
  const user = await User.findByIdAndUpdate(req.userId, { $set: update }, { new: true }).select('settings');
  res.json({ settings: user?.settings });
});

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isDbConnected()) {
    const user = req.userId ? memoryStore.users.get(req.userId) : undefined;
    res.json({ settings: user?.settings });
    return;
  }
  const user = await User.findById(req.userId).select('settings');
  res.json({ settings: user?.settings });
});

export default router;
