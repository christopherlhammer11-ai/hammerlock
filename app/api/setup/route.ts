/**
 * /api/setup — Integration discovery & agent-guided setup
 *
 * GET  → Returns categorized skills with ready/missing status
 * POST → Sends a setup message to the OpenClaw agent for guided config
 */

import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { openclawCommand, isMacOS } from "@/lib/openclaw-paths";
import os from "os";

const execAsync = promisify(exec);

// macOS-only skills that shouldn't show on Windows/Linux
const MACOS_ONLY_SKILLS = new Set(["apple-reminders", "apple-notes", "imsg", "peekaboo", "things-mac"]);

// ── Skill categories for the onboarding UI ──
const SKILL_CATEGORIES: Record<string, {
  label: string;
  emoji: string;
  description: string;
  skills: string[];
}> = {
  apple: {
    label: "Apple Built-in",
    emoji: "🍎",
    description: "Native macOS integrations — no accounts needed, just permissions",
    skills: ["apple-reminders", "apple-notes", "imsg", "peekaboo"],
  },
  productivity: {
    label: "Productivity & Notes",
    emoji: "📋",
    description: "Task management, note-taking, and organization",
    skills: ["bear-notes", "obsidian", "things-mac", "notion", "trello"],
  },
  communication: {
    label: "Communication",
    emoji: "💬",
    description: "Email, messaging, and staying connected",
    skills: ["himalaya", "gog", "wacli", "slack"],
  },
  smart_home: {
    label: "Smart Home",
    emoji: "🏠",
    description: "Control lights, speakers, sleep tracker, and cameras",
    skills: ["openhue", "sonoscli", "eightctl", "camsnap"],
  },
  developer: {
    label: "Developer Tools",
    emoji: "🛠️",
    description: "GitHub, coding agents, and automation",
    skills: ["github", "coding-agent", "skill-creator"],
  },
  media: {
    label: "Media & Content",
    emoji: "🎬",
    description: "Summarize videos, extract audio, process PDFs",
    skills: ["summarize", "nano-pdf", "video-frames", "openai-whisper", "songsee", "gifgrep"],
  },
  web: {
    label: "Web & Research",
    emoji: "🌐",
    description: "Blog monitoring, weather, and web tools",
    skills: ["blogwatcher", "weather", "healthcheck"],
  },
};

// ── Use-case examples for each skill ──
const SKILL_USE_CASES: Record<string, string[]> = {
  "apple-reminders": [
    '"Remind me to call the dentist tomorrow at 2pm"',
    '"Show me what\'s due today"',
    '"Add groceries to my Shopping list"',
  ],
  "apple-notes": [
    '"Create a note about my project ideas"',
    '"Search my notes for meeting minutes"',
    '"List all my note folders"',
  ],
  "imsg": [
    '"Text Mom that I\'ll be late"',
    '"Show my recent messages with John"',
    '"Send an iMessage to the family group"',
  ],
  "himalaya": [
    '"Check my email for anything urgent"',
    '"Send an email to boss@company.com about the deadline"',
    '"Search emails from last week about invoices"',
  ],
  "gog": [
    '"Check my Gmail inbox"',
    '"What\'s on my Google Calendar today?"',
    '"Search Google Drive for the Q4 report"',
  ],
  "github": [
    '"Show my open pull requests"',
    '"List issues in my-org/my-repo"',
    '"What CI checks are running?"',
  ],
  "openhue": [
    '"Turn on the living room lights"',
    '"Set bedroom to warm white at 40%"',
    '"Activate the Movie Night scene"',
  ],
  "sonoscli": [
    '"Play jazz in the kitchen"',
    '"Turn the volume down in the office"',
    '"Group all speakers together"',
  ],
  "eightctl": [
    '"Set my bed temperature to -2"',
    '"What\'s my sleep score?"',
    '"Turn on the bed heater"',
  ],
  "weather": [
    '"What\'s the weather right now?"',
    '"Will it rain tomorrow?"',
    '"5-day forecast for New York"',
  ],
  "summarize": [
    '"Summarize this YouTube video: [URL]"',
    '"Give me a TLDR of this podcast episode"',
    '"Extract key points from this article"',
  ],
  "nano-pdf": [
    '"Merge these two PDFs"',
    '"Extract pages 5-10 from this PDF"',
    '"Add a watermark to my document"',
  ],
  "obsidian": [
    '"Create a daily note in my vault"',
    '"Search my Obsidian vault for project plans"',
    '"Link this note to my MOC"',
  ],
  "things-mac": [
    '"Add a task to my Today list"',
    '"Show my upcoming tasks"',
    '"Create a new project called Launch Plan"',
  ],
  "bear-notes": [
    '"Create a note tagged #ideas"',
    '"Search Bear for meeting notes"',
  ],
  "wacli": [
    '"Send a WhatsApp to Alex"',
    '"Check my recent WhatsApp messages"',
  ],
  "notion": [
    '"Create a new page in my workspace"',
    '"Update the status of my project tracker"',
  ],
  "camsnap": [
    '"Show me the front door camera"',
    '"Capture a frame from the garage cam"',
  ],
  "blogwatcher": [
    '"Check for new posts on TechCrunch"',
    '"Monitor this RSS feed for updates"',
  ],
  "openai-whisper": [
    '"Transcribe this audio recording"',
    '"Convert my voice memo to text"',
  ],
  "peekaboo": [
    '"Take a screenshot"',
    '"Capture the current screen and analyze it"',
  ],
  "healthcheck": [
    '"Run a security check on this machine"',
    '"What\'s my system health status?"',
  ],
  "skill-creator": [
    '"Help me create a new OpenClaw skill"',
    '"Package my scripts as an agent skill"',
  ],
};

