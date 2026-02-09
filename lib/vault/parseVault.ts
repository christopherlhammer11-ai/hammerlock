import { DEFAULT_VAULT } from "./defaultVault";
import { VaultV1, vaultSchema } from "./schema";

export function parseVaultJson(raw: string): VaultV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`vault.json is not valid JSON: ${(err as Error).message}`);
  }

  const verified = vaultSchema.safeParse(parsed);
  if (!verified.success) {
    throw new Error(`vault.json failed schema validation: ${verified.error.message}`);
  }
  return verified.data;
}

export function hydrateVault(fallback?: Partial<VaultV1>): VaultV1 {
  const merged = {
    ...DEFAULT_VAULT,
    ...fallback,
    profile: { ...DEFAULT_VAULT.profile, ...(fallback?.profile ?? {}) },
    preferences: { ...DEFAULT_VAULT.preferences, ...(fallback?.preferences ?? {}) },
    rules: { ...DEFAULT_VAULT.rules, ...(fallback?.rules ?? {}) },
    notes: { ...DEFAULT_VAULT.notes, ...(fallback?.notes ?? {}) }
  } satisfies VaultV1;
  return merged;
}
