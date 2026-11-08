# Krittim AI — Storage, Limits & Scaling (the honest version)

You asked the right questions: *where does everything live, MongoDB is only
512 MB, and where do uploaded files / generated images go?* Here's exactly how
it works today and the plan as you grow.

## What's stored where

| Data | Where | Size impact |
|---|---|---|
| Users, sessions (JWT refresh) | MongoDB `users` | tiny |
| Chats + messages (text) | MongoDB `chats` / `messages` | text is small — 512 MB holds **hundreds of thousands** of messages |
| Web-search citations | MongoDB `messages.sources` | tiny (URLs + titles) |
| Projects (folders) | MongoDB `projects` | tiny |
| Attached files | **metadata only** (name/size/type) in `messages.attachments` | tiny — the bytes are **not** stored (see below) |
| Generated images | image **URL** stored in the message | tiny — unless the provider returns base64 (see below) |

## The 512 MB reality

512 MB of MongoDB is a LOT of text. A chat message averages ~1–2 KB. That's
roughly **250,000–500,000 messages** before you'd ever worry. Chat history is
not your bottleneck on the free tier — **binary files are**, which is why we
deliberately don't put them in Mongo.

## Files you attach (images, PDFs, code…)

Right now attachments are **preview-only metadata** — the app reads the file in
the browser to show a thumbnail and name, but does **not** upload the bytes.
That means:

- ✅ Nothing bloats MongoDB.
- ✅ No storage bill.
- ⚠️ The model can't actually read the file's *contents* yet (it only sees the
  name/type you mention in the prompt).

**Limits enforced (server-side, not just UI):**
- Max **8 MB** per file.
- Max **5 files per day** per user on the free plan (abuse guard). Exceeding it
  returns a clear `429` error.

## Generated images

When you ask for an image, the provider (xKiro) returns either a **URL** or a
**base64** blob:

- **URL** → we store the URL in the message. Tiny. ✅
- **base64** → we render it live, but storing megabytes of base64 in Mongo would
  eat the 512 MB fast, so this is the one thing to move off Mongo first.

## When you outgrow free — the upgrade path (all have free tiers)

1. **Binary storage → Cloudinary or Vercel Blob.** Upload file/image bytes there,
   store only the returned URL in Mongo. Cloudinary's free tier is generous
   (25 GB storage/bandwidth) and needs no card. This is the single highest-value
   upgrade and is a small, drop-in change to the `/api/ai/image` and attachment
   paths.
2. **MongoDB** → if text ever grows past 512 MB, move to MongoDB's paid tiers or
   self-host; but realistically you won't hit this for a long time.
3. **Old messages** → a simple TTL/archive job can cold-store ancient chats.

## TL;DR for you

- **Chats/text: fine on free Mongo for a very long time.**
- **Attachments: metadata-only today, capped at 8 MB each / 5 per day.**
- **Images: stored as URLs; base64 images are the one thing to offload to
  Cloudinary/Vercel Blob when you're ready (I can wire that in a future pass).**

If you want, say the word and I'll add the Cloudinary/Vercel Blob upload path so
attached files and generated images get real, permanent storage with URLs.
