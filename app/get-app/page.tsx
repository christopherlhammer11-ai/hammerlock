"use client";

import { Download, ExternalLink, Globe, Monitor, Shield, Smartphone, Terminal } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { track } from "@vercel/analytics";

const DMG_URL =
  "https://github.com/christopherlhammer11-ai/hammerlock/releases/latest/download/HammerLock-AI.dmg";
const EXE_URL =
  "https://github.com/christopherlhammer11-ai/hammerlock/releases/latest/download/HammerLock-AI-Setup.exe";
const APPIMAGE_URL =
  "https://github.com/christopherlhammer11-ai/hammerlock/releases/latest/download/HammerLock-AI.AppImage";
const DEB_URL =
  "https://github.com/christopherlhammer11-ai/hammerlock/releases/latest/download/HammerLock-AI.deb";

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
          Direct downloads. No account, no email gate, no paywall.
        </p>

        <div className="download-grid">
          {/* macOS */}
          <div className="download-card">
            <div className="download-card-icon"><Monitor size={28} /></div>
            <h3>macOS</h3>
            <p>Native desktop app for Mac. Drag to Applications and launch.</p>
            <a href={DMG_URL} className="btn-primary download-btn" target="_blank" rel="noopener noreferrer" onClick={() => track("download_clicked", { platform: "macos", format: "dmg" })}>
              <Download size={16} /> Download DMG
            </a>
            <span className="download-meta">macOS 12+ &middot; Apple Silicon &amp; Intel</span>
          </div>

          {/* Windows */}
          <div className="download-card">
            <div className="download-card-icon"><Monitor size={28} /></div>
            <h3>Windows</h3>
            <p>Full desktop installer for Windows. Run the setup wizard and launch.</p>
            <a href={EXE_URL} className="btn-primary download-btn" target="_blank" rel="noopener noreferrer" onClick={() => track("download_clicked", { platform: "windows", format: "exe" })}>
              <Download size={16} /> Download EXE
            </a>
            <span className="download-meta">Windows 10+ &middot; 64-bit</span>
          </div>

          {/* Linux */}
          <div className="download-card">
            <div className="download-card-icon"><Terminal size={28} /></div>
            <h3>Linux</h3>
            <p>Available as AppImage (universal) or .deb package for Debian/Ubuntu.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href={APPIMAGE_URL} className="btn-primary download-btn" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem' }} onClick={() => track("download_clicked", { platform: "linux", format: "appimage" })}>
                <Download size={14} /> AppImage
              </a>
              <a href={DEB_URL} className="btn-primary download-btn" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem' }} onClick={() => track("download_clicked", { platform: "linux", format: "deb" })}>
                <Download size={14} /> .deb
              </a>
            </div>
            <span className="download-meta">Ubuntu 20.04+ &middot; 64-bit</span>
          </div>
        </div>

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
          All models are free and open source. Download once &mdash; runs offline forever.
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
