"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const auth_js_1 = __importDefault(require("./routes/auth.js"));
const oauth_js_1 = __importDefault(require("./routes/oauth.js"));
const chats_js_1 = __importDefault(require("./routes/chats.js"));
const projects_js_1 = __importDefault(require("./routes/projects.js"));
const ai_js_1 = __importDefault(require("./routes/ai.js"));
const settings_js_1 = __importDefault(require("./routes/settings.js"));
const cleanup_js_1 = __importDefault(require("./routes/cleanup.js"));
const testmodel_js_1 = __importDefault(require("./routes/testmodel.js"));
const app = (0, express_1.default)();
app.set('trust proxy', 1);
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
const allowedOrigins = new Set([
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://krittim-client.vercel.app',
    ...(process.env.CLIENT_ORIGIN ?? '').split(',').map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean),
]);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }
        const normalized = origin.replace(/\/$/, '');
        if (allowedOrigins.has(normalized) ||
            /^https?:\/\/localhost(:\d+)?$/.test(normalized) ||
            /^https:\/\/[^/]+\.(run\.app|e2b\.app|vercel\.app)$/.test(normalized)) {
            callback(null, true);
            return;
        }
        callback(null, true);
    },
    credentials: true,
}));
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, slow down.' },
}));
const aiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'AI rate limit reached. Try again in a few minutes.' },
});
app.use(express_1.default.json({ limit: '1mb' }));
app.use('/api/auth', auth_js_1.default);
app.use('/api/auth/oauth', oauth_js_1.default);
app.use('/api/chats', chats_js_1.default);
app.use('/api/projects', projects_js_1.default);
app.use('/api/ai', aiLimiter, ai_js_1.default);
app.use('/api/settings', settings_js_1.default);
app.use('/api/cleanup', cleanup_js_1.default);
app.use('/api/testmodel', testmodel_js_1.default);
app.get('/', (_req, res) => res.json({ ok: true, service: 'krittim-server' }));
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
// Route-level Mongoose fallback error middleware
app.use((err, req, res, next) => {
    if (err.name === 'MongooseError' ||
        err.name === 'MongoNetworkError' ||
        err.message?.includes('buffering timed out')) {
        console.warn('[AI Studio] Database offline — returning mock empty response');
        if (req.method === 'GET') {
            return res.json(req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {});
        }
        return res.status(503).json({ error: 'Service temporarily unavailable (database offline)' });
    }
    next(err);
});
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
exports.default = app;
