import { Router, type Response } from 'express';
import { z } from 'zod';
import { Project } from '../models/Project.js';
import { Chat } from '../models/Chat.js';
import { isDbConnected } from '../lib/db.js';
import { memId, memoryStore } from '../lib/memoryStore.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router: Router = Router();
router.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(60),
  emoji: z.string().max(8).optional(),
  color: z.string().max(60).optional(),
});

// List projects
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isDbConnected()) {
    const projects = [...memoryStore.projects.values()]
      .filter((p) => p.userId === req.userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    res.json({ projects });
    return;
  }
  const projects = await Project.find({ userId: req.userId }).sort({ updatedAt: -1 }).lean();
  res.json({ projects });
});

// Create project
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  if (!isDbConnected()) {
    const now = new Date();
    const project = {
      _id: memId(),
      userId: req.userId!,
      name: parsed.data.name,
      emoji: parsed.data.emoji ?? '📁',
      color: parsed.data.color ?? 'from-brand to-brand-soft',
      createdAt: now,
      updatedAt: now,
    };
    memoryStore.projects.set(project._id, project);
    res.status(201).json({ project });
    return;
  }
  const project = await Project.create({ ...parsed.data, userId: req.userId });
  res.status(201).json({ project });
});

// Rename / restyle project
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = z.object({
    name: z.string().min(1).max(60).optional(),
    emoji: z.string().max(8).optional(),
    color: z.string().max(60).optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  if (!isDbConnected()) {
    const project = memoryStore.projects.get(String(req.params.id));
    if (!project || project.userId !== req.userId) { res.status(404).json({ error: 'Project not found' }); return; }
    if (parsed.data.name !== undefined) project.name = parsed.data.name;
    if (parsed.data.emoji !== undefined) project.emoji = parsed.data.emoji;
    if (parsed.data.color !== undefined) project.color = parsed.data.color;
    project.updatedAt = new Date();
    res.json({ project });
    return;
  }
  const project = await Project.findOneAndUpdate({ _id: req.params.id, userId: req.userId }, parsed.data, { new: true });
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  res.json({ project });
});

// Delete project (chats inside are unassigned, not deleted)
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isDbConnected()) {
    const project = memoryStore.projects.get(String(req.params.id));
    if (!project || project.userId !== req.userId) { res.status(404).json({ error: 'Project not found' }); return; }
    memoryStore.projects.delete(project._id);
    for (const chat of memoryStore.chats.values()) {
      if (chat.projectId === project._id) delete chat.projectId;
    }
    res.json({ ok: true });
    return;
  }
  const project = await Project.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  await Chat.updateMany({ projectId: project._id }, { $unset: { projectId: 1 } });
  res.json({ ok: true });
});

// Move a chat into / out of a project
router.post('/:id/chats', async (req: AuthRequest, res: Response): Promise<void> => {
  const parsed = z.object({ slug: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  if (!isDbConnected()) {
    const project = memoryStore.projects.get(String(req.params.id));
    if (!project || project.userId !== req.userId) { res.status(404).json({ error: 'Project not found' }); return; }
    const chat = memoryStore.chats.get(parsed.data.slug);
    if (!chat || chat.userId !== req.userId) { res.status(404).json({ error: 'Chat not found' }); return; }
    chat.projectId = project._id;
    res.json({ chat });
    return;
  }
  const project = await Project.findOne({ _id: req.params.id, userId: req.userId });
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
  const chat = await Chat.findOneAndUpdate({ slug: parsed.data.slug, userId: req.userId }, { projectId: project._id }, { new: true });
  if (!chat) { res.status(404).json({ error: 'Chat not found' }); return; }
  res.json({ chat });
});

export default router;
