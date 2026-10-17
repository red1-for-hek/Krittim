import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { connectDB } from './lib/db.js';
import authRouter from './routes/auth.js';
import chatsRouter from './routes/chats.js';
import aiRouter from './routes/ai.js';
import settingsRouter from './routes/settings.js';

const app = express();
const PORT = process.env.PORT ?? 4000;

// ── Security ──────────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:3000',
  credentials: true,
}));

// ── Global rate limit: 200 req / 15 min per IP ────────────────────────────────

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
}));

// ── AI stream: stricter limit — 30 req / 15 min per IP ───────────────────────

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'AI rate limit reached. Try again in a few minutes.' },
});

app.use(express.json({ limit: '1mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/ai', aiLimiter, aiRouter);
app.use('/api/settings', settingsRouter);

app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// ── 404 ───────────────────────────────────────────────────────────────────────

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Start ─────────────────────────────────────────────────────────────────────

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] Krittim API running on :${PORT}`));
  })
  .catch((err) => {
    console.error('[server] Failed to connect to MongoDB:', err);
    process.exit(1);
  });
