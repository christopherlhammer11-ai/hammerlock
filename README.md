# HammerLock AI

Privacy-first local AI assistant with encrypted memory, local vault storage, and
agent workflows designed around user control.

HammerLock exists for people who want useful AI without turning every private
workflow, note, document, and preference into another cloud dependency.

## Product Promise

Your AI. Your data. Your rules.

- Local-first assistant experience
- AES-256-GCM encrypted vault storage
- 11 specialized agents for different work modes
- Local credential vault and browser automation paths
- PDF, note, memory, schedule, and action workflows
- Bring-your-own API keys for supported LLM providers
- Desktop packaging path through Electron

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

## Why It Matters

Most AI assistants optimize for convenience first and privacy later. HammerLock
starts from the opposite direction: local storage, encrypted memory, explicit
configuration, and a workflow where sensitive context remains under the user's
control.

This is the flagship product in Christopher Hammer's AI engineering portfolio.
It demonstrates product architecture, encrypted local state, agent routing,
tool execution, licensing, and practical AI UX.

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
- Portfolio: https://2026-04-21-that-s-a-full-green-run.vercel.app

## Author

Christopher L. Hammer
