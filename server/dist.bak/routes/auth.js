"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const zod_1 = require("zod");
const User_js_1 = require("../models/User.js");
const Chat_js_1 = require("../models/Chat.js");
const Message_js_1 = require("../models/Message.js");
const Project_js_1 = require("../models/Project.js");
const db_js_1 = require("../lib/db.js");
const memoryStore_js_1 = require("../lib/memoryStore.js");
const jwt_js_1 = require("../lib/jwt.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
function issueTokens(userId, email) {
    return {
        accessToken: (0, jwt_js_1.signAccess)({ userId, email }),
        refreshToken: (0, jwt_js_1.signRefresh)({ userId, email }),
    };
}
// ── Email signup ──────────────────────────────────────────────────────────────
const signupSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(80),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(128),
});
router.post('/signup', async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { name, password } = parsed.data;
    const email = parsed.data.email.toLowerCase().trim();
    if (!(0, db_js_1.isDbConnected)()) {
        const existing = [...memoryStore_js_1.memoryStore.users.values()].find((u) => u.email === email);
        if (existing) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }
        const id = (0, memoryStore_js_1.memId)();
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const tokens = issueTokens(id, email);
        const now = new Date();
        memoryStore_js_1.memoryStore.users.set(id, {
            _id: id,
            name,
            email,
            passwordHash,
            provider: 'email',
            plan: 'free',
            refreshToken: tokens.refreshToken,
            settings: (0, memoryStore_js_1.defaultSettings)(),
            createdAt: now,
            updatedAt: now,
        });
        res.status(201).json({ user: { id, name, email, plan: 'free', provider: 'email' }, ...tokens });
        return;
    }
    if (await User_js_1.User.findOne({ email })) {
        res.status(409).json({ error: 'Email already registered' });
        return;
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 12);
    const user = await User_js_1.User.create({ name, email, passwordHash, provider: 'email' });
    const tokens = issueTokens(user._id.toString(), user.email);
    await User_js_1.User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });
    res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, plan: user.plan, provider: user.provider }, ...tokens });
});
// ── Email login ───────────────────────────────────────────────────────────────
const loginSchema = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(1) });
router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const email = parsed.data.email.toLowerCase().trim();
    const { password } = parsed.data;
    if (!(0, db_js_1.isDbConnected)()) {
        const user = [...memoryStore_js_1.memoryStore.users.values()].find((u) => u.email === email);
        if (!user?.passwordHash || !(await bcryptjs_1.default.compare(password, user.passwordHash))) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
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
    const user = await User_js_1.User.findOne({ email });
    if (!user?.passwordHash || !(await bcryptjs_1.default.compare(password, user.passwordHash))) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }
    const tokens = issueTokens(user._id.toString(), user.email);
    await User_js_1.User.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });
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
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        res.status(400).json({ error: 'refreshToken required' });
        return;
    }
    try {
        const payload = (0, jwt_js_1.verifyRefresh)(refreshToken);
        if (!(0, db_js_1.isDbConnected)()) {
            const user = memoryStore_js_1.memoryStore.users.get(payload.userId);
            if (!user || user.refreshToken !== refreshToken) {
                res.status(401).json({ error: 'Invalid refresh token' });
                return;
            }
            const tokens = issueTokens(user._id, user.email);
            res.json({ accessToken: tokens.accessToken, refreshToken });
            return;
        }
        const user = await User_js_1.User.findById(payload.userId);
        if (!user || user.refreshToken !== refreshToken) {
            res.status(401).json({ error: 'Invalid refresh token' });
            return;
        }
        const tokens = issueTokens(user._id.toString(), user.email);
        res.json({ accessToken: tokens.accessToken, refreshToken });
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
});
// ── Me ────────────────────────────────────────────────────────────────────────
router.get('/me', auth_js_1.requireAuth, async (req, res) => {
    if (!(0, db_js_1.isDbConnected)()) {
        const user = req.userId ? memoryStore_js_1.memoryStore.users.get(req.userId) : undefined;
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const { passwordHash: _p, refreshToken: _r, ...safe } = user;
        void _p;
        void _r;
        res.json({ user: safe });
        return;
    }
    const user = await User_js_1.User.findById(req.userId).select('-passwordHash -refreshToken');
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    res.json({ user });
});
// ── Update Profile ────────────────────────────────────────────────────────────
const profileSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(1).max(80),
    dateOfBirth: zod_1.z.string().trim().max(32).optional(),
});
router.patch('/profile', auth_js_1.requireAuth, async (req, res) => {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { name, dateOfBirth } = parsed.data;
    if (!(0, db_js_1.isDbConnected)()) {
        const user = req.userId ? memoryStore_js_1.memoryStore.users.get(req.userId) : undefined;
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        user.name = name;
        user.dateOfBirth = dateOfBirth || undefined;
        user.updatedAt = new Date();
        const { passwordHash: _p, refreshToken: _r, ...safe } = user;
        void _p;
        void _r;
        res.json({ user: safe });
        return;
    }
    const user = await User_js_1.User.findByIdAndUpdate(req.userId, { name, ...(dateOfBirth !== undefined ? { dateOfBirth } : {}) }, { new: true }).select('-passwordHash -refreshToken');
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    res.json({ user });
});
// ── Delete Account ────────────────────────────────────────────────────────────
router.delete('/delete-account', auth_js_1.requireAuth, async (req, res) => {
    if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    if (!(0, db_js_1.isDbConnected)()) {
        memoryStore_js_1.memoryStore.users.delete(req.userId);
        for (const [slug, chat] of memoryStore_js_1.memoryStore.chats.entries()) {
            if (chat.userId === req.userId) {
                memoryStore_js_1.memoryStore.messages.delete(chat._id);
                memoryStore_js_1.memoryStore.chats.delete(slug);
            }
        }
        for (const [pid, proj] of memoryStore_js_1.memoryStore.projects.entries()) {
            if (proj.userId === req.userId)
                memoryStore_js_1.memoryStore.projects.delete(pid);
        }
        res.json({ ok: true });
        return;
    }
    const chats = await Chat_js_1.Chat.find({ userId: req.userId }).select('_id');
    const chatIds = chats.map((c) => c._id);
    await Promise.all([
        Message_js_1.Message.deleteMany({ chatId: { $in: chatIds } }),
        Chat_js_1.Chat.deleteMany({ userId: req.userId }),
        Project_js_1.Project.deleteMany({ userId: req.userId }),
        User_js_1.User.findByIdAndDelete(req.userId),
    ]);
    res.json({ ok: true });
});
// ── Logout ────────────────────────────────────────────────────────────────────
router.post('/logout', auth_js_1.requireAuth, async (req, res) => {
    if (!(0, db_js_1.isDbConnected)()) {
        const user = req.userId ? memoryStore_js_1.memoryStore.users.get(req.userId) : undefined;
        if (user)
            delete user.refreshToken;
        res.json({ ok: true });
        return;
    }
    await User_js_1.User.findByIdAndUpdate(req.userId, { $unset: { refreshToken: 1 } });
    res.json({ ok: true });
});
exports.default = router;
