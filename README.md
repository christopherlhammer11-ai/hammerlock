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

## Why It Exists

Most AI assistants optimize for convenience first and privacy later. HammerLock starts from the opposite direction: local storage, encrypted memory, explicit configuration, and user-controlled provider choices.

Built for founders, lawyers, analysts, operators, researchers, and anyone else whose documents, strategy, client work, or financial context should not be casually pasted into a generic chatbot.

## Real Workflow Example

Ask:

> Research competitors and draft a pitch deck.

HammerLock can route that through:

1. A specialist research or strategy agent
2. Web scraping for competitor pages, pricing, and public claims
3. Real-Time Verifier-style source checks
4. Prompt Condenser-style context reduction
5. RecallMax-style memory restore for company context and prior decisions
6. Tool Use Guardian-style retries, timeouts, and repair metadata
7. Encrypted vault storage for the final draft

The same pattern applies to compliance documents, financial analysis, legal review, private research, strategy work, and internal operating notes.

## Tech Stack

- TypeScript
- Next.js
- Electron desktop packaging path
- Prisma + SQLite local storage path
- AES-256-GCM encryption primitives
- Local/provider model configuration
- Vitest / CI checks

## Quick Start

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Desktop build path:

```bash
npm run electron:build
```

## Portfolio Context

HammerLock is the flagship of my local-first AI work. It shows product architecture around privacy, memory, tool reliability, and useful agent workflows rather than a thin chatbot wrapper.

Related repos:

- [RecallMax](https://github.com/christopherlhammer11-ai/recallmax) - long-term memory compression
- [Tool Use Guardian](https://github.com/christopherlhammer11-ai/tool-use-guardian) - reliable agent tool calls
- [Real-Time Verifier](https://github.com/christopherlhammer11-ai/real-time-verifier) - output and source validation
- [Craig](https://github.com/christopherlhammer11-ai/craig) - autonomous workflow builder

---

Built by **Christopher L. Hammer** - self-taught AI/product builder shipping local-first tools, demos, and real product surfaces.

- Portfolio: [christopherhammer.dev](https://christopherhammer.dev)
- Proof demos: [https://christopherhammer.dev#proof](https://christopherhammer.dev#proof)
- GitHub: [christopherlhammer11-ai](https://github.com/christopherlhammer11-ai)

