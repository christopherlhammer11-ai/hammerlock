/**
 * IntegrationSetup — Guided integration discovery & setup panel
 *
 * Shows HammerLock workflows and connector-backed tools grouped by category.
 * Users can tap "Set up" to have HammerLock guide them through the best path.
 * Appears after persona onboarding on first launch, and from Settings anytime.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown, ChevronRight, CheckCircle, AlertCircle, Zap,
  X, ArrowRight, RefreshCw, Settings, Search, Star,
} from "lucide-react";

// ── Types matching /api/setup response ──
interface SkillInfo {
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

interface SkillCategory {
  id: string;
  label: string;
  emoji: string;
  description: string;
  skills: SkillInfo[];
  readyCount: number;
  totalCount: number;
}

interface IntegrationSetupProps {
  onClose: () => void;
  onSetupSkill: (skillName: string, message: string) => void;
  mode?: "onboarding" | "settings";
}

interface EnvironmentHealth {
  status: string;
  gateway: string;
  providers: {
    gemini: boolean;
    ollama: boolean;
    openai: boolean;
    anthropic: boolean;
  };
}

const TOOL_BUNDLES = [
  {
    id: "private-mac",
    title: "Private Mac Essentials",
    subtitle: "Notes, reminders, screen capture, and iMessage on one machine.",
    skills: ["apple-notes", "apple-reminders", "peekaboo", "imsg"],
    prompt: "Help me set up my Private Mac Essentials bundle in HammerLock: Apple Notes, Apple Reminders, Screen Capture, and iMessage. Walk me through the highest-leverage order, check permissions, and tell me what to verify after each step.",
  },
  {
    id: "founder-ops",
    title: "Founder Ops Stack",
    subtitle: "Google, GitHub, notes, and PDF workflows for day-to-day execution.",
    skills: ["gog", "github", "apple-notes", "nano-pdf"],
    prompt: "Help me set up my Founder Ops Stack in HammerLock: Google Workspace, GitHub, Apple Notes, and PDF Tools. Prioritize the order, tell me what needs auth versus local permissions, and give me the fastest verification path.",
  },
  {
    id: "research-flow",
    title: "Research & Capture Flow",
    subtitle: "Whisper, PDF tools, weather, and notes for fast collection and synthesis.",
    skills: ["openai-whisper", "nano-pdf", "weather", "apple-notes"],
    prompt: "Help me set up my Research & Capture Flow in HammerLock: Whisper Transcription, PDF Tools, Weather, and Apple Notes. Walk me through setup in the best order and explain the first real command to test each tool.",
  },
];

const TOOL_COVERAGE_GROUPS = [
  {
    id: "capture",
    title: "Capture",
    subtitle: "Notes, transcription, PDFs, and screen capture.",
    skills: ["apple-notes", "openai-whisper", "nano-pdf", "peekaboo"],
    outcome: "Capture ideas, files, voice, and screen context in one flow.",
  },
  {
    id: "connect",
    title: "Connect",
    subtitle: "Accounts, inboxes, repos, and messaging.",
    skills: ["gog", "github", "wacli", "imsg"],
    outcome: "Reach the inboxes, repos, and conversations you already work in.",
  },
  {
    id: "control",
    title: "Control",
    subtitle: "Tasks, reminders, lights, and speakers.",
    skills: ["apple-reminders", "openhue", "sonoscli"],
    outcome: "Take action across reminders, home devices, and daily routines.",
  },
];

export default function IntegrationSetup({ onClose, onSetupSkill, mode = "onboarding" }: IntegrationSetupProps) {
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [totalReady, setTotalReady] = useState(0);
  const [totalSkills, setTotalSkills] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "featured" | "ready" | "setup" | "favorites" | "recent" | "permission" | "auth" | "dependency">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [environmentHealth, setEnvironmentHealth] = useState<EnvironmentHealth | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toolResponses, setToolResponses] = useState<Record<string, { type: "info" | "test"; text: string }>>({});
  const [lastChecked, setLastChecked] = useState<Record<string, string>>({});
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("hammerlock-tool-last-checked");
      if (raw) setLastChecked(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("hammerlock-tool-favorites");
      if (raw) setFavorites(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/setup", { signal: AbortSignal.timeout(15000) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      try {
        const healthRes = await fetch("/api/health", { signal: AbortSignal.timeout(8000) });
        if (healthRes.ok) {
          setEnvironmentHealth(await healthRes.json());
        }
      } catch {
        setEnvironmentHealth(null);
      }
      setCategories(data.categories || []);
      setTotalReady(data.totalReady || 0);
      setTotalSkills(data.totalSkills || 0);
      // Auto-expand first category with ready skills
      const firstReady = data.categories?.find((c: SkillCategory) => c.readyCount > 0);
      if (firstReady) setExpandedCat(firstReady.id);
    } catch (err) {
      setError("Couldn't discover integrations. Make sure HammerLock is running.");
      console.error("[IntegrationSetup]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  const handleSetup = (skill: SkillInfo) => {
    // Send a setup message to the chat as if the user typed it
    const message = skill.ready
      ? `Test my ${skill.emoji} ${skill.name} integration — try a basic operation to make sure it's working.`
      : `Help me set up ${skill.emoji} ${skill.name}. ${skill.setupNote}`;
    onSetupSkill(skill.name, message);
  };

  const handleToolAction = async (skill: SkillInfo, action: "info" | "test") => {
    setActionInProgress(`${skill.name}:${action}`);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: skill.name, action }),
      });
      const data = await res.json();
      setToolResponses((prev) => ({
        ...prev,
        [skill.name]: {
          type: action,
          text: data.response || data.error || "No response returned.",
        },
      }));
      if (action === "test") {
        const now = new Date().toISOString();
        setLastChecked((prev) => {
          const next = { ...prev, [skill.name]: now };
          try {
            window.localStorage.setItem("hammerlock-tool-last-checked", JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      }
    } catch {
      setToolResponses((prev) => ({
        ...prev,
        [skill.name]: {
          type: action,
          text: "I couldn't reach the setup helper right now. Make sure the OpenClaw gateway is running, then try again.",
        },
      }));
    } finally {
      setActionInProgress(null);
    }
  };

  const handleTryExample = (example: string) => {
    // Strip quotes from the example
    const clean = example.replace(/^["']|["']$/g, "");
    onSetupSkill("", clean);
  };

  const toggleFavorite = (skillName: string) => {
    setFavorites((prev) => {
      const next = prev.includes(skillName)
        ? prev.filter((name) => name !== skillName)
        : [...prev, skillName];
      try {
        window.localStorage.setItem("hammerlock-tool-favorites", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const matchesFilter = useCallback((skill: SkillInfo) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query ||
      skill.displayName.toLowerCase().includes(query) ||
      skill.name.toLowerCase().includes(query) ||
      skill.description.toLowerCase().includes(query);

    const matchesState =
      filter === "all" ||
      (filter === "featured" && skill.featured) ||
      (filter === "ready" && skill.ready) ||
      (filter === "setup" && !skill.ready) ||
      (filter === "favorites" && favorites.includes(skill.name)) ||
      (filter === "recent" && Boolean(lastChecked[skill.name])) ||
      (filter === "permission" && skill.status === "needs_permission") ||
      (filter === "auth" && skill.status === "needs_auth") ||
      (filter === "dependency" && skill.status === "needs_dependency");

    return matchesQuery && matchesState;
  }, [favorites, filter, lastChecked, searchQuery]);

  const allSkills = categories.flatMap((cat) => cat.skills);
  const featuredSkills = allSkills.filter((skill) => skill.featured);
  const flagshipSkills = allSkills.filter((skill) => skill.ownership === "flagship");
  const connectorSkills = allSkills.filter((skill) => skill.ownership === "connector");
  const readyNeedsAttention = allSkills.filter((skill) => !skill.ready).length;
  const healthScore = totalSkills > 0 ? Math.round((totalReady / totalSkills) * 100) : 0;
  const favoriteSkills = allSkills.filter((skill) => favorites.includes(skill.name));
  const recentlyTested = [...allSkills]
    .filter((skill) => Boolean(lastChecked[skill.name]))
    .sort((a, b) => new Date(lastChecked[b.name]).getTime() - new Date(lastChecked[a.name]).getTime())
    .slice(0, 4);
  const recentlyVerifiedCount = allSkills.filter((skill) => Boolean(lastChecked[skill.name])).length;
  const healthyFavorites = favoriteSkills.filter((skill) => skill.ready).length;
  const blockersByType = {
    permission: allSkills.filter((skill) => skill.status === "needs_permission").length,
    auth: allSkills.filter((skill) => skill.status === "needs_auth").length,
    dependency: allSkills.filter((skill) => skill.status === "needs_dependency").length,
  };
  const providerReadyCount = environmentHealth
    ? Object.values(environmentHealth.providers).filter(Boolean).length
    : 0;
  const hasEnvironmentBlocker = environmentHealth
    ? environmentHealth.gateway !== "connected" || environmentHealth.status !== "ready" || providerReadyCount === 0
    : false;
  const environmentStep = hasEnvironmentBlocker
    ? {
        id: "environment",
        title: "Stabilize the runtime",
        summary: environmentHealth?.gateway !== "connected"
          ? "Bring the OpenClaw gateway online so tests and guided setup can run."
          : "Add at least one working model provider so chat actions can execute reliably.",
        badge: "Foundation",
      }
    : null;
  const topBlockerType = Object.entries(blockersByType)
    .sort((a, b) => b[1] - a[1])[0];
  const setupLane =
    !topBlockerType || topBlockerType[1] === 0
      ? "Most core setup blockers are cleared."
      : topBlockerType[0] === "permission"
        ? "Biggest unlock is granting local macOS permissions."
        : topBlockerType[0] === "auth"
          ? "Biggest unlock is connecting accounts and OAuth tools."
          : "Biggest unlock is installing missing local dependencies.";
  const recommendedSkills = [...allSkills]
    .sort((a, b) => {
      const score = (skill: SkillInfo) =>
        (skill.ready ? 0 : 100) +
        (skill.featured ? 30 : 0) +
        (skill.status === "needs_permission" ? 10 : 0) +
        (skill.status === "needs_auth" ? 8 : 0) +
        (skill.status === "needs_dependency" ? 6 : 0);
      return score(b) - score(a);
    })
    .filter((skill) => !skill.ready)
    .slice(0, 3);
  const topRecommendation = recommendedSkills[0];
  const quickWins = [...allSkills]
    .filter((skill) => !skill.ready)
    .sort((a, b) => {
      const ease = (skill: SkillInfo) =>
        (skill.featured ? 20 : 0) +
        (skill.status === "needs_permission" ? 18 : 0) +
        (skill.status === "needs_auth" ? 12 : 0) +
        (skill.status === "needs_dependency" ? 6 : 0);
      return ease(b) - ease(a);
    })
    .slice(0, 4);
  const permissionWin = quickWins.find((skill) => skill.status === "needs_permission");
  const authWin = quickWins.find((skill) => skill.status === "needs_auth");
  const firstDayPath = [
    environmentStep,
    permissionWin ? {
      id: permissionWin.name,
      title: `Unlock ${permissionWin.displayName}`,
      summary: permissionWin.setupTrack[0] || permissionWin.setupNote || permissionWin.description,
      badge: "Fastest local win",
      skill: permissionWin,
    } : null,
    authWin ? {
      id: authWin.name,
      title: `Connect ${authWin.displayName}`,
      summary: authWin.setupTrack[0] || authWin.setupNote || authWin.description,
      badge: "Account unlock",
      skill: authWin,
    } : null,
  ].filter(Boolean) as Array<{
    id: string;
    title: string;
    summary: string;
    badge: string;
    skill?: SkillInfo;
  }>;
  const visibleCategories = categories
    .map((cat) => ({ ...cat, skills: cat.skills.filter(matchesFilter) }))
    .filter((cat) => cat.skills.length > 0);
  const visibleFeatured = featuredSkills.filter(matchesFilter);
  const readyToTry = featuredSkills
    .filter((skill) => skill.ready && skill.useCases.length > 0)
    .slice(0, 4);
  const topReadyToTry = readyToTry[0];
  const todaySummary = topReadyToTry && topRecommendation
    ? `You can already use ${topReadyToTry.displayName} right now, and unlocking ${topRecommendation.displayName} is the highest-leverage next step.`
    : topReadyToTry
      ? `You can already use ${topReadyToTry.displayName} right now.`
      : topRecommendation
        ? `Your best next step is unlocking ${topRecommendation.displayName}.`
        : "Your current setup is in a strong state.";
  const visibleBundles = TOOL_BUNDLES.map((bundle) => ({
    ...bundle,
    matched: allSkills.filter((skill) => bundle.skills.includes(skill.name)),
  }));
  const coverageGroups = TOOL_COVERAGE_GROUPS.map((group) => {
    const matched = allSkills.filter((skill) => group.skills.includes(skill.name));
    const ready = matched.filter((skill) => skill.ready).length;
    const readySkill = matched.find((skill) => skill.ready && skill.useCases.length > 0);
    const nextUnlock = matched.find((skill) => !skill.ready);
    return { ...group, matched, ready, total: matched.length, nextUnlock, readySkill };
  });
  const nextOutcomeUnlock = coverageGroups.find((group) => group.ready < group.total && group.nextUnlock);
  const fullyReadyCoverage = coverageGroups.filter((group) => group.ready === group.total).length;
  const partiallyReadyCoverage = coverageGroups.filter((group) => group.ready > 0 && group.ready < group.total).length;
  const readinessNarrative =
    fullyReadyCoverage === coverageGroups.length
      ? "Your core HammerLock workflows are fully ready."
      : fullyReadyCoverage > 0
        ? `${fullyReadyCoverage} core workflow${fullyReadyCoverage === 1 ? "" : "s"} are fully ready, with ${partiallyReadyCoverage} more partially unlocked.`
        : partiallyReadyCoverage > 0
          ? "Your core workflows are partially unlocked. One more setup pass will make HammerLock feel much more real."
          : "Core workflows still need setup before HammerLock feels fully unlocked.";
  const criticalBlockers = featuredSkills
    .filter((skill) => !skill.ready)
    .sort((a, b) => {
      const weight = (skill: SkillInfo) =>
        (skill.status === "needs_permission" ? 30 : 0) +
        (skill.status === "needs_auth" ? 20 : 0) +
        (skill.status === "needs_dependency" ? 10 : 0);
      return weight(b) - weight(a);
    })
    .slice(0, 3);
  const doNow = [
    ...quickWins.slice(0, 2).map((skill) => ({
      id: skill.name,
      title: skill.displayName,
      summary: skill.setupTrack[0] || skill.setupNote || skill.description,
      kind: "now" as const,
    })),
  ];
  const doLater = [
    ...criticalBlockers.slice(0, 2).map((skill) => ({
      id: skill.name,
      title: skill.displayName,
      summary: skill.verificationNote || skill.setupNote || skill.description,
      kind: "later" as const,
    })),
  ];
  const bundleStatus = visibleBundles.map((bundle) => {
    const blockers = bundle.matched.filter((skill) => !skill.ready);
    const nextSkill = blockers[0];
    const blockerTypes = Array.from(
      new Set(
        blockers.map((skill) =>
          skill.status === "needs_permission"
            ? "permissions"
            : skill.status === "needs_auth"
              ? "auth"
              : "dependencies"
        )
      )
    );
    return {
      ...bundle,
      readyCount: bundle.matched.filter((skill) => skill.ready).length,
      blockerCount: blockers.length,
      nextSkill,
      blockerLabel: blockers.length === 0
        ? "Ready to use"
        : blockerTypes.length > 0
          ? `${blockers.length} blocker${blockers.length === 1 ? "" : "s"}: ${blockerTypes.join(", ")}`
          : `${blockers.length} blocker${blockers.length === 1 ? "" : "s"} left`,
      nextStepLabel: blockers.length === 0
        ? "Open this pack in chat"
        : nextSkill
          ? `Next: ${nextSkill.displayName}`
          : "Continue setup",
    };
  });
  const recommendedBundleId = [...bundleStatus]
    .sort((a, b) => {
      const score = (bundle: typeof bundleStatus[number]) =>
        (bundle.readyCount * 10) - (bundle.blockerCount * 6) + (bundle.nextSkill?.status === "needs_permission" ? 4 : 0);
      return score(b) - score(a);
    })[0]?.id;

  return (
    <div className="integration-setup-overlay">
      <div className="integration-setup-panel">
        {/* Header */}
        <div className="integration-setup-header">
          <div className="integration-setup-title-row">
            <div className="integration-setup-icon-wrap">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="integration-setup-title">
                {mode === "onboarding" ? "Set Up Your Tools" : "Tool Center"}
              </h2>
              <p className="integration-setup-subtitle">
                {loading
                  ? "Discovering what's available..."
                  : `${totalReady} of ${totalSkills} tools ready to use`}
              </p>
            </div>
          </div>
          <button className="integration-setup-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Info banner */}
        {mode === "onboarding" && !loading && (
          <div className="integration-setup-banner">
            <span className="integration-setup-banner-emoji">🤖</span>
            <span>
              Your AI assistant can help set up each tool.
              Tap <strong>"Set up"</strong> and it&apos;ll walk you through it step by step.
            </span>
          </div>
        )}

        {/* Content */}
        <div className="integration-setup-content">
          {loading && (
            <div className="integration-setup-loading">
              <RefreshCw size={20} className="spin" />
              <span>Scanning for available integrations...</span>
            </div>
          )}

          {error && (
            <div className="integration-setup-error">
              <AlertCircle size={16} />
              <span>{error}</span>
              <button onClick={fetchSkills} className="integration-setup-retry">Retry</button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="integration-setup-stats">
                <div className="integration-setup-stat">
                  <div className="integration-setup-stat-value">{totalReady}</div>
                  <div className="integration-setup-stat-label">Ready now</div>
                </div>
                <div className="integration-setup-stat">
                  <div className="integration-setup-stat-value">{readyNeedsAttention}</div>
                  <div className="integration-setup-stat-label">Need setup</div>
                </div>
                <div className="integration-setup-stat">
                  <div className="integration-setup-stat-value">{featuredSkills.length}</div>
                  <div className="integration-setup-stat-label">Featured tools</div>
                </div>
                <div className="integration-setup-stat">
                  <div className="integration-setup-stat-value">{healthScore}%</div>
                  <div className="integration-setup-stat-label">Tool health</div>
                </div>
              </div>

              <div className="integration-runtime-split">
                <div className="integration-section-heading">
                  <div className="integration-section-title">HammerLock vs Connectors</div>
                  <div className="integration-section-hint">Own the flagship workflows. Use OpenClaw where connector breadth adds real value.</div>
                </div>
                <div className="integration-runtime-grid">
                  <div className="integration-runtime-card">
                    <div className="integration-bundle-title">HammerLock Workflows</div>
                    <div className="integration-trust-value">{flagshipSkills.length}</div>
                    <div className="integration-bundle-subtitle">
                      Core experiences HammerLock should own end to end: setup, trust, UX, and orchestration.
                    </div>
                  </div>
                  <div className="integration-runtime-card">
                    <div className="integration-bundle-title">OpenClaw Connectors</div>
                    <div className="integration-trust-value">{connectorSkills.length}</div>
                    <div className="integration-bundle-subtitle">
                      Long-tail integrations and local connectors where shared infrastructure keeps shipping fast.
                    </div>
                  </div>
                </div>
              </div>

              <div className="integration-readiness-banner">
                <div className="integration-readiness-title">Readiness Snapshot</div>
                <div className="integration-readiness-copy">{readinessNarrative}</div>
                <div className="integration-readiness-today">{todaySummary}</div>
                {nextOutcomeUnlock && (
                  <button
                    className="integration-readiness-focus"
                    onClick={() => {
                      const parent = categories.find((cat) => cat.skills.some((item) => item.name === nextOutcomeUnlock.nextUnlock?.name));
                      if (parent) setExpandedCat(parent.id);
                      if (nextOutcomeUnlock.nextUnlock) setExpandedSkill(nextOutcomeUnlock.nextUnlock.name);
                    }}
                  >
                    <span className="integration-readiness-focus-label">Next workflow to unlock</span>
                    <span className="integration-readiness-focus-title">{nextOutcomeUnlock.title}</span>
                    <span className="integration-readiness-focus-copy">
                      Unlocking {nextOutcomeUnlock.nextUnlock?.displayName} moves you closer to: {nextOutcomeUnlock.outcome}
                    </span>
                  </button>
                )}
                <div className="integration-readiness-actions">
                  {topRecommendation && (
                    <button
                      className="integration-readiness-action primary"
                      onClick={() => {
                        const parent = categories.find((cat) => cat.skills.some((item) => item.name === topRecommendation.name));
                        if (parent) setExpandedCat(parent.id);
                        setExpandedSkill(topRecommendation.name);
                      }}
                    >
                      Set up next: {topRecommendation.displayName}
                    </button>
                  )}
                  {topReadyToTry && (
                    <button
                      className="integration-readiness-action"
                      onClick={() => handleTryExample(topReadyToTry.useCases[0])}
                    >
                      Try now: {topReadyToTry.displayName}
                    </button>
                  )}
                </div>
              </div>

              <div className="integration-trust">
                <div className="integration-section-title">Trust & Verification</div>
                <div className="integration-trust-grid">
                  <div className="integration-trust-card">
                    <div className="integration-bundle-title">Verified in this app</div>
                    <div className="integration-trust-value">{recentlyVerifiedCount}</div>
                    <div className="integration-bundle-subtitle">
                      Tools you&apos;ve tested locally from this machine.
                    </div>
                  </div>
                  <div className="integration-trust-card">
                    <div className="integration-bundle-title">Favorite tools healthy</div>
                    <div className="integration-trust-value">
                      {favoriteSkills.length > 0 ? `${healthyFavorites}/${favoriteSkills.length}` : "0"}
                    </div>
                    <div className="integration-bundle-subtitle">
                      Quick signal for the tools you care about most.
                    </div>
                  </div>
                  <div className="integration-trust-card">
                    <div className="integration-bundle-title">Best setup lane</div>
                    <div className="integration-trust-copy">{setupLane}</div>
                    <div className="integration-trust-tags">
                      {blockersByType.permission > 0 && <span className="integration-trust-tag">Permissions {blockersByType.permission}</span>}
                      {blockersByType.auth > 0 && <span className="integration-trust-tag">Auth {blockersByType.auth}</span>}
                      {blockersByType.dependency > 0 && <span className="integration-trust-tag">Deps {blockersByType.dependency}</span>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="integration-legend">
                <div className="integration-section-title">Setup Types</div>
                <div className="integration-legend-row">
                  <span className="integration-trust-tag">Permission</span>
                  <span className="integration-legend-copy">Local macOS access like Notes, Reminders, Screen Recording, or Full Disk Access.</span>
                </div>
                <div className="integration-legend-row">
                  <span className="integration-trust-tag">Auth</span>
                  <span className="integration-legend-copy">Account or OAuth connection like Google, GitHub, Slack, or WhatsApp.</span>
                </div>
                <div className="integration-legend-row">
                  <span className="integration-trust-tag">Dependency</span>
                  <span className="integration-legend-copy">A local binary, helper CLI, or runtime HammerLock needs before the tool can run.</span>
                </div>
              </div>

              {firstDayPath.length > 0 && (
                <div className="integration-path">
                  <div className="integration-section-heading">
                    <div className="integration-section-title">First-Day Path</div>
                    <div className="integration-section-hint">Click a step to open the right tool details</div>
                  </div>
                  <div className="integration-path-grid">
                    {firstDayPath.map((step, idx) => (
                      <button
                        key={step.id}
                        className="integration-path-card"
                        onClick={() => {
                          if (!step.skill) return;
                          const parent = categories.find((cat) => cat.skills.some((item) => item.name === step.skill?.name));
                          if (parent) setExpandedCat(parent.id);
                          setExpandedSkill(step.skill.name);
                        }}
                      >
                        <div className="integration-path-top">
                          <span className="integration-path-index">{idx + 1}</span>
                          <span className="integration-featured-badge needs-setup">{step.badge}</span>
                        </div>
                        <div className="integration-featured-name">{step.title}</div>
                        <div className="integration-featured-desc">{step.summary}</div>
                        <div className="integration-featured-path">
                          {step.skill ? "Open tool details" : "Environment first"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {environmentHealth && (
                <div className="integration-environment">
                  <div className="integration-section-title">Environment</div>
                  <div className="integration-environment-grid">
                    <div className="integration-environment-card">
                      <div className="integration-bundle-title">Gateway</div>
                      <div className={`integration-environment-status ${environmentHealth.gateway === "connected" ? "good" : "warn"}`}>
                        {environmentHealth.gateway === "connected" ? "Connected" : "Offline"}
                      </div>
                    </div>
                    <div className="integration-environment-card">
                      <div className="integration-bundle-title">AI Providers</div>
                      <div className="integration-environment-providers">
                        {Object.entries(environmentHealth.providers).map(([name, ok]) => (
                          <span key={name} className={`integration-environment-provider ${ok ? "good" : ""}`}>
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="integration-environment-card">
                      <div className="integration-bundle-title">Runtime</div>
                      <div className={`integration-environment-status ${environmentHealth.status === "ready" ? "good" : "warn"}`}>
                        {environmentHealth.status === "ready" ? "Ready" : "Needs model/provider"}
                      </div>
                    </div>
                  </div>
                  {hasEnvironmentBlocker && (
                    <div className="integration-environment-note">
                      HammerLock can still show local tool state, but chat tests and guided setup work best once the gateway is connected and at least one provider is available.
                    </div>
                  )}
                </div>
              )}

              {(favoriteSkills.length > 0 || recentlyTested.length > 0) && (
                <div className="integration-focus">
                  <div className="integration-section-title">Your Focus</div>
                  <div className="integration-focus-grid">
                    {favoriteSkills.length > 0 && (
                      <div className="integration-focus-card">
                        <div className="integration-bundle-top">
                          <div className="integration-bundle-title">Favorites</div>
                          <button
                            className={`integration-mini-filter${filter === "favorites" ? " active" : ""}`}
                            onClick={() => setFilter(filter === "favorites" ? "all" : "favorites")}
                          >
                            View all
                          </button>
                        </div>
                        <div className="integration-bundle-skills">
                          {favoriteSkills.slice(0, 6).map((skill) => (
                            <button
                              key={skill.name}
                              className={`integration-bundle-skill integration-focus-skill ${skill.ready ? "ready" : ""}`}
                              onClick={() => {
                                const parent = categories.find((cat) => cat.skills.some((item) => item.name === skill.name));
                                if (parent) setExpandedCat(parent.id);
                                setExpandedSkill(skill.name);
                              }}
                            >
                              {skill.emoji} {skill.displayName}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {recentlyTested.length > 0 && (
                      <div className="integration-focus-card">
                        <div className="integration-bundle-top">
                          <div className="integration-bundle-title">Recently Tested</div>
                          <button
                            className={`integration-mini-filter${filter === "recent" ? " active" : ""}`}
                            onClick={() => setFilter(filter === "recent" ? "all" : "recent")}
                          >
                            View all
                          </button>
                        </div>
                        <div className="integration-focus-list">
                          {recentlyTested.map((skill) => (
                            <button
                              key={skill.name}
                              className="integration-focus-row"
                              onClick={() => {
                                const parent = categories.find((cat) => cat.skills.some((item) => item.name === skill.name));
                                if (parent) setExpandedCat(parent.id);
                                setExpandedSkill(skill.name);
                              }}
                            >
                              <span className="integration-featured-name">{skill.emoji} {skill.displayName}</span>
                              <span className="integration-focus-time">
                                {new Date(lastChecked[skill.name]).toLocaleString()}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {readyToTry.length > 0 && (
                <div className="integration-ready">
                  <div className="integration-section-title">Ready to Try</div>
                  <div className="integration-ready-grid">
                    {readyToTry.map((skill) => (
                      <div key={skill.name} className="integration-ready-card">
                        <div className="integration-ready-top">
                          <div className="integration-featured-name">
                            {skill.emoji} {skill.displayName}
                          </div>
                          <span className="integration-featured-badge ready">Ready</span>
                        </div>
                        <div className="integration-featured-desc">{skill.description}</div>
                        <button
                          className="integration-ready-example"
                          onClick={() => handleTryExample(skill.useCases[0])}
                        >
                          <span>{skill.useCases[0]}</span>
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recommendedSkills.length > 0 && (
                <div className="integration-recommended">
                  <div className="integration-section-heading">
                    <div className="integration-section-title">Best Next Moves</div>
                    <div className="integration-section-hint">Click a card to jump to that tool</div>
                  </div>
                  <div className="integration-recommended-grid">
                    {recommendedSkills.map((skill) => (
                      <button
                        key={skill.name}
                        className="integration-recommended-card"
                        onClick={() => {
                          const parent = categories.find((cat) => cat.skills.some((item) => item.name === skill.name));
                          if (parent) setExpandedCat(parent.id);
                          setExpandedSkill(skill.name);
                        }}
                      >
                        <div className="integration-recommended-top">
                          <span className="integration-skill-emoji">{skill.emoji}</span>
                          <span className={`integration-featured-badge ${skill.ready ? "ready" : "needs-setup"}`}>
                            {skill.statusLabel}
                          </span>
                        </div>
                        <div className="integration-featured-name">{skill.displayName}</div>
                        <div className="integration-featured-desc">{skill.setupNote || skill.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {quickWins.length > 0 && (
                <div className="integration-quickwins">
                  <div className="integration-section-heading">
                    <div className="integration-section-title">Quick Wins</div>
                    <div className="integration-section-hint">Fastest tools to unblock next</div>
                  </div>
                  <div className="integration-quickwins-grid">
                    {quickWins.map((skill) => (
                      <button
                        key={skill.name}
                        className="integration-quickwin-card"
                        onClick={() => {
                          const parent = categories.find((cat) => cat.skills.some((item) => item.name === skill.name));
                          if (parent) setExpandedCat(parent.id);
                          setExpandedSkill(skill.name);
                        }}
                      >
                        <div className="integration-recommended-top">
                          <span className="integration-skill-emoji">{skill.emoji}</span>
                          <span className={`integration-featured-badge ${skill.ready ? "ready" : "needs-setup"}`}>
                            {skill.statusLabel}
                          </span>
                        </div>
                        <div className="integration-featured-name">{skill.displayName}</div>
                        <div className="integration-featured-desc">{skill.setupTrack[0] || skill.setupNote || skill.description}</div>
                        <div className="integration-featured-path">
                          {skill.status === "needs_permission" ? "Usually a 1-minute unblock" :
                           skill.status === "needs_auth" ? "Usually a fast account connection" :
                           "Usually needs local install or runtime fix"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(doNow.length > 0 || doLater.length > 0) && (
                <div className="integration-priority">
                  <div className="integration-section-heading">
                    <div className="integration-section-title">Do Now vs Later</div>
                    <div className="integration-section-hint">Focus the next few minutes on fast wins, then come back for heavier unlocks</div>
                  </div>
                  <div className="integration-priority-grid">
                    <div className="integration-priority-column">
                      <div className="integration-priority-label now">Do now</div>
                      {doNow.map((item) => (
                        <div key={item.id} className="integration-priority-card now">
                          <div className="integration-featured-name">{item.title}</div>
                          <div className="integration-featured-desc">{item.summary}</div>
                        </div>
                      ))}
                    </div>
                    <div className="integration-priority-column">
                      <div className="integration-priority-label later">Do later</div>
                      {doLater.map((item) => (
                        <div key={item.id} className="integration-priority-card later">
                          <div className="integration-featured-name">{item.title}</div>
                          <div className="integration-featured-desc">{item.summary}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="integration-outcomes">
                <div className="integration-section-heading">
                  <div className="integration-section-title">What You Unlock</div>
                  <div className="integration-section-hint">Outcome view based on your current tool readiness</div>
                </div>
                <div className="integration-outcomes-grid">
                  {coverageGroups.map((group) => {
                    const statusLabel =
                      group.ready === group.total
                        ? "Ready now"
                        : group.ready > 0
                          ? `${group.total - group.ready} step${group.total - group.ready === 1 ? "" : "s"} away`
                          : "Needs setup";
                    return (
                      <button
                        key={group.id}
                        className="integration-outcome-card"
                        onClick={() => {
                          if (!group.nextUnlock) return;
                          const parent = categories.find((cat) => cat.skills.some((item) => item.name === group.nextUnlock?.name));
                          if (parent) setExpandedCat(parent.id);
                          setExpandedSkill(group.nextUnlock.name);
                        }}
                      >
                        <div className="integration-coverage-top">
                          <div className="integration-bundle-title">{group.title}</div>
                          <span className={`integration-featured-badge ${group.ready === group.total ? "ready" : "needs-setup"}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="integration-featured-desc">{group.outcome}</div>
                        <div className="integration-bundle-nextstep">
                          {group.nextUnlock
                            ? `Next unlock: ${group.nextUnlock.displayName}`
                            : "Fully ready to use"}
                        </div>
                        {group.readySkill && (
                          <button
                            className="integration-outcome-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTryExample(group.readySkill!.useCases[0]);
                            }}
                          >
                            Try it: {group.readySkill.useCases[0]}
                          </button>
                        )}
                        <div className="integration-bundle-skills">
                          {group.matched.map((skill) => (
                            <span key={skill.name} className={`integration-bundle-skill ${skill.ready ? "ready" : ""}`}>
                              {skill.emoji} {skill.displayName}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="integration-coverage">
                <div className="integration-section-title">Core Coverage</div>
                <div className="integration-coverage-grid">
                  {coverageGroups.map((group) => (
                    <div key={group.id} className="integration-coverage-card">
                      <div className="integration-coverage-top">
                        <div className="integration-bundle-title">{group.title}</div>
                        <div className="integration-bundle-count">{group.ready}/{group.total} ready</div>
                      </div>
                      <div className="integration-bundle-subtitle">{group.subtitle}</div>
                      <div className="integration-coverage-bar">
                        <span style={{ width: `${group.total ? (group.ready / group.total) * 100 : 0}%` }} />
                      </div>
                      <div className="integration-bundle-skills">
                        {group.matched.map((skill) => (
                          <span key={skill.name} className={`integration-bundle-skill ${skill.ready ? "ready" : ""}`}>
                            {skill.emoji} {skill.displayName}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {criticalBlockers.length > 0 && (
                <div className="integration-blockers">
                  <div className="integration-section-title">Critical Blockers</div>
                  <div className="integration-blockers-grid">
                    {criticalBlockers.map((skill) => (
                      <button
                        key={skill.name}
                        className="integration-blocker-card"
                        onClick={() => {
                          const parent = categories.find((cat) => cat.skills.some((item) => item.name === skill.name));
                          if (parent) setExpandedCat(parent.id);
                          setExpandedSkill(skill.name);
                        }}
                      >
                        <div className="integration-blocker-top">
                          <span className="integration-skill-emoji">{skill.emoji}</span>
                          <span className={`integration-featured-badge ${skill.ready ? "ready" : "needs-setup"}`}>
                            {skill.statusLabel}
                          </span>
                        </div>
                        <div className="integration-featured-name">{skill.displayName}</div>
                        <div className="integration-featured-desc">{skill.verificationNote || skill.setupNote}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="integration-bundles">
                <div className="integration-section-heading">
                  <div className="integration-section-title">Starter Packs</div>
                  <div className="integration-section-hint">Click a pack to open a guided setup flow in chat</div>
                </div>
                <div className="integration-bundles-grid">
                  {bundleStatus.map((bundle) => {
                    return (
                      <button
                        key={bundle.id}
                        className="integration-bundle-card"
                        onClick={() => onSetupSkill(bundle.id, bundle.prompt)}
                      >
                        <div className="integration-bundle-top">
                          <div className="integration-bundle-title">{bundle.title}</div>
                          <div className="integration-bundle-top-right">
                            {bundle.id === recommendedBundleId && (
                              <span className="integration-bundle-badge">Best place to start</span>
                            )}
                            <div className="integration-bundle-count">{bundle.readyCount}/{bundle.matched.length} ready</div>
                          </div>
                        </div>
                        <div className="integration-bundle-subtitle">{bundle.subtitle}</div>
                        <div className="integration-bundle-statusline">{bundle.blockerLabel}</div>
                        <div className="integration-bundle-nextstep">{bundle.nextStepLabel}</div>
                        <div className="integration-bundle-skills">
                          {bundle.matched.map((skill) => (
                            <span key={skill.name} className={`integration-bundle-skill ${skill.ready ? "ready" : ""}`}>
                              {skill.emoji} {skill.displayName}
                            </span>
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="integration-setup-toolbar">
                <label className="integration-search">
                  <Search size={14} />
                  <input
                    type="text"
                    placeholder="Search tools"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>
                <div className="integration-filter-row">
                  {[
                    ["all", "All"],
                    ["featured", "Featured"],
                    ["ready", "Ready"],
                    ["setup", "Needs Setup"],
                    ["favorites", "Favorites"],
                    ["recent", "Recent"],
                    ["permission", "Permissions"],
                    ["auth", "Auth"],
                    ["dependency", "Dependencies"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={`integration-filter-chip${filter === value ? " active" : ""}`}
                      onClick={() => setFilter(value as "all" | "featured" | "ready" | "setup" | "favorites" | "recent" | "permission" | "auth" | "dependency")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {visibleFeatured.length > 0 && (
                <div className="integration-featured">
                  <div className="integration-section-title">
                    <Star size={14} />
                    Featured Tools
                  </div>
                  <div className="integration-featured-grid">
                    {visibleFeatured.map((skill) => (
                      <button
                        key={skill.name}
                        className={`integration-featured-card ${skill.ready ? "ready" : "needs-setup"}`}
                        onClick={() => {
                          const parent = visibleCategories.find((cat) => cat.skills.some((item) => item.name === skill.name));
                          if (parent) setExpandedCat(parent.id);
                          setExpandedSkill(skill.name);
                        }}
                      >
                        <div className="integration-featured-top">
                          <span className="integration-skill-emoji">{skill.emoji}</span>
                          <span className={`integration-featured-badge ${skill.ready ? "ready" : "needs-setup"}`}>
                            {skill.statusLabel}
                          </span>
                        </div>
                        <div className="integration-featured-name">{skill.displayName}</div>
                        <div className="integration-featured-desc">{skill.description}</div>
                        <div className="integration-featured-path">{skill.setupPathLabel}</div>
                        <div className="integration-featured-runtime">
                          <span className={`integration-runtime-badge ${skill.ownership}`}>{skill.ownershipLabel}</span>
                          <span className="integration-runtime-text">{skill.runtimeLabel}</span>
                        </div>
                        {skill.verificationNote && (
                          <div className="integration-featured-verify">{skill.verificationNote}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {visibleCategories.length === 0 && (
                <div className="integration-empty-state">
                  <AlertCircle size={16} />
                  <span>No tools match that filter yet.</span>
                </div>
              )}

              {visibleCategories.map(cat => (
            <div key={cat.id} className="integration-cat">
              {/* Category header */}
              <button
                className="integration-cat-header"
                onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
              >
                <div className="integration-cat-left">
                  {expandedCat === cat.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="integration-cat-emoji">{cat.emoji}</span>
                  <span className="integration-cat-label">{cat.label}</span>
                </div>
                <div className="integration-cat-right">
                  <span className="integration-cat-count">
                    {cat.readyCount}/{cat.totalCount} ready
                  </span>
                  {cat.readyCount === cat.totalCount && (
                    <CheckCircle size={14} className="integration-cat-check" />
                  )}
                </div>
              </button>

              {/* Category description */}
              {expandedCat === cat.id && (
                <p className="integration-cat-desc">{cat.description}</p>
              )}

              {/* Skills list */}
              {expandedCat === cat.id && (
                <div className="integration-skills">
                  {cat.skills.map(skill => (
                    <div
                      key={skill.name}
                      className={`integration-skill ${skill.ready ? "ready" : "needs-setup"} ${expandedSkill === skill.name ? "expanded" : ""}`}
                    >
                      {/* Skill row */}
                      <button
                        className="integration-skill-row"
                        onClick={() => setExpandedSkill(expandedSkill === skill.name ? null : skill.name)}
                      >
                        <div className="integration-skill-left">
                          <span className="integration-skill-emoji">{skill.emoji}</span>
                          <div>
                            <span className="integration-skill-name">{skill.displayName}</span>
                            <span className="integration-skill-desc">{skill.description}</span>
                            <span className="integration-skill-meta">
                              {skill.name}
                              {skill.featured ? " • featured" : ""}
                            </span>
                            <span className="integration-skill-runtime">
                              <span className={`integration-runtime-badge ${skill.ownership}`}>{skill.ownershipLabel}</span>
                              <span className="integration-runtime-text">{skill.runtimeLabel}</span>
                            </span>
                          </div>
                        </div>
                        <div className="integration-skill-right">
                          <span className={`integration-skill-badge status-${skill.status}`}>
                            {skill.ready ? <CheckCircle size={12} /> : <Settings size={12} />}
                            {skill.statusLabel}
                          </span>
                        </div>
                      </button>

                      {/* Expanded details */}
                      {expandedSkill === skill.name && (
                        <div className="integration-skill-detail">
                          {/* Setup note */}
                          {skill.setupNote && (
                            <div className="integration-skill-setup-note">
                              <span className="integration-skill-setup-type">
                                {skill.setupType === "none" ? "✅" : skill.setupType === "permission" ? "🔐" : skill.setupType === "oauth" ? "🔑" : "⚙️"}
                              </span>
                              {skill.setupNote}
                            </div>
                          )}

                          {skill.verificationNote && (
                            <div className="integration-skill-verify">
                              <CheckCircle size={12} />
                              <span>{skill.verificationNote}</span>
                            </div>
                          )}

                          <div className="integration-skill-strategy">
                            <div className="integration-skill-examples-label">Why it belongs here</div>
                            <div className="integration-skill-requirement">
                              <Zap size={12} />
                              <span>{skill.strategyNote}</span>
                            </div>
                          </div>

                          {skill.requirements.length > 0 && (
                            <div className="integration-skill-requirements">
                              <div className="integration-skill-examples-label">Requirements</div>
                              {skill.requirements.map((req) => (
                                <div key={req} className="integration-skill-requirement">
                                  <AlertCircle size={12} />
                                  <span>{req}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {skill.setupTrack.length > 0 && (
                            <div className="integration-skill-track">
                              <div className="integration-skill-examples-label">Setup track</div>
                              {skill.setupTrack.map((step, idx) => (
                                <div key={step} className="integration-skill-track-step">
                                  <span className="integration-skill-track-index">{idx + 1}</span>
                                  <span>{step}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Use case examples */}
                          {skill.useCases.length > 0 && (
                            <div className="integration-skill-examples">
                              <div className="integration-skill-examples-label">Try saying:</div>
                              {skill.useCases.map((uc, i) => (
                                <button
                                  key={i}
                                  className="integration-skill-example"
                                  onClick={(e) => { e.stopPropagation(); handleTryExample(uc); }}
                                >
                                  <span className="integration-skill-example-text">{uc}</span>
                                  <ArrowRight size={12} />
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Missing requirements */}
                          <div className="integration-skill-actions">
                            <button
                              className={`integration-skill-action secondary favorite-toggle${favorites.includes(skill.name) ? " active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(skill.name);
                              }}
                            >
                              <Star size={14} />
                              {favorites.includes(skill.name) ? "Favorited" : "Favorite"}
                            </button>
                            <button
                              className={`integration-skill-action ${skill.ready ? "test" : "setup"}`}
                              onClick={(e) => { e.stopPropagation(); handleSetup(skill); }}
                            >
                              {skill.ready
                                ? <><Zap size={14} /> Open in Chat</>
                                : <><Settings size={14} /> Set up with AI</>}
                            </button>
                            <button
                              className="integration-skill-action secondary"
                              onClick={(e) => { e.stopPropagation(); handleToolAction(skill, "info"); }}
                              disabled={actionInProgress === `${skill.name}:info`}
                            >
                              {actionInProgress === `${skill.name}:info`
                                ? <><RefreshCw size={14} className="spin" /> Loading...</>
                                : <>What it does</>}
                            </button>
                            <button
                              className="integration-skill-action secondary"
                              onClick={(e) => { e.stopPropagation(); handleToolAction(skill, "test"); }}
                              disabled={actionInProgress === `${skill.name}:test`}
                            >
                              {actionInProgress === `${skill.name}:test`
                                ? <><RefreshCw size={14} className="spin" /> Testing...</>
                                : <>Run test</>}
                            </button>
                          </div>

                          {toolResponses[skill.name] && (
                            <div className="integration-skill-response">
                              <div className="integration-skill-examples-label">
                                {toolResponses[skill.name].type === "info" ? "Tool brief" : "Test result"}
                              </div>
                              <p>{toolResponses[skill.name].text}</p>
                            </div>
                          )}

                          {lastChecked[skill.name] && (
                            <div className="integration-skill-last-checked">
                              Last test run: {new Date(lastChecked[skill.name]).toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="integration-setup-footer">
          {mode === "onboarding" ? (
            <>
              <button className="integration-setup-skip" onClick={onClose}>
                Skip for now — I'll explore later
              </button>
              <p className="integration-setup-footer-note">
                You can always access this from Settings → Integrations
              </p>
            </>
          ) : (
            <button className="integration-setup-done" onClick={onClose}>
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
