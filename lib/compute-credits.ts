/**
 * Backward-compatible free-use helpers.
 *
 * HammerLock v0.4 does not sell, allocate, store, or deduct compute credits.
 * These exports remain while older callers are migrated away from metering.
 */

const UNLIMITED_UNITS = Number.MAX_SAFE_INTEGER;

const COST_MAP: Record<string, number> = {
  chat: 0,
  chat_premium: 0,
  search: 0,
  transcribe: 0,
  report: 0,
  pdf: 0,
};

const DEFAULT_MONTHLY_ALLOCATION = UNLIMITED_UNITS;

export async function getRemainingUnits(): Promise<number> {
  return UNLIMITED_UNITS;
}

export async function getCreditInfo() {
  return {
    unlimited: true,
    meteredByHammerLock: false,
    totalUnits: UNLIMITED_UNITS,
    usedUnits: 0,
    remainingUnits: UNLIMITED_UNITS,
    requestCount: 0,
    periodEnd: null,
    monthlyAllocation: UNLIMITED_UNITS,
    boosterUnits: 0,
  };
}

export async function hasCredit(requestType: string = "chat"): Promise<boolean> {
  void requestType;
  return true;
}

export async function deductCredit(requestType: string = "chat"): Promise<void> {
  void requestType;
}

export async function addUnits(units: number): Promise<void> {
  void units;
}

export async function setMonthlyAllocation(units: number): Promise<void> {
  void units;
}

export async function setBoosterUnits(units: number): Promise<void> {
  void units;
}

export { COST_MAP, DEFAULT_MONTHLY_ALLOCATION };
