// 🔨🔐 HammerLock AI — Personal Vault Store
// A separate encrypted compartment with its own password for PII.
// Uses encryptWithSalt/decryptWithSalt to avoid touching the main vault's activeSalt.
// NEVER sends data to the server. NEVER passes entries to the LLM.
"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  base64ToBytes,
  bytesToBase64,
  decryptWithSalt,
  deriveKey,
  encryptWithSalt,
  hashPassword,
  DEFAULT_KDF_VERSION,
  FALLBACK_KDF_VERSION,
  KDF_VERSIONS,
} from "./crypto";
import type { KdfVersion } from "./crypto";

// ── Types ──

export type PiiCategory =
  | "password"
  | "identity"
  | "financial"
  | "medical"
  | "note"
  | "other";

export type PersonalVaultEntry = {
  id: string;
  category: PiiCategory;
  label: string;
  value: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type PersonalVaultData = {
  entries: PersonalVaultEntry[];
};

// ── Storage Keys (completely separate from main vault) ──

const PV_STORAGE = {
  salt: "pv_salt",
  passwordHash: "pv_password_hash",
  encrypted: "pv_encrypted_data",
  kdfVersion: "pv_kdf_version",
};

const PV_SESSION = {
  derivedKey: "pv_session_key",
  salt: "pv_session_salt",
};

const AUTO_LOCK_MS = 5 * 60 * 1000; // 5 minutes

// ── Helpers ──

function generateId(): string {
  return `pv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const defaultPvData = (): PersonalVaultData => ({ entries: [] });

const KDF_VERSION_SET = new Set<KdfVersion>(Object.values(KDF_VERSIONS));

function readStoredKdfVersion(): KdfVersion {
  if (typeof window === "undefined") return DEFAULT_KDF_VERSION;
  const stored = window.localStorage.getItem(PV_STORAGE.kdfVersion);
  if (stored && KDF_VERSION_SET.has(stored as KdfVersion)) return stored as KdfVersion;
  if (window.localStorage.getItem(PV_STORAGE.passwordHash)) return FALLBACK_KDF_VERSION;
  return DEFAULT_KDF_VERSION;
}

// ── Session persistence (survives refresh, clears on tab close) ──

async function pvPersistSession(key: CryptoKey, salt: Uint8Array) {
  if (typeof window === "undefined") return;
  try {
    const exported = await crypto.subtle.exportKey("raw", key);
    sessionStorage.setItem(PV_SESSION.derivedKey, bytesToBase64(new Uint8Array(exported)));
    sessionStorage.setItem(PV_SESSION.salt, bytesToBase64(salt));
  } catch { /* silent */ }
}

function pvClearSession() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PV_SESSION.derivedKey);
  sessionStorage.removeItem(PV_SESSION.salt);
}

async function pvRestoreSession(): Promise<{
  key: CryptoKey;
  data: PersonalVaultData;
  salt: Uint8Array;
} | null> {
  if (typeof window === "undefined") return null;
  const keyB64 = sessionStorage.getItem(PV_SESSION.derivedKey);
  const saltB64 = sessionStorage.getItem(PV_SESSION.salt);
  const encryptedPayload = localStorage.getItem(PV_STORAGE.encrypted);
  if (!keyB64 || !saltB64 || !encryptedPayload) return null;

  try {
    const keyBytes = base64ToBytes(keyB64);
    const salt = base64ToBytes(saltB64);
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes as unknown as ArrayBuffer,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    );
    const plaintext = await decryptWithSalt(encryptedPayload, key, salt.length);
    const data: PersonalVaultData = JSON.parse(plaintext);
    return { key, data, salt };
  } catch {
    pvClearSession();
    return null;
  }
}

// ── Context ──

type PersonalVaultContextValue = {
  pvIsUnlocked: boolean;
  pvHasVault: boolean;
  pvEntries: PersonalVaultEntry[];
  initializePersonalVault: (password: string) => Promise<void>;
  unlockPersonalVault: (password: string) => Promise<void>;
  lockPersonalVault: () => void;
  addEntry: (entry: Omit<PersonalVaultEntry, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateEntry: (id: string, patch: Partial<Omit<PersonalVaultEntry, "id" | "createdAt">>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  clearPersonalVault: () => void;
};

const PersonalVaultContext = createContext<PersonalVaultContextValue | undefined>(undefined);

export function PersonalVaultProvider({ children }: { children: ReactNode }) {
  const [pvIsUnlocked, setPvIsUnlocked] = useState(false);
  const [pvHasVault, setPvHasVault] = useState(false);
  const [pvData, setPvData] = useState<PersonalVaultData | null>(null);

  const keyRef = useRef<CryptoKey | null>(null);
  const saltRef = useRef<Uint8Array | null>(null);
  const dataRef = useRef<PersonalVaultData | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-lock timer ──
  const resetLockTimer = useCallback(() => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    if (keyRef.current) {
      lockTimerRef.current = setTimeout(() => {
        // Auto-lock
        keyRef.current = null;
        saltRef.current = null;
        dataRef.current = null;
        setPvData(null);
        setPvIsUnlocked(false);
        pvClearSession();
      }, AUTO_LOCK_MS);
    }
  }, []);

  // Reset auto-lock on user activity while PV is unlocked
  useEffect(() => {
    if (!pvIsUnlocked) return;
    const onActivity = () => resetLockTimer();
    document.addEventListener("mousemove", onActivity);
    document.addEventListener("keydown", onActivity);
    return () => {
      document.removeEventListener("mousemove", onActivity);
      document.removeEventListener("keydown", onActivity);
    };
  }, [pvIsUnlocked, resetLockTimer]);

  // ── Check if vault exists on mount ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    setPvHasVault(!!window.localStorage.getItem(PV_STORAGE.salt));
  }, []);

  // ── Auto-restore from session ──
  useEffect(() => {
    if (typeof window === "undefined" || pvIsUnlocked) return;
    let cancelled = false;
    (async () => {
      const session = await pvRestoreSession();
      if (session && !cancelled) {
        keyRef.current = session.key;
        saltRef.current = session.salt;
        dataRef.current = session.data;
        setPvData(session.data);
        setPvIsUnlocked(true);
        setPvHasVault(true);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start auto-lock timer when unlocked
  useEffect(() => {
    if (pvIsUnlocked) resetLockTimer();
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, [pvIsUnlocked, resetLockTimer]);

  // ── Persist encrypted data ──
  const persistEncrypted = useCallback(async (data: PersonalVaultData) => {
    if (!keyRef.current || !saltRef.current) throw new Error("Personal Vault is locked.");
    const payload = await encryptWithSalt(JSON.stringify(data), keyRef.current, saltRef.current);
    localStorage.setItem(PV_STORAGE.encrypted, payload);
  }, []);

  // ── Initialize (first-time setup) ──
  const initializePersonalVault = useCallback(async (password: string) => {
    if (!password) throw new Error("Password required");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const { key, version } = await deriveKey(password, salt);
    const hash = await hashPassword(password, salt);

    localStorage.setItem(PV_STORAGE.salt, bytesToBase64(salt));
    localStorage.setItem(PV_STORAGE.passwordHash, hash);
    localStorage.setItem(PV_STORAGE.kdfVersion, version);

    const initialData = defaultPvData();
    keyRef.current = key;
    saltRef.current = salt;
    dataRef.current = initialData;

    await encryptWithSalt(JSON.stringify(initialData), key, salt).then(payload => {
      localStorage.setItem(PV_STORAGE.encrypted, payload);
    });
    await pvPersistSession(key, salt);

    setPvData(initialData);
    setPvIsUnlocked(true);
    setPvHasVault(true);
  }, []);

  // ── Unlock ──
  const unlockPersonalVault = useCallback(async (password: string) => {
    if (!password) throw new Error("Password required");
    const saltB64 = localStorage.getItem(PV_STORAGE.salt);
    const hashStored = localStorage.getItem(PV_STORAGE.passwordHash);
    const encrypted = localStorage.getItem(PV_STORAGE.encrypted);
    if (!saltB64 || !hashStored || !encrypted) throw new Error("Personal Vault not initialized");

    const salt = base64ToBytes(saltB64);
    const version = readStoredKdfVersion();
    const { key } = await deriveKey(password, salt, { version });
    const hashCandidate = await hashPassword(password, salt);
    if (hashCandidate !== hashStored) throw new Error("Wrong password");

    const plaintext = await decryptWithSalt(encrypted, key, salt.length);
    const data: PersonalVaultData = JSON.parse(plaintext);

    keyRef.current = key;
    saltRef.current = salt;
    dataRef.current = data;
    await pvPersistSession(key, salt);

    setPvData(data);
    setPvIsUnlocked(true);
    setPvHasVault(true);
  }, []);

  // ── Lock ──
  const lockPersonalVault = useCallback(() => {
    keyRef.current = null;
    saltRef.current = null;
    dataRef.current = null;
    setPvData(null);
    setPvIsUnlocked(false);
    pvClearSession();
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
  }, []);

  // ── CRUD ──
  const addEntry = useCallback(async (entry: Omit<PersonalVaultEntry, "id" | "createdAt" | "updatedAt">) => {
    if (!dataRef.current) throw new Error("Personal Vault is locked");
    const now = new Date().toISOString();
    const newEntry: PersonalVaultEntry = {
      ...entry,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    const next: PersonalVaultData = {
      entries: [...dataRef.current.entries, newEntry],
    };
    dataRef.current = next;
    setPvData(next);
    await persistEncrypted(next);
    resetLockTimer();
  }, [persistEncrypted, resetLockTimer]);

  const updateEntry = useCallback(async (id: string, patch: Partial<Omit<PersonalVaultEntry, "id" | "createdAt">>) => {
    if (!dataRef.current) throw new Error("Personal Vault is locked");
    const next: PersonalVaultData = {
      entries: dataRef.current.entries.map(e =>
        e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e
      ),
    };
    dataRef.current = next;
    setPvData(next);
    await persistEncrypted(next);
    resetLockTimer();
  }, [persistEncrypted, resetLockTimer]);

  const deleteEntry = useCallback(async (id: string) => {
    if (!dataRef.current) throw new Error("Personal Vault is locked");
    const next: PersonalVaultData = {
      entries: dataRef.current.entries.filter(e => e.id !== id),
    };
    dataRef.current = next;
    setPvData(next);
    await persistEncrypted(next);
    resetLockTimer();
  }, [persistEncrypted, resetLockTimer]);

  // ── Clear (delete entire personal vault) ──
  const clearPersonalVault = useCallback(() => {
    localStorage.removeItem(PV_STORAGE.salt);
    localStorage.removeItem(PV_STORAGE.passwordHash);
    localStorage.removeItem(PV_STORAGE.encrypted);
    localStorage.removeItem(PV_STORAGE.kdfVersion);
    pvClearSession();
    keyRef.current = null;
    saltRef.current = null;
    dataRef.current = null;
    setPvData(null);
    setPvIsUnlocked(false);
    setPvHasVault(false);
  }, []);

  const pvEntries = pvData?.entries ?? [];

  const value = useMemo(() => ({
    pvIsUnlocked,
    pvHasVault,
    pvEntries,
    initializePersonalVault,
    unlockPersonalVault,
    lockPersonalVault,
    addEntry,
    updateEntry,
    deleteEntry,
    clearPersonalVault,
  }), [
    pvIsUnlocked, pvHasVault, pvEntries,
    initializePersonalVault, unlockPersonalVault, lockPersonalVault,
    addEntry, updateEntry, deleteEntry, clearPersonalVault,
  ]);

  return (
    <PersonalVaultContext.Provider value={value}>
      {children}
    </PersonalVaultContext.Provider>
  );
}

export function usePersonalVault() {
  const context = useContext(PersonalVaultContext);
  if (!context) throw new Error("usePersonalVault must be used within PersonalVaultProvider");
  return context;
}
