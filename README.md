# Krittim AI

Premium conversational intelligence platform by **BNMPC ITC**.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| UI | shadcn/ui, Radix UI, Lucide React |
| State | Zustand + localStorage persistence |
| Fonts | DM Sans (UI), Playfair Display (wordmark italic), Geist Mono (code) |
| Backend | Node.js 20 + Express 4, TypeScript |
| Auth | JWT (access 15m + refresh 30d) — Google, GitHub, Discord, Email |
| Database | MongoDB Atlas free M0 tier via Mongoose |
| AI Routing | Custom SSE proxy with multi-provider fallback |

---

## Models

### S1 Neon — Speed & Daily Driver (default)
1. **Groq** — `llama-3.3-70b-versatile` (free, no card)
2. **Together AI** — `Llama-3.3-70B-Instruct-Turbo-Free` (free tier)
3. **OpenRouter** — `llama-3.3-70b-instruct:free` (free tier)

### R1 Xenon — Flagship Reasoning
1. **xKiro key-1** — `muse-spark-1.3`
2. **xKiro key-2** — `muse-spark-1.3` (second account, auto-rotates)
3. **apinex.bond** — `deepseek-v4.1-flash`
4. → falls back to S1 Neon chain if all above fail

Fallback is automatic on 429 / 5xx / network error.

---

## Auth

- Google OAuth
- GitHub OAuth
- Discord OAuth
- Email + Password

Sessions: JWT access token (15m) + refresh token (30d), stored in MongoDB.

---

## Chat URLs

Every chat gets a unique slug on creation: `/chat/chat-a3f9b2c1xz`

- Generated server-side, stored in MongoDB `chats.slug`
- Also stored in Zustand for instant client-side navigation
- Titles are auto-generated from the first message (like ChatGPT)
- Every new visit to `/` creates a fresh chat and redirects to its slug URL

---

## Running Locally

```bash
# Frontend
cd client
npm install
npm run dev
# → http://localhost:3000

# Backend
cd server
cp .env.example .env
# fill in .env (see API Keys section below)
npm install
npm run dev
# → http://localhost:4000
```

---

## API Keys — Where to Get Them (All Free)

### MongoDB Atlas
- https://cloud.mongodb.com → free M0 cluster → copy connection URI
- No credit card required

### Groq (S1 Neon — primary, best choice)
- https://console.groq.com → sign up → API Keys → Create Key
- **Completely free**, no credit card, 14,400 req/day, 500K tokens/day
- Fastest inference available

### Together AI (S1 Neon — fallback 1)
- https://api.together.xyz → sign up → API Keys
- Free tier with `-Free` suffix models, no credit card
- `meta-llama/Llama-3.3-70B-Instruct-Turbo-Free` is permanently free

### OpenRouter (S1 Neon — fallback 2)
- https://openrouter.ai → sign up → Keys → Create Key
- Models ending in `:free` are always free, no credit card for free tier
- `meta-llama/llama-3.3-70b-instruct:free`

### xKiro (R1 Xenon — primary)
- https://xkiro.com → sign up → API Keys
- Create **2 accounts** → get 2 keys → put in `XKIRO_API_KEY_1` and `XKIRO_API_KEY_2`
- If key-1 hits rate limit, key-2 takes over automatically

### apinex.bond (R1 Xenon — fallback)
- https://apinex.bond → sign up → API section

### OAuth (Google / GitHub / Discord)
- **Google**: https://console.cloud.google.com → APIs & Services → Credentials → Create OAuth 2.0 Client
- **GitHub**: https://github.com/settings/developers → OAuth Apps → New OAuth App
- **Discord**: https://discord.com/developers/applications → New Application → OAuth2

---

## Environment Variables

### client/.env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### server/.env
See `server/.env.example` for the full list with instructions.

---

## Project Structure

```
Krittim/
├── client/                  # Next.js frontend
│   ├── app/
│   │   ├── page.tsx         # / → redirects to /chat/[new-slug]
│   │   └── chat/[slug]/     # dynamic chat route
│   ├── components/
│   ├── store/               # Zustand (chatStore, authStore)
│   ├── lib/                 # types, utils
│   └── hooks/
├── server/                  # Express backend
│   └── src/
│       ├── ai/proxy.ts      # provider fallback + SSE
│       ├── models/          # Mongoose schemas
│       ├── routes/          # auth, chats, ai, settings
│       ├── middleware/       # JWT auth guard
│       └── lib/             # db, jwt, slug
└── database/                # schema docs
```

---

## What's Left To Do (in order)

- [ ] Wire client `sendMessage` to `POST /api/ai/stream` (replace mock)
- [ ] Wire client `createChat` to `POST /api/chats`
- [ ] Wire client auth buttons to `POST /api/auth/oauth` (NextAuth or direct)
- [ ] Sync chat list from server on login
- [ ] Deploy: Vercel (client) + Railway/Render (server) + MongoDB Atlas

---

Built by **BNMPC ITC** · Krittim AI
