/**
 * PermissionsSetup — First-launch permissions & accounts onboarding
 *
 * Step 1 of the desktop onboarding flow (before IntegrationSetup).
 * Handles:
 *   - macOS permissions (Calendar, Reminders, Notes, Contacts, Mic, Full Disk)
 *   - Google account connection via gog CLI
 *
 * Shows as a full-screen modal. Appears once on first launch, then
 * accessible from Settings → Permissions.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, ExternalLink, RefreshCw, X,
  Calendar, Bell, StickyNote, Users, Mic, HardDrive,
  Mail, ArrowRight,
} from "lucide-react";

// ── Types matching /api/permissions response ──
interface Permission {
  id: string;
  name: string;
  description: string;
  granted: boolean;
  required: boolean;
  manual: boolean;
  settingsUrl?: string;
  features: string[];
}

interface PermissionsData {
  platform: string;
  allGranted: boolean;
  requiredMissing: number;
  permissions: Permission[];
}

// ── Types matching /api/google-auth response ──
interface GoogleAuthData {
  connected: boolean;
  accounts: string[];
  services: string[];
  needsSetup?: boolean;
  needsCredentials?: boolean;
  error?: string;
}

interface PermissionsSetupProps {
  onClose: () => void;
  onComplete?: () => void; // called when user finishes — triggers integration setup
  mode?: "onboarding" | "settings";
}

// Map permission IDs to icons
const PERMISSION_ICONS: Record<string, typeof Calendar> = {
  calendar: Calendar,
  reminders: Bell,
  notes: StickyNote,
  contacts: Users,
  microphone: Mic,
  "full-disk-access": HardDrive,
};

export default function PermissionsSetup({ onClose, onComplete, mode = "onboarding" }: PermissionsSetupProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [googleAuth, setGoogleAuth] = useState<GoogleAuthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [showGoogleInput, setShowGoogleInput] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch permission status + Google auth status ──
  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [permRes, googleRes] = await Promise.all([
        fetch("/api/permissions", { signal: AbortSignal.timeout(15000) }),
        fetch("/api/google-auth", { signal: AbortSignal.timeout(10000) }),
      ]);
      const permData: PermissionsData = await permRes.json();
      const gData: GoogleAuthData = await googleRes.json();
      setPermissions(permData.permissions || []);
      setGoogleAuth(gData);
    } catch (err) {
      setError("Couldn't check permissions. Make sure HammerLock is running.");
      console.error("[PermissionsSetup]", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // ── Request a macOS permission ──
  const requestPermission = async (permId: string) => {
    setRequesting(permId);
    try {
      const res = await fetch("/api/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission: permId }),
      });
      const data = await res.json();

      // Update local state
      if (data.granted) {
        setPermissions(prev =>
          prev.map(p => p.id === permId ? { ...p, granted: true } : p)
        );
      }

      // For manual permissions, give user time then recheck
      if (data.manual) {
        setTimeout(() => recheckPermission(permId), 3000);
      }
    } catch (err) {
      console.error("[PermissionsSetup] request error:", err);
    } finally {
      // Small delay before clearing "requesting" state to show feedback
      setTimeout(() => setRequesting(null), 500);
    }
  };

  // ── Recheck a single permission ──
  const recheckPermission = async (permId: string) => {
    try {
      const res = await fetch("/api/permissions", { signal: AbortSignal.timeout(10000) });
      const data: PermissionsData = await res.json();
      const updated = data.permissions.find(p => p.id === permId);
      if (updated) {
        setPermissions(prev =>
          prev.map(p => p.id === permId ? updated : p)
        );
      }
    } catch { /* silent */ }
  };

  // ── Connect Google account ──
  const connectGoogle = async () => {
    if (!googleEmail.trim() || !googleEmail.includes("@")) {
      setGoogleError("Please enter a valid email address");
      return;
    }
    setGoogleConnecting(true);
    setGoogleError(null);
    try {
      const res = await fetch("/api/google-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", email: googleEmail.trim() }),
        signal: AbortSignal.timeout(180000), // 3 min for browser auth
      });
      const data = await res.json();
      if (data.error) {
        setGoogleError(data.error);
      } else {
        // Refresh auth status
        const gRes = await fetch("/api/google-auth", { signal: AbortSignal.timeout(10000) });
        const gData = await gRes.json();
        setGoogleAuth(gData);
        setShowGoogleInput(false);
        setGoogleEmail("");
      }
    } catch (err) {
      const msg = (err as Error).message || "Connection failed";
      if (msg.includes("timeout") || msg.includes("aborted")) {
        setGoogleError("Connection timed out. Make sure to complete authorization in the browser window that opened.");
      } else {
        setGoogleError(msg);
      }
    } finally {
      setGoogleConnecting(false);
    }
  };

  // ── Stats ──
  const grantedCount = permissions.filter(p => p.granted).length;
  const totalCount = permissions.length;
  const requiredGranted = permissions.filter(p => p.required && p.granted).length;
  const requiredTotal = permissions.filter(p => p.required).length;
  const googleConnected = googleAuth?.connected ?? false;

  const handleContinue = () => {
    if (onComplete) {
      onComplete();
    } else {
      onClose();
    }
  };

  return (
    <div className="perms-overlay">
      <div className="perms-panel">
        {/* Header */}
        <div className="perms-header">
          <div className="perms-title-row">
            <div className="perms-icon-wrap">
              <Shield size={20} />
            </div>
            <div>
              <h2 className="perms-title">
                {mode === "onboarding" ? "Set Up Permissions" : "Permissions & Accounts"}
              </h2>
              <p className="perms-subtitle">
                {loading
                  ? "Checking access..."
                  : `${grantedCount} of ${totalCount} permissions granted`}
              </p>
            </div>
          </div>
          <button className="perms-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Info banner */}
        {mode === "onboarding" && !loading && (
          <div className="perms-banner">
            <span className="perms-banner-emoji">🔐</span>
            <span>
              HammerLock needs a few permissions to control your calendar, reminders, and more.
              <strong> Everything stays on your device.</strong>
            </span>
          </div>
        )}

        {/* Content */}
        <div className="perms-content">
          {loading && (
            <div className="perms-loading">
              <RefreshCw size={20} className="spin" />
              <span>Checking permissions...</span>
            </div>
          )}

          {error && (
            <div className="perms-error">
              <AlertTriangle size={16} />
              <span>{error}</span>
              <button onClick={fetchStatus} className="perms-retry">Retry</button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* ── macOS Permissions ── */}
              <div className="perms-section">
                <div className="perms-section-header">
                  <span className="perms-section-label">macOS Permissions</span>
                  <span className="perms-section-count">
                    {requiredGranted}/{requiredTotal} required
                  </span>
                </div>

                <div className="perms-list">
                  {permissions.map(perm => {
                    const Icon = PERMISSION_ICONS[perm.id] || Shield;
                    const isRequesting = requesting === perm.id;
                    return (
                      <div
                        key={perm.id}
                        className={`perm-card ${perm.granted ? "granted" : "denied"}`}
                      >
                        <div className="perm-card-left">
                          <div className={`perm-card-icon ${perm.granted ? "granted" : ""}`}>
                            <Icon size={16} />
                          </div>
                          <div className="perm-card-info">
                            <div className="perm-card-name">
                              {perm.name}
                              {perm.required && <span className="perm-required-dot" />}
                            </div>
                            <div className="perm-card-desc">{perm.description}</div>
                            {!perm.granted && perm.features.length > 0 && (
                              <div className="perm-card-features">
                                {perm.features.slice(0, 2).map(f => (
                                  <span key={f} className="perm-feature-tag">{f}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="perm-card-right">
                          {perm.granted ? (
                            <span className="perm-badge granted">
                              <CheckCircle size={14} /> Granted
                            </span>
                          ) : (
                            <button
                              className="perm-grant-btn"
                              onClick={() => requestPermission(perm.id)}
                              disabled={isRequesting}
                            >
                              {isRequesting ? (
                                <><RefreshCw size={12} className="spin" /> Requesting...</>
                              ) : perm.manual ? (
                                <><ExternalLink size={12} /> Open Settings</>
                              ) : (
                                <><ChevronRight size={12} /> Grant</>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Google Account ── */}
              <div className="perms-section">
                <div className="perms-section-header">
                  <span className="perms-section-label">Google Account</span>
                  {googleConnected && (
                    <span className="perms-section-count connected">Connected</span>
                  )}
                </div>

                <div className="perms-google-card">
                  <div className="perms-google-icon">
                    <Mail size={18} />
                  </div>
                  <div className="perms-google-info">
                    {googleConnected ? (
                      <>
                        <div className="perms-google-email">
                          <CheckCircle size={14} className="perms-google-check" />
                          {googleAuth?.accounts?.[0]}
                        </div>
                        <div className="perms-google-services">
                          Gmail, Calendar, Drive, Contacts, Tasks, Docs, Sheets
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="perms-google-label">
                          Connect your Google account
                        </div>
                        <div className="perms-google-desc">
                          Access Gmail, Google Calendar, Drive, Contacts, Tasks, and more
                        </div>
                      </>
                    )}
                  </div>

                  {!googleConnected && !showGoogleInput && (
                    <button
                      className="perms-google-connect-btn"
                      onClick={() => setShowGoogleInput(true)}
                    >
                      <ArrowRight size={14} /> Connect
                    </button>
                  )}
                </div>

                {/* Google email input */}
                {!googleConnected && showGoogleInput && (
                  <div className="perms-google-input-area">
                    <div className="perms-google-input-row">
                      <input
                        type="email"
                        value={googleEmail}
                        onChange={e => setGoogleEmail(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && !googleConnecting) connectGoogle(); }}
                        placeholder="you@gmail.com"
                        className="perms-google-input"
                        autoFocus
                        disabled={googleConnecting}
                      />
                      <button
                        className="perms-google-go-btn"
                        onClick={connectGoogle}
                        disabled={googleConnecting || !googleEmail.trim()}
                      >
                        {googleConnecting ? (
                          <><RefreshCw size={12} className="spin" /> Authorizing...</>
                        ) : (
                          <>Connect</>
                        )}
                      </button>
                    </div>
                    {googleConnecting && (
                      <div className="perms-google-hint">
                        Complete authorization in the browser window that just opened...
                      </div>
                    )}
                    {googleError && (
                      <div className="perms-google-error">
                        <XCircle size={12} /> {googleError}
                      </div>
                    )}
                    <button
                      className="perms-google-cancel"
                      onClick={() => { setShowGoogleInput(false); setGoogleError(null); }}
                      disabled={googleConnecting}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="perms-footer">
          {mode === "onboarding" ? (
            <>
              <button className="perms-continue-btn" onClick={handleContinue}>
                {grantedCount === 0 && !googleConnected
                  ? "Skip for now"
                  : "Continue"}
                <ArrowRight size={14} />
              </button>
              <p className="perms-footer-note">
                You can change permissions anytime in Settings
              </p>
            </>
          ) : (
            <>
              <button className="perms-refresh-btn" onClick={fetchStatus}>
                <RefreshCw size={14} /> Recheck Permissions
              </button>
              <button className="perms-done-btn" onClick={onClose}>
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
