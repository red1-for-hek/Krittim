import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRouter from './routes/auth.js';
import oauthRouter from './routes/oauth.js';
import chatsRouter from './routes/chats.js';
import projectsRouter from './routes/projects.js';
import aiRouter from './routes/ai.js';
import settingsRouter from './routes/settings.js';
import cleanupRouter from './routes/cleanup.js';
import testmodelRouter from './routes/testmodel.js';

const app: Express = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://krittim-client.vercel.app',
  ...(process.env.CLIENT_ORIGIN ?? '').split(',').map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean),
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    const normalized = origin.replace(/\/$/, '');
    if (
      allowedOrigins.has(normalized) ||
      /^https?:\/\/localhost(:\d+)?$/.test(normalized) ||
      /^https:\/\/[^/]+\.(run\.app|e2b\.app|vercel\.app)$/.test(normalized)
    ) {
      callback(null, true);
      return;
    }
    callback(null, true);
  },
  credentials: true,
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
}));

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'AI rate limit reached. Try again in a few minutes.' },
});

app.use(express.json({ limit: '1mb' }));
app.use('/api/auth', authRouter);
app.use('/api/auth/oauth', oauthRouter);
app.use('/api/chats', chatsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/ai', aiLimiter, aiRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/cleanup', cleanupRouter);
app.use('/api/testmodel', testmodelRouter);
app.get('/', (_req, res) => res.json({ ok: true, service: 'krittim-server' }));
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

// Route-level Mongoose fallback error middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (
    err.name === 'MongooseError' ||
    err.name === 'MongoNetworkError' ||
    err.message?.includes('buffering timed out')
  ) {
    console.warn('[AI Studio] Database offline — returning mock empty response');
    if (req.method === 'GET') {
      return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
    }
    return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
  }
  next(err);
});

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

export default app;
