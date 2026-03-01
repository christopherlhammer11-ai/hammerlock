"use client";

import { X, Settings, Bell, BellOff, RotateCcw, Zap, Shield } from "lucide-react";
import { useNudges } from "@/lib/use-nudges";

type SettingsPanelProps = {
  open: boolean;
  onClose: () => void;
  onOpenIntegrations?: () => void;
  onOpenPermissions?: () => void;
};

export default function SettingsPanel({ open, onClose, onOpenIntegrations, onOpenPermissions }: SettingsPanelProps) {
  const { isEnabled, setNudgesEnabled, resetNudges } = useNudges();

  if (!open) return null;

  return (
    <div className="onboarding-overlay" onClick={onClose}>
      <div
        className="onboarding-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 440 }}
        role="dialog"
        aria-label="Settings"
      >
        {/* Header */}
        <div className="onboarding-header">
          <Settings size={18} />
          <h3>Settings</h3>
          <button
            className="ghost-btn"
            onClick={onClose}
            aria-label="Close settings"
            style={{ padding: "4px 8px" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="settings-body">
          {/* ── Integrations ── */}
          {onOpenIntegrations && (
            <div className="settings-section">
              <div className="settings-section-title">Integrations</div>
              <button
                className="settings-integrations-btn"
                onClick={() => {
                  onClose();
                  onOpenIntegrations();
                }}
              >
                <div className="settings-integrations-btn-left">
                  <Zap size={16} style={{ color: "var(--accent)" }} />
                  <div>
                    <div className="settings-row-label" style={{ display: "block" }}>
                      Manage Integrations
                    </div>
                    <div className="settings-row-desc" style={{ padding: 0, marginTop: 2 }}>
                      Calendar, Reminders, Email, Smart Home, GitHub, and more
                    </div>
                  </div>
                </div>
                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>&rsaquo;</span>
              </button>
            </div>
          )}

          {/* ── Permissions & Accounts ── */}
          {onOpenPermissions && (
            <div className="settings-section">
              <div className="settings-section-title">Permissions</div>
              <button
                className="settings-integrations-btn"
                onClick={() => {
                  onClose();
                  onOpenPermissions();
                }}
              >
                <div className="settings-integrations-btn-left">
                  <Shield size={16} style={{ color: "var(--accent)" }} />
                  <div>
                    <div className="settings-row-label" style={{ display: "block" }}>
                      Permissions & Accounts
                    </div>
                    <div className="settings-row-desc" style={{ padding: 0, marginTop: 2 }}>
                      macOS access, Google account connection
                    </div>
                  </div>
                </div>
                <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>&rsaquo;</span>
              </button>
            </div>
          )}

          {/* ── Tips & Nudges ── */}
          <div className="settings-section">
            <div className="settings-section-title">Tips & Nudges</div>

            <div className="settings-row">
              <div className="settings-row-info">
                <div className="settings-row-label">
                  {isEnabled ? (
                    <Bell size={14} style={{ color: "var(--accent)" }} />
                  ) : (
                    <BellOff size={14} style={{ color: "var(--text-muted)" }} />
                  )}
                  <span>Show helpful tips</span>
                </div>
                <div className="settings-row-desc">
                  Contextual suggestions, onboarding hints, and feature tips
                </div>
              </div>
              <label className="settings-toggle" aria-label="Toggle helpful tips">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setNudgesEnabled(e.target.checked)}
                />
                <span className="settings-toggle-track">
                  <span className="settings-toggle-thumb" />
                </span>
              </label>
            </div>

            {!isEnabled && (
              <button
                className="settings-restore-btn"
                onClick={async () => {
                  await resetNudges();
                }}
              >
                <RotateCcw size={12} />
                Restore all tips & reset dismissed nudges
              </button>
            )}
          </div>

          {/* About */}
          <div className="settings-section">
            <div className="settings-section-title">About</div>
            <div className="settings-row-desc" style={{ padding: "0 0 4px" }}>
              <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>HammerLock AI</strong>{" "}
              <span style={{ opacity: 0.6 }}>v{process.env.NEXT_PUBLIC_APP_VERSION || "0.3.2"}</span>
            </div>
            <div className="settings-row-desc" style={{ padding: "0 0 8px", lineHeight: 1.6 }}>
              Encrypted, local-first AI assistant. All data stays on your device.
            </div>
            <div style={{ display: "flex", gap: "12px", padding: "0 0 6px", flexWrap: "wrap" }}>
              <a
                href="https://hammerlockai.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.75rem", color: "var(--accent)", textDecoration: "none" }}
              >
                Website
              </a>
              <a
                href="https://hammerlockai.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.75rem", color: "var(--text-muted)", textDecoration: "none" }}
              >
                Privacy
              </a>
              <a
                href="https://hammerlockai.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.75rem", color: "var(--text-muted)", textDecoration: "none" }}
              >
                Terms
              </a>
            </div>
            <div className="settings-row-desc" style={{ padding: "4px 0 0", fontSize: "0.7rem", opacity: 0.4 }}>
              &copy; {new Date().getFullYear()} HammerLock AI. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
