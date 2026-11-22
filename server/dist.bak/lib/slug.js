"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSlug = generateSlug;
const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';
function generateSlug(length = 10) {
    let slug = 'chat-';
    for (let i = 0; i < length; i++) {
        slug += CHARS[Math.floor(Math.random() * CHARS.length)];
    }
    return slug;
}
