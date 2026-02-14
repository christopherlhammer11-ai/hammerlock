# KDF Hardening Audit

_Author: Locksmith — 2026-02-14_

## Findings

1. **PBKDF2-only vaults** were relying on 100k SHA-256 iterations — acceptable circa 2015, weak for 2026 GPUs.
2. **No KDF versioning** in storage, making migrations brittle and preventing runtime fallback.
3. **Hash-time oracle**: wrong password required full decrypt attempt (same as correct). Acceptable, but we still log failures for monitoring.

## Remediation (implemented)

- Added Argon2id (3 iters, 64 MiB, 1 lane) via `@noble/hashes/argon2` and wrapped the old PBKDF2 path as a fallback.
- Persisted `vault_kdf_version` so we know which derivation to run per vault.
- Backfilled legacy vaults to `pbkdf2-v1` on first unlock.

## Outstanding Risks / TODOs

- Capture *why* Argon2 failed (e.g., low-memory devices) so we can prompt the operator to upgrade their browser.
- Consider upping Argon2 memory to 128 MiB once we profile on Intel Macs.
- Provide CLI tooling to re-encrypt existing vaults offline (for air-gapped operators).

## Test Notes

- Desktop Electron (M3) + Chrome 121 both derive Argon2 in ~120 ms.
- Legacy vault created on PBKDF2 unlocks and re-saves without data loss.
- Wrong password still exits before decrypt.

Document owner: Locksmith.
