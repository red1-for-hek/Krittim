# Krittim AI — Setup Guide (what YOU provide, and exactly where it goes)

Everything runs on **free tiers**. You only need to create accounts and paste
keys/IDs into environment variables. No code changes required for any of this.

There are **two deploy targets**:

| Target | What it is | Where env vars go |
|---|---|---|
| **Server** (`server/`) | Express API + OAuth + AI proxy | Your server host (Render / Railway / Vercel) → Environment |
| **Client** (`client/`) | Next.js frontend | Vercel → Project Settings → Environment Variables |

> Rule of thumb: **all secrets live on the SERVER.** The client only ever gets
> `NEXT_PUBLIC_API_URL` (the server's public URL). Never put provider keys in
> the client.

---

## 1. MongoDB Atlas (database) — free, no card

1. https://cloud.mongodb.com → sign up → **Create → M0 (Free)**.
2. **Database Access → Add New Database User** → set a username + password (save the password).
3. **Network Access → Add IP → `0.0.0.0/0`** (allow from anywhere — required for serverless).
4. **Connect → Drivers** → copy the URI.
5. Put it on the **server** as:
   ```
   MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxx.mongodb.net/krittim?retryWrites=true&w=majority
   ```

---

## 2. JWT secrets (session security)

Generate two random 64-byte hex strings on any machine with Node:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Put them on the **server**:
```
JWT_SECRET=<first value>
JWT_REFRESH_SECRET=<second value>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
```

---

## 3. AI provider keys (the models) — all free

**S1 Neon (fast, default) — Groq**
1. https://console.groq.com → sign up → **API Keys → Create Key**.
2. Put 1–5 keys on the **server** as `GROQ_API_KEY_1`, `GROQ_API_KEY_2`, … (more keys = more free quota, auto round-robin).

**R1 Xenon (flagship reasoning) — xKiro**
1. https://xkiro.com → sign up → API Keys. Make **2 accounts** → 2 keys.
2. **Server**:
   ```
   XKIRO_API_KEY_1=<account 1 key>
   XKIRO_API_KEY_2=<account 2 key>
   XKIRO_API_KEY_image=<an image-capable key>
   ```

**R1 Xenon fallback — apinex.bond**
1. https://apinex.bond → sign up → API section → copy key.
2. **Server**: `APINEX_API_KEY=<key>`.

> Model names already have sensible defaults in the code. You usually don't
> need to touch `*_MODEL` unless a provider changes theirs.

---

## 4. OAuth apps — Google · GitHub · Discord (the login buttons)

For each provider you create an app, then set the **Authorized redirect URI /
Callback URL** to:

```
https://<YOUR-SERVER-URL>/api/auth/oauth/<provider>/callback
```

`<YOUR-SERVER-URL>` is the public URL of your server deploy (see step 6).
Example: `https://krittim-api.onrender.com/api/auth/oauth/google/callback`

Then copy the **Client ID** and **Client Secret** into the **server** env.

### Google
1. https://console.cloud.google.com → **APIs & Services → Credentials**.
2. **Create Credentials → OAuth client ID → Web application**.
3. **Authorized redirect URIs** → add the callback URL above.
4. Configure the **OAuth consent screen** (External) and add scopes `email` and `profile`.
5. Copy Client ID / Secret → server: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

### GitHub
1. https://github.com/settings/developers → **OAuth Apps → New OAuth App**.
2. **Authorization callback URL** → the callback URL above.
3. Copy Client ID → generate a **Client Secret** → server: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.

### Discord
1. https://discord.com/developers/applications → **New Application**.
2. **OAuth2 → Redirects → Add Redirect** → the callback URL above.
3. Copy **Client ID** and **Client Secret** (Reset Secret) → server: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`.

> You can enable just one, two, or all three. Any provider missing its keys
> simply shows a friendly "not configured" message instead of breaking login.

---

## 5. Client environment variable

On **Vercel (client project)** add exactly one variable:
```
NEXT_PUBLIC_API_URL=https://<YOUR-SERVER-URL>
```
(For local dev: `http://localhost:4000`.)

---

## 6. Deploy order (important)

1. **Deploy the server first** (Render / Railway / Vercel). Copy its public URL.
2. On the server, set:
   ```
   CLIENT_APP_URL=https://<YOUR-CLIENT-URL>      # your Vercel frontend URL
   CLIENT_ORIGIN=https://<YOUR-CLIENT-URL>       # same value, for CORS
   OAUTH_REDIRECT_BASE=https://<YOUR-SERVER-URL> # this server's own URL
   OAUTH_STATE_SECRET=<any random string>        # signs login state
   ```
3. Go back and finish **step 4** using that server URL in each callback URI.
4. **Deploy the client** with `NEXT_PUBLIC_API_URL` pointing at the server.
5. Redeploy both once after adding keys so the new env values take effect.

### Local dev
```bash
# server/.env
CLIENT_APP_URL=http://localhost:3000
CLIENT_ORIGIN=http://localhost:3000
OAUTH_REDIRECT_BASE=http://localhost:4000
NODE_ENV=development
# …plus your keys from steps 1–4

# client/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
```
Then `npm run dev` in both `server/` and `client/`.

---

## 7. Full server env checklist

Copy `server/.env.example` → `server/.env` and fill in:

```
MONGODB_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
GOOGLE_CLIENT_ID=            GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=            GITHUB_CLIENT_SECRET=
DISCORD_CLIENT_ID=           DISCORD_CLIENT_SECRET=
GROQ_API_KEY_1=              (…optional GROQ_API_KEY_2..5)
XKIRO_API_KEY_1=             XKIRO_API_KEY_2=             XKIRO_API_KEY_image=
APINEX_API_KEY=
CLIENT_APP_URL=              CLIENT_ORIGIN=               OAUTH_REDIRECT_BASE=   OAUTH_STATE_SECRET=
```

---

## How login works now (for your understanding)

- Clicking **Google/GitHub/Discord** sends the browser to our server, which
  redirects to the provider. The server holds the secrets — the browser never
  sees them.
- The provider redirects back to `/api/auth/oauth/:provider/callback` on our
  server, which verifies a signed anti-CSRF `state`, exchanges the code for a
  profile, creates/links the account in MongoDB, and mints our own JWT pair.
- The server bounces the browser to `/auth/callback#access_token=…&refresh_token=…`
  (the `#` fragment is never sent to servers or logged). The SPA reads it,
  stores the tokens, and clears the URL bar.
- **Email + password** still works directly against `/api/auth/signup|login`.
