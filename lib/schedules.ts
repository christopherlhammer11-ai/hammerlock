// 🔨🔐 HammerLock AI — Scheduled Agent Tasks
// Runs agent tasks on a schedule: daily, weekly, hourly, or one-time.
// Schedules are stored encrypted in the vault alongside persona data.

export type ScheduleFrequency = "once" | "daily" | "weekly" | "hourly" | "weekdays" | "weekends";

export type ScheduledTask = {
  id: string;
  /** The agent ID to use (e.g., "coach", "money", "content") */
  agentId: string;
  /** Human-readable description of what to do */
  task: string;
  /** The actual prompt to send to the agent */
  prompt: string;
  /** How often: once, daily, weekly, hourly, weekdays, weekends */
  frequency: ScheduleFrequency;
  /** Hour of day (0-23) */
  hour: number;
  /** Minute of hour (0-59) */
  minute: number;
  /** Day of week (0=Sun, 1=Mon, ..., 6=Sat) — only used for "weekly" */
  dayOfWeek?: number;
  /** ISO string of when this was created */
  createdAt: string;
  /** ISO string of the last time this task fired */
  lastFiredAt?: string;
  /** Whether this schedule is active */
  enabled: boolean;
};

/** Storage key for schedules in vault settings */
export const SCHEDULES_VAULT_KEY = "scheduled_tasks";

/** Day names for display */
export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Generate a unique schedule ID */
export function generateScheduleId(): string {
  return `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Format time as 12-hour string */
export function formatTime12h(hour: number, minute: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "am" : "pm";
  const m = minute.toString().padStart(2, "0");
  return m === "00" ? `${h}${ampm}` : `${h}:${m}${ampm}`;
}

/** Format schedule as human-readable string */
export function formatSchedule(task: ScheduledTask): string {
  const time = formatTime12h(task.hour, task.minute);
  switch (task.frequency) {
    case "once":
      return `Once at ${time}`;
    case "daily":
      return `Daily at ${time}`;
    case "weekly":
      return `Every ${DAY_NAMES[task.dayOfWeek ?? 0]} at ${time}`;
    case "hourly":
      return `Every hour at :${task.minute.toString().padStart(2, "0")}`;
    case "weekdays":
      return `Weekdays at ${time}`;
    case "weekends":
      return `Weekends at ${time}`;
    default:
      return `At ${time}`;
  }
}

/**
 * Check if a scheduled task should fire right now.
 * Uses a 60-second window to avoid missing tasks between poller ticks.
 */
export function shouldFireNow(task: ScheduledTask, now: Date): boolean {
  if (!task.enabled) return false;

  const currentH = now.getHours();
  const currentM = now.getMinutes();
  const currentDay = now.getDay(); // 0=Sun

  // Check if already fired this minute (prevent double-fire)
  if (task.lastFiredAt) {
    const lastFired = new Date(task.lastFiredAt);
    if (
      lastFired.getFullYear() === now.getFullYear() &&
      lastFired.getMonth() === now.getMonth() &&
      lastFired.getDate() === now.getDate() &&
      lastFired.getHours() === now.getHours() &&
      lastFired.getMinutes() === now.getMinutes()
    ) {
      return false; // Already fired this minute
    }
  }

  // For hourly, only check minute
  if (task.frequency === "hourly") {
    return currentM === task.minute;
  }

  // Check time match first
  if (currentH !== task.hour || currentM !== task.minute) {
    return false;
  }

  // Check day-of-week constraints
  switch (task.frequency) {
    case "daily":
      return true;
    case "weekly":
      return currentDay === (task.dayOfWeek ?? 0);
    case "weekdays":
      return currentDay >= 1 && currentDay <= 5;
    case "weekends":
      return currentDay === 0 || currentDay === 6;
    case "once": {
      // Fire once, then it gets disabled after firing
      return !task.lastFiredAt;
    }
    default:
      return true;
  }
}

/**
 * After a "once" task fires, mark it as disabled.
 */
export function markFired(task: ScheduledTask, now: Date): ScheduledTask {
  const updated = { ...task, lastFiredAt: now.toISOString() };
  if (task.frequency === "once") {
    updated.enabled = false;
  }
  return updated;
}

/** Get all scheduled tasks from vault settings */
export function getSchedulesFromVault(settings: Record<string, unknown>): ScheduledTask[] {
  const raw = settings[SCHEDULES_VAULT_KEY];
  if (!Array.isArray(raw)) return [];
  return raw as ScheduledTask[];
}

/** Save scheduled tasks to vault settings (returns new settings object) */
export function setSchedulesInVault(
  settings: Record<string, unknown>,
  tasks: ScheduledTask[]
): Record<string, unknown> {
  return { ...settings, [SCHEDULES_VAULT_KEY]: tasks };
}

/** Add a new scheduled task */
export function addSchedule(
  settings: Record<string, unknown>,
  task: ScheduledTask
): Record<string, unknown> {
  const existing = getSchedulesFromVault(settings);
  return setSchedulesInVault(settings, [...existing, task]);
}

/** Remove a scheduled task by ID */
export function removeSchedule(
  settings: Record<string, unknown>,
  taskId: string
): Record<string, unknown> {
  const existing = getSchedulesFromVault(settings);
  return setSchedulesInVault(settings, existing.filter(t => t.id !== taskId));
}

/** Update a scheduled task (e.g., after firing) */
export function updateSchedule(
  settings: Record<string, unknown>,
  taskId: string,
  updater: (task: ScheduledTask) => ScheduledTask
): Record<string, unknown> {
  const existing = getSchedulesFromVault(settings);
  return setSchedulesInVault(
    settings,
    existing.map(t => (t.id === taskId ? updater(t) : t))
  );
}

/** Toggle a scheduled task on/off */
export function toggleSchedule(
  settings: Record<string, unknown>,
  taskId: string
): Record<string, unknown> {
  return updateSchedule(settings, taskId, t => ({ ...t, enabled: !t.enabled }));
}
