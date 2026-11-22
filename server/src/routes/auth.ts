import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Chat } from '../models/Chat.js';
import { Message } from '../models/Message.js';
import { Project } from '../models/Project.js';
import { isDbConnected } from '../lib/db.js';
import { defaultSettings, memId, memoryStore } from '../lib/memoryStore.js';
import { signAccess, signRefresh, verifyRefresh } from '../lib/jwt.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router: Router = Router();

function issueTokens(userId: string, email: string) {
  return {
    accessToken: signAccess({ userId, email }),
    refreshToken: signRefresh({ userId, email }),
  };
}

// ── Email signup ──────────────────────────────────────────────────────────────

const signupSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();

  if (!isDbConnected()) {
    const existing = [...memoryStore.users.values()].find((u) => u.email === email);
    if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }

    const id = memId();
    const passwordHash = await bcrypt.hash(password, 10);
    const tokens = issueTokens(id, email);
    const now = new Date();
    memoryStore.users.set(id, {
      _id: id,
      name,
      email,
      passwordHash,
      provider: 'email',
      plan: 'free',
      refreshToken: tokens.refreshToken,
      settings: defaultSettings(),
      createdAt: now,
      updatedAt: now,
    });
    res.status(201).json({ user: { id, name, email, plan: 'free', provider: 'email' }, ...tokens });
    return;
  }

  if (await User.findOne({ email })) {
    res.status(409).json({ error: 'Email already registered' }); return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, provider: 'email' });
  const tokens = issueTokens(user._id.toString(), user.email);
  await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });
  res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, plan: user.plan, provider: user.provider }, ...tokens });
});

// ── Email login ───────────────────────────────────────────────────────────────

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const email = parsed.data.email.toLowerCase().trim();
  const { password } = parsed.data;

  if (!isDbConnected()) {
    const user = [...memoryStore.users.values()].find((u) => u.email === email);
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid credentials' }); return;
    }
    const tokens = issueTokens(user._id, user.email);
    user.refreshToken = tokens.refreshToken;
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        provider: user.provider,
        dateOfBirth: user.dateOfBirth,
      },
      ...tokens,
    });
    return;
  }

  const user = await User.findOne({ email });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid credentials' }); return;
  }

  const tokens = issueTokens(user._id.toString(), user.email);
  await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });
  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      provider: user.provider,
      dateOfBirth: user.dateOfBirth,
    },
    ...tokens,
  });
});

// ── Refresh ───────────────────────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) { res.status(400).json({ error: 'refreshToken required' }); return; }
  try {
    const payload = verifyRefresh(refreshToken);
    if (!isDbConnected()) {
      const user = memoryStore.users.get(payload.userId);
      if (!user || user.refreshToken !== refreshToken) { res.status(401).json({ error: 'Invalid refresh token' }); return; }
      const tokens = issueTokens(user._id, user.email);
      res.json({ accessToken: tokens.accessToken, refreshToken });
      return;
    }

    const user = await User.findById(payload.userId);
    if (!user || user.refreshToken !== refreshToken) { res.status(401).json({ error: 'Invalid refresh token' }); return; }
    const tokens = issueTokens(user._id.toString(), user.email);
    res.json({ accessToken: tokens.accessToken, refreshToken });
  } catch { res.status(401).json({ error: 'Invalid or expired refresh token' }); }
});

// ── Me ────────────────────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isDbConnected()) {
    const user = req.userId ? memoryStore.users.get(req.userId) : undefined;
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const { passwordHash: _p, refreshToken: _r, ...safe } = user;
    void _p;
    void _r;
    res.json({ user: safe });
    return;
  }

  const user = await User.findById(req.userId).select('-passwordHash -refreshToken');
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({ user });
});

// ── Update Profile ────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  dateOfBirth: z.string().trim().max(32).optional(),
});

router.patch('/profile', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { name, dateOfBirth } = parsed.data;

  if (!isDbConnected()) {
    const user = req.userId ? memoryStore.users.get(req.userId) : undefined;
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    user.name = name;
    user.dateOfBirth = dateOfBirth || undefined;
    user.updatedAt = new Date();
    const { passwordHash: _p, refreshToken: _r, ...safe } = user;
    void _p;
    void _r;
    res.json({ user: safe });
    return;
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { name, ...(dateOfBirth !== undefined ? { dateOfBirth } : {}) },
    { new: true },
  ).select('-passwordHash -refreshToken');
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({ user });
});

// ── Delete Account ────────────────────────────────────────────────────────────

router.delete('/delete-account', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

  if (!isDbConnected()) {
    memoryStore.users.delete(req.userId);
    for (const [slug, chat] of memoryStore.chats.entries()) {
      if (chat.userId === req.userId) {
        memoryStore.messages.delete(chat._id);
        memoryStore.chats.delete(slug);
      }
    }
    for (const [pid, proj] of memoryStore.projects.entries()) {
      if (proj.userId === req.userId) memoryStore.projects.delete(pid);
    }
    res.json({ ok: true });
    return;
  }

  const chats = await Chat.find({ userId: req.userId }).select('_id');
  const chatIds = chats.map((c) => c._id);
  await Promise.all([
    Message.deleteMany({ chatId: { $in: chatIds } }),
    Chat.deleteMany({ userId: req.userId }),
    Project.deleteMany({ userId: req.userId }),
    User.findByIdAndDelete(req.userId),
  ]);
  res.json({ ok: true });
});

// ── Logout ────────────────────────────────────────────────────────────────────

router.post('/logout', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isDbConnected()) {
    const user = req.userId ? memoryStore.users.get(req.userId) : undefined;
    if (user) delete user.refreshToken;
    res.json({ ok: true });
    return;
  }
  await User.findByIdAndUpdate(req.userId, { $unset: { refreshToken: 1 } });
  res.json({ ok: true });
});

export default router;
