"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.memId = exports.memoryStore = void 0;
exports.defaultSettings = defaultSettings;
const node_crypto_1 = __importDefault(require("node:crypto"));
const g = globalThis;
exports.memoryStore = (g.__krittimMemoryStore ??= {
    users: new Map(),
    chats: new Map(),
    messages: new Map(),
    projects: new Map(),
});
const memId = () => node_crypto_1.default.randomBytes(12).toString('hex');
exports.memId = memId;
function defaultSettings() {
    return {
        theme: 'dark',
        model: 's1_neon',
        reasoningMode: 'auto',
        enterToSend: true,
        streamResponses: true,
        aiMemory: true,
        responseStyle: 'balanced',
        customInstructions: '',
    };
}
