# HammerLock Architecture

HammerLock is a local-first AI assistant for sensitive work. The architecture is built around a simple idea: private context should stay under user control, and remote model/tool calls should be explicit choices.

## System Layers

```text
User
  |
  v
Next.js app surface
  |
  +-- Setup and provider configuration
  +-- Agent selection and chat workflows
  +-- Vault unlock/lock UX
  +-- Demo, marketing, and documentation pages
  |
  v
Local data layer
  |
  +-- Encrypted vault data
  +-- Local SQLite / Prisma path
  +-- Browser or desktop app storage depending on runtime
  |
  v
Model and tool layer
  |
  +-- Ollama / local model path when configured
  +-- Bring-your-own-key remote provider path when configured
  +-- Web/research tools when enabled
```

## Agent Workflow

```text
User request
  -> choose specialist agent
  -> restore relevant local memory/context
  -> call model/provider
  -> use tools when configured
  -> verify or repair structured outputs where possible
  -> save useful result back into local encrypted context
```

## Privacy Boundary

HammerLock has two important boundaries:

1. **Local storage boundary:** vault and memory data should be encrypted before persistent local storage.
2. **Provider boundary:** prompts leave the device only when the user chooses a remote model/provider or a network-backed tool.

## Security-Relevant Design Choices

- AES-256-GCM is used for authenticated encryption primitives.
- Password-derived keys should remain client-side and in memory.
- The app avoids default hidden provider accounts; the user configures providers.
- Local Ollama support exists for workflows where remote model calls are not acceptable.
- Tool calls should surface failure metadata instead of failing silently.

## Related Infrastructure

HammerLock is the product layer. The surrounding portfolio explores smaller pieces of the same operating model:

- [RecallMax](https://github.com/christopherlhammer11-ai/recallmax): compressed long-term memory
- [Tool Use Guardian](https://github.com/christopherlhammer11-ai/tool-use-guardian): retries, timeouts, JSON repair, and failure metadata
- [Real-Time Verifier](https://github.com/christopherlhammer11-ai/real-time-verifier): checks for URLs, JSON, claims, and confidence metadata
- [Prompt Condenser](https://github.com/christopherlhammer11-ai/prompt-condenser): context reduction for lower-cost LLM workflows

## Current Maturity

This repo is portfolio-grade product work with tests, CI, live demos, and public documentation. It should not be described as independently audited security software until that audit exists.
