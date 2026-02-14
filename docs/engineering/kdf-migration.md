# KDF Migration Plan

_Last updated: 2026-02-14_

## Scope

- Replace PBKDF2-only vault key derivation with Argon2id (browser-safe, WASM fallback) while retaining backward compatibility.
- Persist the KDF choice per vault (`localStorage.vault_kdf_version`) so legacy vaults continue to unlock.
- Ensure persona/credits files remain untouched.

## Current State (post-audit)

- `lib/crypto.ts` now supports Argon2id (`@noble/hashes/argon2`) with 3 iterations, 64 MiB memory, 32-byte key.
- `deriveKey` returns `{ key, version }` and falls back to PBKDF2 only when Argon fails.
- `lib/vault-store.tsx` stores `vault_kdf_version` and defaults to PBKDF2 for legacy vaults.

## Remaining Work

1. **Upgrade flow UX**
   - Surface a toast after legacy unlock informing the user they were upgraded (or why we stayed on PBKDF2).
2. **Argon2 feature detection**
   - Capture failures (e.g., Safari 13 without BigInt) and log telemetry so we know how often we fall back.
3. **Automated tests**
   - Add Jest/browser tests that encrypt/decrypt fixtures for both versions.
4. **Docs**
   - Update `README.md` + support docs to mention Argon2 + new storage key.

## Verification Checklist

- [ ] New vault: inspect `localStorage.vault_kdf_version === "argon2id-v1"`.
- [ ] Legacy vault (no version): unlock succeeds, version backfilled to `pbkdf2-v1`.
- [ ] Wrong password: fail fast before decrypting.
- [ ] Credits/persona unaffected.

## Owners

- **Vaultie**: code, tests, README.
- **Locksmith**: cryptographic review, threat model update.
- **Opsbot**: regression coverage once tests land.
