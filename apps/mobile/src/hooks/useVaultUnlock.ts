import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_KDF_VERSION,
  KdfVersion,
  deriveKey,
  hashPassword,
  setActiveSalt,
} from '../../../../lib/crypto';

const VAULT_SALT = Uint8Array.from([88, 12, 33, 77, 190, 201, 12, 44, 5, 6, 7, 8, 9, 10, 11, 12]);
const EXPECTED_PASSWORD_HASH = 'ax7pu2FZv3bfRrYRuCzweH/0nNP2Hj1BCs0txI4gWJQ=';
const BIOMETRIC_FALLBACK_SECRET = 'vault-demo-passphrase';

type UnlockState = 'locked' | 'unlocking' | 'ready';

export interface VaultUnlockResult {
  status: UnlockState;
  error: string | null;
  keyVersion: KdfVersion;
  sessionKey: CryptoKey | null;
  unlockedAt: number | null;
  unlockWithPassphrase: (passphrase: string) => Promise<void>;
  unlockWithBiometrics: () => Promise<void>;
}

export function useVaultUnlock(): VaultUnlockResult {
  const [status, setStatus] = useState<UnlockState>('locked');
  const [error, setError] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<CryptoKey | null>(null);
  const [keyVersion, setKeyVersion] = useState<KdfVersion>(DEFAULT_KDF_VERSION);
  const [unlockedAt, setUnlockedAt] = useState<number | null>(null);

  const ensureSalt = useCallback(() => {
    setActiveSalt(VAULT_SALT);
  }, []);

  const persistKey = useCallback((key: CryptoKey, version: KdfVersion) => {
    setSessionKey(key);
    setKeyVersion(version);
    setUnlockedAt(Date.now());
    setStatus('ready');
  }, []);

  const validatePassphrase = useCallback(async (passphrase: string) => {
    ensureSalt();
    const attemptHash = await hashPassword(passphrase, VAULT_SALT);
    if (attemptHash !== EXPECTED_PASSWORD_HASH) {
      throw new Error('Incorrect passphrase.');
    }
    const { key, version } = await deriveKey(passphrase, VAULT_SALT);
    persistKey(key, version);
  }, [ensureSalt, persistKey]);

  const unlockWithPassphrase = useCallback(async (passphrase: string) => {
    setStatus('unlocking');
    setError(null);
    try {
      await validatePassphrase(passphrase.trim());
    } catch (err) {
      console.error('[vault] unlock failed', err);
      setStatus('locked');
      setError(err instanceof Error ? err.message : 'Unlock failed.');
      throw err;
    }
  }, [validatePassphrase]);

  const unlockWithBiometrics = useCallback(async () => {
    setStatus('unlocking');
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      await validatePassphrase(BIOMETRIC_FALLBACK_SECRET);
    } catch (err) {
      setStatus('locked');
      setError('Face ID did not match. Try again.');
      throw err;
    }
  }, [validatePassphrase]);

  return useMemo(
    () => ({ status, error, keyVersion, sessionKey, unlockedAt, unlockWithPassphrase, unlockWithBiometrics }),
    [status, error, keyVersion, sessionKey, unlockedAt, unlockWithPassphrase, unlockWithBiometrics]
  );
}
