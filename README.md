# HammerLock AI

Privacy-first local AI assistant with encrypted memory, local vault storage, and
agent workflows designed around user control.

HammerLock exists for people who want AI help without turning every private
document, note, credential, workflow, and preference into another cloud
dependency. It is the flagship privacy product in Christopher Hammer's AI
portfolio.

## Product Promise

Your AI. Your data. Your rules.

- Local-first assistant experience
- AES-256-GCM encrypted vault storage
- 11 specialized agents for different work modes
- Local credential vault and browser automation paths
- PDF, note, memory, schedule, and action workflows
- Bring-your-own API keys for supported LLM providers
- Desktop packaging path through Electron

## Why It Matters

Most AI assistants optimize for convenience first and privacy later. HammerLock
starts from the opposite direction: local storage, encrypted memory, explicit
configuration, and workflows where sensitive context stays under the user's
control.

The goal is not another chat UI. The goal is a private assistant that can
research, reason, remember, verify, draft, and help with real work while keeping
the user's sensitive context under their control.

## Example Workflow

A user asks:

> Research competitors and draft a pitch deck.

HammerLock routes that request through an agent workflow:

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
7. The selected agent drafts the deliverable and stores it in the encrypted
   HammerLock vault.

The same pattern can support legal review, client research, startup strategy,
financial analysis, compliance workflows, private writing, and internal
operations.

## Portfolio Context

HammerLock stands on its own as a privacy-first AI assistant. It also shows the
kind of product architecture I care about across the rest of my portfolio:
encrypted local state, clear user control, practical agent workflows, and
observable tool use.

Related projects explore adjacent pieces:

- **Craig** - autonomous coding and business workflow builder
- **RecallMax** - long-term memory compression
- **Tool Use Guardian** - reliable agent tool calls
- **Real-Time Verifier** - output and source validation
- **Repo Intelligence / Local Doc RAG** - private code and document context

## Current Status

Verified on April 22, 2026:

- `npm test` passes: 53 tests across license keys and server crypto
- `npm run build` passes: Next.js production build completes
- Missing credential-store build blocker fixed

Known productization work:

- Add a short visual demo or walkthrough
- Publish a clean download path for the desktop app
- Verify Electron packaging on the target release machines
- Connect production checkout/license flow end to end

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm test
npm run build
```

## Desktop Builds

```bash
npm run electron:build:mac
npm run electron:build:win
npm run electron:build:linux
```

Electron packaging requires platform-specific signing, notarization, and release
credentials before public distribution.

## Core Areas

- `app/` - Next.js app routes, product pages, chat, vault, and APIs
- `components/` - UI panels for vault, settings, integrations, and permissions
- `lib/` - crypto, vault storage, agents, licensing, schedules, credentials, and routing
- `electron/` - desktop shell
- `tests/` - server crypto and license-key coverage

## Links

- Product site: https://hammerlockai.com
- GitHub profile: https://github.com/christopherlhammer11-ai
- Portfolio: https://christopherhammer.dev

## Author

Christopher L. Hammer
