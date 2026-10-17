# Krittim Server

Production Node.js + Express backend for Krittim AI.

## Stack

| | |
|---|---|
| Runtime | Node.js 20+, TypeScript |
| Framework | Express 4 |
| Database | MongoDB Atlas via Mongoose |
| Auth | JWT (access 15m + refresh 30d) |
| Streaming | SSE — `text/event-stream` |
| Validation | Zod |
| Security | Helmet, CORS, express-rate-limit |

---

## Directory

```
server/src/
├── index.ts          # Express app + startup
├── ai/
│   └── proxy.ts      # Provider fallback + SSE streaming
├── lib/
│   ├── db.ts         # MongoDB connection
│   ├── jwt.ts        # Sign / verify access + refresh tokens
│   └── slug.ts       # Chat slug generator
├── middleware/
│   └── auth.ts       # requireAuth — JWT guard
├── models/
│   ├── User.ts
│   ├── Chat.ts       # has unique slug field
│   ├── Message.ts
│   └── Project.ts
└── routes/
    ├── auth.ts       # signup, login, oauth, refresh, me, logout
    ├── chats.ts      # CRUD + messages by slug
    ├── ai.ts         # POST /stream — SSE endpoint
    └── settings.ts   # user preferences
```

---

## API Reference

### Auth — `/api/auth`

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/signup` | `{name, email, password}` | Email registration |
| POST | `/login` | `{email, password}` | Email login |
| POST | `/oauth` | `{provider, providerId, name, email, avatarUrl?}` | Google/GitHub/Discord |
| POST | `/refresh` | `{refreshToken}` | Rotate tokens |
| GET | `/me` | — | Get current user (auth required) |
| POST | `/logout` | — | Invalidate refresh token |

### Chats — `/api/chats` (auth required)

| Method | Path | Description |
|---|---|---|
| GET | `/` | List all user chats |
| POST | `/` | Create chat → returns `{chat}` with slug |
| GET | `/:slug` | Get single chat |
| PATCH | `/:slug` | Rename chat |
| DELETE | `/:slug` | Delete chat + all messages |
| GET | `/:slug/messages` | Paginated messages (`?page=1&limit=50`) |

### AI — `/api/ai` (auth required, stricter rate limit)

| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/stream` | `{slug, modelId, reasoningMode, message}` | SSE stream |

SSE event shapes:
```
data: {"type":"chunk","content":"hello"}
data: {"type":"done","provider":"groq","modelId":"llama-3.3-70b-versatile"}
data: [DONE]
data: {"type":"error","message":"All providers failed"}
```

### Settings — `/api/settings` (auth required)

| Method | Path | Description |
|---|---|---|
| GET | `/` | Get user settings |
| PATCH | `/` | Update settings |

---

## AI Provider Fallback Chain

### R1 Xenon
1. xKiro key-1 (`muse-spark-1.3`)
2. xKiro key-2 (`muse-spark-1.3`) ← second account for rotation
3. apinex.bond (`deepseek-v4.1-flash`)
4. → falls through to S1 Neon chain if all above fail

### S1 Neon
1. Groq (`llama-3.3-70b-versatile`)
2. Together AI (`Llama-3.3-70B-Instruct-Turbo-Free`)
3. OpenRouter (`llama-3.3-70b-instruct:free`)

On 429 or 5xx → immediately tries next provider. No delay.

---

## Rate Limits

| Scope | Limit |
|---|---|
| Global | 200 req / 15 min per IP |
| `/api/ai/stream` | 30 req / 15 min per IP |

---

## Running

```bash
cp .env.example .env
# fill in .env values
npm install
npm run dev   # tsx watch — hot reload
npm run build # tsc → dist/
npm start     # node dist/index.js
```

---

## Environment Variables

See `.env.example` for all variables with instructions on where to get each key.
