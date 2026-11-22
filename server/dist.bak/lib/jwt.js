"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefresh = exports.verifyAccess = exports.signRefresh = exports.signAccess = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ACCESS_SECRET = process.env.JWT_SECRET || 'krittim-dev-access-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'krittim-dev-refresh-secret';
const ACCESS_EXP = process.env.JWT_EXPIRES_IN ?? '15m';
const REFRESH_EXP = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';
const signAccess = (payload) => jsonwebtoken_1.default.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXP });
exports.signAccess = signAccess;
const signRefresh = (payload) => jsonwebtoken_1.default.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXP });
exports.signRefresh = signRefresh;
const verifyAccess = (token) => jsonwebtoken_1.default.verify(token, ACCESS_SECRET);
exports.verifyAccess = verifyAccess;
const verifyRefresh = (token) => jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
exports.verifyRefresh = verifyRefresh;
