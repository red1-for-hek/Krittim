"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chat = void 0;
const mongoose_1 = require("mongoose");
const ChatSchema = new mongoose_1.Schema({
    slug: { type: String, required: true, unique: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'New Chat', trim: true },
    modelId: { type: String, default: 's1_neon' },
    reasoningMode: { type: String, default: 'auto' },
    projectId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project' },
    pinned: { type: Boolean, default: false },
}, { timestamps: true });
ChatSchema.index({ userId: 1, updatedAt: -1 });
ChatSchema.index({ slug: 1 }, { unique: true });
exports.Chat = (0, mongoose_1.model)('Chat', ChatSchema);
