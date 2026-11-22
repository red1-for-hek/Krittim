"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDbConnected = isDbConnected;
exports.connectDB = connectDB;
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_js_1 = require("../models/User.js");
const memoryStore_js_1 = require("./memoryStore.js");
let connected = false;
let attempted = false;
function isDbConnected() {
    return connected && mongoose_1.default.connection.readyState === 1;
}
async function connectDB() {
    if (isDbConnected())
        return;
    if (attempted && !process.env.MONGODB_URI)
        return;
    attempted = true;
    mongoose_1.default.set('bufferCommands', false);
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.warn('[db] MONGODB_URI is not set — using in-memory fallback');
        await seedDemoUserMemory();
        return;
    }
    try {
        await mongoose_1.default.connect(uri, { serverSelectionTimeoutMS: 5000 });
        connected = true;
        console.log('[db] MongoDB connected');
        const demoEmail = process.env.DEMO_USER_EMAIL?.trim().toLowerCase();
        const demoPassword = process.env.DEMO_USER_PASSWORD;
        if (demoEmail && demoPassword) {
            const passwordHash = await bcryptjs_1.default.hash(demoPassword, 12);
            await User_js_1.User.updateOne({ email: demoEmail }, {
                $setOnInsert: {
                    name: process.env.DEMO_USER_NAME ?? 'Krittim Demo User',
                    email: demoEmail,
                    passwordHash,
                    provider: 'email',
                    plan: 'pro',
                },
            }, { upsert: true });
            console.log(`[db] Demo user ready: ${demoEmail}`);
        }
    }
    catch (err) {
        connected = false;
        console.warn('[db] MongoDB not connected — using in-memory fallback:', err instanceof Error ? err.message : err);
        await seedDemoUserMemory();
    }
}
async function seedDemoUserMemory() {
    const demoEmail = process.env.DEMO_USER_EMAIL?.trim().toLowerCase();
    const demoPassword = process.env.DEMO_USER_PASSWORD;
    if (!demoEmail || !demoPassword)
        return;
    const existing = [...memoryStore_js_1.memoryStore.users.values()].find((u) => u.email === demoEmail);
    if (existing)
        return;
    const id = (0, memoryStore_js_1.memId)();
    const passwordHash = await bcryptjs_1.default.hash(demoPassword, 10);
    const now = new Date();
    memoryStore_js_1.memoryStore.users.set(id, {
        _id: id,
        name: process.env.DEMO_USER_NAME ?? 'Krittim Demo User',
        email: demoEmail,
        passwordHash,
        provider: 'email',
        plan: 'pro',
        settings: (0, memoryStore_js_1.defaultSettings)(),
        createdAt: now,
        updatedAt: now,
    });
}
