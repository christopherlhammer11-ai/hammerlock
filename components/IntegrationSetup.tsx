/**
 * IntegrationSetup — Guided integration discovery & setup panel
 *
 * Shows available OpenClaw skills grouped by category with use case examples.
 * Users can tap "Set up" to have the OpenClaw agent walk them through config.
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

export default function IntegrationSetup({ onClose, onSetupSkill, mode = "onboarding" }: IntegrationSetupProps) {
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [totalReady, setTotalReady] = useState(0);
  const [totalSkills, setTotalSkills] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "featured" | "ready" | "setup">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toolResponses, setToolResponses] = useState<Record<string, { type: "info" | "test"; text: string }>>({});

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/setup", { signal: AbortSignal.timeout(15000) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
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
      (filter === "setup" && !skill.ready);

    return matchesQuery && matchesState;
  }, [filter, searchQuery]);

  const allSkills = categories.flatMap((cat) => cat.skills);
  const featuredSkills = allSkills.filter((skill) => skill.featured);
  const readyNeedsAttention = allSkills.filter((skill) => !skill.ready).length;
  const visibleCategories = categories
    .map((cat) => ({ ...cat, skills: cat.skills.filter(matchesFilter) }))
    .filter((cat) => cat.skills.length > 0);
  const visibleFeatured = featuredSkills.filter(matchesFilter);

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
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={`integration-filter-chip${filter === value ? " active" : ""}`}
                      onClick={() => setFilter(value as "all" | "featured" | "ready" | "setup")}
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