// ── Setup instructions for skills that need config ──
const SKILL_SETUP_INFO: Record<string, {
  setupType: "permission" | "cli" | "api_key" | "oauth" | "none";
  setupNote: string;
}> = {
  "apple-reminders": { setupType: "permission", setupNote: "Needs macOS Reminders access — you'll be prompted on first use" },
  "apple-notes": { setupType: "permission", setupNote: "Needs macOS Notes access — you'll be prompted on first use" },
  "imsg": { setupType: "permission", setupNote: "Needs Full Disk Access for reading iMessage database" },
  "himalaya": { setupType: "cli", setupNote: "Needs IMAP/SMTP account setup via `himalaya account add`" },
  "gog": { setupType: "oauth", setupNote: "Needs Google OAuth — run `gog auth add` to connect your Google account" },
  "github": { setupType: "cli", setupNote: "Needs `gh auth login` — HammerLock can walk you through it" },
  "openhue": { setupType: "cli", setupNote: "Needs Hue Bridge pairing — press the bridge button when prompted" },
  "sonoscli": { setupType: "none", setupNote: "Auto-discovers Sonos speakers on your network" },
  "eightctl": { setupType: "cli", setupNote: "Needs Eight Sleep login via `eightctl auth`" },
  "notion": { setupType: "api_key", setupNote: "Needs a Notion API integration token" },
  "slack": { setupType: "oauth", setupNote: "Needs Slack workspace OAuth token" },
  "wacli": { setupType: "cli", setupNote: "Needs WhatsApp Web pairing via QR code" },
  "camsnap": { setupType: "cli", setupNote: "Needs RTSP camera URL configuration" },
  "weather": { setupType: "none", setupNote: "Works out of the box — no setup needed" },
  "summarize": { setupType: "none", setupNote: "Works out of the box — no setup needed" },
  "nano-pdf": { setupType: "none", setupNote: "Works out of the box — no setup needed" },
  "blogwatcher": { setupType: "none", setupNote: "Works out of the box — no setup needed" },
  "obsidian": { setupType: "none", setupNote: "Auto-detects Obsidian vaults on your machine" },
  "things-mac": { setupType: "none", setupNote: "Works if Things 3 is installed" },
  "bear-notes": { setupType: "none", setupNote: "Works if Bear is installed" },
  "openai-whisper": { setupType: "none", setupNote: "Uses local Whisper model — no API key needed" },
  "peekaboo": { setupType: "permission", setupNote: "Needs Screen Recording permission" },
  "gifgrep": { setupType: "none", setupNote: "Works out of the box" },
  "video-frames": { setupType: "none", setupNote: "Needs ffmpeg (usually pre-installed)" },
  "songsee": { setupType: "none", setupNote: "Needs ffmpeg (usually pre-installed)" },
  "healthcheck": { setupType: "none", setupNote: "Works out of the box" },
  "skill-creator": { setupType: "none", setupNote: "Works out of the box" },
};

