"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jwt_js_1 = require("../lib/jwt.js");
function requireAuth(req, res, next) {
    if (process.env.DEV_AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production') {
        req.userId = '000000000000000000000001';
        req.userEmail = 'dev@localhost';
        next();
        return;
    }
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing authorization header' });
        return;
    }
    try {
        const payload = (0, jwt_js_1.verifyAccess)(header.slice(7));
        req.userId = payload.userId;
        req.userEmail = payload.email;
        next();
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
