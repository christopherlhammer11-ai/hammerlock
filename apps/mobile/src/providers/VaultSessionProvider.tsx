import React, { PropsWithChildren, createContext, useContext, useState } from 'react';
import { useVaultUnlock } from '@mobile/hooks/useVaultUnlock';

interface VaultSessionContextValue {
  status: 'locked' | 'unlocking' | 'ready';
  lastUnlockedAt: number | null;
  sessionKey: CryptoKey | null;
  unlockError: string | null;
  unlockWithPassphrase: (passphrase: string) => Promise<void>;
  unlockWithBiometrics: () => Promise<void>;
  apiKey: string;
  setApiKey: (key: string) => void;
  model: string;
  setModel: (model: string) => void;
}

const VaultSessionContext = createContext<VaultSessionContextValue | undefined>(undefined);

export function VaultSessionProvider({ children }: PropsWithChildren<Record<string, unknown>>) {
  const state = useVaultUnlock();
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('default-model');

  const value: VaultSessionContextValue = {
    status: state.status,
    lastUnlockedAt: state.unlockedAt,
    sessionKey: state.sessionKey,
    unlockError: state.error,
    unlockWithPassphrase: state.unlockWithPassphrase,
    unlockWithBiometrics: state.unlockWithBiometrics,
    apiKey,
    setApiKey,
    model,
    setModel,
  };

  return <VaultSessionContext.Provider value={value}>{children}</VaultSessionContext.Provider>;
}

export function useVaultSession() {
  const ctx = useContext(VaultSessionContext);
  if (!ctx) {
    throw new Error('useVaultSession must be used within VaultSessionProvider');
  }
  return ctx;
}