const FEATURED_SKILLS = new Set([
  "apple-notes",
  "apple-reminders",
  "imsg",
  "gog",
  "github",
  "wacli",
  "openhue",
  "sonoscli",
  "nano-pdf",
  "openai-whisper",
]);

const SKILL_DISPLAY_NAMES: Record<string, string> = {
  "apple-notes": "Apple Notes",
  "apple-reminders": "Apple Reminders",
  "imsg": "iMessage",
  "peekaboo": "Screen Capture",
  "bear-notes": "Bear",
  "obsidian": "Obsidian",
  "things-mac": "Things",
  "notion": "Notion",
  "trello": "Trello",
  "himalaya": "Email",
  "gog": "Google Workspace",
  "wacli": "WhatsApp",
  "slack": "Slack",
  "openhue": "Philips Hue",
  "sonoscli": "Sonos",
  "eightctl": "Eight Sleep",
  "camsnap": "Cameras",
  "github": "GitHub",
  "coding-agent": "Coding Agent",
  "skill-creator": "Skill Creator",
  "summarize": "Summarizer",
  "nano-pdf": "PDF Tools",
  "video-frames": "Video Frames",
  "openai-whisper": "Whisper Transcription",
  "songsee": "Audio Analysis",
  "gifgrep": "GIF Search",
  "blogwatcher": "Blog Watcher",
  "weather": "Weather",
  "healthcheck": "System Health",
};

const SKILL_ACTION_PROMPTS: Record<string, {
  setup?: string;
  test?: string;
  info?: string;
}> = {
  "apple-notes": {
    setup: "Help me set up Apple Notes in HammerLock. Check macOS permissions first, explain exactly what access is needed, then walk me through the quickest way to verify note creation and search are working.",
    test: "Test Apple Notes. Try a safe read-only check first, then tell me whether note search and note creation appear available on this machine.",
    info: "Explain what Apple Notes can do inside HammerLock, what macOS permissions it depends on, and the best real-world workflows for using it.",
  },
  "apple-reminders": {
    setup: "Help me set up Apple Reminders in HammerLock. Check whether Reminders permissions are available, explain what to grant, and show me the fastest way to verify reminder creation and listing.",
    test: "Test Apple Reminders. Check whether reminder lists and reminder creation appear available, and summarize the result clearly.",
  },
  "imsg": {
    setup: "Help me set up iMessage in HammerLock. Check what permissions or disk access are required, explain any limitations, and walk me through a safe verification flow.",
    test: "Test the iMessage integration with a safe non-destructive check. Tell me if message history access appears available and what still needs to be configured if not.",
  },
  "gog": {
    setup: "Help me connect Google Workspace tools in HammerLock. Check whether Google auth is already configured, and if not, guide me through the exact gog OAuth steps for Gmail, Calendar, Drive, and related tools.",
    test: "Test Google Workspace in HammerLock. Verify whether Gmail, Calendar, and Drive access appear connected and summarize what is working right now.",
  },
  "github": {
    setup: "Help me set up GitHub in HammerLock. Check whether gh auth is already available, and if not, walk me through the cleanest login flow and repo access verification.",
    test: "Test the GitHub integration. Verify whether GitHub authentication is active and whether basic repo or issue access appears to be working.",
  },
  "wacli": {
    setup: "Help me set up WhatsApp in HammerLock. Explain the pairing flow, what QR login is needed, and the safest way to confirm the tool is ready.",
    test: "Test the WhatsApp integration with a safe status check. Tell me whether WhatsApp pairing appears active and what to do next if it is not.",
  },
  "openhue": {
    setup: "Help me set up Philips Hue in HammerLock. Check for bridge discovery requirements, explain the pairing steps, and tell me how to verify lights and scenes are reachable.",
    test: "Test the Philips Hue integration. Check whether a bridge and lights appear reachable and summarize whether light control is ready.",
  },
  "sonoscli": {
    setup: "Help me set up Sonos in HammerLock. Check whether speakers can be discovered on the network, explain any network requirements, and show how to verify playback control.",
    test: "Test Sonos in HammerLock. Verify whether speakers are discoverable and whether basic playback control appears available.",
  },
  "nano-pdf": {
    info: "Explain what PDF Tools can do inside HammerLock, including merge, extract, and document processing workflows, and tell me what kinds of tasks are best handled with it.",
    test: "Test the PDF tools in HammerLock. Confirm whether the PDF processing toolchain appears available and summarize the supported document actions.",
  },
  "openai-whisper": {
    info: "Explain how Whisper Transcription works in HammerLock, whether it runs locally, what kinds of audio it is best for, and how it fits into voice workflows.",
    test: "Test Whisper Transcription in HammerLock. Confirm whether the transcription toolchain appears available and summarize any missing dependencies or next steps.",
  },
};

