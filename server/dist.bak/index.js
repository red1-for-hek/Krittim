"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_js_1 = __importDefault(require("./app.js"));
const db_js_1 = require("./lib/db.js");
const PORT = Number(process.env.PORT ?? 4000);
(0, db_js_1.connectDB)().then(() => {
    app_js_1.default.listen(PORT, '0.0.0.0', () => console.log(`[server] Krittim API running on :${PORT}`));
});
