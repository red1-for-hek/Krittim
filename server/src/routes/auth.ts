import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { User } from '../models/User.js';
import { signAccess, signRefresh, verifyRefresh } from '../lib/jwt.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

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
  const { name, email, password } = parsed.data;

  if (await User.findOne({ email })) {
    res.status(409).json({ error: 'Email already registered' }); return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash, provider: 'email' });
  const tokens = issueTokens(user._id.toString(), user.email);
  await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });
  res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, plan: user.plan }, ...tokens });
});

// ── Email login ───────────────────────────────────────────────────────────────

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { email, password } = parsed.data;

  const user = await User.findOne({ email });
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid credentials' }); return;
  }

  const tokens = issueTokens(user._id.toString(), user.email);
  await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });
  res.json({ user: { id: user._id, name: user.name, email: user.email, plan: user.plan }, ...tokens });
});

// ── OAuth (Google / GitHub / Discord) ────────────────────────────────────────
// Client completes OAuth flow, sends us the profile data + provider token.
// We upsert the user and return our own JWT pair.

const oauthSchema = z.object({
  provider: z.enum(['google', 'github', 'discord']),
  providerId: z.string().min(1),
  name: z.string().min(1).max(80),
  email: z.string().email(),
  avatarUrl: z.string().url().optional(),
});

router.post('/oauth', async (req: Request, res: Response): Promise<void> => {
  const parsed = oauthSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { provider, providerId, name, email, avatarUrl } = parsed.data;

  let user = await User.findOne({ provider, providerId });
  if (!user) {
    user = await User.findOne({ email }) ?? await User.create({ name, email, avatarUrl, provider, providerId });
    if (user.provider !== provider) { user.provider = provider; user.providerId = providerId; await user.save(); }
  }
  if (avatarUrl && user.avatarUrl !== avatarUrl) { user.avatarUrl = avatarUrl; await user.save(); }

  const tokens = issueTokens(user._id.toString(), user.email);
  await User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });
  res.json({ user: { id: user._id, name: user.name, email: user.email, plan: user.plan, avatarUrl: user.avatarUrl }, ...tokens });
});

// ── Refresh ───────────────────────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) { res.status(400).json({ error: 'refreshToken required' }); return; }
  try {
    const payload = verifyRefresh(refreshToken);
    const user = await User.findById(payload.userId);
    if (!user || user.refreshToken !== refreshToken) { res.status(401).json({ error: 'Invalid refresh token' }); return; }
    const tokens = issueTokens(user._id.toString(), user.email);
    // Keep the refresh token stable so multiple tabs and simultaneous requests
    // cannot invalidate one another during an access-token renewal.
    res.json({ accessToken: tokens.accessToken, refreshToken });
  } catch { res.status(401).json({ error: 'Invalid or expired refresh token' }); }
});

// ── Me ────────────────────────────────────────────────────────────────────────

router.get('/me', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.userId).select('-passwordHash -refreshToken');
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }
  res.json({ user });
});

// ── Logout ────────────────────────────────────────────────────────────────────

router.post('/logout', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  await User.findByIdAndUpdate(req.userId, { $unset: { refreshToken: 1 } });
  res.json({ ok: true });
});

export default router;