const SKILL_SETUP_TRACKS: Record<string, string[]> = {
  "apple-notes": [
    "Grant Notes access when macOS prompts you.",
    "Open Tool Center again and confirm the permission looks healthy.",
    "Run a quick note creation or search test from chat.",
  ],
  "apple-reminders": [
    "Grant Reminders access when macOS prompts you.",
    "Re-open the Tool Center and verify the tool is readable.",
    "Create a simple reminder from chat to confirm writes work.",
  ],
  "imsg": [
    "Enable Full Disk Access for HammerLock AI in System Settings.",
    "Re-open the Tool Center and verify message access health.",
    "Run a safe message-history test before attempting any send flow.",
  ],
  "gog": [
    "Connect your Google account through the gog OAuth flow.",
    "Verify Gmail, Calendar, and Drive are visible in the test result.",
    "Try one real command like inbox, calendar, or Drive search.",
  ],
  "github": [
    "Authenticate with GitHub using gh auth login.",
    "Verify repo or issue access in the Tool Center test.",
    "Try one real workflow like listing PRs or open issues.",
  ],
  "wacli": [
    "Pair WhatsApp Web by scanning the QR code.",
    "Confirm the pairing remains active in the Tool Center test.",
    "Try a safe read or status check before any outbound send flow.",
  ],
  "openhue": [
    "Pair with the Hue Bridge and press the bridge button if prompted.",
    "Verify that rooms, lights, or scenes are discoverable.",
    "Run one real command like toggling or dimming a light.",
  ],
  "sonoscli": [
    "Make sure your speakers are on the same network.",
    "Verify speaker discovery in the Tool Center test.",
    "Try a safe playback or volume command from chat.",
  ],
  "nano-pdf": [
    "Confirm PDF tooling is present on this machine.",
    "Run the Tool Center test to verify processing availability.",
    "Try one real operation like extract, merge, or watermark.",
  ],
  "openai-whisper": [
    "Confirm the Whisper toolchain is installed and reachable.",
    "Run the Tool Center test to verify transcription readiness.",
    "Try one real audio transcription from chat.",
  ],
};

export interface SkillInfo {
  name: string;
  displayName: string;
  emoji: string;
  description: string;
  engine: "hammerlock" | "openclaw" | "hybrid";
  ownership: "flagship" | "connector";
  ownershipLabel: string;
  runtimeLabel: string;
  strategyNote: string;
  featured: boolean;
  ready: boolean;
  disabled: boolean;
  status: "ready" | "needs_permission" | "needs_auth" | "needs_dependency" | "disabled";
  statusLabel: string;
  recommendedAction: "test" | "setup" | "info";
  missingBins: string[];
  missingEnv: string[];
  setupType: string;
  setupNote: string;
  useCases: string[];
  requirements: string[];
  setupPathLabel: string;
  verificationNote?: string;
  verifiedAt?: string;
  setupTrack: string[];
}

export interface SkillCategory {
  id: string;
  label: string;
  emoji: string;
  description: string;
  skills: SkillInfo[];
  readyCount: number;
  totalCount: number;
}

