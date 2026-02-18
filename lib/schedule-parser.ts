// 🔨🔐 HammerLock AI — Schedule Parser
// Parses natural language schedule commands into ScheduledTask objects.
// "Every Monday at 9am, have Coach send me a workout plan"
// → { agentId: "coach", frequency: "weekly", hour: 9, minute: 0, dayOfWeek: 1, ... }

import {
  type ScheduledTask,
  type ScheduleFrequency,
  generateScheduleId,
} from "./schedules";

/** Result of parsing a schedule command */
export type ParsedSchedule = {
  success: true;
  task: ScheduledTask;
} | {
  success: false;
  error: string;
};

/** Agent name → ID mapping for natural language matching */
const AGENT_NAME_MAP: Record<string, string> = {
  coach: "coach",
  fitness: "coach",
  trainer: "coach",
  wellness: "coach",
  health: "coach",
  money: "money",
  budget: "money",
  finance: "money",
  financial: "money",
  content: "content",
  social: "content",
  "social media": "content",
  posting: "content",
  analyst: "analyst",
  analysis: "analyst",
  strategist: "strategist",
  strategy: "strategist",
  counsel: "counsel",
  legal: "counsel",
  lawyer: "counsel",
  researcher: "researcher",
  research: "researcher",
  operator: "operator",
  ops: "operator",
  writer: "writer",
  writing: "writer",
  director: "director",
  video: "director",
  film: "director",
  script: "director",
  general: "general",
  assistant: "general",
};

/** Day name → number mapping */
const DAY_MAP: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

/**
 * Parse a time string like "9am", "2:30pm", "14:00", "noon", "midnight"
 * Returns [hour, minute] in 24-hour format or null
 */
function parseTime(text: string): [number, number] | null {
  const lower = text.toLowerCase().trim();

  // Special words
  if (lower === "noon" || lower === "midday") return [12, 0];
  if (lower === "midnight") return [0, 0];
  if (lower === "morning") return [9, 0];
  if (lower === "afternoon") return [14, 0];
  if (lower === "evening") return [18, 0];
  if (lower === "night") return [21, 0];

  // "9am", "9:30am", "2pm", "2:30pm", "14:00"
  const match = lower.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3];

  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return [hour, minute];
}

/**
 * Extract the agent ID from natural language text.
 * Looks for patterns like "have Coach...", "use the money agent...", "with analyst..."
 */
function extractAgentId(text: string): string | null {
  const lower = text.toLowerCase();

  // "have [agent] ...", "use [agent] ...", "ask [agent] ...", "with [agent] ..."
  const agentPattern = /(?:have|use|ask|with|from|via|through|using)\s+(?:the\s+)?(\w+)\s+(?:agent\s+)?/i;
  const match = lower.match(agentPattern);
  if (match) {
    const name = match[1].toLowerCase();
    if (AGENT_NAME_MAP[name]) return AGENT_NAME_MAP[name];
  }

  // "[agent] agent" pattern
  const agentSuffix = lower.match(/(\w+)\s+agent/i);
  if (agentSuffix) {
    const name = agentSuffix[1].toLowerCase();
    if (AGENT_NAME_MAP[name]) return AGENT_NAME_MAP[name];
  }

  // Direct agent name anywhere in text
  for (const [name, id] of Object.entries(AGENT_NAME_MAP)) {
    // Match whole word to avoid partial matches
    const regex = new RegExp(`\\b${name}\\b`, "i");
    if (regex.test(lower)) return id;
  }

  return null;
}

/**
 * Extract the task/prompt from the text, stripping schedule and agent parts.
 */
