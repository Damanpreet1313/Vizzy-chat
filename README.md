<div align="center">

<img src="public/bot-avatar.png" alt="Vizzy Chat Logo" width="80" />

# Vizzy Chat

**A full-stack AI chat application with image generation, voice input, and persistent conversations.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-purple?logo=clerk)](https://clerk.com)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?logo=prisma)](https://www.prisma.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[Features](#features) · [Tech Stack](#tech-stack) · [Getting Started](#getting-started) · [Environment Variables](#environment-variables) · [Deployment](#deployment)

</div>

---

## Features

- 🤖 **AI Chat** — Streaming responses via [OpenRouter](https://openrouter.ai) (auto-selects best model), with a free [Pollinations.ai](https://pollinations.ai) fallback when no API key is set
- 🎨 **Image Generation** — Type `/generate <prompt>` to create images using FLUX.1-schnell on HuggingFace, with automatic Pollinations.ai fallback
- 🎙️ **Voice Input** — Record audio messages transcribed to text using Groq Whisper (`whisper-large-v3`)
- 💬 **Persistent Conversations** — Full conversation history stored in PostgreSQL, accessible from the sidebar
- 🌗 **Dark / Light Mode** — System-aware theme toggle
- ☁️ **Cloud Storage** — Generated images stored on Cloudflare R2, with local filesystem fallback for development
- 🔐 **Auth** — Sign-up, sign-in, and webhook sync powered by Clerk
- 🛡️ **Rate Limiting** — Per-user sliding window rate limiting on all AI endpoints via Upstash

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Auth | Clerk |
| Database | PostgreSQL + Prisma |
| AI / LLM | OpenRouter → Pollinations.ai (fallback) |
| Image Gen | HuggingFace FLUX.1-schnell → Pollinations.ai (fallback) |
| Voice STT | Groq Whisper |
| Storage | Cloudflare R2 → Local (fallback) |
| State | Zustand + TanStack Query |
| UI | Tailwind CSS v4 + shadcn/ui + Framer Motion |
| Queue | BullMQ + Upstash Redis |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (local or hosted e.g. [Neon](https://neon.tech))
- A [Clerk](https://clerk.com) account (free tier works)

> **Zero-config mode:** Vizzy Chat runs without any paid API keys. LLM chat and image generation both fall back to free Pollinations.ai endpoints automatically. You only need Clerk + a database to get started.

### 1. Clone & Install

```bash
git clone https://github.com/Damanpreet1313/Vizzy-chat.git
cd Vizzy-chat
npm install
```

### 2. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Fill in the values — see [Environment Variables](#environment-variables) below.

### 3. Set Up the Database

```bash
npx prisma db push
```

### 4. Run the Development Server

```bash
# Chat + UI only
npm run dev

# Chat + image worker (for BullMQ queue)
npm run dev:all
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Create a `.env.local` file in the project root. Only the variables marked **Required** are needed to run the app — everything else unlocks additional features.

```env
# ── Database (Required) ────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/vizzy

# ── Clerk Auth (Required) ──────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...          # For syncing users via Clerk webhooks

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# ── App URL ────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── LLM — OpenRouter (Optional, falls back to Pollinations.ai) ─────
OPENROUTER_API_KEY=sk-or-...

# ── Image Generation — HuggingFace (Optional, falls back to Pollinations.ai)
HUGGINGFACE_API_TOKEN=hf_...

# ── Voice STT — Groq (Optional) ───────────────────────────────────
GROQ_API_KEY=gsk_...

# ── Cloud Storage — Cloudflare R2 (Optional, falls back to local) ──
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=vizzy-chat
R2_PUBLIC_URL=https://pub-<hash>.r2.dev

# ── Rate Limiting — Upstash Redis (Optional) ──────────────────────
UPSTASH_REDIS_URL=rediss://...
UPSTASH_REDIS_TOKEN=...
```

### Clerk Webhook Setup

1. In your Clerk dashboard, go to **Webhooks → Add Endpoint**
2. Set the URL to `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to the `user.created` and `user.updated` events
4. Copy the signing secret into `CLERK_WEBHOOK_SECRET`

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/            # Sign-in / Sign-up pages (Clerk)
│   ├── api/
│   │   ├── chat/          # Streaming LLM chat endpoint (rate limited + validated)
│   │   ├── conversations/ # CRUD for conversation history
│   │   ├── images/        # Image generation + job status polling
│   │   ├── stt/           # Voice → text (Groq Whisper)
│   │   └── webhooks/      # Clerk user sync
│   └── page.tsx           # Main app shell
├── components/
│   ├── chat/              # ChatInterface, MessageBubble, TypingIndicator
│   ├── sidebar/           # Conversation history sidebar
│   ├── voice/             # Voice recorder
│   └── ui/                # shadcn/ui primitives
├── hooks/                 # useImageGeneration
├── lib/
│   ├── clients/           # openrouter, huggingface, groq, r2
│   ├── db.ts              # Prisma client singleton
│   ├── queue.ts           # BullMQ + Redis queue
│   └── validators.ts      # Zod schemas
├── store/                 # Zustand stores (chat, user)
└── worker/                # Image generation background worker
prisma/
└── schema.prisma          # User, Conversation, Message, ImageJob models
```

---

## Usage

### Chat

Type a message and press **Enter** (or **Shift+Enter** for a new line). Responses stream in real time and are saved to your conversation history automatically.

### Image Generation

```
/generate a neon-lit cyberpunk city at night
```

Type `/generate` followed by your prompt, or use the **⊕ → Generate Image** button in the toolbar.

### Voice Input

Click the microphone icon, speak, and your audio is transcribed via Groq Whisper and inserted into the message box.

---

## License

[MIT](LICENSE) © Damanpreet Singh