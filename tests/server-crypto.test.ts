/**
 * Tests for lib/server-crypto.ts — AES-256-GCM encryption/decryption.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import {
  encryptForFile,
  decryptFromFile,
  isEncrypted,
  setServerSessionKey,
  hasServerSessionKey,
  clearServerSessionKey,
  deriveServerKey,
} from "../lib/server-crypto";

// Generate a valid 32-byte key for testing
const TEST_KEY_HEX = crypto.randomBytes(32).toString("hex");
const TEST_KEY_BUF = Buffer.from(TEST_KEY_HEX, "hex");

describe("server-crypto", () => {
  beforeEach(() => {
    setServerSessionKey(TEST_KEY_HEX);
  });

  afterEach(() => {
    clearServerSessionKey();
  });

  // --- Session key management ---

  describe("session key management", () => {
    it("sets and detects session key", () => {
      expect(hasServerSessionKey()).toBe(true);
    });

    it("clears session key", () => {
      clearServerSessionKey();
      expect(hasServerSessionKey()).toBe(false);
    });

    it("rejects invalid key length", () => {
      expect(() => setServerSessionKey("aabbcc")).toThrow("Invalid key length");
    });

    it("accepts null to clear key", () => {
      setServerSessionKey(null);
      expect(hasServerSessionKey()).toBe(false);
    });
  });

  // --- Encrypt / Decrypt round-trip ---

  describe("encrypt and decrypt round-trip", () => {
    it("encrypts and decrypts short text", () => {
      const plaintext = "Hello, HammerLock!";
      const encrypted = encryptForFile(plaintext);
      const decrypted = decryptFromFile(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("encrypts and decrypts empty string", () => {
      const encrypted = encryptForFile("");
      const decrypted = decryptFromFile(encrypted);
      expect(decrypted).toBe("");
    });

    it("encrypts and decrypts unicode text", () => {
      const plaintext = "日本語テスト 🔐🔨 émojis & spëcial chars";
      const encrypted = encryptForFile(plaintext);
      const decrypted = decryptFromFile(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("encrypts and decrypts large text (10KB)", () => {
      const plaintext = "A".repeat(10_000);
      const encrypted = encryptForFile(plaintext);
      const decrypted = decryptFromFile(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("produces different ciphertext for same plaintext (random IV)", () => {
      const plaintext = "same input";
      const a = encryptForFile(plaintext);
      const b = encryptForFile(plaintext);
      expect(a).not.toBe(b); // Different IVs
    });

    it("works with explicit key parameter", () => {
      clearServerSessionKey();
      const plaintext = "explicit key test";
      const encrypted = encryptForFile(plaintext, TEST_KEY_BUF);
      const decrypted = decryptFromFile(encrypted, TEST_KEY_BUF);
      expect(decrypted).toBe(plaintext);
    });
  });

  // --- Encrypted prefix format ---

  describe("encrypted format", () => {
    it("output starts with HAMMERLOCK_ENC: prefix", () => {
      const encrypted = encryptForFile("test");
      expect(encrypted.startsWith("HAMMERLOCK_ENC:")).toBe(true);
    });

    it("isEncrypted detects HAMMERLOCK_ENC prefix", () => {
      const encrypted = encryptForFile("test");
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("isEncrypted detects legacy VAULTAI_ENC prefix", () => {
      expect(isEncrypted("VAULTAI_ENC:abc123")).toBe(true);
    });

    it("isEncrypted returns false for plaintext", () => {
      expect(isEncrypted("just a normal string")).toBe(false);
      expect(isEncrypted("")).toBe(false);
    });
  });

  // --- Decryption failure cases ---

  describe("decryption failures", () => {
    it("returns null with wrong key", () => {
      const encrypted = encryptForFile("secret data");
      const wrongKey = crypto.randomBytes(32);
      const result = decryptFromFile(encrypted, wrongKey);
      expect(result).toBeNull();
    });

    it("returns null for corrupted ciphertext", () => {
      const encrypted = encryptForFile("test");
      // Flip some bits in the middle of the base64 data
      const corrupted = encrypted.slice(0, 20) + "XXXX" + encrypted.slice(24);
      const result = decryptFromFile(corrupted);
      expect(result).toBeNull();
    });

    it("returns plaintext for unencrypted input (migration path)", () => {
      const plain = "this is not encrypted";
      const result = decryptFromFile(plain);
      expect(result).toBe(plain);
    });

    it("returns null when no session key is set", () => {
      clearServerSessionKey();
      const result = decryptFromFile("HAMMERLOCK_ENC:abc123");
      expect(result).toBeNull();
    });

    it("throws when encrypting without a key", () => {
      clearServerSessionKey();
      expect(() => encryptForFile("test")).toThrow("No encryption key available");
    });
  });

  // --- PBKDF2 key derivation ---

  describe("deriveServerKey", () => {
    it("derives a 32-byte key", () => {
      const salt = crypto.randomBytes(16);
      const key = deriveServerKey("my-password", salt);
      expect(key.length).toBe(32);
    });

    it("same password + salt produces same key", () => {
      const salt = crypto.randomBytes(16);
      const key1 = deriveServerKey("password", salt);
      const key2 = deriveServerKey("password", salt);
      expect(key1.equals(key2)).toBe(true);
    });

    it("different passwords produce different keys", () => {
      const salt = crypto.randomBytes(16);
      const key1 = deriveServerKey("password1", salt);
      const key2 = deriveServerKey("password2", salt);
      expect(key1.equals(key2)).toBe(false);
    });

    it("different salts produce different keys", () => {
      const salt1 = crypto.randomBytes(16);
      const salt2 = crypto.randomBytes(16);
      const key1 = deriveServerKey("password", salt1);
      const key2 = deriveServerKey("password", salt2);
      expect(key1.equals(key2)).toBe(false);
    });

    it("derived key can encrypt/decrypt", () => {
      const salt = crypto.randomBytes(16);
      const key = deriveServerKey("vault-password-123", salt);
      const plaintext = "encrypted with derived key";
      const encrypted = encryptForFile(plaintext, key);
      const decrypted = decryptFromFile(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });
  });
});
