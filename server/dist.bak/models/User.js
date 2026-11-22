"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: String,
    avatarUrl: String,
    dateOfBirth: { type: String, trim: true },
    provider: { type: String, enum: ['google', 'github', 'discord', 'email'], required: true },
    providerId: String,
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    refreshToken: String,
    settings: {
        theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
        model: { type: String, default: 's1_neon' },
        reasoningMode: { type: String, default: 'auto' },
        enterToSend: { type: Boolean, default: true },
        streamResponses: { type: Boolean, default: true },
        aiMemory: { type: Boolean, default: true },
        responseStyle: { type: String, enum: ['concise', 'balanced', 'thorough'], default: 'balanced' },
        customInstructions: { type: String, default: '', maxlength: 4000 },
    },
}, { timestamps: true });
UserSchema.index({ email: 1 });
UserSchema.index({ provider: 1, providerId: 1 });
exports.User = (0, mongoose_1.model)('User', UserSchema);