function extractTask(text: string): string {
  let task = text;

  // Remove schedule prefixes
  task = task.replace(
    /^(?:schedule|set\s+up|create|add)\s+(?:a\s+)?(?:scheduled\s+)?(?:task|agent\s+task)?[:\s]*/i,
    ""
  );

  // Remove frequency parts
  task = task.replace(
    /\b(?:every\s+(?:day|morning|evening|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|weekdays?|weekends?|hour))\b/gi,
    ""
  );
  task = task.replace(/\b(?:daily|weekly|hourly|once|weekdays?|weekends?)\b/gi, "");

  // Remove time parts
  task = task.replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b/gi, "");
  task = task.replace(/\bat\s+(?:noon|midnight|morning|afternoon|evening|night)\b/gi, "");

  // Remove agent references
  task = task.replace(/\b(?:have|use|ask|with|from|via|through|using)\s+(?:the\s+)?\w+\s+(?:agent\s+)?/gi, "");
  task = task.replace(/\b\w+\s+agent\b/gi, "");

  // Remove common connecting words at start
  task = task.replace(/^[,;\s]+/, "");
  task = task.replace(/^(?:to\s+|and\s+|then\s+)/i, "");

  // Clean up multiple commas, extra spaces, and leading/trailing punctuation
  task = task.replace(/,\s*,/g, ",");
  task = task.replace(/^\s*[,;:\s]+/, "");
  task = task.replace(/\s+/g, " ").trim();

  return task || text.trim();
}

/**
 * Main parser: converts natural language into a ScheduledTask.
 *
 * Supported patterns:
 * - "Every day at 9am, have Coach send me a workout plan"
 * - "Schedule daily at 8am: money agent review my spending"
 * - "Every Monday at 10am, content agent draft social posts"
 * - "Weekdays at 7am, coach send me a morning motivation"
 * - "Every hour, check my budget with money agent"
 * - "Once at 3pm, have analyst run a revenue check"
 * - "Schedule a task: every morning, coach sends a workout"
 */
export function parseScheduleCommand(text: string): ParsedSchedule {
  const lower = text.toLowerCase().trim();

  // ── Detect if this is a schedule command ──
  const isScheduleCmd =
    /^(?:schedule|set\s+up|create)\s+(?:a\s+)?(?:scheduled\s+)?(?:task|agent)/i.test(lower) ||
    /^every\s+(?:day|morning|evening|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|weekday|weekend|hour)/i.test(lower) ||
    /^(?:daily|weekly|weekdays?|weekends?|hourly|once)\s+at\s+/i.test(lower) ||
    /\bevery\s+(?:day|morning|monday|tuesday|wednesday|thursday|friday|saturday|sunday|hour|weekday|weekend)\b/i.test(lower);

  if (!isScheduleCmd) {
    return { success: false, error: "Not a schedule command" };
  }

  // ── Parse frequency ──
  let frequency: ScheduleFrequency = "daily";
  let dayOfWeek: number | undefined;

  if (/\bhourly\b|\bevery\s+hour\b/i.test(lower)) {
    frequency = "hourly";
  } else if (/\bonce\b/i.test(lower)) {
    frequency = "once";
  } else if (/\bweekdays?\b|\bevery\s+weekday\b/i.test(lower)) {
    frequency = "weekdays";
  } else if (/\bweekends?\b|\bevery\s+weekend\b/i.test(lower)) {
    frequency = "weekends";
  } else {
    // Check for specific day names
    for (const [dayName, dayNum] of Object.entries(DAY_MAP)) {
      const dayRegex = new RegExp(`\\b(?:every\\s+)?${dayName}\\b`, "i");
      if (dayRegex.test(lower)) {
        frequency = "weekly";
        dayOfWeek = dayNum;
        break;
      }
    }
    // "every day" or "daily" stays as default "daily"
  }

  // ── Parse time ──
  let hour = 9; // Default 9am
  let minute = 0;

  // "at 9am", "at 2:30pm", "at noon"
  const timeMatch = lower.match(/\bat\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i)
    || lower.match(/\bat\s+(noon|midnight|morning|afternoon|evening|night)\b/i);

  if (timeMatch) {
    const parsed = parseTime(timeMatch[1]);
    if (parsed) {
      [hour, minute] = parsed;
    }
  } else if (/\bmorning\b/i.test(lower)) {
    hour = 9; minute = 0;
  } else if (/\bafternoon\b/i.test(lower)) {
    hour = 14; minute = 0;
  } else if (/\bevening\b/i.test(lower)) {
    hour = 18; minute = 0;
  } else if (/\bnight\b/i.test(lower)) {
    hour = 21; minute = 0;
  }

  // ── Extract agent ──
  const agentId = extractAgentId(text) || "general";

  // ── Extract task description ──
  const task = extractTask(text);

  if (!task || task.length < 3) {
    return {
      success: false,
      error: "Couldn't understand the task. Try: \"Every day at 9am, have Coach send me a workout plan\""
    };
  }

  // ── Build the prompt the agent will receive ──
  const prompt = buildAgentPrompt(agentId, task);

  const scheduled: ScheduledTask = {
    id: generateScheduleId(),
    agentId,
    task,
    prompt,
    frequency,
    hour,
    minute,
    dayOfWeek,
    createdAt: new Date().toISOString(),
    enabled: true,
  };

  return { success: true, task: scheduled };
}

