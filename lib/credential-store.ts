import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  decryptFromFile,
  encryptForFile,
  hasServerSessionKey,
  isEncrypted,
} from "./server-crypto";

export type CredentialCategory = "login" | "api_key" | "note" | "other";

export interface CredentialEntry {
  id: string;
  category: CredentialCategory;
  label: string;
  site?: string;
  username?: string;
  password?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CredentialStore {
  version: 1;
  entries: CredentialEntry[];
}

export type NewCredential = Omit<CredentialEntry, "id" | "createdAt" | "updatedAt">;

const HAMMERLOCK_DIR = path.join(os.homedir(), ".hammerlock");
const CREDENTIALS_PATH = path.join(HAMMERLOCK_DIR, "credentials.json");

let cache: CredentialStore | null = null;

function emptyStore(): CredentialStore {
  return { version: 1, entries: [] };
}

function normalizeSite(site: string | undefined): string {
  if (!site) return "";
  return site
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/[.,!?]+$/, "");
}

function normalizeTags(tags: string[] | undefined): string[] {
  return Array.from(
    new Set((tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean))
  );
}

function parseStore(raw: string): CredentialStore {
  const parsed = JSON.parse(raw) as Partial<CredentialStore>;
  return {
    version: 1,
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
  };
}

async function readStoreFromDisk(): Promise<CredentialStore> {
  try {
    const raw = await fs.readFile(CREDENTIALS_PATH, "utf8");
    const plaintext = isEncrypted(raw) ? decryptFromFile(raw) : raw;
    if (!plaintext) {
      throw new Error("Credentials are encrypted. Unlock the vault and try again.");
    }
    return parseStore(plaintext);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return emptyStore();
    throw error;
  }
}

async function writeStoreToDisk(store: CredentialStore): Promise<void> {
  await fs.mkdir(HAMMERLOCK_DIR, { recursive: true });
  const json = JSON.stringify(store, null, 2);
  const payload = hasServerSessionKey() ? encryptForFile(json) : json;
  await fs.writeFile(CREDENTIALS_PATH, payload, "utf8");
}

export function clearCredentialCache(): void {
  cache = null;
}

export async function loadCredentials(): Promise<CredentialStore> {
  cache = await readStoreFromDisk();
  return cache;
}

async function getStore(): Promise<CredentialStore> {
  if (!cache) {
    cache = await readStoreFromDisk();
  }
  return cache;
}

export async function listCredentials(): Promise<CredentialEntry[]> {
  const store = await getStore();
  return [...store.entries].sort((a, b) => a.label.localeCompare(b.label));
}

export async function addCredential(input: NewCredential): Promise<CredentialEntry> {
  const store = await getStore();
  const now = new Date().toISOString();
  const site = normalizeSite(input.site);
  const label = input.label.trim() || site || "Credential";
  const entry: CredentialEntry = {
    ...input,
    id: crypto.randomUUID(),
    category: input.category,
    label,
    site,
    username: input.username?.trim(),
    password: input.password ?? "",
    notes: input.notes ?? "",
    tags: normalizeTags(input.tags),
    createdAt: now,
    updatedAt: now,
  };

  const existingIndex = store.entries.findIndex((candidate) => {
    const sameSite = normalizeSite(candidate.site) === site;
    const sameUsername = (candidate.username ?? "").toLowerCase() === (entry.username ?? "").toLowerCase();
    return sameSite && sameUsername;
  });

  if (existingIndex >= 0) {
    const existing = store.entries[existingIndex];
    const updated: CredentialEntry = {
      ...existing,
      ...entry,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    store.entries[existingIndex] = updated;
    await writeStoreToDisk(store);
    cache = store;
    return updated;
  }

  store.entries.push(entry);
  await writeStoreToDisk(store);
  cache = store;
  return entry;
}

export async function findCredentialForSite(siteQuery: string): Promise<CredentialEntry | null> {
  const query = normalizeSite(siteQuery);
  if (!query) return null;

  const entries = await listCredentials();
  return entries.find((entry) => {
    const site = normalizeSite(entry.site);
    const tags = entry.tags.map(normalizeSite);
    const label = entry.label.toLowerCase();
    return (
      site === query ||
      site.includes(query) ||
      query.includes(site) ||
      label === query ||
      label.includes(query) ||
      tags.some((tag) => tag === query || tag.includes(query))
    );
  }) ?? null;
}

export async function searchCredentials(query: string): Promise<CredentialEntry[]> {
  const normalized = normalizeSite(query);
  if (!normalized) return listCredentials();

  const entries = await listCredentials();
  return entries.filter((entry) => {
    const haystack = [
      entry.label,
      entry.site ?? "",
      entry.username ?? "",
      entry.notes ?? "",
      ...entry.tags,
    ].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });
}
