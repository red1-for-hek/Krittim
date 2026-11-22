"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const node_crypto_1 = __importDefault(require("node:crypto"));
const User_js_1 = require("../models/User.js");
const db_js_1 = require("../lib/db.js");
const memoryStore_js_1 = require("../lib/memoryStore.js");
const jwt_js_1 = require("../lib/jwt.js");
const router = (0, express_1.Router)();
function providerConfig(provider) {
    if (provider === 'google') {
        return {
            clientId: process.env.GOOGLE_CLIENT_ID ?? '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
            authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            scope: 'openid email profile',
            profileUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
        };
    }
    if (provider === 'github') {
        return {
            clientId: process.env.GITHUB_CLIENT_ID ?? '',
            clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
            authorizeUrl: 'https://github.com/login/oauth/authorize',
            tokenUrl: 'https://github.com/login/oauth/access_token',
            scope: 'read:user user:email',
            tokenHeaders: { Accept: 'application/json' },
            profileUrl: 'https://api.github.com/user',
        };
    }
    if (provider === 'discord') {
        return {
            clientId: process.env.DISCORD_CLIENT_ID ?? '',
            clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
            authorizeUrl: 'https://discord.com/oauth2/authorize',
            tokenUrl: 'https://discord.com/api/oauth2/token',
            scope: 'identify email',
            profileUrl: 'https://discord.com/api/users/@me',
        };
    }
    return null;
}
function baseUrl(req) {
    const configured = process.env.OAUTH_REDIRECT_BASE?.trim();
    if (configured)
        return configured.replace(/\/$/, '');
    const proto = req.headers['x-forwarded-proto']?.split(',')[0] ?? req.protocol ?? 'http';
    const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost:3000';
    return `${proto}://${host}`;
}
function clientAppUrl(req) {
    const configured = (process.env.CLIENT_APP_URL ?? process.env.CLIENT_ORIGIN)?.trim();
    if (configured)
        return configured.replace(/\/$/, '');
    return baseUrl(req);
}
const STATE_SECRET = process.env.OAUTH_STATE_SECRET ?? process.env.JWT_SECRET ?? 'krittim-dev-state-secret';
function signState(provider) {
    const payload = Buffer.from(JSON.stringify({ p: provider, n: node_crypto_1.default.randomBytes(12).toString('hex'), t: Date.now() })).toString('base64url');
    const sig = node_crypto_1.default.createHmac('sha256', STATE_SECRET).update(payload).digest('base64url');
    return `${payload}.${sig}`;
}
function verifyState(state, provider) {
    if (!state)
        return false;
    const [payload, sig] = state.split('.');
    if (!payload || !sig)
        return false;
    const expected = node_crypto_1.default.createHmac('sha256', STATE_SECRET).update(payload).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !node_crypto_1.default.timingSafeEqual(a, b))
        return false;
    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
        if (data.p !== provider)
            return false;
        return typeof data.t === 'number' && Date.now() - data.t < 10 * 60 * 1000;
    }
    catch {
        return false;
    }
}
async function exchangeCode(config, code, redirectUri) {
    const res = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            ...config.tokenHeaders,
        },
        body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        }),
    });
    if (!res.ok)
        throw new Error(`token exchange failed (${res.status})`);
    const json = await res.json();
    if (!json.access_token)
        throw new Error('no access_token in provider response');
    return json.access_token;
}
async function fetchProfile(provider, config, accessToken) {
    if (provider === 'google') {
        const res = await fetch(config.profileUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok)
            throw new Error(`google profile failed (${res.status})`);
        const p = await res.json();
        return { providerId: p.sub, email: p.email, name: p.name || p.email.split('@')[0], avatarUrl: p.picture };
    }
    if (provider === 'github') {
        const res = await fetch(config.profileUrl, {
            headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'krittim-ai' },
        });
        if (!res.ok)
            throw new Error(`github profile failed (${res.status})`);
        const p = await res.json();
        let email = p.email;
        if (!email) {
            const emailRes = await fetch('https://api.github.com/user/emails', {
                headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'krittim-ai' },
            });
            if (emailRes.ok) {
                const emails = await emailRes.json();
                email = emails.find((e) => e.primary && e.verified)?.email ?? emails[0]?.email ?? undefined;
            }
        }
        if (!email)
            throw new Error('github account has no accessible email');
        return { providerId: String(p.id), email, name: p.name || p.login, avatarUrl: p.avatar_url };
    }
    const res = await fetch(config.profileUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok)
        throw new Error(`discord profile failed (${res.status})`);
    const p = await res.json();
    if (!p.email)
        throw new Error('discord account did not share an email');
    const avatar = p.avatar ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png` : undefined;
    return { providerId: p.id, email: p.email, name: p.global_name || p.username, avatarUrl: avatar };
}
function redirectWithError(req, res, message) {
    const target = `${clientAppUrl(req)}/auth/callback#error=${encodeURIComponent(message)}`;
    res.redirect(target);
}
router.get('/:provider', (req, res) => {
    const provider = req.params.provider;
    const config = providerConfig(provider);
    if (!config) {
        res.status(404).json({ error: 'Unknown provider' });
        return;
    }
    if (!config.clientId || !config.clientSecret) {
        redirectWithError(req, res, `${provider} login is not configured on the server`);
        return;
    }
    const redirectUri = `${baseUrl(req)}/api/auth/oauth/${provider}/callback`;
    const url = new URL(config.authorizeUrl);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', config.scope);
    url.searchParams.set('state', signState(provider));
    if (provider === 'google')
        url.searchParams.set('prompt', 'select_account');
    res.redirect(url.toString());
});
router.get('/:provider/callback', async (req, res) => {
    const provider = req.params.provider;
    const config = providerConfig(provider);
    if (!config) {
        res.status(404).json({ error: 'Unknown provider' });
        return;
    }
    if (req.query.error) {
        redirectWithError(req, res, String(req.query.error_description ?? req.query.error));
        return;
    }
    if (!verifyState(req.query.state, provider)) {
        redirectWithError(req, res, 'Invalid or expired login session. Please try again.');
        return;
    }
    const code = req.query.code;
    if (!code) {
        redirectWithError(req, res, 'Missing authorization code');
        return;
    }
    try {
        const redirectUri = `${baseUrl(req)}/api/auth/oauth/${provider}/callback`;
        const accessToken = await exchangeCode(config, code, redirectUri);
        const profile = await fetchProfile(provider, config, accessToken);
        let userId;
        let userEmail;
        if (!(0, db_js_1.isDbConnected)()) {
            const normalizedEmail = profile.email.toLowerCase();
            let user = [...memoryStore_js_1.memoryStore.users.values()].find((u) => (u.provider === provider && u.providerId === profile.providerId) || u.email === normalizedEmail);
            if (!user) {
                const id = (0, memoryStore_js_1.memId)();
                const now = new Date();
                user = {
                    _id: id,
                    name: profile.name,
                    email: normalizedEmail,
                    provider,
                    providerId: profile.providerId,
                    avatarUrl: profile.avatarUrl,
                    plan: 'free',
                    settings: (0, memoryStore_js_1.defaultSettings)(),
                    createdAt: now,
                    updatedAt: now,
                };
                memoryStore_js_1.memoryStore.users.set(id, user);
            }
            else {
                user.provider = provider;
                user.providerId = profile.providerId;
                if (profile.avatarUrl)
                    user.avatarUrl = profile.avatarUrl;
            }
            userId = user._id;
            userEmail = user.email;
            const access = (0, jwt_js_1.signAccess)({ userId, email: userEmail });
            const refresh = (0, jwt_js_1.signRefresh)({ userId, email: userEmail });
            user.refreshToken = refresh;
            const fragment = new URLSearchParams({ access_token: access, refresh_token: refresh });
            res.redirect(`${clientAppUrl(req)}/auth/callback#${fragment.toString()}`);
            return;
        }
        let user = await User_js_1.User.findOne({ provider, providerId: profile.providerId });
        if (!user) {
            const byEmail = await User_js_1.User.findOne({ email: profile.email.toLowerCase() });
            if (byEmail) {
                byEmail.provider = provider;
                byEmail.providerId = profile.providerId;
                if (profile.avatarUrl && byEmail.avatarUrl !== profile.avatarUrl)
                    byEmail.avatarUrl = profile.avatarUrl;
                user = await byEmail.save();
            }
            else {
                user = await User_js_1.User.create({
                    name: profile.name,
                    email: profile.email.toLowerCase(),
                    provider,
                    providerId: profile.providerId,
                    avatarUrl: profile.avatarUrl,
                });
            }
        }
        else if (profile.avatarUrl && user.avatarUrl !== profile.avatarUrl) {
            user.avatarUrl = profile.avatarUrl;
            await user.save();
        }
        const access = (0, jwt_js_1.signAccess)({ userId: user._id.toString(), email: user.email });
        const refresh = (0, jwt_js_1.signRefresh)({ userId: user._id.toString(), email: user.email });
        await User_js_1.User.findByIdAndUpdate(user._id, { refreshToken: refresh });
        const fragment = new URLSearchParams({ access_token: access, refresh_token: refresh });
        res.redirect(`${clientAppUrl(req)}/auth/callback#${fragment.toString()}`);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'OAuth login failed';
        console.warn(`[oauth] ${provider} failed:`, message);
        redirectWithError(req, res, message);
    }
});
exports.default = router;
