"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_js_1 = require("../middleware/auth.js");
const db_js_1 = require("../lib/db.js");
const memoryStore_js_1 = require("../lib/memoryStore.js");
const User_js_1 = require("../models/User.js");
const Chat_js_1 = require("../models/Chat.js");
const Message_js_1 = require("../models/Message.js");
const Project_js_1 = require("../models/Project.js");
const router = (0, express_1.Router)();
router.delete('/me', auth_js_1.requireAuth, async (req, res) => {
    const userId = req.userId;
    if (!(0, db_js_1.isDbConnected)()) {
        for (const [slug, chat] of memoryStore_js_1.memoryStore.chats.entries()) {
            if (chat.userId === userId) {
                memoryStore_js_1.memoryStore.messages.delete(chat._id);
                memoryStore_js_1.memoryStore.chats.delete(slug);
            }
        }
        for (const [pid, proj] of memoryStore_js_1.memoryStore.projects.entries()) {
            if (proj.userId === userId)
                memoryStore_js_1.memoryStore.projects.delete(pid);
        }
        memoryStore_js_1.memoryStore.users.delete(userId);
        res.json({ ok: true, message: 'All your data has been wiped.' });
        return;
    }
    try {
        const userChats = await Chat_js_1.Chat.find({ userId }).select('_id').lean();
        const chatIds = userChats.map((c) => c._id);
        await Message_js_1.Message.deleteMany({ chatId: { $in: chatIds } });
        await Chat_js_1.Chat.deleteMany({ userId });
        await Project_js_1.Project.deleteMany({ createdBy: userId });
        await User_js_1.User.findByIdAndDelete(userId);
        res.json({ ok: true, message: 'All your data has been wiped.' });
    }
    catch {
        res.status(500).json({ error: 'Cleanup failed' });
    }
});
const wipeSchema = zod_1.z.object({ secret: zod_1.z.string().min(1) });
router.delete('/all', async (req, res) => {
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
    if (!(0, db_js_1.isDbConnected)()) {
        memoryStore_js_1.memoryStore.messages.clear();
        memoryStore_js_1.memoryStore.chats.clear();
        memoryStore_js_1.memoryStore.projects.clear();
        memoryStore_js_1.memoryStore.users.clear();
        res.json({ ok: true, message: 'Database wiped clean.' });
        return;
    }
    try {
        await Message_js_1.Message.deleteMany({});
        await Chat_js_1.Chat.deleteMany({});
        await Project_js_1.Project.deleteMany({});
        await User_js_1.User.deleteMany({});
        res.json({ ok: true, message: 'Database wiped clean.' });
    }
    catch {
        res.status(500).json({ error: 'Full wipe failed.' });
    }
});
exports.default = router;
