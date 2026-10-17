# Krittim Database

MongoDB Atlas (free M0 tier) via Mongoose.

---

## Collections

### users
```
_id          ObjectId
name         String (required)
email        String (unique, indexed)
passwordHash String (email auth only)
avatarUrl    String
provider     'google' | 'github' | 'discord' | 'email'
providerId   String (OAuth subject ID)
plan         'free' | 'pro' | 'enterprise'  default: free
refreshToken String (hashed, rotated on every refresh)
settings     {
               theme: 'dark'|'light'|'system'
               modelId: 's1_neon'|'r1_xenon'
               reasoningMode: 'auto'|'fast'|'thinking'
               enterToSend: Boolean
               streamResponses: Boolean
               aiMemory: Boolean
             }
createdAt    Date
updatedAt    Date
```
Indexes: `email`, `(provider, providerId)`

---

### chats
```
_id           ObjectId
slug          String (unique) ← used in URL: /chat/chat-a3f9b2c1
userId        ObjectId → users._id (indexed)
title         String  default: 'New Chat' (auto-set on first message)
modelId       String  default: 's1_neon'
reasoningMode String  default: 'auto'
projectId     ObjectId → projects._id (optional)
pinned        Boolean default: false
createdAt     Date
updatedAt     Date
```
Indexes: `slug` (unique), `(userId, updatedAt desc)`

---

### messages
```
_id           ObjectId
chatId        ObjectId → chats._id (indexed)
role          'user' | 'assistant'
content       String
modelId       String (which model generated this reply)
reasoningMode String
attachments   [{ name, size, type, url? }]
createdAt     Date
```
Index: `(chatId, createdAt asc)` — efficient pagination

---

### projects
```
_id       ObjectId
userId    ObjectId → users._id (indexed)
name      String
emoji     String
color     String (tailwind gradient classes)
createdAt Date
updatedAt Date
```

---

## Slug Storage

Chat slugs (e.g. `chat-a3f9b2c1xz`) are:
- Generated server-side on `POST /api/chats`
- Stored in the `chats.slug` field (unique index)
- Used as the URL path: `https://krittim.ai/chat/chat-a3f9b2c1xz`
- Also stored in the client Zustand store for local navigation before backend sync

---

## Getting MongoDB Atlas (Free)

1. Go to https://cloud.mongodb.com
2. Sign up (free, no credit card)
3. Create a free **M0** cluster (512 MB, enough for thousands of chats)
4. Database Access → Add user with password
5. Network Access → Allow `0.0.0.0/0` (or your server IP)
6. Connect → Drivers → copy the URI → paste into `MONGODB_URI` in `.env`

---

## Client ↔ Server Sync Strategy

1. **Logged out** — chats live only in Zustand + localStorage (current behaviour)
2. **On login** — client calls `GET /api/chats` and merges with local state (server wins on conflict)
3. **While logged in** — every `createChat` / `sendMessage` / `deleteChat` hits the API; Zustand is updated optimistically
4. **On refresh** — Zustand rehydrates from localStorage instantly; background fetch syncs from server
