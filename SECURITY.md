# Security Policy

HammerLock is built around local-first AI workflows for sensitive documents and private work. Security claims in this repository should be read as implementation goals and documented architecture, not as a third-party audit.

## Supported Surface

Security-sensitive areas include:

- Local vault encryption and unlock flow
- Password-derived key handling
- Local persistence and chat/session storage
- Provider setup and bring-your-own-key configuration
- Desktop packaging path
- API routes that touch user content, model calls, or integration setup

## Reporting a Vulnerability

Please email security reports to:

**christopherlhammer11@gmail.com**

Include:

- A short description of the issue
- Affected file, route, or workflow
- Steps to reproduce
- Any suggested remediation

I will prioritize reports that affect vault confidentiality, secret handling, local data exposure, command execution, provider-key leakage, or authentication/unlock behavior.

## Current Security Posture

- Local vault data is encrypted before storage using AES-256-GCM primitives.
- Password-derived keys are intended to stay client-side and in memory.
- Provider keys should be user supplied and never committed.
- The app is designed around explicit setup rather than hidden default cloud accounts.
- Desktop and local model workflows are part of the privacy story, but users still need to understand which model/provider they configure.

## Known Limitations

- This project has not received an independent security audit.
- Local compromise of the user machine can compromise local application data.
- Browser storage and desktop storage inherit the risks of the host environment.
- No password recovery is possible for properly local encrypted vault data.

For implementation details, see [ARCHITECTURE.md](./ARCHITECTURE.md), [PRIVACY.md](./PRIVACY.md), and [docs/SECURITY.md](./docs/SECURITY.md).