const TOOL_RUNTIME_STRATEGY: Record<string, {
  engine: SkillInfo["engine"];
  ownership: SkillInfo["ownership"];
  strategyNote: string;
}> = {
  "apple-notes": {
    engine: "hybrid",
    ownership: "flagship",
    strategyNote: "HammerLock should own the user experience here, even when OpenClaw still helps with local execution.",
  },
  "apple-reminders": {
    engine: "hybrid",
    ownership: "flagship",
    strategyNote: "Core daily workflow. Keep the HammerLock setup, testing, and orchestration layer first-class.",
  },
  "imsg": {
    engine: "hybrid",
    ownership: "flagship",
    strategyNote: "High-value private messaging workflow that should feel native inside HammerLock.",
  },
  "gog": {
    engine: "hybrid",
    ownership: "flagship",
    strategyNote: "Important work surface for email, calendar, and docs. HammerLock should own the workflow framing.",
  },
  "github": {
    engine: "hybrid",
    ownership: "flagship",
    strategyNote: "Developer workflow users will attribute to HammerLock, even if the connector layer stays shared.",
  },
  "nano-pdf": {
    engine: "hammerlock",
    ownership: "flagship",
    strategyNote: "Document work is part of the HammerLock product promise and should stay a first-class workflow.",
  },
  "openai-whisper": {
    engine: "hammerlock",
    ownership: "flagship",
    strategyNote: "Voice and transcription are core HammerLock experiences and should feel product-native.",
  },
  "peekaboo": {
    engine: "hybrid",
    ownership: "flagship",
    strategyNote: "Screen capture is part of the flagship local workflow surface, even if the underlying automation is shared.",
  },
  "weather": {
    engine: "hammerlock",
    ownership: "flagship",
    strategyNote: "Simple utility that should feel built in and available instantly.",
  },
};

function getToolRuntimeMeta(skillName: string) {
  const meta = TOOL_RUNTIME_STRATEGY[skillName];
  if (meta) {
    return {
      ...meta,
      ownershipLabel: meta.ownership === "flagship" ? "HammerLock Workflow" : "Connector",
      runtimeLabel:
        meta.engine === "hammerlock"
          ? "HammerLock Native"
          : meta.engine === "hybrid"
            ? "HammerLock + OpenClaw"
            : "OpenClaw Connector",
    };
  }

  return {
    engine: "openclaw" as const,
    ownership: "connector" as const,
    ownershipLabel: "Connector",
    runtimeLabel: "OpenClaw Connector",
    strategyNote: "Useful integration breadth powered by OpenClaw so HammerLock can stay focused on flagship workflows.",
  };
}

