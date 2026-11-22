"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const User_js_1 = require("../models/User.js");
const db_js_1 = require("../lib/db.js");
const memoryStore_js_1 = require("../lib/memoryStore.js");
const auth_js_1 = require("../middleware/auth.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth);
const settingsSchema = zod_1.z.object({
    theme: zod_1.z.enum(['dark', 'light', 'system']).optional(),
    model: zod_1.z.enum(['r1_xenon', 's1_neon']).optional(),
    reasoningMode: zod_1.z.enum(['auto', 'fast', 'thinking']).optional(),
    enterToSend: zod_1.z.boolean().optional(),
    streamResponses: zod_1.z.boolean().optional(),
    aiMemory: zod_1.z.boolean().optional(),
    responseStyle: zod_1.z.enum(['concise', 'balanced', 'thorough']).optional(),
    customInstructions: zod_1.z.string().max(4000).optional(),
});
router.patch('/', async (req, res) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ error: parsed.error.flatten() });
        return;
    }
    if (!(0, db_js_1.isDbConnected)()) {
        const user = req.userId ? memoryStore_js_1.memoryStore.users.get(req.userId) : undefined;
        if (user) {
            Object.assign(user.settings, parsed.data);
            user.updatedAt = new Date();
        }
        res.json({ settings: user?.settings });
        return;
    }
    const update = Object.fromEntries(Object.entries(parsed.data).map(([k, v]) => [`settings.${k}`, v]));
    const user = await User_js_1.User.findByIdAndUpdate(req.userId, { $set: update }, { new: true }).select('settings');
    res.json({ settings: user?.settings });
});
router.get('/', async (req, res) => {
    if (!(0, db_js_1.isDbConnected)()) {
        const user = req.userId ? memoryStore_js_1.memoryStore.users.get(req.userId) : undefined;
        res.json({ settings: user?.settings });
        return;
    }
    const user = await User_js_1.User.findById(req.userId).select('settings');
    res.json({ settings: user?.settings });
});
exports.default = router;
