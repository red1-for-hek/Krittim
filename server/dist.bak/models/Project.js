"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Project = void 0;
const mongoose_1 = require("mongoose");
const ProjectSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    emoji: { type: String, default: '📁' },
    color: { type: String, default: 'from-brand to-brand-soft' },
}, { timestamps: true });
ProjectSchema.index({ userId: 1 });
exports.Project = (0, mongoose_1.model)('Project', ProjectSchema);