export async function GET() {
  try {
    const cmd = openclawCommand("skills list --json");
    const { stdout } = await execAsync(cmd + " 2>/dev/null", { timeout: 10000 });
    const data = JSON.parse(stdout);
    const rawSkills: Array<{
      name: string;
      emoji: string;
      description: string;
      eligible: boolean;
      disabled: boolean;
      missing: { bins: string[]; anyBins: string[]; env: string[]; config: string[]; os: string[] };
    }> = data.skills || [];

    // Build skill lookup
    const skillMap = new Map(rawSkills.map(s => [s.name, s]));
    const featuredChecks = await runFeaturedHealthChecks(skillMap);
    const verifiedAt = new Date().toISOString();

    // Build categorized response
    const categories: SkillCategory[] = [];

    for (const [catId, catDef] of Object.entries(SKILL_CATEGORIES)) {
      // Skip the entire Apple category on non-macOS platforms
      if (!isMacOS && catId === "apple") continue;

      const catSkills: SkillInfo[] = [];

      for (const skillName of catDef.skills) {
        // Skip macOS-only skills on Windows/Linux
        if (!isMacOS && MACOS_ONLY_SKILLS.has(skillName)) continue;

        const raw = skillMap.get(skillName);
        if (!raw) continue; // Skill not in this OpenClaw install

        const setup = SKILL_SETUP_INFO[skillName] || { setupType: "none", setupNote: "" };
        const missingBins = [...(raw.missing?.bins || []), ...(raw.missing?.anyBins || [])];
        const missingEnv = raw.missing?.env || [];
        const disabled = raw.disabled;
        const ready = raw.eligible;
        const status: SkillInfo["status"] = disabled
          ? "disabled"
          : ready
            ? "ready"
            : setup.setupType === "permission"
              ? "needs_permission"
              : setup.setupType === "oauth" || setup.setupType === "api_key"
                ? "needs_auth"
                : missingBins.length > 0 || missingEnv.length > 0
                  ? "needs_dependency"
                  : "needs_dependency";
        const statusLabel =
          status === "ready" ? "Ready" :
          status === "needs_permission" ? "Needs Permission" :
          status === "needs_auth" ? "Needs Account/Auth" :
          status === "disabled" ? "Disabled" :
          "Needs Setup";
        const requirements = [
          ...(missingBins.length ? [`Install: ${missingBins.join(", ")}`] : []),
          ...(missingEnv.length ? [`Env vars: ${missingEnv.join(", ")}`] : []),
          ...(setup.setupNote ? [setup.setupNote] : []),
        ];
        const setupPathLabel =
          setup.setupType === "none" ? "Instant" :
          setup.setupType === "permission" ? "Permission" :
          setup.setupType === "oauth" ? "OAuth" :
          setup.setupType === "api_key" ? "API Key" :
          "CLI Setup";
        const verificationNote = featuredChecks[raw.name];
        const setupTrack = SKILL_SETUP_TRACKS[raw.name] || [];
        const runtimeMeta = getToolRuntimeMeta(raw.name);

        catSkills.push({
          name: raw.name,
          displayName: SKILL_DISPLAY_NAMES[raw.name] || raw.name,
          emoji: raw.emoji,
          description: raw.description.split(".")[0] + ".", // First sentence only
          engine: runtimeMeta.engine,
          ownership: runtimeMeta.ownership,
          ownershipLabel: runtimeMeta.ownershipLabel,
          runtimeLabel: runtimeMeta.runtimeLabel,
          strategyNote: runtimeMeta.strategyNote,
          featured: FEATURED_SKILLS.has(raw.name),
          ready,
          disabled,
          status,
          statusLabel,
          recommendedAction: ready ? "test" : "setup",
          missingBins,
          missingEnv,
          setupType: setup.setupType,
          setupNote: setup.setupNote,
          useCases: SKILL_USE_CASES[skillName] || [],
          requirements,
          setupPathLabel,
          verificationNote,
          verifiedAt: verificationNote ? verifiedAt : undefined,
          setupTrack,
        });
      }

      catSkills.sort((a, b) => {
        const score = (skill: SkillInfo) =>
          (skill.featured ? 100 : 0) +
          (skill.ready ? 20 : 0) +
          (skill.status === "needs_permission" ? 5 : 0);
        return score(b) - score(a) || a.displayName.localeCompare(b.displayName);
      });

      if (catSkills.length > 0) {
        categories.push({
          id: catId,
          label: catDef.label,
          emoji: catDef.emoji,
          description: catDef.description,
          skills: catSkills,
          readyCount: catSkills.filter(s => s.ready).length,
          totalCount: catSkills.length,
        });
      }
    }

    // Sort: categories with most ready skills first
    categories.sort((a, b) => b.readyCount - a.readyCount);

    return NextResponse.json({
      categories,
      totalReady: rawSkills.filter(s => s.eligible).length,
      totalSkills: rawSkills.length,
    });
  } catch (err) {
    console.error("[setup] skills list error:", err);
    return NextResponse.json(
      { error: "Failed to discover integrations", categories: [], totalReady: 0, totalSkills: 0 },
      { status: 500 }
    );
  }
}

async function runFeaturedHealthChecks(skillMap: Map<string, {
  name: string;
  emoji: string;
  description: string;
  eligible: boolean;
  disabled: boolean;
  missing: { bins: string[]; anyBins: string[]; env: string[]; config: string[]; os: string[] };
}>): Promise<Record<string, string>> {
  const notes: Record<string, string> = {};
  const has = (name: string) => skillMap.has(name);

  const checks = await Promise.all([
    has("apple-notes") ? checkAppleScriptHealth("apple-notes", "Notes", 'get name of folders') : Promise.resolve(null),
    has("apple-reminders") ? checkAppleScriptHealth("apple-reminders", "Reminders", 'get name of lists') : Promise.resolve(null),
    has("imsg") ? checkFullDiskHealth("imsg") : Promise.resolve(null),
    has("gog") ? checkGoogleHealth() : Promise.resolve(null),
    has("github") ? checkGitHubHealth() : Promise.resolve(null),
  ]);

  for (const item of checks) {
    if (item) notes[item.skill] = item.note;
  }

  return notes;
}

