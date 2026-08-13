"use client";

import { ExternalLink, Globe, Monitor, Shield, Smartphone, Terminal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { track } from "@vercel/analytics";

const RELEASE_BASE = "https://github.com/christopherlhammer11-ai/hammerlock/releases/download/v0.4.0";
const RELEASES_URL = "https://github.com/christopherlhammer11-ai/hammerlock/releases/tag/v0.4.0";
const MAC_DOWNLOAD = `${RELEASE_BASE}/HammerLock-AI.dmg`;
const WINDOWS_DOWNLOAD = `${RELEASE_BASE}/HammerLock-AI-Setup.exe`;
const LINUX_APPIMAGE_DOWNLOAD = `${RELEASE_BASE}/HammerLock-AI.AppImage`;
const LINUX_DEB_DOWNLOAD = `${RELEASE_BASE}/HammerLock-AI.deb`;

export default function GetAppPage() {
  const { t } = useI18n();

  return (
    <div className="success-page">
      <div className="success-hero">
        <div className="success-icon">
          <Image src="/brand/hammerlock-icon-192.png" alt="HammerLock AI" width={56} height={56} style={{ borderRadius: 10 }} />
        </div>
        <h1>{t.site_getapp_title}</h1>
        <p className="success-subtitle">
          {t.site_getapp_subtitle}
        </p>
      </div>

      <div className="success-downloads">
        <h2>{t.site_getapp_heading}</h2>
        <p className="success-hint">{t.site_getapp_choose}</p>
        <p className="success-hint" style={{ marginTop: -8, marginBottom: 28 }}>
          HammerLock AI v0.4 is free. No account, email gate, subscription, or activation key. macOS is signed and notarized by Apple; every desktop build includes a SHA-256 checksum on GitHub.
        </p>

        <div className="download-grid">
          {/* macOS */}
          <div className="download-card">
            <div className="download-card-icon"><Monitor size={28} /></div>
            <h3>macOS</h3>
            <p>Native desktop app for Mac. Drag to Applications and launch.</p>
            <a href={MAC_DOWNLOAD} className="btn-primary download-btn" onClick={() => track("download_started", { platform: "macos", version: "0.4.0" })}>
              <ExternalLink size={16} /> Download for Mac
            </a>
            <span className="download-meta">v0.4.0 &middot; Intel Mac &middot; Apple signed and notarized</span>
          </div>

          {/* Windows */}
          <div className="download-card">
            <div className="download-card-icon"><Monitor size={28} /></div>
            <h3>Windows</h3>
            <p>Full desktop installer for Windows. Run the setup wizard and launch.</p>
            <a href={WINDOWS_DOWNLOAD} className="btn-primary download-btn" onClick={() => track("download_started", { platform: "windows", version: "0.4.0" })}>
              <ExternalLink size={16} /> Download for Windows
            </a>
            <span className="download-meta">v0.4.0 &middot; Windows installer</span>
          </div>

          {/* Linux */}
          <div className="download-card">
            <div className="download-card-icon"><Terminal size={28} /></div>
            <h3>Linux</h3>
            <p>Available as AppImage (universal) or .deb package for Debian/Ubuntu.</p>
            <a href={LINUX_APPIMAGE_DOWNLOAD} className="btn-primary download-btn" onClick={() => track("download_started", { platform: "linux_appimage", version: "0.4.0" })}>
              <ExternalLink size={16} /> Download AppImage
            </a>
            <a href={LINUX_DEB_DOWNLOAD} className="btn-secondary download-btn" onClick={() => track("download_started", { platform: "linux_deb", version: "0.4.0" })}>
              <ExternalLink size={16} /> Download .deb
            </a>
            <span className="download-meta">v0.4.0 &middot; AppImage or Debian/Ubuntu package</span>
          </div>
        </div>

        <p className="success-hint" style={{ marginTop: 20 }}>
          <a href={RELEASES_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
            View release notes and SHA-256 checksums &rarr;
          </a>
        </p>

        <div className="download-grid" style={{ marginTop: 16 }}>
          <div className="download-card">
            <div className="download-card-icon"><Globe size={28} /></div>
            <h3>{t.site_getapp_web}</h3>
            <p>{t.site_getapp_web_desc}</p>
            <span className="download-meta">{t.site_getapp_web_meta}</span>
          </div>

          <div className="download-card">
            <div className="download-card-icon"><Smartphone size={28} /></div>
            <h3>{t.site_getapp_pwa}</h3>
            <p>{t.site_getapp_pwa_desc}</p>
            <span className="download-meta">{t.site_getapp_pwa_meta} &middot; Add to Home Screen</span>
          </div>
        </div>
      </div>

      <div className="success-setup">
        <h2><Shield size={20} /> {t.site_getapp_first_launch}</h2>
        <div className="setup-steps">
          <div className="setup-step">
            <div className="step-number">1</div>
            <div>
              <strong>{t.site_getapp_step1_title}</strong>
              <p>{t.site_getapp_step1_desc}</p>
            </div>
          </div>
          <div className="setup-step">
            <div className="step-number">2</div>
            <div>
              <strong>{t.site_getapp_step2_title}</strong>
              <p>{t.site_getapp_step2_desc}</p>
            </div>
          </div>
          <div className="setup-step">
            <div className="step-number">3</div>
            <div>
              <strong>{t.site_getapp_step3_title}</strong>
              <p>{t.site_getapp_step3_desc}</p>
            </div>
          </div>
          <div className="setup-step">
            <div className="step-number">4</div>
            <div>
              <strong>{t.site_getapp_step4_title}</strong>
              <p>{t.site_getapp_step4_desc}</p>
            </div>
          </div>
        </div>
      </div>

      {/* LOCAL AI ENGINE SECTION */}
      <div className="success-setup" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <h2><Terminal size={20} /> Power Your AI Locally</h2>
        <p className="success-hint" style={{ marginBottom: 24 }}>
          HammerLock AI is the interface. <strong>Ollama</strong> is the engine that runs AI models on your machine.
          You need both &mdash; the app does not include a model. Install Ollama, pull a model, and everything runs 100% offline.
        </p>

        <div className="download-grid">
          <div className="download-card">
            <div className="download-card-icon" style={{ fontSize: '1.5rem' }}>🦙</div>
            <h3>Ollama</h3>
            <p>Free, open-source local AI engine. Runs models on your hardware with one command. Required for local AI.</p>
            <a
              href="https://ollama.com"
              className="btn-primary download-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={14} /> Download Ollama
            </a>
            <span className="download-meta">ollama.com &middot; macOS, Windows, Linux</span>
          </div>

          <div className="download-card">
            <div className="download-card-icon" style={{ fontSize: '1.5rem' }}>🧠</div>
            <h3>Or Use Cloud API Keys</h3>
            <p>Prefer cloud models? Bring your own API keys from OpenAI, Anthropic, Google, Groq, Mistral, or DeepSeek. No Ollama needed.</p>
            <span className="download-meta">BYOK &mdash; your keys, your spend, your choice</span>
          </div>
        </div>
      </div>

      {/* SETUP PATH BY PLAN */}
      <div className="success-setup" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <h2><Shield size={20} /> Choose Your Setup</h2>
        <p className="success-hint" style={{ marginBottom: 24 }}>
          HammerLock AI is free. Pick the setup that fits how you want to run it.
        </p>
        <div className="download-grid">
          <div className="download-card" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="download-card-icon" style={{ fontSize: '1.2rem' }}>🆓</div>
            <h3>Private + Local</h3>
            <p style={{ fontSize: '0.88rem' }}>
              <strong>Use Ollama.</strong> Install Ollama, pull a model, and run everything locally on your machine. No API keys, no cloud, no recurring cost.
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
              <code style={{ background: 'rgba(0,255,136,0.08)', color: 'var(--accent)', padding: '2px 6px', borderRadius: 4 }}>ollama pull llama3.1</code>
            </div>
          </div>

          <div className="download-card" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="download-card-icon" style={{ fontSize: '1.2rem' }}>🔑</div>
            <h3>Cloud + BYOK</h3>
            <p style={{ fontSize: '0.88rem' }}>
              <strong>Bring your own keys.</strong> Connect OpenAI, Anthropic, Google, Groq, Mistral, or DeepSeek if you want hosted models while keeping control of spend.
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Go to <strong>Settings → API Keys</strong> in the app
            </div>
          </div>

          <div className="download-card" style={{ borderColor: 'rgba(0,255,136,0.2)' }}>
            <div className="download-card-icon" style={{ fontSize: '1.2rem' }}>⚡</div>
            <h3>Teams + Enterprise</h3>
            <p style={{ fontSize: '0.88rem' }}>
              <strong>Need rollout help?</strong> For self-hosting, shared deployments, air-gapped environments, or custom integrations, talk to us and we&apos;ll tailor the install.
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--accent)', marginTop: 8 }}>
              Contact: info@hammerlockai.com
            </div>
          </div>
        </div>
      </div>

      {/* RECOMMENDED MODELS */}
      <div className="success-setup" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <h2>Recommended Local Models</h2>
        <p className="success-hint" style={{ marginBottom: 24 }}>
          After installing Ollama, open a terminal and pull one of these models. Each one runs entirely on your hardware.
        </p>

        <div className="model-table-wrap" style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12,
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best For</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RAM Needed</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--accent)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Terminal Command</th>
              </tr>
            </thead>
            <tbody>
              {[
                { model: 'LLaMA 3.1 8B', best: 'Best all-rounder (recommended)', ram: '16 GB', cmd: 'ollama pull llama3.1', tag: '★' },
                { model: 'Mistral 7B', best: 'Fast & efficient', ram: '16 GB', cmd: 'ollama pull mistral', tag: '' },
                { model: 'Phi-3 Mini', best: 'Low-resource machines', ram: '8 GB', cmd: 'ollama pull phi3', tag: '' },
                { model: 'Gemma 2', best: 'Instruction following', ram: '16 GB', cmd: 'ollama pull gemma2', tag: '' },
                { model: 'Mixtral 8x7B', best: 'Near-GPT-4 quality', ram: '32 GB', cmd: 'ollama pull mixtral', tag: '' },
                { model: 'LLaMA 3.1 70B', best: 'Maximum capability', ram: '64 GB', cmd: 'ollama pull llama3.1:70b', tag: '' },
              ].map((m) => (
                <tr key={m.model} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {m.tag && <span style={{ color: 'var(--accent)', marginRight: 6 }}>{m.tag}</span>}
                    {m.model}
                  </td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{m.best}</td>
                  <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{m.ram}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <code style={{ background: 'rgba(0,255,136,0.08)', color: 'var(--accent)', padding: '3px 8px', borderRadius: 4, fontSize: '0.82rem', fontFamily: 'var(--font-jetbrains), monospace' }}>{m.cmd}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 16, textAlign: 'center' }}>
          These local models are available through Ollama and can run offline after download.
          <br />
          <a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
            Browse all models at ollama.com/library &rarr;
          </a>
        </p>
      </div>

      <div className="success-footer">
        <p>{t.site_getapp_questions} <strong>info@hammerlockai.com</strong></p>
        <Link href="/" className="success-home-link">{t.site_getapp_back}</Link>
      </div>
    </div>
  );
}
