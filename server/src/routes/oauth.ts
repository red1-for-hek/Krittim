import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { signAccess, signRefresh } from '../lib/jwt.js';

/**
 * OAuth 2.0 Authorization Code flow for Google · GitHub · Discord.
 *
 * The server holds the client secrets (never the browser). The browser only
 * ever does a top-level redirect to the provider and back, so there is no CORS
 * or token-in-JS exposure. On success we mint our own JWT pair and hand it to
 * the SPA through the URL *fragment* (#…), which browsers do not send to
 * servers or log — the client page immediately strips it from the address bar.
 *
 *   GET /api/auth/oauth/:provider            → 302 to the provider consent screen
 *   GET /api/auth/oauth/:provider/callback   → exchange code → JWT → redirect to SPA
 */

const router = Router();

type Provider = 'google' | 'github' | 'discord';

interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  /** Extra headers for the token exchange (GitHub wants JSON). */
  tokenHeaders?: Record<string, string>;
  profileUrl: string;
}

function providerConfig(provider: Provider): ProviderConfig | null {
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
  return {
    clientId: process.env.DISCORD_CLIENT_ID ?? '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
    authorizeUrl: 'https://discord.com/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    scope: 'identify email',
    profileUrl: 'https://discord.com/api/users/@me',
  };
}

/** Absolute base URL of THIS server (used to build the callback redirect URI). */
function baseUrl(req: Request): string {
  const configured = process.env.OAUTH_REDIRECT_BASE?.trim();
  if (configured) return configured.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ?? req.protocol;
  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost:4000';
  return `${proto}://${host}`;
}

