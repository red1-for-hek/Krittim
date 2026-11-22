"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Message = void 0;
const mongoose_1 = require("mongoose");
const MessageSchema = new mongoose_1.Schema({
    chatId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Chat', required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    modelId: String,
    reasoningMode: String,
    attachments: [{ name: String, size: Number, type: String, url: String }],
    sources: [{ index: Number, title: String, url: String, snippet: String }],
}, { timestamps: { createdAt: true, updatedAt: false } });
MessageSchema.index({ chatId: 1, createdAt: 1 });
exports.Message = (0, mongoose_1.model)('Message', MessageSchema);
