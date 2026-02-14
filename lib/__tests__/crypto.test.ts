import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

import {
  KDF_VERSIONS,
  deriveKey,
  encrypt,
  decrypt,
  setActiveSalt
} from "../crypto";

// Polyfill the browser globals that lib/crypto.ts expects.
if (typeof globalThis.window === "undefined") {
  (globalThis as typeof globalThis & { window: any }).window = {
    crypto: webcrypto
  } as any;
} else {
  (globalThis.window as any).crypto = webcrypto;
}

if (typeof globalThis.crypto === "undefined") {
  (globalThis as typeof globalThis & { crypto: typeof webcrypto }).crypto = webcrypto as any;
}

if (typeof globalThis.btoa === "undefined") {
  globalThis.btoa = (input: string) => Buffer.from(input, "binary").toString("base64");
}

if (typeof globalThis.atob === "undefined") {
  globalThis.atob = (input: string) => Buffer.from(input, "base64").toString("binary");
}

test("deriveKey uses Argon2id by default", async () => {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  setActiveSalt(salt);

  const { key, version } = await deriveKey("test-password", salt);

  assert.equal(version, KDF_VERSIONS.ARGON2ID_V1, "Expected Argon2id to be the default KDF");
  assert.equal((key.algorithm as AesKeyAlgorithm).name, "AES-GCM");
});

test("legacy PBKDF2 vault data still decrypts after upgrade", async () => {
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const password = "correct horse battery staple";
  const sample = { persona: "legacy", chatHistory: [], settings: { theme: "dark" } };

  // Simulate a legacy PBKDF2 vault encrypting data before the Argon2 rollout.
  setActiveSalt(salt);
  const { key: legacyKey } = await deriveKey(password, salt, { version: KDF_VERSIONS.PBKDF2_V1 });
  const ciphertext = await encrypt(JSON.stringify(sample), legacyKey);

  // A post-upgrade unlock should still succeed when the stored version is PBKDF2.
  setActiveSalt(salt);
  const { key: unlockKey, version } = await deriveKey(password, salt, { version: KDF_VERSIONS.PBKDF2_V1 });
  const plaintext = await decrypt(ciphertext, unlockKey);

  assert.equal(version, KDF_VERSIONS.PBKDF2_V1, "Unlocking a legacy vault must keep PBKDF2");
  assert.deepEqual(JSON.parse(plaintext), sample, "Legacy ciphertext should round-trip");
});
