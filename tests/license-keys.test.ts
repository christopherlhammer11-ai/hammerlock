/**
 * Tests for lib/license-keys.ts — license key generation, derivation, and validation.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  generateLicenseKey,
  deriveKeyFromSession,
  isValidKeyFormat,
} from "../lib/license-keys";

// The license key module requires STRIPE_SECRET_KEY for HMAC derivation.
// Set a test value for the duration of these tests.
const ORIGINAL_STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_fake_key_for_unit_tests_only";
});

afterAll(() => {
  if (ORIGINAL_STRIPE_KEY) {
    process.env.STRIPE_SECRET_KEY = ORIGINAL_STRIPE_KEY;
  } else {
    delete process.env.STRIPE_SECRET_KEY;
  }
});

// Valid characters: 23456789ABCDEFGHJKMNPQRSTUVWXYZ (no 0, O, 1, I, L)
const KEY_REGEX = /^HL-[23456789A-HJ-NP-Z]{4}-[23456789A-HJ-NP-Z]{4}-[23456789A-HJ-NP-Z]{4}-[23456789A-HJ-NP-Z]{4}$/;

describe("license-keys", () => {
  // --- generateLicenseKey ---

  describe("generateLicenseKey", () => {
    it("produces a key matching HL-XXXX-XXXX-XXXX-XXXX format", () => {
      const key = generateLicenseKey();
      expect(key).toMatch(KEY_REGEX);
    });

    it("produces unique keys", () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateLicenseKey());
      }
      // All 100 keys should be unique (collision probability is astronomically low)
      expect(keys.size).toBe(100);
    });

    it("produces keys that pass format validation", () => {
      for (let i = 0; i < 20; i++) {
        const key = generateLicenseKey();
        expect(isValidKeyFormat(key)).toBe(true);
      }
    });

    it("key length is exactly 22 characters", () => {
      // HL- + 4 + - + 4 + - + 4 + - + 4 = 3 + 4 + 1 + 4 + 1 + 4 + 1 + 4 = 22
      const key = generateLicenseKey();
      expect(key.length).toBe(22);
    });

    it("never contains ambiguous characters (0, O, 1, I, L)", () => {
      for (let i = 0; i < 50; i++) {
        const key = generateLicenseKey();
        const chars = key.replace(/HL-/g, "").replace(/-/g, "");
        expect(chars).not.toMatch(/[01OIL]/);
      }
    });
  });

  // --- deriveKeyFromSession ---

  describe("deriveKeyFromSession", () => {
    it("produces a key matching the license format", () => {
      const key = deriveKeyFromSession("cs_test_abc123");
      expect(key).toMatch(KEY_REGEX);
    });

    it("is deterministic — same session ID produces same key", () => {
      const sessionId = "cs_test_deterministic_check";
      const key1 = deriveKeyFromSession(sessionId);
      const key2 = deriveKeyFromSession(sessionId);
      expect(key1).toBe(key2);
    });

    it("different session IDs produce different keys", () => {
      const key1 = deriveKeyFromSession("cs_test_session_A");
      const key2 = deriveKeyFromSession("cs_test_session_B");
      expect(key1).not.toBe(key2);
    });

    it("derived keys pass format validation", () => {
      const key = deriveKeyFromSession("cs_test_validate_me");
      expect(isValidKeyFormat(key)).toBe(true);
    });

    it("handles long session IDs", () => {
      const longId = "cs_test_" + "x".repeat(200);
      const key = deriveKeyFromSession(longId);
      expect(key).toMatch(KEY_REGEX);
    });

    it("handles special characters in session ID", () => {
      const key = deriveKeyFromSession("cs_test_special/chars+here=end");
      expect(key).toMatch(KEY_REGEX);
    });
  });

  // --- isValidKeyFormat ---

  describe("isValidKeyFormat", () => {
    it("accepts valid uppercase key", () => {
      expect(isValidKeyFormat("HL-AB23-CD45-EF67-GH89")).toBe(true);
    });

    it("accepts valid lowercase key (case-insensitive)", () => {
      expect(isValidKeyFormat("hl-ab23-cd45-ef67-gh89")).toBe(true);
    });

    it("accepts mixed case", () => {
      expect(isValidKeyFormat("Hl-Ab23-Cd45-Ef67-Gh89")).toBe(true);
    });

    it("rejects empty string", () => {
      expect(isValidKeyFormat("")).toBe(false);
    });

    it("rejects wrong prefix", () => {
      expect(isValidKeyFormat("XX-AB23-CD45-EF67-GH89")).toBe(false);
    });

    it("rejects too few groups", () => {
      expect(isValidKeyFormat("HL-AB23-CD45-EF67")).toBe(false);
    });

    it("rejects too many groups", () => {
      expect(isValidKeyFormat("HL-AB23-CD45-EF67-GH89-JK22")).toBe(false);
    });

    it("rejects groups that are too short", () => {
      expect(isValidKeyFormat("HL-AB2-CD45-EF67-GH89")).toBe(false);
    });

    it("rejects groups that are too long", () => {
      expect(isValidKeyFormat("HL-AB234-CD45-EF67-GH89")).toBe(false);
    });

    it("rejects ambiguous character 0", () => {
      expect(isValidKeyFormat("HL-A023-CD45-EF67-GH89")).toBe(false);
    });

    it("rejects ambiguous character O", () => {
      expect(isValidKeyFormat("HL-AO23-CD45-EF67-GH89")).toBe(false);
    });

    it("rejects ambiguous character 1", () => {
      expect(isValidKeyFormat("HL-A123-CD45-EF67-GH89")).toBe(false);
    });

    it("rejects ambiguous character I", () => {
      expect(isValidKeyFormat("HL-AI23-CD45-EF67-GH89")).toBe(false);
    });

    it("rejects ambiguous character L", () => {
      expect(isValidKeyFormat("HL-AL23-CD45-EF67-GH89")).toBe(false);
    });

    it("rejects random strings", () => {
      expect(isValidKeyFormat("not-a-key")).toBe(false);
      expect(isValidKeyFormat("1234567890")).toBe(false);
      expect(isValidKeyFormat("HL-")).toBe(false);
    });

    it("validates keys generated by generateLicenseKey", () => {
      for (let i = 0; i < 50; i++) {
        expect(isValidKeyFormat(generateLicenseKey())).toBe(true);
      }
    });

    it("validates keys generated by deriveKeyFromSession", () => {
      for (let i = 0; i < 20; i++) {
        expect(isValidKeyFormat(deriveKeyFromSession(`cs_test_${i}`))).toBe(true);
      }
    });
  });

  // --- STRIPE_SECRET_KEY requirement ---

  describe("STRIPE_SECRET_KEY requirement", () => {
    it("deriveKeyFromSession throws when STRIPE_SECRET_KEY is missing", () => {
      const original = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;
      try {
        expect(() => deriveKeyFromSession("cs_test_no_key")).toThrow(
          "STRIPE_SECRET_KEY is required"
        );
      } finally {
        process.env.STRIPE_SECRET_KEY = original;
      }
    });
  });
});