/** Where the SPA lives — we bounce the user back here after a successful login. */
function clientAppUrl(): string {
  return (process.env.CLIENT_APP_URL ?? process.env.CLIENT_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
}

/* ------------------------------ CSRF state ------------------------------ */
// Stateless, HMAC-signed state so it survives serverless cold starts and
// multi-instance deploys (no shared session store required).

const STATE_SECRET = process.env.OAUTH_STATE_SECRET ?? process.env.JWT_SECRET ?? 'krittim-dev-state-secret';

function signState(provider: Provider): string {
  const payload = Buffer.from(JSON.stringify({ p: provider, n: crypto.randomBytes(12).toString('hex'), t: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyState(state: string | undefined, provider: Provider): boolean {
  if (!state) return false;
  const [payload, sig] = state.split('.');
  if (!payload || !sig) return false;
  const expected = crypto.createHmac('sha256', STATE_SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { p?: string; t?: number };
    if (data.p !== provider) return false;
    // 10 minute window — enough for a user to complete the consent screen.
    return typeof data.t === 'number' && Date.now() - data.t < 10 * 60 * 1000;
  } catch {
    return false;
  }
}

/* --------------------------- token + profile --------------------------- */

interface NormalizedProfile {
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

async function exchangeCode(config: ProviderConfig, code: string, redirectUri: string): Promise<string> {
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
  if (!res.ok) throw new Error(`token exchange failed (${res.status})`);
  const json = await res.json() as { access_token?: string };
  if (!json.access_token) throw new Error('no access_token in provider response');
  return json.access_token;
}

async function fetchProfile(provider: Provider, config: ProviderConfig, accessToken: string): Promise<NormalizedProfile> {
  if (provider === 'google') {
    const res = await fetch(config.profileUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`google profile failed (${res.status})`);
    const p = await res.json() as { sub: string; email: string; name?: string; picture?: string };
    return { providerId: p.sub, email: p.email, name: p.name || p.email.split('@')[0], avatarUrl: p.picture };
  }

  if (provider === 'github') {
    const res = await fetch(config.profileUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'krittim-ai' },
    });
    if (!res.ok) throw new Error(`github profile failed (${res.status})`);
    const p = await res.json() as { id: number; login: string; name?: string; avatar_url?: string; email?: string | null };
    let email = p.email;
    if (!email) {
      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'krittim-ai' },
      });
      if (emailRes.ok) {
        const emails = await emailRes.json() as { email: string; primary: boolean; verified: boolean }[];
        email = emails.find((e) => e.primary && e.verified)?.email ?? emails[0]?.email ?? undefined;
      }
    }
    if (!email) throw new Error('github account has no accessible email');
    return { providerId: String(p.id), email, name: p.name || p.login, avatarUrl: p.avatar_url };
  }

  // Discord
  const res = await fetch(config.profileUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`discord profile failed (${res.status})`);
  const p = await res.json() as { id: string; email?: string; username: string; global_name?: string; avatar?: string };
  if (!p.email) throw new Error('discord account did not share an email');
  const avatar = p.avatar ? `https://cdn.discordapp.com/avatars/${p.id}/${p.avatar}.png` : undefined;
  return { providerId: p.id, email: p.email, name: p.global_name || p.username, avatarUrl: avatar };
}

/* ------------------------------- routes ------------------------------- */

function redirectWithError(res: Response, message: string): void {
  const target = `${clientAppUrl()}/auth/callback#error=${encodeURIComponent(message)}`;
  res.redirect(target);
}

router.get('/:provider', (req: Request, res: Response): void => {
  const provider = req.params.provider as Provider;
  const config = providerConfig(provider);
  if (!config) { res.status(404).json({ error: 'Unknown provider' }); return; }
  if (!config.clientId || !config.clientSecret) {
    redirectWithError(res, `${provider} login is not configured on the server`);
    return;
  }
  const redirectUri = `${baseUrl(req)}/api/auth/oauth/${provider}/callback`;
  const url = new URL(config.authorizeUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scope);
  url.searchParams.set('state', signState(provider));
  // Google: force account chooser so multi-account users can pick.
  if (provider === 'google') url.searchParams.set('prompt', 'select_account');
  res.redirect(url.toString());
});

router.get('/:provider/callback', async (req: Request, res: Response): Promise<void> => {
  const provider = req.params.provider as Provider;
  const config = providerConfig(provider);
  if (!config) { res.status(404).json({ error: 'Unknown provider' }); return; }

  if (req.query.error) { redirectWithError(res, String(req.query.error_description ?? req.query.error)); return; }
  if (!verifyState(req.query.state as string | undefined, provider)) {
    redirectWithError(res, 'Invalid or expired login session. Please try again.');
    return;
  }
  const code = req.query.code as string | undefined;
  if (!code) { redirectWithError(res, 'Missing authorization code'); return; }

  try {
    const redirectUri = `${baseUrl(req)}/api/auth/oauth/${provider}/callback`;
    const accessToken = await exchangeCode(config, code, redirectUri);
    const profile = await fetchProfile(provider, config, accessToken);

    // Upsert: match by (provider, providerId); link to an existing account by email.
    let user = await User.findOne({ provider, providerId: profile.providerId });
    if (!user) {
      const byEmail = await User.findOne({ email: profile.email.toLowerCase() });
      if (byEmail) {
        byEmail.provider = provider;
        byEmail.providerId = profile.providerId;
        if (profile.avatarUrl && byEmail.avatarUrl !== profile.avatarUrl) byEmail.avatarUrl = profile.avatarUrl;
        user = await byEmail.save();
      } else {
        user = await User.create({
          name: profile.name,
          email: profile.email.toLowerCase(),
          provider,
          providerId: profile.providerId,
          avatarUrl: profile.avatarUrl,
        });
      }
    } else if (profile.avatarUrl && user.avatarUrl !== profile.avatarUrl) {
      user.avatarUrl = profile.avatarUrl;
      await user.save();
    }

    const access = signAccess({ userId: user._id.toString(), email: user.email });
    const refresh = signRefresh({ userId: user._id.toString(), email: user.email });
    await User.findByIdAndUpdate(user._id, { refreshToken: refresh });

    const fragment = new URLSearchParams({ access_token: access, refresh_token: refresh });
    res.redirect(`${clientAppUrl()}/auth/callback#${fragment.toString()}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OAuth login failed';
    console.warn(`[oauth] ${provider} failed:`, message);
    redirectWithError(res, message);
  }
});

export default router;
