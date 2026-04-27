# Privacy Model

HammerLock exists because a lot of useful AI work involves documents, strategy, financial context, client data, research notes, or personal memory that should not be casually pasted into a generic cloud assistant.

## Core Principle

The product is designed to keep user-controlled data local by default and to make any external model/provider choice explicit.

## What Stays Local

- Vault contents
- Persona and memory data stored in the local vault path
- Local chat/session context stored by the app
- Local model usage through Ollama when configured
- Desktop app data stored on the user machine

## What May Leave the Device

Data may leave the device only when the user configures a remote provider or feature that requires a network call, such as:

- A bring-your-own-key LLM provider
- Web research or scraping workflows
- External API-backed tools
- Deployment, telemetry, or hosting infrastructure used by the web surface

The README and UI should not imply a workflow is fully offline if it depends on a remote provider or web tool.

## Data Handling Boundaries

- HammerLock should not train models on user data.
- User provider keys should remain user controlled.
- Sensitive data should not be logged in plaintext.
- Vault encryption is intended to protect stored local content, not to defend against every compromised-device scenario.

## User Responsibility

Users should:

- Choose trusted model providers
- Understand whether they are using Ollama/local models or remote APIs
- Protect their device login and disk encryption
- Back up anything they cannot afford to lose
- Keep provider keys out of screenshots, commits, and shared logs

## Hiring / Review Note

This document is intentionally plain about tradeoffs. The goal is credible privacy engineering, not overclaiming.
