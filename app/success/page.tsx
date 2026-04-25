"use client";

import { CheckCircle, Copy, Download, Globe, Key, Monitor, Shield, Smartphone } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSubscription, SubscriptionTier } from "@/lib/subscription-store";
import { useI18n } from "@/lib/i18n";
import { track } from "@vercel/analytics";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const planParam = params.get("plan");
  const { subscription, activateSubscription } = useSubscription();
  const [activated, setActivated] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [licenseTier, setLicenseTier] = useState<string | null>(null);
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  // Activate subscription in localStorage (for web users)
  useEffect(() => {
    if (!sessionId || activated) return;
    if (subscription.sessionId === sessionId) { setActivated(true); return; }
    let tier: SubscriptionTier = "pro";
    if (planParam?.includes("core")) {
      tier = "core";
    } else if (planParam?.includes("teams")) {
      tier = "teams";
    } else if (planParam?.includes("enterprise")) {
      tier = "enterprise";
    }
    activateSubscription(tier, sessionId);
    setActivated(true);
    track("purchase_complete", { plan: planParam || "unknown", tier });
  }, [sessionId, planParam, activated, subscription.sessionId, activateSubscription]);

  // Fetch license key from server (with retry for webhook timing)
  useEffect(() => {
    if (!sessionId || licenseKey) return;
    setLicenseLoading(true);

    let attempts = 0;
    const maxAttempts = 6;
    const delay = 2000;

    const fetchKey = async () => {
      try {
        const res = await fetch(`/api/license/key?session_id=${encodeURIComponent(sessionId)}`);
        if (res.ok) {
          const data = await res.json();
          setLicenseKey(data.licenseKey);
          setLicenseTier(data.tier);
          setLicenseLoading(false);
          return;
        }
        // 404 = webhook hasn't processed yet, retry
        if (res.status === 404 && attempts < maxAttempts) {
          attempts++;
          setTimeout(fetchKey, delay);
          return;
        }
      } catch {
        // Network error — retry
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(fetchKey, delay);
          return;
        }
      }
      setLicenseLoading(false);
    };

    fetchKey();
  }, [sessionId, licenseKey]);

  const handleCopy = useCallback(() => {
    if (!licenseKey) return;
    navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [licenseKey]);

  return (
    <div className="success-page">
      <div className="success-hero">
        <div className="success-icon">
          <CheckCircle size={48} />
        </div>
        <h1>{t.site_success_title}</h1>
        <p className="success-subtitle">
          HammerLock AI is ready. Download the app, create your vault, and choose local models, your own API keys, or a managed rollout.
        </p>
        {subscription.active && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "rgba(0, 255, 136, 0.1)", border: "1px solid rgba(0, 255, 136, 0.3)", borderRadius: 8, color: "var(--accent)", fontSize: "0.85rem", marginTop: 12 }}>
            <Shield size={14} />
            {t.site_success_plan_activated(subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1))}
          </div>
        )}
        {sessionId && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 8 }}>
            {t.site_success_confirmation}: <code style={{
              background: "rgba(255,255,255,0.06)",
              padding: "3px 8px",
              borderRadius: 4,
              fontSize: "0.78rem",
              fontFamily: "var(--font-jetbrains), monospace",
              color: "var(--text-secondary)",
              letterSpacing: "0.02em",
            }}>{sessionId.slice(0, 20)}...</code>
          </p>
        )}
      </div>

      {/* License Key Section */}
      <div className="license-key-section" style={{
        maxWidth: 600,
        margin: "32px auto",
        padding: "28px",
        background: "var(--bg-card)",
        border: "1px solid var(--accent)",
        borderRadius: "var(--radius-lg)",
        textAlign: "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 12 }}>
          <Key size={20} style={{ color: "var(--accent)" }} />
          <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Your License Key</h3>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 16 }}>
          If you received a license key for managed rollout, support, or a custom deployment, enter it in the desktop app when prompted.
        </p>
        {licenseLoading ? (
          <div style={{
            padding: "20px",
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-secondary)",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}>
            <span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            Generating your license key...
          </div>
        ) : licenseKey ? (
          <>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "14px 20px",
              background: "var(--bg-secondary)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
            }}>
              <code style={{
                fontFamily: "var(--font-jetbrains)",
                fontSize: "1.2rem",
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: "var(--accent)",
              }}>
                {licenseKey}
              </code>
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? "var(--accent)" : "transparent",
                  border: `1px solid ${copied ? "var(--accent)" : "var(--border-color)"}`,
                  borderRadius: "var(--radius-sm)",
                  padding: "6px 12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  color: copied ? "#000" : "var(--text-secondary)",
                  fontSize: "0.8rem",
                  transition: "all 0.15s ease",
                }}
              >
                <Copy size={14} />
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 12 }}>
              Save this key somewhere safe. You&apos;ll need it to activate the desktop app.
            </p>
          </>
        ) : (
          <div style={{
            padding: "20px",
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
          }}>
            <p style={{ margin: "0 0 8px" }}>Your activation details are still syncing...</p>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
              If nothing appears within a minute, refresh the page or contact <strong>info@hammerlockai.com</strong> with your confirmation code.
            </p>
          </div>
        )}
      </div>

      <div className="success-downloads">
        <h2>{t.site_success_get_started}</h2>
        <p className="success-hint">{t.site_success_choose}</p>
        <div className="download-grid">
          <div className="download-card">
            <div className="download-card-icon"><Monitor size={28} /></div>
            <h3>macOS</h3>
            <p>Full desktop app with encrypted vault, local AI, and all features.</p>
            <a href="https://github.com/christopherlhammer11-ai/hammerlock/releases/latest/download/HammerLock-AI.dmg" className="btn-primary download-btn" target="_blank" rel="noopener noreferrer">
              <Download size={16} /> Download DMG
            </a>
            <span className="download-meta">macOS 12+ &middot; Apple Silicon &amp; Intel</span>
          </div>
          <div className="download-card">
            <div className="download-card-icon"><Monitor size={28} /></div>
            <h3>Windows</h3>
            <p>One-click installer for Windows 10/11 with all desktop features.</p>
            <a href="https://github.com/christopherlhammer11-ai/hammerlock/releases/latest/download/HammerLock-AI-Setup.exe" className="btn-primary download-btn" target="_blank" rel="noopener noreferrer">
              <Download size={16} /> Download EXE
            </a>
            <span className="download-meta">Windows 10+ &middot; 64-bit</span>
          </div>
          <div className="download-card">
            <div className="download-card-icon"><Monitor size={28} /></div>
            <h3>Linux</h3>
            <p>AppImage or .deb package for Ubuntu, Fedora, and other distros.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="https://github.com/christopherlhammer11-ai/hammerlock/releases/latest/download/HammerLock-AI.AppImage" className="btn-primary download-btn" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem" }}>
                <Download size={14} /> AppImage
              </a>
              <a href="https://github.com/christopherlhammer11-ai/hammerlock/releases/latest/download/HammerLock-AI.deb" className="btn-primary download-btn" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem" }}>
                <Download size={14} /> .deb
              </a>
            </div>
            <span className="download-meta">Ubuntu 20.04+ &middot; 64-bit</span>
          </div>
        </div>
      </div>
      <div className="success-setup">
        <h2><Shield size={20} /> {t.site_success_quick_setup}</h2>

        <div className="setup-steps">
          <div className="setup-step">
            <div className="step-number">1</div>
            <div>
              <strong>Download &amp; Install HammerLock AI</strong>
              <p>Download the app above, move it into Applications, launch it, and create your vault password on first run.</p>
            </div>
          </div>
          <div className="setup-step">
            <div className="step-number">2</div>
            <div>
              <strong>Pick Your AI Path</strong>
              <p>Use <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" style={{color: "var(--accent)"}}>Ollama</a> for private local AI, or bring your own provider keys in Settings if you want hosted models.</p>
            </div>
          </div>
          <div className="setup-step">
            <div className="step-number">3</div>
            <div>
              <strong>Open Tool Center</strong>
              <p>Use Tool Center to connect the workflows you actually want: Notes, Reminders, GitHub, Google Workspace, PDF tools, voice, and more.</p>
            </div>
          </div>
          <div className="setup-step">
            <div className="step-number">4</div>
            <div>
              <strong>Optional: Activate Managed Features</strong>
              <p>If you received an activation key or support package, enter it in the app. Otherwise you can just use HammerLock for free.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="success-footer">
        <p>{t.site_success_questions} <strong>info@hammerlockai.com</strong></p>
        <Link href="/" className="success-home-link">{t.site_success_back}</Link>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  const { t } = useI18n();
  return (
    <Suspense fallback={<div className="success-page"><div className="success-hero"><h1>{t.site_success_loading}</h1></div></div>}>
      <SuccessContent />
    </Suspense>
  );
}