async function checkAppleScriptHealth(skill: string, app: string, command: string) {
  if (!isMacOS) return { skill, note: "macOS-only tool." };
  try {
    await execAsync(`osascript -e 'tell application "${app}" to ${command}' 2>/dev/null`, { timeout: 6000 });
    return { skill, note: `${app} access verified on this Mac.` };
  } catch {
    return { skill, note: `${app} permission has not been verified yet.` };
  }
}

async function checkFullDiskHealth(skill: string) {
  if (!isMacOS) return { skill, note: "macOS-only tool." };
  try {
    await execAsync(`test -r "${os.homedir()}/Library/Messages/chat.db" && echo ok`, { timeout: 3000 });
    return { skill, note: "Full Disk Access appears available for message history." };
  } catch {
    return { skill, note: "Full Disk Access still needs to be granted for message access." };
  }
}

async function checkGoogleHealth() {
  try {
    const { stdout } = await execAsync(`gog auth status --json 2>/dev/null`, { timeout: 8000 });
    const status = JSON.parse(stdout);
    const email = status.account?.email;
    if (email) {
      return { skill: "gog", note: `Google account connected: ${email}` };
    }
  } catch {
    // ignore
  }
  return { skill: "gog", note: "Google Workspace connection has not been verified yet." };
}

async function checkGitHubHealth() {
  try {
    const { stdout, stderr } = await execAsync(`gh auth status 2>&1`, { timeout: 8000 });
    const output = `${stdout}\n${stderr}`;
    const match = output.match(/Logged in to [^\s]+ as ([^\s]+)/i);
    if (match?.[1]) {
      return { skill: "github", note: `GitHub auth verified for ${match[1]}.` };
    }
    if (/Logged in to/i.test(output)) {
      return { skill: "github", note: "GitHub authentication appears active." };
    }
  } catch {
    // ignore
  }
  return { skill: "github", note: "GitHub auth has not been verified yet." };
}

/**
 * POST /api/setup — Ask the OpenClaw agent to help set up a specific skill
 *
 * Body: { skill: string, action: "setup" | "test" | "info" }
 */
export async function POST(req: Request) {
  try {
    const { skill, action } = await req.json();
    const prompts = SKILL_ACTION_PROMPTS[skill] || {};

    let message = "";
    if (action === "setup") {
      message = prompts.setup || `Help me set up the "${skill}" integration. Walk me through the configuration step by step. Check if it's already configured, and if not, tell me exactly what I need to do.`;
    } else if (action === "test") {
      message = prompts.test || `Test the "${skill}" integration. Try a basic operation and tell me if it's working correctly.`;
    } else {
      message = prompts.info || `Tell me about the "${skill}" skill — what it does, what I can use it for, and what's needed to set it up.`;
    }

    const escaped = message.replace(/'/g, "'\\''");
    const cmd = openclawCommand(
      `agent --agent main --session-id 'hammerlock-setup-${Date.now()}' --message '${escaped}' --json --no-color`
    );

    const { stdout } = await execAsync(cmd + " 2>/dev/null", { timeout: 60000 });

    // Parse agent response
    let response = stdout.trim();
    try {
      const parsed = JSON.parse(response);
      if (parsed.result?.payloads?.[0]?.text) {
        response = parsed.result.payloads[0].text;
      } else if (parsed.text) {
        response = parsed.text;
      }
    } catch {
      // Use raw stdout if not JSON
    }

    return NextResponse.json({ response, skill, action });
  } catch (err) {
    console.error("[setup] agent error:", err);
    return NextResponse.json(
      { error: "Setup agent unavailable", response: "I couldn't reach the setup agent. Make sure the OpenClaw gateway is running." },
      { status: 500 }
    );
  }
}
