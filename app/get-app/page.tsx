"use client";

import { Download, Globe, Lock, Monitor, Shield, Smartphone } from "lucide-react";
import Link from "next/link";

export default function GetAppPage() {
  return (
    <div className="success-page">
      <div className="success-hero">
        <div className="success-icon">
          <Lock size={48} />
        </div>
        <h1>VaultAI is a Desktop App</h1>
        <p className="success-subtitle">
          VaultAI runs locally on your machine so your data never leaves your device.
          Download the app to get started.
        </p>
      </div>

      <div className="success-downloads">
        <h2>Get VaultAI</h2>
        <p className="success-hint">Choose your platform</p>
        <div className="download-grid">
          <div className="download-card">
            <div className="download-card-icon"><Monitor size={28} /></div>
            <h3>Desktop App</h3>
            <p>Full offline capability with local AI. Your data never leaves your machine.</p>
            <a
              href="https://github.com/christopherlhammer11-ai/vaultai/releases/latest/download/VaultAI.dmg"
              className="btn-primary download-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download size={16} /> Download for Mac
            </a>
            <span className="download-meta">macOS 12+ &middot; Apple Silicon &amp; Intel</span>
          </div>

          <div className="download-card">
            <div className="download-card-icon"><Globe size={28} /></div>
            <h3>Web Console</h3>
            <p>Access VaultAI from any browser on your local network while the desktop app is running.</p>
            <span className="download-meta">Open <strong>localhost:3100</strong> after launching the app</span>
          </div>

          <div className="download-card">
            <div className="download-card-icon"><Smartphone size={28} /></div>
            <h3>Mobile (PWA)</h3>
            <p>Open VaultAI on your phone and add to home screen for an app-like experience.</p>
            <span className="download-meta">Same network as desktop &middot; Add to Home Screen</span>
          </div>
        </div>
      </div>

      <div className="success-setup">
        <h2><Shield size={20} /> First Launch</h2>
        <div className="setup-steps">
          <div className="setup-step">
            <div className="step-number">1</div>
            <div>
              <strong>Install &amp; open VaultAI</strong>
              <p>Open the .dmg and drag VaultAI to Applications. Double-click to launch.</p>
            </div>
          </div>
          <div className="setup-step">
            <div className="step-number">2</div>
            <div>
              <strong>Create your vault password</strong>
              <p>This password encrypts everything locally. We never see it.</p>
            </div>
          </div>
          <div className="setup-step">
            <div className="step-number">3</div>
            <div>
              <strong>Start chatting</strong>
              <p>Use local AI models with Ollama or connect your own API keys. Everything stays on your machine.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="success-footer">
        <p>Questions? Reach us at <strong>info@personalvaultai.com</strong></p>
        <Link href="/" className="success-home-link">Back to Home</Link>
      </div>
    </div>
  );
}
