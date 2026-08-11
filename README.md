# HammerLock AI

**Privacy-first local AI assistant for sensitive work.** HammerLock keeps documents, memory, and workflows encrypted on the user's device, with cloud APIs used only when the user chooses to bring their own key.

**Demo:** [HammerLock Research Run](https://christopherhammer.dev/assets/videos/narrated/project-demos/hammerlock-research-run-narrated.mp4)  
**Portfolio context:** [https://christopherhammer.dev#use-cases](https://christopherhammer.dev#use-cases)

## Core Features

- AES-256-GCM encrypted local vault
- 11 specialized agents for research, legal, finance, drafting, strategy, and operations-style workflows
- Persistent encrypted memory path with RecallMax-style compression
- Tool Use Guardian patterns for retries, timeouts, JSON repair, and clearer tool-call failure metadata
- Bring-your-own-key provider setup for supported LLM APIs
- Local model path through Ollama when configured
- Desktop packaging path through Electron
- Next.js application surface with tests and CI workflow
- Free to download and use with no subscription, activation key, or message cap

## Why It Exists

Most AI assistants optimize for convenience first and privacy later. HammerLock starts from the opposite direction: local storage, encrypted memory, explicit configuration, and user-controlled provider choices.

Built for founders, lawyers, analysts, operators, researchers, and anyone else whose documents, strategy, client work, or financial context should not be casually pasted into a generic chatbot.

## Real Workflow Example

Ask:

> Research competitors and draft a pitch deck.

HammerLock can route that request through configured agents, model providers,
the local vault, web search, and local tools. Across the wider portfolio, the
same workflow is explored through adjacent projects:

1. **HammerLock** receives the request and selects the right specialist agent.
2. **Web Scraper** collects competitor sites, pricing pages, public claims, and
   useful source material.
3. **Real-Time Verifier** checks that URLs are live and that structured data is
   valid before the assistant relies on it.
4. **Prompt Condenser** compresses collected context to reduce token usage while
   preserving URLs, JSON, code blocks, and intent.
5. **RecallMax** restores compressed long-term memory: company positioning,
   previous research, user preferences, and open decisions.
6. **Tool Use Guardian** wraps external calls with retries, timeouts, JSON
   repair, and structured failure metadata.
7. The selected agent drafts the deliverable and can store it in the encrypted
   HammerLock vault.

The same pattern applies to compliance documents, financial analysis, legal review, private research, strategy work, and internal operating notes.

## Tech Stack

- TypeScript
- Next.js
- Electron desktop packaging path
- Prisma + SQLite local storage path
- AES-256-GCM encryption primitives
- Local/provider model configuration
- Vitest / CI checks

## Security and Privacy Docs

- [Architecture](./ARCHITECTURE.md) - local-first app layers, provider boundary, and agent workflow
- [Privacy Model](./PRIVACY.md) - what stays local, what may leave the device, and user-controlled provider tradeoffs
- [Security Policy](./SECURITY.md) - vulnerability reporting, current posture, and known limitations
- [Detailed Security Notes](./docs/SECURITY.md) - encryption primitives and vault behavior

## Current Status

Verified locally on August 11, 2026:

- `npm test` passes: 53 tests across legacy key compatibility and server crypto
- `npm run lint` passes
- `npm run build` passes: Next.js production build completes
- `npm audit --omit=dev` reports zero advisories
- Unsigned arm64 macOS application packaging completes at v0.4.0
- The bundled OpenClaw setup command and `/api/setup` endpoint complete successfully
- Billing and activation endpoints are retired; product features are unlocked

Release gates still requiring platform evidence:

- Sign, notarize, and smoke-test the distributable macOS v0.4.0 DMG
- Build and smoke-test Windows and Linux v0.4.0 artifacts
- Confirm published downloads against checksums and the first-launch flow
- Obtain independent security review before making audit or certification claims
- Replace the pinned OpenClaw prerelease when an equally clean stable release is available

## Quick Start

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Desktop build path:

```bash
npm test
npm run lint
npm run build
npm run electron:build
```

## Portfolio Context

HammerLock is the flagship of my local-first AI work. It shows product architecture around privacy, memory, tool reliability, and useful agent workflows rather than a thin chatbot wrapper.

Related repos:

- [RecallMax](https://github.com/christopherlhammer11-ai/recallmax) - long-term memory compression
- [Tool Use Guardian](https://github.com/christopherlhammer11-ai/tool-use-guardian) - reliable agent tool calls
- [Real-Time Verifier](https://github.com/christopherlhammer11-ai/real-time-verifier) - output and source validation
- [Craig](https://github.com/christopherlhammer11-ai/craig) - autonomous workflow builder

## Repository Layout

- `app/` - Next.js app routes, product pages, chat, vault, and APIs
- `components/` - UI panels for vault, settings, integrations, and permissions
- `lib/` - crypto, vault storage, agents, schedules, credentials, and routing
- `electron/` - desktop shell
- `tests/` - server crypto and legacy key-compatibility coverage

## License and Cost

HammerLock AI v0.4+ is free of charge for personal and internal business use
under the included HammerLock AI Freeware License. It is freeware, not an
open-source license. OpenClaw and other dependencies remain governed by their
own licenses. Ollama models and optional cloud providers may have their own
terms or costs; HammerLock does not resell cloud model usage.

---

Built by **Christopher L. Hammer** - self-taught AI/product builder shipping local-first tools, demos, and real product surfaces.

- Portfolio: [christopherhammer.dev](https://christopherhammer.dev)
- Proof demos: [https://christopherhammer.dev#proof](https://christopherhammer.dev#proof)
- GitHub: [christopherlhammer11-ai](https://github.com/christopherlhammer11-ai)
