"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const Chat_js_1 = require("../models/Chat.js");
const Message_js_1 = require("../models/Message.js");
const db_js_1 = require("../lib/db.js");
const memoryStore_js_1 = require("../lib/memoryStore.js");
const auth_js_1 = require("../middleware/auth.js");
const slug_js_1 = require("../lib/slug.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth);
// ── List chats ────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    if (!(0, db_js_1.isDbConnected)()) {
        const chats = [...memoryStore_js_1.memoryStore.chats.values()]
            .filter((c) => c.userId === req.userId)
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        res.json({ chats });
        return;
    }
    const chats = await Chat_js_1.Chat.find({ userId: req.userId }).sort({ updatedAt: -1 }).lean();
    res.json({ chats });
});
// ── Create chat ───────────────────────────────────────────────────────────────
const createSchema = zod_1.z.object({
    modelId: zod_1.z.enum(['r1_xenon', 's1_neon']).default('s1_neon'),
    reasoningMode: zod_1.z.enum(['auto', 'fast', 'thinking']).default('auto'),
    projectId: zod_1.z.string().optional(),
});
router.post('/', async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    if (!(0, db_js_1.isDbConnected)()) {
        let slug = (0, slug_js_1.generateSlug)();
        while (memoryStore_js_1.memoryStore.chats.has(slug))
            slug = (0, slug_js_1.generateSlug)();
        const now = new Date();
        const chat = {
            _id: (0, memoryStore_js_1.memId)(),
            slug,
            userId: req.userId,
            title: 'New Chat',
            modelId: parsed.data.modelId,
            reasoningMode: parsed.data.reasoningMode,
            projectId: parsed.data.projectId,
            pinned: false,
            createdAt: now,
            updatedAt: now,
        };
        memoryStore_js_1.memoryStore.chats.set(slug, chat);
        res.status(201).json({ chat });
        return;
    }
    let slug = (0, slug_js_1.generateSlug)();
    while (await Chat_js_1.Chat.exists({ slug }))
        slug = (0, slug_js_1.generateSlug)();
    const chat = await Chat_js_1.Chat.create({ ...parsed.data, slug, userId: req.userId });
    res.status(201).json({ chat });
});
// ── Get single chat by slug ───────────────────────────────────────────────────
router.get('/:slug', async (req, res) => {
    if (!(0, db_js_1.isDbConnected)()) {
        const chat = memoryStore_js_1.memoryStore.chats.get(String(req.params.slug));
        if (!chat || chat.userId !== req.userId) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }
        res.json({ chat });
        return;
    }
    const chat = await Chat_js_1.Chat.findOne({ slug: req.params.slug, userId: req.userId }).lean();
    if (!chat) {
        res.status(404).json({ error: 'Chat not found' });
        return;
    }
    res.json({ chat });
});
// ── Rename chat ───────────────────────────────────────────────────────────────
router.patch('/:slug', async (req, res) => {
    const { title } = req.body;
    if (!title?.trim()) {
        res.status(400).json({ error: 'title required' });
        return;
    }
    if (!(0, db_js_1.isDbConnected)()) {
        const chat = memoryStore_js_1.memoryStore.chats.get(String(req.params.slug));
        if (!chat || chat.userId !== req.userId) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }
        chat.title = title.trim();
        chat.updatedAt = new Date();
        res.json({ chat });
        return;
    }
    const chat = await Chat_js_1.Chat.findOneAndUpdate({ slug: req.params.slug, userId: req.userId }, { title: title.trim() }, { new: true });
    if (!chat) {
        res.status(404).json({ error: 'Chat not found' });
        return;
    }
    res.json({ chat });
});
// ── Delete chat ───────────────────────────────────────────────────────────────
router.delete('/:slug', async (req, res) => {
    if (!(0, db_js_1.isDbConnected)()) {
        const chat = memoryStore_js_1.memoryStore.chats.get(String(req.params.slug));
        if (!chat || chat.userId !== req.userId) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }
        memoryStore_js_1.memoryStore.chats.delete(chat.slug);
        memoryStore_js_1.memoryStore.messages.delete(chat._id);
        res.json({ ok: true });
        return;
    }
    const chat = await Chat_js_1.Chat.findOneAndDelete({ slug: req.params.slug, userId: req.userId });
    if (!chat) {
        res.status(404).json({ error: 'Chat not found' });
        return;
    }
    await Message_js_1.Message.deleteMany({ chatId: chat._id });
    res.json({ ok: true });
});
// ── Messages ──────────────────────────────────────────────────────────────────
router.get('/:slug/messages', async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    if (!(0, db_js_1.isDbConnected)()) {
        const chat = memoryStore_js_1.memoryStore.chats.get(String(req.params.slug));
        if (!chat || chat.userId !== req.userId) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }
        const all = memoryStore_js_1.memoryStore.messages.get(chat._id) ?? [];
        const messages = all.slice((page - 1) * limit, page * limit);
        res.json({ messages });
        return;
    }
    const chat = await Chat_js_1.Chat.findOne({ slug: req.params.slug, userId: req.userId });
    if (!chat) {
        res.status(404).json({ error: 'Chat not found' });
        return;
    }
    const messages = await Message_js_1.Message.find({ chatId: chat._id })
        .sort({ createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
    res.json({ messages });
});
exports.default = router;
