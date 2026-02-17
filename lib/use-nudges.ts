"use client";

import { useCallback, useMemo } from "react";
import { useVault } from "./vault-store";

/**
 * Nudge preference key stored in vaultData.settings.
 * true = show nudges (default), false = suppressed.
 */
const NUDGE_KEY = "nudges_enabled";

/**
 * Tracks which individual nudge IDs have been permanently dismissed.
 * Stored as a string[] in vaultData.settings.
 */
const DISMISSED_KEY = "nudges_dismissed";

export type NudgeDef = {
  /** Unique ID — once dismissed, never shown again */
  id: string;
  /** The message text (supports markdown-light) */
  message: string;
  /** Optional emoji/icon prefix */
  icon?: string;
  /** Optional CTA label (e.g. "Try it →") */
  ctaLabel?: string;
  /** Optional CTA action — sent as a chat command */
  ctaCommand?: string;
};

export function useNudges() {
  const { vaultData, updateVaultData, isUnlocked } = useVault();

  /** Global toggle — default ON */
  const isEnabled = useMemo(() => {
    if (!vaultData) return true;
    const val = vaultData.settings[NUDGE_KEY];
    return val === undefined ? true : !!val;
  }, [vaultData]);

  /** Set of dismissed nudge IDs */
  const dismissedIds = useMemo(() => {
    if (!vaultData) return new Set<string>();
    const arr = vaultData.settings[DISMISSED_KEY];
    return new Set<string>(Array.isArray(arr) ? (arr as string[]) : []);
  }, [vaultData]);

  /** Toggle the global nudge preference */
  const setNudgesEnabled = useCallback(
    async (enabled: boolean) => {
      if (!isUnlocked) return;
      await updateVaultData((prev) => ({
        ...prev,
        settings: { ...prev.settings, [NUDGE_KEY]: enabled },
      }));
    },
    [isUnlocked, updateVaultData]
  );

  /** Dismiss a specific nudge permanently */
  const dismissNudge = useCallback(
    async (nudgeId: string) => {
      if (!isUnlocked) return;
      await updateVaultData((prev) => {
        const existing = Array.isArray(prev.settings[DISMISSED_KEY])
          ? (prev.settings[DISMISSED_KEY] as string[])
          : [];
        if (existing.includes(nudgeId)) return prev;
        return {
          ...prev,
          settings: { ...prev.settings, [DISMISSED_KEY]: [...existing, nudgeId] },
        };
      });
    },
    [isUnlocked, updateVaultData]
  );

  /** Check if a specific nudge should be shown */
  const shouldShow = useCallback(
    (nudgeId: string): boolean => {
      if (!isEnabled) return false;
      return !dismissedIds.has(nudgeId);
    },
    [isEnabled, dismissedIds]
  );

  /** Turn off ALL nudges (called from "Turn off these tips" link) */
  const disableAll = useCallback(async () => {
    await setNudgesEnabled(false);
  }, [setNudgesEnabled]);

  /** Re-enable nudges and clear dismissed list (full reset) */
  const resetNudges = useCallback(async () => {
    if (!isUnlocked) return;
    await updateVaultData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        [NUDGE_KEY]: true,
        [DISMISSED_KEY]: [],
      },
    }));
  }, [isUnlocked, updateVaultData]);

  return {
    isEnabled,
    setNudgesEnabled,
    dismissNudge,
    shouldShow,
    disableAll,
    resetNudges,
    dismissedIds,
  };
}
