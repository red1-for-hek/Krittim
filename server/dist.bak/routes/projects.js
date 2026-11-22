"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const Project_js_1 = require("../models/Project.js");
const Chat_js_1 = require("../models/Chat.js");
const db_js_1 = require("../lib/db.js");
const memoryStore_js_1 = require("../lib/memoryStore.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth);
const createSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(60),
    emoji: zod_1.z.string().max(8).optional(),
    color: zod_1.z.string().max(60).optional(),
});
// List projects
router.get('/', async (req, res) => {
    if (!(0, db_js_1.isDbConnected)()) {
        const projects = [...memoryStore_js_1.memoryStore.projects.values()]
            .filter((p) => p.userId === req.userId)
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        res.json({ projects });
        return;
    }
    const projects = await Project_js_1.Project.find({ userId: req.userId }).sort({ updatedAt: -1 }).lean();
    res.json({ projects });
});
// Create project
router.post('/', async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    if (!(0, db_js_1.isDbConnected)()) {
        const now = new Date();
        const project = {
            _id: (0, memoryStore_js_1.memId)(),
            userId: req.userId,
            name: parsed.data.name,
            emoji: parsed.data.emoji ?? '📁',
            color: parsed.data.color ?? 'from-brand to-brand-soft',
            createdAt: now,
            updatedAt: now,
        };
        memoryStore_js_1.memoryStore.projects.set(project._id, project);
        res.status(201).json({ project });
        return;
    }
    const project = await Project_js_1.Project.create({ ...parsed.data, userId: req.userId });
    res.status(201).json({ project });
});
// Rename / restyle project
router.patch('/:id', async (req, res) => {
    const parsed = zod_1.z.object({
        name: zod_1.z.string().min(1).max(60).optional(),
        emoji: zod_1.z.string().max(8).optional(),
        color: zod_1.z.string().max(60).optional(),
    }).safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    if (!(0, db_js_1.isDbConnected)()) {
        const project = memoryStore_js_1.memoryStore.projects.get(String(req.params.id));
        if (!project || project.userId !== req.userId) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        if (parsed.data.name !== undefined)
            project.name = parsed.data.name;
        if (parsed.data.emoji !== undefined)
            project.emoji = parsed.data.emoji;
        if (parsed.data.color !== undefined)
            project.color = parsed.data.color;
        project.updatedAt = new Date();
        res.json({ project });
        return;
    }
    const project = await Project_js_1.Project.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, parsed.data, { new: true });
    if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
    }
    res.json({ project });
});
// Delete project (chats inside are unassigned, not deleted)
router.delete('/:id', async (req, res) => {
    if (!(0, db_js_1.isDbConnected)()) {
        const project = memoryStore_js_1.memoryStore.projects.get(String(req.params.id));
        if (!project || project.userId !== req.userId) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        memoryStore_js_1.memoryStore.projects.delete(project._id);
        for (const chat of memoryStore_js_1.memoryStore.chats.values()) {
            if (chat.projectId === project._id)
                delete chat.projectId;
        }
        res.json({ ok: true });
        return;
    }
    const project = await Project_js_1.Project.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
    }
    await Chat_js_1.Chat.updateMany({ projectId: project._id }, { $unset: { projectId: 1 } });
    res.json({ ok: true });
});
// Move a chat into / out of a project
router.post('/:id/chats', async (req, res) => {
    const parsed = zod_1.z.object({ slug: zod_1.z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    if (!(0, db_js_1.isDbConnected)()) {
        const project = memoryStore_js_1.memoryStore.projects.get(String(req.params.id));
        if (!project || project.userId !== req.userId) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }
        const chat = memoryStore_js_1.memoryStore.chats.get(parsed.data.slug);
        if (!chat || chat.userId !== req.userId) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }
        chat.projectId = project._id;
        res.json({ chat });
        return;
    }
    const project = await Project_js_1.Project.findOne({ _id: req.params.id, userId: req.userId });
    if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
    }
    const chat = await Chat_js_1.Chat.findOneAndUpdate({ slug: parsed.data.slug, userId: req.userId }, { projectId: project._id }, { new: true });
    if (!chat) {
        res.status(404).json({ error: 'Chat not found' });
        return;
    }
    res.json({ chat });
});
exports.default = router;
