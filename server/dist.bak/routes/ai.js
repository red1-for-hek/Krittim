"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const Chat_js_1 = require("../models/Chat.js");
const Message_js_1 = require("../models/Message.js");
const db_js_1 = require("../lib/db.js");
const memoryStore_js_1 = require("../lib/memoryStore.js");
const auth_js_1 = require("../middleware/auth.js");
const proxy_js_1 = require("../ai/proxy.js");
const search_js_1 = require("../ai/search.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth);
/* ------------------------------ limits ---------------------------------- */
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024; // 8 MB per file
const MAX_ATTACHMENTS_PER_DAY = 5; // free-tier abuse guard
const MAX_FILES_PER_MESSAGE = 5;
const streamSchema = zod_1.z.object({
    slug: zod_1.z.string().min(1),
    modelId: zod_1.z.enum(['r1_xenon', 's1_neon', 'image_gen']).default('s1_neon'),
    reasoningMode: zod_1.z.enum(['auto', 'fast', 'thinking']).default('auto'),
    message: zod_1.z.string().min(1).max(32_000),
    hasImage: zod_1.z.boolean().default(false),
    webSearch: zod_1.z.boolean().default(false),
    mode: zod_1.z.enum(['chat', 'image']).default('chat'),
    /** When true, the user turn already exists (regenerate/edit) — don't re-store it. */
    regenerate: zod_1.z.boolean().default(false),
    customInstructions: zod_1.z.string().max(4000).optional(),
    responseStyle: zod_1.z.enum(['concise', 'balanced', 'thorough']).optional(),
    attachments: zod_1.z
        .array(zod_1.z.object({ name: zod_1.z.string().min(1).max(255), size: zod_1.z.number().nonnegative(), type: zod_1.z.string().max(120) }))
        .max(MAX_FILES_PER_MESSAGE)
        .optional(),
});
/** SSE event writer (newline-delimited JSON, `data:` framed). */
function send(res, event) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
}
router.post('/stream', async (req, res) => {
    const parsed = streamSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { slug, modelId, reasoningMode, message, hasImage, webSearch, mode, regenerate, customInstructions, responseStyle, attachments } = parsed.data;
    const dbOnline = (0, db_js_1.isDbConnected)();
    // ---- upload limits (server-enforced) ----
    if (attachments && attachments.length > 0) {
        const tooBig = attachments.find((a) => a.size > MAX_ATTACHMENT_BYTES);
        if (tooBig) {
            res.status(413).json({ error: `“${tooBig.name}” exceeds the 8 MB per-file limit.` });
            return;
        }
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        let uploadsToday = 0;
        if (dbOnline) {
            const userChats = await Chat_js_1.Chat.find({ userId: req.userId }).select('_id').lean();
            uploadsToday = await Message_js_1.Message.countDocuments({
                role: 'user',
                chatId: { $in: userChats.map((c) => c._id) },
                createdAt: { $gte: startOfDay },
                'attachments.0': { $exists: true },
            });
        }
        else {
            const userChatIds = [...memoryStore_js_1.memoryStore.chats.values()]
                .filter((c) => c.userId === req.userId)
                .map((c) => c._id);
            for (const cid of userChatIds) {
                const msgs = memoryStore_js_1.memoryStore.messages.get(cid) ?? [];
                uploadsToday += msgs.filter((m) => m.role === 'user' && m.createdAt >= startOfDay && m.attachments.length > 0).length;
            }
        }
        if (uploadsToday >= MAX_ATTACHMENTS_PER_DAY) {
            res.status(429).json({ error: `Daily upload limit reached (${MAX_ATTACHMENTS_PER_DAY}/day on the free plan).` });
            return;
        }
    }
    let chatIdStr;
    let contextMessages = [];
    if (dbOnline) {
        let chat = await Chat_js_1.Chat.findOne({ slug, userId: req.userId });
        if (!chat) {
            const existingChat = await Chat_js_1.Chat.findOne({ slug }).select({ userId: 1 }).lean();
            if (existingChat) {
                res.status(404).json({ error: 'Chat not found' });
                return;
            }
            chat = await Chat_js_1.Chat.create({ slug, userId: req.userId, title: 'New Chat', modelId, reasoningMode });
        }
        chatIdStr = chat._id.toString();
        if (!regenerate) {
            await Message_js_1.Message.create({
                chatId: chat._id,
                role: 'user',
                content: message,
                attachments: attachments ?? [],
            });
        }
        if (chat.title === 'New Chat') {
            const title = message.length > 50 ? `${message.slice(0, 50).trimEnd()}…` : message;
            await Chat_js_1.Chat.findByIdAndUpdate(chat._id, { title, modelId, reasoningMode });
        }
        else {
            await Chat_js_1.Chat.findByIdAndUpdate(chat._id, { modelId, reasoningMode, updatedAt: new Date() });
        }
        const history = await Message_js_1.Message.find({ chatId: chat._id }).sort({ createdAt: -1 }).limit(20).lean();
        contextMessages = history.reverse().map((m) => ({ role: m.role, content: m.content }));
    }
    else {
        let chat = memoryStore_js_1.memoryStore.chats.get(slug);
        if (!chat) {
            const now = new Date();
            chat = {
                _id: (0, memoryStore_js_1.memId)(),
                slug,
                userId: req.userId,
                title: 'New Chat',
                modelId,
                reasoningMode,
                pinned: false,
                createdAt: now,
                updatedAt: now,
            };
            memoryStore_js_1.memoryStore.chats.set(slug, chat);
        }
        else if (chat.userId !== req.userId) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }
        chatIdStr = chat._id;
        const msgs = memoryStore_js_1.memoryStore.messages.get(chatIdStr) ?? [];
        if (!regenerate) {
            msgs.push({
                _id: (0, memoryStore_js_1.memId)(),
                chatId: chatIdStr,
                role: 'user',
                content: message,
                attachments: attachments ?? [],
                createdAt: new Date(),
            });
            memoryStore_js_1.memoryStore.messages.set(chatIdStr, msgs);
        }
        if (chat.title === 'New Chat') {
            chat.title = message.length > 50 ? `${message.slice(0, 50).trimEnd()}…` : message;
        }
        chat.modelId = modelId;
        chat.reasoningMode = reasoningMode;
        chat.updatedAt = new Date();
        contextMessages = msgs.slice(-20).map((m) => ({ role: m.role, content: m.content }));
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    const streamOpts = { customInstructions, responseStyle: responseStyle };
    /* ----------------------------- image mode ----------------------------- */
    if (mode === 'image') {
        send(res, { type: 'status', stage: 'generating', detail: 'Sketching your image' });
        try {
            const imageUrl = await (0, proxy_js_1.generateImage)(message);
            send(res, { type: 'image', url: imageUrl });
            send(res, { type: 'done', provider: 'xkiro-image', modelId: 'image_gen' });
            res.write('data: [DONE]\n\n');
            if (dbOnline) {
                await Message_js_1.Message.create({
                    chatId: chatIdStr,
                    role: 'assistant',
                    content: `![generated image](${imageUrl})`,
                    modelId: 'image_gen',
                });
            }
            else {
                const msgs = memoryStore_js_1.memoryStore.messages.get(chatIdStr) ?? [];
                msgs.push({
                    _id: (0, memoryStore_js_1.memId)(),
                    chatId: chatIdStr,
                    role: 'assistant',
                    content: `![generated image](${imageUrl})`,
                    modelId: 'image_gen',
                    attachments: [],
                    createdAt: new Date(),
                });
                memoryStore_js_1.memoryStore.messages.set(chatIdStr, msgs);
            }
        }
        catch (err) {
            send(res, { type: 'error', message: err instanceof Error ? err.message : 'Image generation failed' });
            res.write('data: [DONE]\n\n');
        }
        finally {
            res.end();
        }
        return;
    }
    /* ------------------------- research (auto/toggle) --------------------- */
    let sources = [];
    const shouldSearch = webSearch || (0, search_js_1.needsSearch)(message);
    if (shouldSearch) {
        send(res, { type: 'status', stage: 'searching', detail: 'Searching the web' });
        try {
            const { sources: found, context } = await (0, search_js_1.research)(message);
            sources = found;
            if (sources.length) {
                send(res, { type: 'sources', sources });
                send(res, { type: 'status', stage: 'reading', detail: `Reading ${sources.length} source${sources.length === 1 ? '' : 's'}` });
            }
            if (context) {
                contextMessages.push({
                    role: 'system',
                    content: `You have live web results for the user's question. Use them to answer accurately and cite sources inline as [1], [2], … matching the numbers below. If the results don't cover it, say so and answer from knowledge, clearly marking uncertainty.\n\nWEB RESULTS:\n${context}`,
                });
            }
            else {
                send(res, { type: 'status', stage: 'reading', detail: 'No strong sources found — answering from knowledge' });
            }
        }
        catch {
            send(res, { type: 'status', stage: 'reading', detail: 'Search unavailable — answering from knowledge' });
        }
    }
    /* ----------------------------- stream answer -------------------------- */
    send(res, { type: 'status', stage: 'thinking', detail: shouldSearch ? 'Synthesizing an answer' : 'Thinking' });
    let fullContent = '';
    try {
        await (0, proxy_js_1.streamCompletion)(modelId, reasoningMode, contextMessages, hasImage, (chunk) => {
            fullContent += chunk;
            send(res, { type: 'chunk', content: chunk });
        }, (provider, providerModel) => {
            send(res, { type: 'done', provider, modelId: providerModel });
            res.write('data: [DONE]\n\n');
        }, streamOpts);
        if (dbOnline) {
            await Message_js_1.Message.create({
                chatId: chatIdStr,
                role: 'assistant',
                content: fullContent,
                modelId,
                reasoningMode,
                sources: sources.length ? sources : undefined,
            });
        }
        else {
            const msgs = memoryStore_js_1.memoryStore.messages.get(chatIdStr) ?? [];
            msgs.push({
                _id: (0, memoryStore_js_1.memId)(),
                chatId: chatIdStr,
                role: 'assistant',
                content: fullContent,
                modelId,
                reasoningMode,
                attachments: [],
                sources: sources.length ? sources : undefined,
                createdAt: new Date(),
            });
            memoryStore_js_1.memoryStore.messages.set(chatIdStr, msgs);
        }
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'All providers failed';
        send(res, { type: 'error', message: msg });
        res.write('data: [DONE]\n\n');
    }
    finally {
        res.end();
    }
});
router.post('/image', async (req, res) => {
    const parsed = zod_1.z.object({ slug: zod_1.z.string().min(1), prompt: zod_1.z.string().min(1).max(2000) }).safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    const { slug, prompt } = parsed.data;
    if (!(0, db_js_1.isDbConnected)()) {
        const chat = memoryStore_js_1.memoryStore.chats.get(slug);
        if (!chat || chat.userId !== req.userId) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }
        const msgs = memoryStore_js_1.memoryStore.messages.get(chat._id) ?? [];
        msgs.push({ _id: (0, memoryStore_js_1.memId)(), chatId: chat._id, role: 'user', content: prompt, attachments: [], createdAt: new Date() });
        try {
            const imageContent = await (0, proxy_js_1.generateImage)(prompt);
            msgs.push({ _id: (0, memoryStore_js_1.memId)(), chatId: chat._id, role: 'assistant', content: `![generated image](${imageContent})`, modelId: 'image_gen', attachments: [], createdAt: new Date() });
            memoryStore_js_1.memoryStore.messages.set(chat._id, msgs);
            res.json({ imageContent });
        }
        catch (err) {
            res.status(502).json({ error: err instanceof Error ? err.message : 'Image generation failed' });
        }
        return;
    }
    const chat = await Chat_js_1.Chat.findOne({ slug, userId: req.userId });
    if (!chat) {
        res.status(404).json({ error: 'Chat not found' });
        return;
    }
    await Message_js_1.Message.create({ chatId: chat._id, role: 'user', content: prompt });
    try {
        const imageContent = await (0, proxy_js_1.generateImage)(prompt);
        await Message_js_1.Message.create({ chatId: chat._id, role: 'assistant', content: `![generated image](${imageContent})`, modelId: 'image_gen' });
        res.json({ imageContent });
    }
    catch (err) {
        res.status(502).json({ error: err instanceof Error ? err.message : 'Image generation failed' });
    }
});
exports.default = router;
