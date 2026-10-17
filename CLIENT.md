# Krittim AI — Client Spec (frontend-first rebuild)

> Why the old frontend felt "heavy": `framer-motion` on ~8 components (springs,
> `AnimatePresence`, `layoutId` pills), `react-syntax-highlighter/Prism` (~500KB)
> for every code block, and multi-layer `backdrop-blur-2xl` + 50vmax blurred
> blobs animating on the GPU. All of that is gone in this rebuild. Same features,
> ~10x lighter runtime.

## 1. Product idea (1 line)
ChatGPT-like multi-provider chat platform. Frontend-first with a mock
streaming engine shaped exactly like a future SSE feed, so the backend can drop
in with zero UI changes.

## 2. Feature inventory (everything from the old UI — all kept)

| Area | Features / options |
|---|---|
| Sidebar (desktop 260px ⇄ 68px rail, mobile drawer) | New Chat (⌘K hint), Settings, collapsible Projects group (emoji + gradient badge, per-project chat count, new-chat-in-project), searchable chat history grouped Today / Yesterday / Previous 7 days / Previous 30 days / Older, relative timestamps, pinned dots, rename (inline) + delete (2-step confirm), active-chat pill, footer credit |
| TopBar (sticky glass) | Model switcher: **Krittim R1 Xenon** (Flagship, complex tasks) · **Krittim S1 Neon** (Speed, daily tasks); animated chat title, message-count chip, streaming badge, ProfileButton (Log in / Sign up → avatar menu: profile, customize, logout, plan line) |
| Welcome (empty state) | Brand sigil, "Welcome to Krittim" word-reveal headline, "by BNMPC ITC", tagline line, centered composer |
| Composer | Auto-resize textarea (8 rows max), Attach (≤6 files, image preview thumbnails, size labels, removable chips), voice dictation (Web Speech API, live waveform + interim transcript, error line), reasoning mode Auto / Lightning / Thinking, Send ⇄ Stop morph, Enter-to-send setting, helper hint line |
| Thread | User bubbles (right, copy + timestamp on hover), assistant rows (K avatar, model name + mode chip, GFM markdown: tables/lists/links/quotes, light code cards with lang rail + copy, inline-code chips), thinking-dots state, streaming cursor, rAF pin-to-bottom, skeleton on thread switch |
| Palette (⌘K) | Fuzzy filter, groups Commands / Models / Chats, full keyboard nav (↑↓ Enter Esc), recent-6 chats, footer hints |
| Settings (tabs) | Appearance: Dark / Light / System + accent preview + timestamps toggle. Chat: AI Memory, Stream responses, Enter-to-send. Account: mock Google/GitHub user card or Log-in. Data: Clear chats + Clear storage (tap-again confirm) |
| Global | Theme no-flash bootstrap (dark default, OS sync), shortcuts ⌘K palette · ⌘, settings · ⌘[/⌘J sidebar, toasts, localStorage persist (chats, messages, model, mode, prefs), mock auth + mock streaming replies (greeting / code / RAG explainer / default planner) |

## 3. New design language (my take — premium but cheap on GPU)
- **One accent, one job:** deep emerald `#10b981`-family. Used only for active
  states, glows, and the K mark. Everything else is neutral zinc/green-tinted
  surfaces. No rainbow gradients.
- **Motion budget:** transform + opacity only, ≤300ms, `prefers-reduced-motion`
  respected. Entrance = one `fade-up` stagger (CSS `animation-delay`, no JS
  lib). No layout animations, no `layoutId`, no spring physics in JS.
- **Depth without blur cost:** blur is limited to TopBar + composer + modals.
  Bubbles, rows, chips are flat `1px hairline` surfaces. Background is one
  static radial wash + one slow-drifting blob (disabled on mobile / reduced
  motion) + dot-matrix + grain.
- **Type:** Inter (UI, tight tracking on headings), Geist Mono (timestamps,
  code, counts), Instrument Serif italic (single accent word: brand footer,
  "by BNMPC ITC"). Base 15–16px thread text, 13px sidebar rows, 10–11px
  eyebrow labels with 0.14em tracking.
- **Copy tone:** short, confident, engineering-flavoured. Composer placeholder:
  "Ask Krittim anything…". Empty thread tagline: "Refined intelligence for
  complex reasoning, system architectures, and engineering execution."
- **Responsive:** mobile-first. `100dvh`, safe-area padding on composer,
  44px touch targets, drawer sidebar with scrim, composer sticky bottom,
  thread `max-w-3xl` centered, tables scroll-x, code cards scroll-x.

## 4. Performance rules (must hold on low-end mobile)
1. No `framer-motion`. No `react-syntax-highlighter`. No runtime highlight lib.
2. Code blocks = plain `<pre>` + mono font + header rail. Highlighting can
   come later via a ~5KB tokenizer, never Prism.
3. One `backdrop-blur` layer visible at a time where possible; never on
   scrolling rows.
4. Streaming ticker writes via Zustand only (already rAF-batched scroll);
   markdown memoizes per message.
5. `content-visibility: auto` on far-off messages (later pass, backend phase).
6. Persisted slice stays whitelisted — ephemeral chrome never hits disk.

## 5. Backend handoff (next phase, not this pass)
- `sendMessage` / `stopStreaming` in `store/chatStore.ts` already mirror an SSE
  shape: push user turn → 620ms latency → open assistant bubble → append
  tokens. Backend only replaces `mockReply` + ticker with `fetch(...)/reader`.
- Multi-provider routing lands in `ModelId` (`r1_xenon` / `s1_neon` today) —
  extend the union, UI needs no changes.
- Attachments are metadata-only previews today; upload API plugs into
  `PendingFile` → `AttachmentMeta`.
