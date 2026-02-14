"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  base64ToBytes,
  bytesToBase64,
  decrypt,
  deriveKey,
  encrypt,
  hashPassword,
  setActiveSalt,
  DEFAULT_KDF_VERSION,
  FALLBACK_KDF_VERSION,
  KDF_VERSIONS
} from "./crypto";
import type { KdfVersion } from "./crypto";

export type VaultMessage = {
  id: string;
  role: "user" | "ai" | "error";
  content: string;
  pending?: boolean;
  timestamp?: string;
};

export type VaultData = {
  persona: string | null;
  chatHistory: VaultMessage[];
  settings: Record<string, unknown>;
};

const defaultVaultData = (): VaultData => ({
  persona: null,
  chatHistory: [],
  settings: {}
});

const STORAGE_KEYS = {
  salt: "vault_salt",
  passwordHash: "vault_password_hash",
  encrypted: "vault_encrypted_data",
  kdfVersion: "vault_kdf_version"
};

const KDF_VERSION_SET = new Set<KdfVersion>(Object.values(KDF_VERSIONS));
const LEGACY_KDF_VERSION: KdfVersion = FALLBACK_KDF_VERSION;

type VaultContextValue = {
  isUnlocked: boolean;
  hasVault: boolean;
  vaultData: VaultData | null;
  initializeVault: (password: string) => Promise<void>;
  unlockVault: (password: string) => Promise<void>;
  updateVaultData: (updater: (prev: VaultData) => VaultData) => Promise<void>;
  saveVault: () => Promise<void>;
  lockVault: () => void;
  clearVault: () => void;
};

const VaultContext = createContext<VaultContextValue | undefined>(undefined);

const ensureClientWindow = () => {
  if (typeof window === "undefined") {
    throw new Error("Vault operations can only run in the browser.");
  }
  return window;
};

const parseStoredKdfVersion = (value: string | null): KdfVersion | null => {
  if (!value) return null;
  return KDF_VERSION_SET.has(value as KdfVersion) ? (value as KdfVersion) : null;
};

const readStoredKdfVersion = (w: Window): KdfVersion => {
  const stored = parseStoredKdfVersion(w.localStorage.getItem(STORAGE_KEYS.kdfVersion));
  if (stored) return stored;
  // Legacy vaults won't have a version flag but will have password hash/salt.
  if (w.localStorage.getItem(STORAGE_KEYS.passwordHash)) {
    return LEGACY_KDF_VERSION;
  }
  return DEFAULT_KDF_VERSION;
};

const persistKdfVersion = (w: Window, version: KdfVersion) => {
  w.localStorage.setItem(STORAGE_KEYS.kdfVersion, version);
};

export function VaultProvider({ children }: { children: ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasVault, setHasVault] = useState(false);
  const [vaultData, setVaultData] = useState<VaultData | null>(null);

  const keyRef = useRef<CryptoKey | null>(null);
  const dataRef = useRef<VaultData | null>(null);

  const syncFlags = useCallback(() => {
    if (typeof window === "undefined") return;
    const saltString = window.localStorage.getItem(STORAGE_KEYS.salt);
    if (saltString) {
      const salt = base64ToBytes(saltString);
      setActiveSalt(salt);
      setHasVault(true);
    } else {
      setActiveSalt(null);
      setHasVault(false);
    }
  }, []);

  const lockVault = useCallback(() => {
    keyRef.current = null;
    dataRef.current = null;
    setActiveSalt(null);
    setVaultData(null);
    setIsUnlocked(false);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    syncFlags();
    const handleBeforeUnload = () => {
      lockVault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [syncFlags, lockVault]);

  const persistEncrypted = useCallback(async (data: VaultData) => {
    if (!keyRef.current) {
      throw new Error("Vault is locked. Cannot save.");
    }
    const w = ensureClientWindow();
    const encryptedPayload = await encrypt(JSON.stringify(data), keyRef.current);
    w.localStorage.setItem(STORAGE_KEYS.encrypted, encryptedPayload);
  }, []);

  const initializeVault = useCallback(
    async (password: string) => {
      if (!password) throw new Error("Password required");
      const w = ensureClientWindow();
      const crypto = w.crypto;
      const salt = crypto.getRandomValues(new Uint8Array(16));
      setActiveSalt(salt);
      const { key, version } = await deriveKey(password, salt);
      const passwordHash = await hashPassword(password, salt);
      w.localStorage.setItem(STORAGE_KEYS.salt, bytesToBase64(salt));
      w.localStorage.setItem(STORAGE_KEYS.passwordHash, passwordHash);
      persistKdfVersion(w, version);
      const initialData = defaultVaultData();
      keyRef.current = key;
      dataRef.current = initialData;
      await persistEncrypted(initialData);
      setVaultData(initialData);
      setIsUnlocked(true);
      setHasVault(true);
    },
    [persistEncrypted]
  );

  const unlockVault = useCallback(async (password: string) => {
    if (!password) throw new Error("Password required");
    const w = ensureClientWindow();
    const saltString = w.localStorage.getItem(STORAGE_KEYS.salt);
    const hashStored = w.localStorage.getItem(STORAGE_KEYS.passwordHash);
    const encryptedPayload = w.localStorage.getItem(STORAGE_KEYS.encrypted);
    if (!saltString || !hashStored || !encryptedPayload) {
      throw new Error("Vault not initialized");
    }
    const salt = base64ToBytes(saltString);
    setActiveSalt(salt);
    const requestedVersion = readStoredKdfVersion(w);
    const { key, version } = await deriveKey(password, salt, { version: requestedVersion });
    persistKdfVersion(w, version);
    const hashCandidate = await hashPassword(password, salt);
    if (hashCandidate !== hashStored) {
      throw new Error("Wrong password");
    }
    const plaintext = await decrypt(encryptedPayload, key);
    const parsed: VaultData = JSON.parse(plaintext);
    keyRef.current = key;
    dataRef.current = parsed;
    setVaultData(parsed);
    setIsUnlocked(true);
    setHasVault(true);
  }, []);

  const updateVaultData = useCallback(
    async (updater: (prev: VaultData) => VaultData) => {
      if (!keyRef.current) throw new Error("Vault is locked");
      const base = dataRef.current ?? defaultVaultData();
      const clone: VaultData = {
        ...base,
        chatHistory: [...base.chatHistory],
        settings: { ...base.settings }
      };
      const next = updater(clone);
      dataRef.current = next;
      setVaultData(next);
      await persistEncrypted(next);
    },
    [persistEncrypted]
  );

  const saveVault = useCallback(async () => {
    if (!dataRef.current) return;
    await persistEncrypted(dataRef.current);
  }, [persistEncrypted]);

  const clearVault = useCallback(() => {
    const w = ensureClientWindow();
    w.localStorage.removeItem(STORAGE_KEYS.salt);
    w.localStorage.removeItem(STORAGE_KEYS.passwordHash);
    w.localStorage.removeItem(STORAGE_KEYS.encrypted);
    w.localStorage.removeItem(STORAGE_KEYS.kdfVersion);
    lockVault();
    syncFlags();
  }, [lockVault, syncFlags]);

  const value = useMemo(
    () => ({
      isUnlocked,
      hasVault,
      vaultData,
      initializeVault,
      unlockVault,
      updateVaultData,
      saveVault,
      lockVault,
      clearVault
    }),
    [
      isUnlocked,
      hasVault,
      vaultData,
      initializeVault,
      unlockVault,
      updateVaultData,
      saveVault,
      lockVault,
      clearVault
    ]
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error("useVault must be used within VaultProvider");
  }
  return context;
}
