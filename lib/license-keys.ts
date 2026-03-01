/**
 * HammerLock AI — License Key Generation & Validation
 *
 * Format: HL-XXXX-XXXX-XXXX-XXXX
 * Uses a 29-character alphabet (no ambiguous 0/O, 1/I/L).
 *
 * Two modes:
 * - generateLicenseKey(): Random key (for local/DB use)
 * - deriveKeyFromSession(): Deterministic key from Stripe session ID
 *   (same session always produces the same key — no DB needed)
 */

import crypto from "crypto";

// Removed: 0, O, 1, I, L to avoid visual ambiguity
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 29 chars

function getKeySalt(): string {
  const salt = process.env.STRIPE_SECRET_KEY;
  if (!salt) throw new Error("STRIPE_SECRET_KEY is required for license key operations");
  return salt;
}

/**
 * Generate a cryptographically random license key.
 * Format: HL-XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(): string {
  const groups: string[] = [];
  for (let g = 0; g < 4; g++) {
    let group = "";
    const bytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) {
      group += ALPHABET[bytes[i] % ALPHABET.length];
    }
    groups.push(group);
  }
  return `HL-${groups.join("-")}`;
}

/**
 * Derive a deterministic license key from a Stripe session ID.
 * Same session ID always produces the same key.
 * Uses HMAC-SHA256 with the Stripe secret key as salt.
 */
export function deriveKeyFromSession(sessionId: string): string {
  const hash = crypto.createHmac("sha256", getKeySalt()).update(sessionId).digest();
  const groups: string[] = [];
  for (let g = 0; g < 4; g++) {
    let group = "";
    for (let i = 0; i < 4; i++) {
      group += ALPHABET[hash[(g * 4) + i] % ALPHABET.length];
    }
    groups.push(group);
  }
  return `HL-${groups.join("-")}`;
}

/**
 * Validate that a string matches the license key format.
 */
export function isValidKeyFormat(key: string): boolean {
  return /^HL-[23456789A-HJKMNP-Z]{4}-[23456789A-HJKMNP-Z]{4}-[23456789A-HJKMNP-Z]{4}-[23456789A-HJKMNP-Z]{4}$/.test(
    key.toUpperCase()
  );
}
