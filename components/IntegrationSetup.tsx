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
  X, ArrowRight, RefreshCw, Settings,
} from "lucide-react";

// ── Types matching /api/setup response ──
interface SkillInfo {
  name: string;
  emoji: string;
  description: string;
  ready: boolean;
  disabled: boolean;
  missingBins: string[];
  missingEnv: string[];
  setupType: string;
  setupNote: string;
  useCases: string[];
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [setupInProgress, setSetupInProgress] = useState<string | null>(null);

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
    setSetupInProgress(skill.name);
    // Send a setup message to the chat as if the user typed it
    const message = skill.ready
      ? `Test my ${skill.emoji} ${skill.name} integration — try a basic operation to make sure it's working.`
      : `Help me set up ${skill.emoji} ${skill.name}. ${skill.setupNote}`;
    onSetupSkill(skill.name, message);
  };

  const handleTryExample = (example: string) => {
    // Strip quotes from the example
    const clean = example.replace(/^["']|["']$/g, "");
    onSetupSkill("", clean);
  };

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
                {mode === "onboarding" ? "Set Up Your Integrations" : "Manage Integrations"}
              </h2>
              <p className="integration-setup-subtitle">
                {loading
                  ? "Discovering what's available..."
                  : `${totalReady} of ${totalSkills} integrations ready to use`}
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
              Your AI assistant can help set up each integration.
              Tap <strong>"Set up"</strong> and it'll walk you through it step by step.
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

          {!loading && !error && categories.map(cat => (
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
                            <span className="integration-skill-name">{skill.name}</span>
                            <span className="integration-skill-desc">{skill.description}</span>
                          </div>
                        </div>
                        <div className="integration-skill-right">
                          {skill.ready ? (
                            <span className="integration-skill-badge ready">
                              <CheckCircle size={12} /> Ready
                            </span>
                          ) : (
                            <span className="integration-skill-badge needs-setup">
                              <Settings size={12} /> Setup needed
                            </span>
                          )}
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
                          {skill.missingBins.length > 0 && (
                            <div className="integration-skill-missing">
                              <AlertCircle size={12} />
                              Missing: {skill.missingBins.join(", ")}
                            </div>
                          )}

                          {/* Action button */}
                          <button
                            className={`integration-skill-action ${skill.ready ? "test" : "setup"}`}
                            onClick={(e) => { e.stopPropagation(); handleSetup(skill); }}
                            disabled={setupInProgress === skill.name}
                          >
                            {setupInProgress === skill.name
                              ? <><RefreshCw size={14} className="spin" /> Setting up...</>
                              : skill.ready
                                ? <><Zap size={14} /> Test it</>
                                : <><Settings size={14} /> Set up with AI</>}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
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