/**
 * Build a prompt tailored to the agent's specialty.
 */
function buildAgentPrompt(agentId: string, task: string): string {
  const prompts: Record<string, string> = {
    coach: `As my fitness and wellness coach, ${task}. Make it actionable and motivating. Include specific exercises, reps, or meal details if relevant.`,
    money: `As my financial advisor, ${task}. Be specific with numbers, deadlines, and action items. Include any budget alerts or savings tips.`,
    content: `As my content strategist, ${task}. Include ready-to-post content with hashtags, CTAs, and platform-specific formatting.`,
    analyst: `As my financial analyst, ${task}. Include data-driven insights, metrics, and structured analysis.`,
    strategist: `As my business strategist, ${task}. Include frameworks, competitive analysis, and strategic recommendations.`,
    counsel: `As my legal research assistant, ${task}. Include relevant considerations, risks, and recommended next steps. Note: this is research, not legal advice.`,
    researcher: `As my research assistant, ${task}. Include sources, key findings, and analysis.`,
    operator: `As my operations manager, ${task}. Include prioritized action items, timelines, and ownership suggestions.`,
    writer: `As my writing assistant, ${task}. Include polished, ready-to-use content.`,
    general: `${task}. Be helpful, concise, and actionable.`,
  };

  return prompts[agentId] || prompts.general;
}

/**
 * Detect if a user message is trying to manage schedules.
 * Returns the action type or null.
 */
export function detectScheduleIntent(text: string): "create" | "list" | "delete" | "toggle" | null {
  const lower = text.toLowerCase().trim();

  // List schedules
  if (
    /^(?:show|list|view|what(?:'s| are)|check)\s+(?:my\s+)?(?:scheduled?\s+tasks?|schedules?|automations?|cron)/i.test(lower) ||
    /^(?:my\s+)?schedules?\s*$/i.test(lower)
  ) {
    return "list";
  }

  // Delete/remove schedule
  if (
    /^(?:delete|remove|cancel|stop)\s+(?:the\s+)?(?:scheduled?\s+(?:task)?|schedule|automation)/i.test(lower) ||
    /^(?:unschedule|cancel\s+schedule)/i.test(lower)
  ) {
    return "delete";
  }

  // Pause/resume (toggle)
  if (
    /^(?:pause|resume|toggle|enable|disable)\s+(?:the\s+)?(?:scheduled?\s+(?:task)?|schedule|automation)/i.test(lower)
  ) {
    return "toggle";
  }

  // Create schedule (this is the broadest — keep last)
  if (
    /^(?:schedule|set\s+up|create)\s+(?:a\s+)?(?:scheduled?\s+)?(?:task|agent)/i.test(lower) ||
    /^every\s+(?:day|morning|evening|night|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun|weekday|weekend|hour)/i.test(lower) ||
    /^(?:daily|weekly|weekdays?|weekends?|hourly|once)\s+at\s+/i.test(lower)
  ) {
    return "create";
  }

  return null;
}
