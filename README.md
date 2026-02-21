<p align="center">
  <img src="public/brand/hammerlock-icon-192.png" alt="HammerLock AI" width="80" />
</p>

<h1 align="center">HammerLock AI</h1>

<p align="center">
  <strong>Your AI. Your Data. Your Rules.</strong><br/>
  Encrypted, local-first AI assistant with 11 specialized agents.
</p>

<p align="center">
  <a href="https://hammerlockai.com">Website</a> &bull;
  <a href="https://github.com/christopherlhammer11-ai/hammerlock/releases/latest">Download</a> &bull;
  <a href="https://hammerlockai.com/blog">Blog</a> &bull;
  <a href="https://hammerlockai.com/privacy">Privacy</a>
</p>

<p align="center">
  <img src="https://img.shields.io/github/v/release/christopherlhammer11-ai/hammerlock?style=flat-square&color=00ff88" alt="Release" />
  <img src="https://img.shields.io/github/license/christopherlhammer11-ai/hammerlock?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-blue?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/encryption-AES--256--GCM-green?style=flat-square" alt="Encryption" />
</p>

---

## What is HammerLock AI?

A desktop AI assistant that keeps your conversations **encrypted on your device**. No cloud accounts. No data leakage. No training on your conversations.

Unlike ChatGPT, Copilot, and Claude — HammerLock runs on **your machine**. Your data stays yours.

| | ChatGPT / Copilot | HammerLock AI |
|---|---|---|
| Data stored on your device | No | **Yes** |
| AES-256 encryption at rest | No | **Yes** |
| Trains on your data | Yes | **No** |
| Account required | Yes | **No** |
| Works fully offline | No | **Yes** |
| Open source | No | **Yes** |

## Features

- **AES-256-GCM encrypted vault** — All conversations, personas, and files encrypted at rest
- **11 specialized AI agents** — Strategy, Money, Legal, Content, Research, Coach, Health, Writer, Director, Analyst, Operator
- **Ollama integration** — Run Llama, Mistral, Gemma, Phi, DeepSeek 100% locally
- **Cloud model support** — GPT-4o, Claude, Gemini, Groq, Mistral, DeepSeek (bring your own key or use bundled credits)
- **Provider racing** — Automatically routes to the fastest available model
- **PII anonymization** — Scrubs personal data before any cloud query
- **Voice input/output** — Whisper transcription + text-to-speech
- **Web search** — Brave-powered with cited sources
- **PDF upload & analysis** — Upload documents for AI analysis
- **Persistent memory** — Encrypted persona loaded into every conversation
- **11 languages** — English, Spanish, Portuguese, German, French, Chinese, Japanese, Korean, Arabic, Hindi, Russian

## Download

| Platform | Download | Requirements |
|----------|----------|-------------|
| **macOS** | [HammerLock-AI.dmg](https://github.com/christopherlhammer11-ai/hammerlock/releases/latest/download/HammerLock-AI.dmg) | macOS 12+ (Apple Silicon & Intel) |
| **Windows** | [HammerLock-AI-Setup.exe](https://github.com/christopherlhammer11-ai/hammerlock/releases/latest/download/HammerLock-AI-Setup.exe) | Windows 10+ (64-bit) |
| **Linux** | [AppImage](https://github.com/christopherlhammer11-ai/hammerlock/releases/latest/download/HammerLock-AI.AppImage) / [.deb](https://github.com/christopherlhammer11-ai/hammerlock/releases/latest/download/HammerLock-AI.deb) | Ubuntu 20.04+ (64-bit) |

## Quick Start

### Option A: Fully Local (Free Forever)

1. Download and install HammerLock AI
2. Install [Ollama](https://ollama.com) and pull a model:
   ```bash
   ollama pull llama3.1
   ```
3. Launch HammerLock, set your encryption password
4. Start chatting — everything runs locally, no internet needed

### Option B: Cloud Models (Bring Your Own Key)

1. Download and install HammerLock AI
2. Go to **Sidebar > API Keys**
3. Enter your OpenAI, Anthropic, Google, or other API key
4. Start chatting — PII is scrubbed before queries leave your machine

### Option C: Pro Plan (Cloud Credits Included)

1. Subscribe at [hammerlockai.com](https://hammerlockai.com)
2. Enter your license key in the desktop app
3. Get 1,000 monthly cloud AI credits + web search + voice + PDF tools

## Pricing

| Plan | Price | What You Get |
|------|-------|-------------|
| **Free** | $0 | Ollama (local AI), encrypted vault, 15 messages |
| **Core** | $15 one-time | BYOK, all agents, unlimited messages, vault, personas |
| **Pro** | $29/month | 1,000 cloud credits, web search, voice I/O, PDF tools, reports |
| **Teams** | $49/user/month | Everything in Pro + per-seat licensing, team billing |

## Architecture

```
Electron (desktop shell)
  └── Next.js 15 (embedded server + React UI)
        ├── /app/chat      — Main chat interface
        ├── /app/api/execute — LLM routing + provider racing
        ├── /app/api/license — Database-free licensing (Stripe as source of truth)
        └── /lib
              ├── vault-store    — AES-256-GCM encrypted storage
              ├── agents         — 11 specialized agent definitions
              ├── compute-credits — Credit tracking + deduction
              └── license-keys   — Deterministic key derivation (HMAC-SHA256)
```

**Encryption:** AES-256-GCM with PBKDF2 key derivation (310,000 iterations). Your password is never stored — only a verification hash. All vault data encrypted at rest in `~/.hammerlock/`.

**Licensing:** Database-free. License keys are deterministically derived from Stripe checkout sessions via HMAC-SHA256. Stripe is the single source of truth — no SQLite, no Postgres, no database at all.

**Provider Racing:** When using cloud models, HammerLock sends requests to all configured providers with staggered delays (cheaper/faster models get a head start). First successful response wins, others are aborted.

## Development

```bash
git clone https://github.com/christopherlhammer11-ai/hammerlock.git
cd hammerlock
npm install
cp .env.example .env.local    # Add your API keys
npm run dev                    # Start Next.js dev server
npm run electron:dev           # Start Electron in dev mode
```

## Tech Stack

- **Desktop:** Electron 40
- **Framework:** Next.js 15, React 19, TypeScript
- **Encryption:** AES-256-GCM, PBKDF2
- **Local AI:** Ollama
- **Cloud AI:** OpenAI, Anthropic, Google, Groq, Mistral, DeepSeek
- **Search:** Brave Search API
- **Voice:** Whisper (STT), Web Speech API (TTS)
- **Payments:** Stripe
- **Hosting:** Vercel (website only — app runs locally)

## Privacy

- Conversations are encrypted on your device with AES-256-GCM
- Your encryption password is never stored or transmitted
- PII is automatically anonymized before cloud API calls
- No accounts required for free tier
- No telemetry, no analytics, no tracking in the desktop app
- Open source — inspect everything

See our [Privacy Policy](https://hammerlockai.com/privacy).

## License

MIT

---

<p align="center">
  <strong>Your AI. Your Data. Your Rules.</strong><br/>
  <a href="https://hammerlockai.com">hammerlockai.com</a>
</p>
