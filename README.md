# ✦ Vizzy Chat

A full-stack AI chat application built with Next.js 16. Stream conversations with large language models, generate images from text, transcribe voice to text, upload and edit images — all in a polished dark UI.

---

## Features

**Chat**
- Real-time streaming responses via Groq (primary), Gemini, and OpenRouter as fallbacks
- Markdown rendering with syntax-highlighted code blocks and copy buttons
- Conversation history persisted to PostgreSQL — pick up where you left off
- `/generate <prompt>` command to trigger image generation inline

**Images**
- Generate images from text prompts via HuggingFace FLUX.1-schnell (Pollinations.ai fallback)
- Upload images with drag & drop or camera capture
- In-chat image editor — upscale (2×/3×/4×), rotate, flip, adjust filters, before/after compare slider
- Optional 2× upscale + watermark on upload via Sharp

**Voice**
- Record audio directly in the input bar
- Transcribe to text via Groq Whisper with automatic retry on rate limits

**Auth & Security**
- Clerk authentication — sign in / sign up, webhook-synced user records
- Per-user rate limiting on the chat route via Upstash Redis (sliding window, 20 req/60s)
- File upload validation — MIME type allowlist, 10 MB size cap, Sharp content verification

**UI**
- Pure dark theme — `#0d0d0d` background, `#3b82f6` accent
- Plus Jakarta Sans + Instrument Serif typography
- Responsive — fixed 268px sidebar on desktop, Sheet drawer on mobile
- Framer Motion animations throughout

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Auth | Clerk |
| Database | PostgreSQL + Prisma 5 |
| Primary AI | Groq — `llama-3.3-70b-versatile` |
| AI Fallbacks | Google Gemini 2.0 Flash, OpenRouter |
| Image Generation | HuggingFace FLUX.1-schnell / Pollinations.ai |
| Speech-to-Text | Groq Whisper |
| File Storage | Cloudflare R2 (local `public/` fallback) |
| Rate Limiting | Upstash Redis + @upstash/ratelimit |
| Job Queue | BullMQ + ioredis |
| UI Components | shadcn/ui (base-ui) + Tailwind CSS v4 |
| State | Zustand + TanStack Query |
| Animations | Framer Motion |
| Image Processing | Sharp |

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/vizzy-chat.git
cd vizzy-chat
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the values — see the [Environment Variables](#environment-variables) section below.

### 3. Push the database schema

```bash
npm run db:push
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To also run the BullMQ image worker:

```bash
npm run dev:all
```

---

## Environment Variables

```env
# ── Database ──────────────────────────────────────────────────
# PostgreSQL — Supabase, Neon, Railway, or local
DATABASE_URL="postgresql://user:password@host:5432/vizzy"
DIRECT_URL="postgresql://user:password@host:5432/vizzy"   # Supabase direct (optional)

# ── Clerk Auth ────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"

# ── AI — Chat ─────────────────────────────────────────────────
# Groq (primary) — https://console.groq.com
# Free tier: 14,400 requests/day
GROQ_API_KEY="gsk_..."

# Google Gemini (fallback) — https://aistudio.google.com/apikey
# Free tier: 1,500 requests/day per project
GEMINI_API_KEY="AIza..."

# OpenRouter (last resort) — https://openrouter.ai/keys
OPENROUTER_API_KEY="sk-or-..."

# ── AI — Image Generation ─────────────────────────────────────
# HuggingFace — https://huggingface.co/settings/tokens
# Optional — falls back to Pollinations.ai (free, no key needed)
HUGGINGFACE_API_TOKEN="hf_..."

# ── Cloudflare R2 — File Storage ──────────────────────────────
# Optional — falls back to local public/uploads/
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""          # e.g. https://pub-xxx.r2.dev

# ── Upstash Redis — Rate Limiting ─────────────────────────────
# https://console.upstash.com — create a Redis database
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXxx..."

# BullMQ worker uses ioredis format
UPSTASH_REDIS_URL="rediss://default:xxx@xxx.upstash.io:6379"

# ── App ───────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Required vs optional

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Any PostgreSQL provider |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | |
| `CLERK_SECRET_KEY` | ✅ | |
| `CLERK_WEBHOOK_SECRET` | ✅ | Set up endpoint in Clerk dashboard |
| `GROQ_API_KEY` | ✅ | Primary chat + voice transcription |
| `GEMINI_API_KEY` | ⚠️ Optional | Chat fallback |
| `OPENROUTER_API_KEY` | ⚠️ Optional | Chat last resort |
| `HUGGINGFACE_API_TOKEN` | ⚠️ Optional | Falls back to Pollinations.ai |
| `R2_*` | ⚠️ Optional | Falls back to `public/uploads/` |
| `UPSTASH_REDIS_REST_URL/TOKEN` | ⚠️ Optional | Rate limiting skipped if absent |
| `UPSTASH_REDIS_URL` | ⚠️ Optional | BullMQ worker only |

---

## Scripts

```bash
npm run dev        # Dev server (4 GB heap)
npm run build      # Production build
npm run start      # Production server
npm run lint       # ESLint
npm run db:push    # Push Prisma schema to database
npm run worker     # BullMQ image worker (separate process)
npm run dev:all    # Dev server + worker concurrently
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Sign-in / sign-up pages
│   ├── api/
│   │   ├── chat/            # Streaming chat — Groq → Gemini → OpenRouter
│   │   ├── conversations/   # CRUD for conversation history
│   │   ├── images/          # generate + status endpoints
│   │   ├── stt/             # Speech-to-text via Groq Whisper
│   │   ├── upload/          # Image upload with validation
│   │   └── webhooks/clerk/  # User sync webhook
│   ├── globals.css          # Tailwind v4 + design tokens
│   ├── layout.tsx           # Fonts, providers
│   └── page.tsx             # App shell
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx    # Main chat view + input bar
│   │   ├── MessageBubble.tsx    # Message row with markdown + image editor
│   │   └── TypingIndicator.tsx  # Animated dots
│   ├── images/
│   │   ├── DropzoneUpload.tsx       # Drag & drop + camera capture
│   │   ├── ImageCompare.tsx         # Before/after slider
│   │   ├── ImageGallery.tsx         # Gallery view
│   │   └── ImageOperationsModal.tsx # Upscale, transform, filters, compare
│   ├── sidebar/
│   │   └── Sidebar.tsx   # Desktop sidebar + mobile Sheet drawer
│   ├── ui/               # shadcn/ui components
│   └── voice/
│       └── VoiceRecorder.tsx  # Record + transcribe
├── hooks/
│   └── useImageGeneration.ts  # Optimistic image gen with polling
├── lib/
│   ├── clients/
│   │   ├── gemini.ts       # Gemini client
│   │   ├── groq.ts         # Groq STT client
│   │   ├── huggingface.ts  # Image generation with retry
│   │   ├── openrouter.ts   # OpenRouter chat client
│   │   └── r2.ts           # Cloudflare R2 upload
│   ├── db.ts               # Prisma singleton
│   ├── queue.ts            # BullMQ queue
│   └── validators.ts       # Zod schemas
├── store/
│   ├── useChatStore.ts     # Messages, loading, active conversation
│   └── useUserStore.ts     # User profile
└── worker/
    └── image.worker.ts     # BullMQ image processing worker
```

---

## Deployment

### Vercel (recommended)

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add all environment variables in the Vercel dashboard
4. Deploy

> **Note:** The BullMQ worker (`npm run worker`) is a long-running Node process — it cannot run on Vercel serverless functions. For production, run it on a separate server (Railway, Fly.io, a VPS) or replace BullMQ with a serverless-compatible queue like Inngest or Trigger.dev.

### Clerk Webhook

After deploying, set up the Clerk webhook so user records sync to your database:

1. Clerk Dashboard → Webhooks → Add endpoint
2. URL: `https://your-domain.com/api/webhooks/clerk`
3. Events: `user.created`, `user.updated`, `user.deleted`
4. Copy the signing secret → set as `CLERK_WEBHOOK_SECRET`
