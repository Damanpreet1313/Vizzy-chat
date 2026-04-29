# Vizzy Chat

A full-stack AI chat application built with Next.js 16, featuring real-time streaming, voice input, image generation, and image editing — all in a polished dark/light UI.

![Vizzy Chat](public/bot-avatar.png)

## Features

- **Streaming chat** — real-time responses via OpenRouter (supports GPT-4o, Claude, Gemini, etc.)
- **Voice input** — record audio and transcribe with Groq Whisper
- **Image generation** — generate images from text prompts via HuggingFace FLUX or Pollinations.ai fallback
- **Image operations** — upscale, rotate/flip, apply filters, and compare before/after directly in chat
- **Image upload** — drag & drop or camera capture with optional 2× upscale + watermark
- **Conversation history** — persisted to PostgreSQL via Prisma
- **Auth** — Clerk authentication (sign in / sign up)
- **Rate limiting** — per-user sliding window via Upstash Redis
- **Dark & light theme** — full theme switching with next-themes

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth | Clerk |
| Database | PostgreSQL + Prisma |
| AI Chat | OpenRouter API |
| Image Gen | HuggingFace Inference API / Pollinations.ai |
| STT | Groq Whisper |
| Storage | Cloudflare R2 (or local fallback) |
| Rate Limiting | Upstash Redis + @upstash/ratelimit |
| UI | Tailwind CSS v4 + shadcn/ui (base-ui) |
| State | Zustand + TanStack Query |
| Animations | Framer Motion |

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/vizzy-chat.git
cd vizzy-chat
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

See [Environment Variables](#environment-variables) below for details on each key.

### 3. Set up the database

```bash
npm run db:push
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Create a `.env.local` file in the project root with the following:

```env
# ── Database ──────────────────────────────────────────────────
# PostgreSQL connection string (e.g. from Neon, Supabase, or local)
DATABASE_URL="postgresql://user:password@host:5432/vizzy"

# ── Clerk Auth ────────────────────────────────────────────────
# Get these from https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."          # From Clerk → Webhooks

# Clerk redirect URLs (leave as-is for local dev)
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"

# ── OpenRouter (AI Chat) ──────────────────────────────────────
# Get your key from https://openrouter.ai/keys
OPENROUTER_API_KEY="sk-or-..."

# ── Groq (Speech-to-Text) ─────────────────────────────────────
# Get your key from https://console.groq.com
GROQ_API_KEY="gsk_..."

# ── HuggingFace (Image Generation) ───────────────────────────
# Get your token from https://huggingface.co/settings/tokens
# Optional — falls back to Pollinations.ai (free, no key needed)
HUGGINGFACE_API_TOKEN="hf_..."

# ── Cloudflare R2 (File Storage) ─────────────────────────────
# Create a bucket at https://dash.cloudflare.com → R2
# Leave blank to use local public/uploads fallback
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""
R2_PUBLIC_URL=""                          # e.g. https://pub-xxx.r2.dev

# ── Upstash Redis (Rate Limiting) ─────────────────────────────
# Create a database at https://console.upstash.com
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXxx..."

# Used by BullMQ worker (ioredis format)
UPSTASH_REDIS_URL="rediss://default:xxx@xxx.upstash.io:6379"
```

### Which keys are required?

| Key | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | Any PostgreSQL provider works |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ Yes | |
| `CLERK_SECRET_KEY` | ✅ Yes | |
| `CLERK_WEBHOOK_SECRET` | ✅ Yes | Set up webhook in Clerk dashboard |
| `OPENROUTER_API_KEY` | ✅ Yes | Powers the chat |
| `GROQ_API_KEY` | ⚠️ Optional | Voice input won't work without it |
| `HUGGINGFACE_API_TOKEN` | ⚠️ Optional | Falls back to Pollinations.ai |
| `R2_*` variables | ⚠️ Optional | Falls back to local `public/uploads` |
| `UPSTASH_REDIS_REST_URL/TOKEN` | ✅ Yes | Required for rate limiting |
| `UPSTASH_REDIS_URL` | ⚠️ Optional | Only needed for the BullMQ worker |

---

## Scripts

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run db:push      # Push Prisma schema to database
npm run worker       # Start BullMQ image worker (separate process)
npm run dev:all      # Run dev server + worker concurrently
```

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Sign-in / sign-up pages
│   ├── api/
│   │   ├── chat/        # Streaming chat endpoint
│   │   ├── conversations/
│   │   ├── images/      # Generate + status endpoints
│   │   ├── stt/         # Speech-to-text
│   │   ├── upload/      # Image upload
│   │   └── webhooks/    # Clerk webhook handler
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── chat/            # ChatInterface, MessageBubble, TypingIndicator
│   ├── images/          # DropzoneUpload, ImageOperationsModal, ImageCompare
│   ├── sidebar/         # Sidebar with mobile Sheet drawer
│   ├── ui/              # shadcn/ui components
│   └── voice/           # VoiceRecorder
├── hooks/               # useImageGeneration
├── lib/
│   ├── clients/         # gemini, groq, huggingface, openrouter, r2
│   ├── db.ts            # Prisma client
│   ├── queue.ts         # BullMQ queue
│   └── validators.ts    # Zod schemas
├── store/               # Zustand stores
└── worker/              # BullMQ image worker
```

## Deployment

The easiest way to deploy is [Vercel](https://vercel.com):

1. Push to GitHub
2. Import the repo in Vercel
3. Add all environment variables in the Vercel dashboard
4. Deploy

> **Note:** The BullMQ worker (`npm run worker`) is a long-running Node process and cannot run on Vercel's serverless functions. For production image processing queues, run it on a separate server (Railway, Fly.io, a VPS, etc.) or replace BullMQ with a serverless-compatible queue.

## License

MIT
