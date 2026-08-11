"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

export type SubscriptionTier = "free" | "core" | "pro" | "teams" | "enterprise";

export type SubscriptionStatus = {
  tier: SubscriptionTier;
  active: boolean;
  trialEnd: string | null;
  customerId: string | null;
  sessionId: string | null;
  activatedAt: string | null;
};

// Compatibility export for older clients. HammerLock no longer limits messages.
const FREE_MESSAGE_LIMIT = Number.MAX_SAFE_INTEGER;

const STORAGE_KEY = "vault_subscription";

const defaultSubscription = (): SubscriptionStatus => ({
  tier: "free",
  active: false,
  trialEnd: null,
  customerId: null,
  sessionId: null,
  activatedAt: null,
});

type SubscriptionContextValue = {
  subscription: SubscriptionStatus;
  messageCount: number;
  canSendMessage: boolean;
  isFeatureAvailable: (feature: PremiumFeature) => boolean;
  activateSubscription: (tier: SubscriptionTier, sessionId: string) => void;
  incrementMessageCount: () => void;
  resetMessageCount: () => void;
  clearSubscription: () => void;
  licenseTier: SubscriptionTier;
  licenseLoading: boolean;
  setUsingOwnKey: (v: boolean) => void;
};

export type PremiumFeature =
  | "web_search"
  | "cloud_llm"
  | "voice_input"
  | "voice_output"
  | "pdf_export"
  | "pdf_upload"
  | "personas"
  | "file_vault"
  | "reports"
  | "share";

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionStatus>(defaultSubscription());
  const [messageCount, setMessageCount] = useState(0);
  const licenseTier: SubscriptionTier = "free";
  const licenseLoading = false;
  const [, setUsingOwnKey] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: SubscriptionStatus = JSON.parse(stored);
        // Auto-expire trial subscriptions
        if (parsed.active && parsed.trialEnd && new Date(parsed.trialEnd).getTime() <= Date.now()) {
          parsed.active = false;
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        setSubscription(parsed);
      }
      const count = window.localStorage.getItem("hammerlock_message_count");
      if (count) setMessageCount(parseInt(count, 10) || 0);
    } catch {
      // ignore
    }
  }, []);

  const persist = useCallback((sub: SubscriptionStatus) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sub));
  }, []);

  const activateSubscription = useCallback(
    (tier: SubscriptionTier, sessionId: string) => {
      const next: SubscriptionStatus = {
        tier,
        active: true,
        trialEnd: null,  // No trial — paid plan
        customerId: null,
        sessionId,
        activatedAt: new Date().toISOString(),
      };
      setSubscription(next);
      persist(next);
    },
    [persist]
  );

  const incrementMessageCount = useCallback(() => {
    setMessageCount((prev) => {
      const next = prev + 1;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("hammerlock_message_count", String(next));
      }
      return next;
    });
  }, []);

  const resetMessageCount = useCallback(() => {
    setMessageCount(0);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("hammerlock_message_count", "0");
    }
  }, []);

  const canSendMessage = true;

  const isFeatureAvailable = useCallback((_feature: PremiumFeature) => true, []);

  const clearSubscription = useCallback(() => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem("hammerlock_message_count");
    setSubscription(defaultSubscription());
    setMessageCount(0);
  }, []);

  const value = useMemo(
    () => ({
      subscription,
      messageCount,
      canSendMessage,
      isFeatureAvailable,
      activateSubscription,
      incrementMessageCount,
      resetMessageCount,
      clearSubscription,
      licenseTier,
      licenseLoading,
      setUsingOwnKey,
    }),
    [subscription, messageCount, canSendMessage, isFeatureAvailable, activateSubscription, incrementMessageCount, resetMessageCount, clearSubscription, licenseTier, licenseLoading]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return context;
}

export { FREE_MESSAGE_LIMIT };
