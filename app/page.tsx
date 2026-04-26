'use client';

// 🔨🔐 HammerLock AI — Landing Page
// Your AI. Your Data. Your Rules.

import { Check, Globe, Menu, Smartphone, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useI18n, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { track } from "@vercel/analytics";
import { BUILT_IN_AGENTS } from "@/lib/agents";

// Features array is built inside the component to access i18n
const HAMMERLOCK_X_URL = "https://x.com/HammerlockAI";

// Steps array is built inside the component to access i18n

// Comparison rows are built inside the component to access i18n

// Plans array is built inside the component to access i18n

/** Detect if running inside Electron desktop app */
function isElectron(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as unknown as Record<string, unknown>).electron ||
    (typeof navigator !== "undefined" && navigator.userAgent.includes("Electron"));
}

export default function LandingPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileUrl, setMobileUrl] = useState<string | null>(null);
  const [integrationCount, setIntegrationCount] = useState<number | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [expandedUseCase, setExpandedUseCase] = useState<string | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const langRef = useRef<HTMLDivElement>(null);
  const { t, locale, setLocale } = useI18n();

  const features = [
    { icon: '🔐', title: t.site_feat_encrypt_title, body: t.site_feat_encrypt_body,
      detail: 'AES-256-GCM encryption with PBKDF2 key derivation. Your data never leaves your device unencrypted — not even metadata.',
      cta: 'See Security Details', ctaLink: '#why' },
    { icon: '🌐', title: t.site_feat_search_title, body: t.site_feat_search_body,
      detail: 'Real-time web search powered by Brave Search API. Get current information with source citations — all processed locally.',
      cta: 'See Download Options', ctaLink: '/get-app' },
    { icon: '🧠', title: t.site_feat_memory_title, body: t.site_feat_memory_body,
      detail: 'Your personal vault remembers your role, preferences, and context. Every conversation builds on what came before.',
      cta: 'Learn More', ctaLink: '#how' },
    { icon: '🎙️', title: t.site_feat_voice_title, body: t.site_feat_voice_body,
      detail: 'Whisper-powered transcription for voice input. Text-to-speech for hands-free responses. Works offline with Ollama.',
      cta: 'Download Free', ctaLink: '/get-app' },
    { icon: '🔗', title: integrationCount ? `${integrationCount} Local Tools & Integrations` : 'Local Tools & Integrations', body: 'Calendar, notes, messaging, GitHub, smart home, browser automation, weather, PDF utilities, and more — all reachable from chat when configured on your machine.',
      detail: 'Powered by the OpenClaw gateway: HammerLock can detect and connect to local tools and external services like Philips Hue, Sonos, Eight Sleep, WhatsApp, GitHub, Google apps, and more. Availability depends on your OS, installed apps, permissions, and connected accounts.',
      cta: 'See Integrations', ctaLink: '#why' },
    { icon: '🌍', title: t.site_feat_lang_title, body: t.site_feat_lang_body,
      detail: '11 languages supported: English, Spanish, Portuguese, French, German, Chinese, Japanese, Korean, Arabic, Hindi, and Russian.',
      cta: 'Get the App', ctaLink: '/get-app' },
    { icon: '💳', title: t.site_feat_credits_title, body: t.site_feat_credits_body,
      detail: 'Run free with local models through Ollama, or connect your own API keys from OpenAI, Anthropic, Google, Groq, Mistral, or DeepSeek. You stay in control of cost and privacy.',
      cta: 'Choose Your Setup', ctaLink: '/get-app' },
    { icon: '📄', title: t.site_feat_pdf_title, body: t.site_feat_pdf_body,
      detail: 'Upload any PDF and ask questions about it. Generate formatted reports and export conversations. All processing stays local.',
      cta: 'Download Free', ctaLink: '/get-app' },
    { icon: '🗄️', title: t.site_feat_vault_title, body: t.site_feat_vault_body,
      detail: 'Encrypted personal vault stores your profile, notes, and preferences. Synced across sessions, never sent to the cloud.',
      cta: 'Get the App', ctaLink: '/get-app' },
    { icon: '🤖', title: t.site_feat_agents_title, body: t.site_feat_agents_body,
      detail: '11 built-in agents work alongside local tools and integrations like notes, calendar, messaging, GitHub, browser automation, PDF utilities, and smart home controls. What is available depends on your setup.',
      cta: 'Meet the Agents', ctaLink: '#agents' },
    { icon: '⚡', title: t.site_feat_perf_title, body: t.site_feat_perf_body,
      detail: 'Parallel provider racing across 6+ LLMs. Streaming responses start in under 1 second. Token-aware context management.',
      cta: 'Start Here', ctaLink: '/get-app' },
  ];

  const steps = [
    { label: '01', title: t.site_step1_title, body: t.site_step1_body },
    { label: '02', title: t.site_step2_title, body: t.site_step2_body },
    { label: '03', title: t.site_step3_title, body: t.site_step3_body },
    { label: '04', title: t.site_step4_title, body: t.site_step4_body },
  ];

  const comparisonRows = [
    [t.site_cmp_local_storage, '✕', '✓'],
    [t.site_cmp_aes, '✕', '✓'],
    [t.site_cmp_pii, '✕', '✓'],
    [t.site_cmp_no_train, '✕', '✓'],
    [t.site_cmp_agents, '✕', t.site_cmp_agents_val],
    ['Local tools & integrations', 'Limited', integrationCount ? `${integrationCount}+ available to configure` : 'Available based on your setup'],
    ['Browser automation', '✕', '✓'],
    [t.site_cmp_memory, '✕', '✓'],
    [t.site_cmp_search, t.site_cmp_search_typical, '✓'],
    [t.site_cmp_voice, t.site_cmp_voice_typical, '✓'],
    [t.site_cmp_no_account, '✕', '✓'],
  ];

  const testimonials = [
    {
      emoji: "🚀", name: "Sarah M.", role: "CEO, Early-Stage Startup", category: "Startup",
      quote: "I replaced three separate SaaS subscriptions with HammerLock. Email drafting, scheduling, and market research — all from one encrypted chat that never touches the cloud.",
    },
    {
      emoji: "⚖️", name: "David R.", role: "Immigration Attorney", category: "Legal",
      quote: "Client confidentiality isn't optional. I parse case documents and research precedents without any data leaving my laptop. My clients' information stays exactly where it should.",
    },
    {
      emoji: "📊", name: "Priya K.", role: "CPA, Self-Employed", category: "Finance",
      quote: "I analyze sensitive financial documents locally — no cloud uploads, no compliance headaches. My clients trust me because I can prove their data never left my machine.",
    },
    {
      emoji: "🎙️", name: "Marcus T.", role: "Head of Ops, Remote Team", category: "Operations",
      quote: "Voice commands, smart home control, and calendar management — I run my entire morning routine hands-free. It's like having a chief of staff that respects my privacy.",
    },
    {
      emoji: "🔒", name: "Elena W.", role: "Senior Software Engineer", category: "Privacy",
      quote: "Finally an AI assistant that doesn't train on my conversations. I use it daily for code review and documentation — knowing my proprietary code stays private.",
    },
    {
      emoji: "🏪", name: "James L.", role: "Small Business Owner", category: "Small Biz",
      quote: "Customer emails, inventory reminders, daily task lists — all managed from one place. The encryption means I don't worry about my business data ending up in someone's training set.",
    },
  ];

  const landingAgents = BUILT_IN_AGENTS.map((agent) => ({
    ...agent,
    iconEmoji:
      agent.id === "general" ? "🔧" :
      agent.id === "strategist" ? "🎯" :
      agent.id === "counsel" ? "⚖️" :
      agent.id === "analyst" ? "📈" :
      agent.id === "researcher" ? "📚" :
      agent.id === "operator" ? "🛠️" :
      agent.id === "writer" ? "✍️" :
      agent.id === "coach" ? "❤️" :
      agent.id === "money" ? "💸" :
      agent.id === "content" ? "📣" :
      "🎬",
  }));

  const setupPaths = [
    {
      name: "Local-First",
      tag: "RECOMMENDED",
      setup: "Run Ollama on your machine",
      description: "Best for privacy, zero recurring cost, and unlimited local use.",
      points: [
        "Private local models with Ollama",
        "Encrypted vault and memory",
        "Voice, PDF, agents, and local tools",
        "No cloud account required",
      ],
      ctaLabel: "Download for Mac",
      ctaHref: "/get-app",
    },
    {
      name: "Bring Your Own Keys",
      tag: "FLEXIBLE",
      setup: "Connect OpenAI, Anthropic, Google, Groq, Mistral, or DeepSeek",
      description: "Best when you want cloud models but still want HammerLock owning the UX and encrypted local context.",
      points: [
        "Use your own provider accounts",
        "Pick the models you trust",
        "No HammerLock markup on usage",
        "Mix local and cloud when needed",
      ],
      ctaLabel: "See Setup Guide",
      ctaHref: "/get-app",
    },
    {
      name: "Team Rollout",
      tag: "SELF-HOSTED",
      setup: "For teams that want a private shared deployment",
      description: "Best for companies that need a defensible internal AI surface without sending work product into third-party chat history.",
      points: [
        "Shared deployment patterns",
        "Private internal workflows",
        "Custom integrations",
        "Support for rollout planning",
      ],
      ctaLabel: "Talk to Us",
      ctaHref: "mailto:info@hammerlockai.com",
    },
  ];

  // Close language picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Desktop app: skip marketing page, go straight to vault
  useEffect(() => {
    if (isElectron()) {
      window.location.replace("/vault");
    }
  }, []);

  // QR code only in local dev — never on production (Vercel returns container IPs)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      fetch('/api/local-ip')
        .then((r) => r.json())
        .then((data) => {
          if (data.ip && data.ip !== 'localhost') {
            const port = window.location.port || '3000';
            setMobileUrl(`http://${data.ip}:${port}`);
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    fetch('/api/setup')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('setup unavailable'))))
      .then((data) => {
        if (typeof data.totalSkills === 'number') {
          setIntegrationCount(data.totalSkills);
        }
      })
      .catch(() => {});
  }, []);

  // Nav scroll effect
  useEffect(() => {
    const nav = document.querySelector('nav.site-nav');
    if (!nav) return;
    const onScroll = () => {
      if (window.scrollY > 40) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll fade-in for sections
  useEffect(() => {
    // Small delay to ensure DOM is fully hydrated before observing
    const timer = setTimeout(() => {
      const sections = document.querySelectorAll('.fade-in-section');
      if (!sections.length) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
              observer.unobserve(entry.target); // stop watching once visible
            }
          });
        },
        { threshold: 0.01, rootMargin: '200px 0px 0px 0px' }
      );
      sections.forEach((s) => observer.observe(s));

      // Fallback: if any section is already in the viewport on load, mark it visible
      sections.forEach((s) => {
        const rect = s.getBoundingClientRect();
        if (rect.top < window.innerHeight + 200) {
          s.classList.add('visible');
        }
      });

      return () => observer.disconnect();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="page-wrapper">
      <nav className="site-nav">
        <a href="/" className="logo-mark" style={{ textDecoration: 'none', color: 'inherit' }}>
          <Image src="/brand/hammerlock-icon-192.png" alt="" width={22} height={22} style={{ borderRadius: 4 }} />
          HammerLock AI
        </a>
        <ul>
          <li><a href="#features">{t.site_nav_features}</a></li>
          <li><a href="#agents">{t.site_nav_agents}</a></li>
          <li><a href="#setup">Setup</a></li>
          <li><a href="#how">{t.site_nav_how}</a></li>
          <li><a href="#why">{t.site_nav_why}</a></li>
          <li><a href="/blog/blog-index.html">Research</a></li>
          <li><a href={HAMMERLOCK_X_URL} target="_blank" rel="noopener noreferrer">X</a></li>
        </ul>
        <div className="lang-picker" ref={langRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            aria-label="Change language"
            style={{
              background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '6px 10px', color: 'var(--text-secondary)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              fontSize: '0.8rem', transition: 'border-color 0.2s',
            }}
          >
            <Globe size={14} /> {LOCALE_LABELS[locale]}
          </button>
          {langOpen && (
            <div style={{
              position: 'absolute', top: '110%', right: 0, background: 'rgba(20,20,20,0.95)',
              backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: 6, zIndex: 1000, minWidth: 140,
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
              {(Object.keys(LOCALE_LABELS) as Locale[]).map(loc => (
                <button
                  key={loc}
                  onClick={() => { setLocale(loc); setLangOpen(false); }}
                  style={{
                    display: 'block', width: '100%', padding: '7px 12px',
                    background: loc === locale ? 'rgba(0,255,136,0.1)' : 'transparent',
                    border: 'none', color: loc === locale ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: '0.8rem', textAlign: 'left', borderRadius: 6, cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (loc !== locale) (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { if (loc !== locale) (e.target as HTMLElement).style.background = 'transparent'; }}
                >
                  {LOCALE_LABELS[loc]}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="nav-hamburger" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <a href="/get-app" className="btn-primary" onClick={() => track("cta_click", { location: "nav", label: "download_app" })}>{t.site_cta}</a>
      </nav>

      {mobileNavOpen && (
        <>
          <div className="mobile-nav-overlay" onClick={() => setMobileNavOpen(false)} />
          <div className="mobile-nav-panel">
            <button className="mobile-nav-close" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
              <X size={24} />
            </button>
            <a href="#features" onClick={() => setMobileNavOpen(false)}>{t.site_nav_features}</a>
            <a href="#agents" onClick={() => setMobileNavOpen(false)}>{t.site_nav_agents}</a>
            <a href="#setup" onClick={() => setMobileNavOpen(false)}>Setup</a>
            <a href="#how" onClick={() => setMobileNavOpen(false)}>{t.site_nav_how}</a>
            <a href="#why" onClick={() => setMobileNavOpen(false)}>{t.site_nav_why}</a>
            <a href="/blog" onClick={() => setMobileNavOpen(false)}>Research</a>
            <a href={HAMMERLOCK_X_URL} target="_blank" rel="noopener noreferrer" onClick={() => setMobileNavOpen(false)}>X / @HammerlockAI</a>
            <a href="/get-app" className="btn-primary" style={{ textAlign: 'center' }} onClick={() => setMobileNavOpen(false)}>{t.site_cta}</a>
          </div>
        </>
      )}

      <main className="hero">
        <div className="badge">
          <span className="badge-dot" /> {t.site_hero_badge}
        </div>
        <h1>
          <span className="gradient">{t.site_hero_h1_1}</span><br />
          {t.site_hero_h1_2}<br />
          <span className="gradient">{t.site_hero_h1_3}</span>
        </h1>
        <p className="subhead">
          {t.site_hero_sub}
        </p>
        <div className="hero-cta">
          <a href="/get-app" className="btn-primary" onClick={() => track("cta_click", { location: "hero", label: "download_app" })}>{t.site_cta_trial}</a>
          <a href="#setup" className="btn-secondary" onClick={() => track("cta_click", { location: "hero", label: "see_setup" })}>{t.site_cta_how}</a>
        </div>
        <div className="hero-proof-strip">
          <span>Free and open source</span>
          <span>11 built-in agents</span>
          <span>Encrypted local memory</span>
          <span>Run local or BYOK</span>
        </div>
      </main>

      <section className="hero-video-section fade-in-section">
        <div className="hero-video-wrapper">
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/brand/hammerlock-og-banner.jpg"
            className="hero-video"
          >
            <source src="/videos/hammerlock-hero-fast.mp4" type="video/mp4" />
          </video>
          <div className="hero-video-overlay">
            <span className="hero-video-badge">See it in action</span>
          </div>
        </div>
      </section>

      <section className="usecases fade-in-section">
        <div className="section-label">{t.site_section_usecases}</div>
        <h2>{t.site_usecases_h2}</h2>
        <p className="section-subtitle">
          {t.site_sub_usecases}
        </p>
        <div className="usecases-grid">
          {[
            {
              label: t.site_uc_founders_label,
              headline: t.site_uc_founders_headline,
              body: t.site_uc_founders_body,
              prompt: `"${t.site_uc_founders_prompt}"`,
              response: t.site_uc_founders_response,
            },
            {
              label: t.site_uc_legal_label,
              headline: t.site_uc_legal_headline,
              body: t.site_uc_legal_body,
              prompt: `"${t.site_uc_legal_prompt}"`,
              response: t.site_uc_legal_response,
            },
            {
              label: t.site_uc_finance_label,
              headline: t.site_uc_finance_headline,
              body: t.site_uc_finance_body,
              prompt: `"${t.site_uc_finance_prompt}"`,
              response: t.site_uc_finance_response,
            },
            {
              label: t.site_uc_ops_label,
              headline: t.site_uc_ops_headline,
              body: t.site_uc_ops_body,
              prompt: `"${t.site_uc_ops_prompt}"`,
              response: t.site_uc_ops_response,
            },
          ].map((card) => (
            <article
              key={card.label}
              className={`usecase-card${expandedUseCase === card.label ? ' expanded' : ''}`}
              onClick={() => setExpandedUseCase(expandedUseCase === card.label ? null : card.label)}
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
            >
              <div className="usecase-label">{card.label}</div>
              <h3>{card.headline}</h3>
              <p>{card.body}</p>
              <div className="usecase-terminal">
                <div><span className="prompt">hammerlock &gt;</span> {card.prompt}</div>
                <div className="meta">{card.response}</div>
              </div>
              {expandedUseCase === card.label && (
                <div className="card-expand" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,255,136,0.15)' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                    {card.label === t.site_uc_founders_label && 'Pitch decks, competitor analysis, investor prep, go-to-market plans — all with your encrypted context. Your strategy stays yours.'}
                    {card.label === t.site_uc_legal_label && 'Contract review, clause flagging, NDA drafts, compliance checklists — processed locally with zero cloud exposure.'}
                    {card.label === t.site_uc_finance_label && 'Revenue modeling, expense tracking, cash flow projections, investor reporting — your financials never leave your machine.'}
                    {card.label === t.site_uc_ops_label && 'SOPs, workflow automation, team scheduling, process optimization — operational intelligence that learns your business.'}
                  </p>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <a href="#agents" onClick={(e) => e.stopPropagation()} className="btn-secondary" style={{ textDecoration: 'none', padding: '8px 16px', fontSize: '0.85rem', borderRadius: 8 }}>Meet the Agents &rarr;</a>
                    <a href="/get-app" onClick={(e) => e.stopPropagation()} className="cta-main" style={{ display: 'inline-block', padding: '8px 20px', fontSize: '0.85rem', textDecoration: 'none', borderRadius: 8 }}>Download the App &rarr;</a>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section id="features" className="features fade-in-section">
        <div className="section-label">{t.site_section_features}</div>
        <h2>{t.site_features_h2}</h2>
        <p className="section-subtitle">
          {t.site_sub_features}
        </p>
        <div className="features-grid">
          {features.map((feature) => (
            <article
              key={feature.title}
              className={`feature-card${expandedFeature === feature.title ? ' expanded' : ''}`}
              onClick={() => setExpandedFeature(expandedFeature === feature.title ? null : feature.title)}
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
            >
              <div style={{ fontSize: "1.75rem" }}>{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
              {expandedFeature === feature.title && (
                <div className="card-expand" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,255,136,0.15)' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>{feature.detail}</p>
                  <a
                    href={feature.ctaLink}
                    onClick={(e) => e.stopPropagation()}
                    className="cta-main"
                    style={{ display: 'inline-block', padding: '8px 20px', fontSize: '0.85rem', textDecoration: 'none', borderRadius: 8 }}
                  >
                    {feature.cta} &rarr;
                  </a>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* AGENTS */}
      <section id="agents" className="features fade-in-section" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="section-label">{t.site_section_agents}</div>
        <h2>Eleven built-in agents. One encrypted console.</h2>
        <p className="section-subtitle">
          {t.site_sub_agents}
        </p>
        <div className="features-grid">
          {landingAgents.map((agent) => (
            <article
              key={agent.id}
              className={`feature-card${expandedAgent === agent.name ? ' expanded' : ''}`}
              onClick={() => setExpandedAgent(expandedAgent === agent.name ? null : agent.name)}
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
            >
              <div style={{ fontSize: '1.75rem' }}>{agent.iconEmoji}</div>
              <h3>{agent.name}</h3>
              <p>{agent.tagline}</p>
              {expandedAgent === agent.name && (
                <div className="card-expand" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,255,136,0.15)' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                    {agent.systemPrompt.split("\n").slice(0, 3).join(" ")}
                  </p>
                  <a
                    href="/get-app"
                    onClick={(e) => e.stopPropagation()}
                    className="cta-main"
                    style={{ display: 'inline-block', padding: '8px 20px', fontSize: '0.85rem', textDecoration: 'none', borderRadius: 8 }}
                  >
                    Download Free &rarr;
                  </a>
                </div>
              )}
            </article>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href="/agents" className="btn-secondary" style={{ textDecoration: 'none' }}>
            {t.site_agent_guide} &rarr;
          </a>
        </div>
      </section>

      {/* SETUP */}
      <section id="setup" className="pricing-section fade-in-section">
        <div className="section-label">CHOOSE YOUR SETUP</div>
        <h2>Start local. Add cloud only if you want it.</h2>
        <p className="section-subtitle">
          HammerLock AI is free and open source. The real choice is not pricing. It&apos;s how you want to run the intelligence layer behind the app.
        </p>


        <div className="pricing-grid">
          {setupPaths.map((path) => (
            <div key={path.name} className={`pricing-card${path.tag === 'RECOMMENDED' ? ' popular' : ''}`}>
              {path.tag === 'RECOMMENDED' && <div className="pricing-badge">BEST DEFAULT</div>}
              <div className="pricing-tag-row">
                <span className="pricing-tag">{path.tag}</span>
              </div>
              <h3>{path.name}</h3>
              <p className="pricing-description">{path.description}</p>
              <div className="pricing-price">
                <span className="price-amount" style={{ fontSize: '1.15rem' }}>{path.setup}</span>
              </div>
              {path.ctaHref.startsWith('mailto:') ? (
                <a
                  href={path.ctaHref}
                  className="btn-secondary pricing-cta"
                  style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}
                >
                  {path.ctaLabel}
                </a>
              ) : (
                <a
                  href={path.ctaHref}
                  className="btn-primary pricing-cta"
                  style={{ display: 'block', textDecoration: 'none', textAlign: 'center' }}
                >
                  {path.ctaLabel}
                </a>
              )}
              <ul className="pricing-features">
                {path.points.map((f) => (
                  <li key={f}><Check size={14} /> {f}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* BYOK callout */}
        <div style={{
          marginTop: 40, padding: '24px 32px', background: 'rgba(0,255,136,0.03)',
          border: '1px solid rgba(0,255,136,0.12)', borderRadius: 14, textAlign: 'center',
          maxWidth: 680, marginLeft: 'auto', marginRight: 'auto',
        }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--accent)', marginBottom: 12 }}>
            Pick your runtime. Keep your freedom.
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.6 }}>
            Run 100% local with Ollama for the most private setup, or connect your own API keys from OpenAI, Anthropic, Google, Groq, Mistral, or DeepSeek when you want cloud models.
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            Need install help or a team rollout? Reach us at{' '}
            <a href="mailto:info@hammerlockai.com" style={{ color: 'var(--accent)', textDecoration: 'none' }}>info@hammerlockai.com</a>
          </p>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="testimonials fade-in-section">
        <div className="section-label">REAL STORIES</div>
        <h2>Trusted by people who take privacy seriously</h2>
        <p className="section-subtitle">
          From solo founders to law firms, people are switching to HammerLock AI
          because their data deserves better than the cloud.
        </p>
        <div className="testimonials-grid">
          {testimonials.map((item) => (
            <div key={item.name} className="testimonial-card">
              <div className="testimonial-category">{item.category}</div>
              <p className="testimonial-quote">&ldquo;{item.quote}&rdquo;</p>
              <div className="testimonial-author">
                <span className="testimonial-avatar">{item.emoji}</span>
                <div>
                  <div className="testimonial-name">{item.name}</div>
                  <div className="testimonial-role">{item.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="timeline-section fade-in-section">
        <div className="timeline-header">
          <div className="section-label">{t.site_section_how}</div>
          <h2>{t.site_how_h2}</h2>
          <p className="section-subtitle">
            {t.site_sub_how}
          </p>
        </div>
        <div className="timeline-steps">
          {steps.map((step) => (
            <div key={step.label} className="timeline-step" data-step={step.label}>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 40, padding: '20px 28px', background: 'rgba(0,255,136,0.04)',
          border: '1px solid rgba(0,255,136,0.12)', borderRadius: 12,
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, justifyContent: 'center',
        }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Need the AI engine?
          </span>
          <a
            href="https://ollama.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '8px 16px' }}
          >
            Download Ollama (free) &rarr;
          </a>
          <a
            href="/get-app"
            className="btn-secondary"
            style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '8px 16px' }}
          >
            See all models &amp; setup guide &rarr;
          </a>
        </div>
      </section>

      {/* MOBILE QR CODE */}
      {mobileUrl && (
        <section className="qr-section">
          <div className="qr-card">
            <div className="qr-text">
              <div className="section-label">{t.site_mobile_label}</div>
              <h2>{t.site_mobile_title}</h2>
              <p className="section-subtitle">
                {t.site_mobile_sub}
              </p>
              <div className="qr-steps">
                <div><Smartphone size={16} /> <strong>iPhone:</strong> {t.site_mobile_iphone}</div>
                <div><Smartphone size={16} /> <strong>Android:</strong> {t.site_mobile_android}</div>
              </div>
              <div className="qr-url">{mobileUrl}</div>
            </div>
            <div className="qr-code-wrap">
              <QRCodeSVG
                value={mobileUrl}
                size={180}
                bgColor="#111111"
                fgColor="#00ff88"
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
        </section>
      )}

      <section id="why" className="comparison fade-in-section">
        <div className="section-label">{t.site_section_why}</div>
        <h2>{t.site_why_h2}</h2>
        <p className="section-subtitle">
          {t.site_sub_why}
        </p>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>{t.site_comparison_feature}</th>
                <th>{t.site_comparison_typical}</th>
                <th>{t.site_comparison_vault}</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(([label, typical, vault]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{typical}</td>
                  <td>{vault}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="openclaw fade-in-section">
        <div className="section-label">{t.site_section_openclaw}</div>
        <h2>{t.site_openclaw_h2}</h2>
        <p className="section-subtitle">
          {t.site_sub_openclaw}
        </p>
        {/* Core pillars */}
        <div className="openclaw-pills">
          {[
            { label: t.site_oc_multi, desc: t.site_oc_multi_desc },
            { label: t.site_oc_byok, desc: t.site_oc_byok_desc },
            { label: t.site_oc_self, desc: t.site_oc_self_desc },
            { label: t.site_oc_audit, desc: t.site_oc_audit_desc },
          ].map((pill) => (
            <div key={pill.label} className="openclaw-pill">
              <span className="openclaw-pill-label">{pill.label}</span>
              <span>{pill.desc}</span>
            </div>
          ))}
        </div>

        {/* How OpenClaw Works — Architecture */}
        <div style={{ marginTop: 60, maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
          <h3 style={{ textAlign: 'center', fontSize: '1.3rem', marginBottom: 8, letterSpacing: '-0.02em' }}>
            How OpenClaw Works
          </h3>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 32, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
            OpenClaw is the open-source AI runtime that powers HammerLock. It handles provider routing, failover, streaming, and local model management — so you never depend on a single AI vendor.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {[
              { icon: '🔄', title: 'Parallel Provider Racing', desc: 'Sends your query to multiple AI providers simultaneously. The fastest response wins. If one provider is down, you never notice.', blogLabel: 'How racing works →', blogHref: '/blog/parallel-provider-racing.html' },
              { icon: '🏠', title: 'Local-First with Ollama', desc: 'Run Llama, Mistral, Phi, or Gemma locally with Ollama. Zero latency, zero cost, zero data leaving your machine. Perfect for sensitive work.', blogLabel: 'Read the field guide →', blogHref: '/blog/blog-index.html' },
              { icon: '🔀', title: 'Automatic Failover', desc: 'If OpenAI is slow, Groq picks it up. If Groq is down, Anthropic steps in. Your workflow never stops, regardless of provider outages.', blogLabel: 'Inside OpenClaw →', blogHref: '/blog/automatic-failover.html' },
              { icon: '🌊', title: 'Real-Time Streaming', desc: 'Tokens stream to your screen as they generate. No more staring at loading spinners — see the AI think in real time.', blogLabel: 'Speed benchmarks →', blogHref: '/blog/token-streaming.html' },
              { icon: '🔑', title: 'Bring Your Own Keys', desc: 'Use your own API keys from any provider. Pay the providers directly at their rates. No markup, no middleman, no data routing through us.', blogLabel: 'API key guide →', blogHref: '/blog/byok-guide.html' },
              { icon: '🛡️', title: 'PII Anonymization', desc: 'Built-in anonymizer strips personal data before it reaches any cloud API. Names, emails, phone numbers — automatically redacted and restored.', blogLabel: 'Privacy architecture →', blogHref: '/blog/privacy-architecture.html' },
              { icon: '🌐', title: 'Browser Automation & Web Tools', desc: 'Dedicated browser instance controlled from chat. Navigate sites, automate repetitive flows, and route into your local tool stack when your setup allows it.' },
              { icon: '📱', title: integrationCount ? `${integrationCount} Local Tools & Integrations` : 'Local Tools & Integrations', desc: 'Notes, calendar, messaging, GitHub, smart home, weather, PDF helpers, and more — all discoverable through the local tool gateway when configured on your machine.' },
            ].map((item) => (
              <div key={item.title} style={{
                padding: '20px 24px', background: 'rgba(17,17,17,0.6)',
                border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12,
                transition: 'all 0.2s ease',
              }}>
                <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{item.icon}</div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>{item.title}</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                {item.blogHref && <a href={item.blogHref} style={{ display: 'inline-block', marginTop: 10, fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{item.blogLabel}</a>}
              </div>
            ))}
          </div>
        </div>

        {/* OpenClaw Use Cases */}
        <div style={{ marginTop: 60, maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
          <h3 style={{ textAlign: 'center', fontSize: '1.3rem', marginBottom: 8, letterSpacing: '-0.02em' }}>
            What You Can Build with OpenClaw
          </h3>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 32, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
            OpenClaw isn&apos;t just for HammerLock. It&apos;s a standalone runtime you can embed in any application.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { title: 'Private Legal AI', desc: 'Law firms processing client documents with zero cloud exposure. Contract review, case research, and compliance checks — all running locally with attorney-client privilege intact.', tag: 'Legal', blogLabel: 'Read the case study →' },
              { title: 'Healthcare Data Analysis', desc: 'HIPAA-compliant AI processing of patient data. Medical record summarization, clinical trial matching, and research synthesis without data leaving the hospital network.', tag: 'Healthcare', blogLabel: 'HIPAA compliance guide →' },
              { title: 'Financial Modeling', desc: 'Investment firms running AI analysis on proprietary trading data. Portfolio optimization, risk assessment, and market research with no data leakage to third parties.', tag: 'Finance', blogLabel: 'Enterprise use cases →' },
              { title: 'Government & Defense', desc: 'Air-gapped AI deployments for classified environments. Intelligence analysis, document processing, and decision support on isolated networks.', tag: 'Gov/Defense', blogLabel: 'Air-gap deployment →' },
              { title: 'Enterprise Knowledge Base', desc: 'Companies deploying internal AI assistants trained on proprietary documentation. SOPs, product specs, and internal wikis — searchable and conversational.', tag: 'Enterprise', blogLabel: 'Enterprise architecture →' },
              { title: 'Developer Tools', desc: 'Embed OpenClaw in your own applications. Build AI-powered features without vendor lock-in. Switch providers, add local models, or go fully offline — your architecture, your choice.', tag: 'Developers', blogLabel: 'Developer docs →' },
            ].map((uc) => (
              <div key={uc.title} style={{
                padding: '24px', background: 'rgba(17,17,17,0.6)',
                border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12,
                transition: 'all 0.2s ease', position: 'relative',
              }}>
                <span style={{
                  display: 'inline-block', padding: '2px 10px', fontSize: '0.7rem', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)',
                  background: 'rgba(0,255,136,0.08)', borderRadius: 4, marginBottom: 10,
                }}>{uc.tag}</span>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{uc.title}</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{uc.desc}</p>
                <a href="/blog" style={{ display: 'inline-block', marginTop: 12, fontSize: '0.78rem', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>{uc.blogLabel}</a>
              </div>
            ))}
          </div>
        </div>

        {/* Supported Providers */}
        <div style={{ marginTop: 60, textAlign: 'center', maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 16, letterSpacing: '-0.02em' }}>
            Supported AI Providers
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            {['OpenAI (GPT-4o, GPT-4o-mini)', 'Anthropic (Claude Sonnet)', 'Google (Gemini Flash, Gemini Pro)', 'Groq (Llama 3.3 70B)', 'Mistral (Mistral Small)', 'DeepSeek (DeepSeek Chat)', 'Ollama (Llama, Phi, Gemma, Mistral — local)'].map((p) => (
              <span key={p} style={{
                padding: '6px 14px', fontSize: '0.78rem', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, color: 'var(--text-secondary)',
              }}>{p}</span>
            ))}
          </div>
          <p style={{ marginTop: 20, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            New providers added regularly. All providers are optional — use one, some, or all.
          </p>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <a href="/get-app" className="cta-main" style={{ display: 'inline-block', padding: '12px 32px', fontSize: '1rem', textDecoration: 'none', borderRadius: 10 }}>
            Get Started with OpenClaw &rarr;
          </a>
          <div style={{ marginTop: 12 }}>
            <a href="https://github.com/christopherlhammer11-ai/hammerlock" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textDecoration: 'none' }}>
              View source on GitHub &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* BLOG / RESEARCH */}
      <section className="features fade-in-section" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="section-label">Research</div>
        <h2>The Open Source Intelligence Files</h2>
        <p className="section-subtitle">
          Deep dives into why open source isn&apos;t just a philosophy &mdash; it&apos;s the only architecture that puts you in control.
        </p>
        <div className="blog-preview-grid">
          {[
            { num: "01", pillar: "Philosophy", title: "The Code That Changed Everything: A Brief History of Open Source" },
            { num: "02", pillar: "AI Models", title: "Ollama, LLaMA, Mistral, Gemma: Your 2026 Field Guide to Local AI" },
            { num: "03", pillar: "Why OSS Wins", title: "Why Open Source Always Wins \u2014 And What Closed Systems Hide" },
            { num: "04", pillar: "Privacy + OSS", title: "Open Source and Privacy Are the Same Fight" },
            { num: "05", pillar: "Business Case", title: "Build on What You Can Inspect: The Business Case for Open Source" },
          ].map((a) => (
            <a key={a.num} href="/blog" className="blog-preview-card">
              <span className="blog-preview-num">{a.num} / {a.pillar}</span>
              <span className="blog-preview-title">{a.title}</span>
              <span className="blog-preview-meta">HammerLock Research Desk</span>
            </a>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <a href="/blog" className="btn-secondary" style={{ textDecoration: 'none' }}>
            Read all articles &rarr;
          </a>
        </div>
      </section>

      {/* NEWSLETTER SIGNUP */}
      <section className="newsletter-section fade-in-section" style={{
        padding: '60px 24px', borderTop: '1px solid rgba(255,255,255,0.04)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div className="section-label">Stay Updated</div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: 8 }}>Privacy-first AI news, direct to you</h2>
          <p className="section-subtitle" style={{ marginBottom: 24 }}>
            Product updates, local AI tips, and privacy research. No spam — just signal. Unsubscribe anytime.
          </p>
          {newsletterStatus === "success" ? (
            <div style={{
              padding: '16px 24px', background: 'rgba(0,255,136,0.08)',
              border: '1px solid rgba(0,255,136,0.25)', borderRadius: 10,
              color: 'var(--accent)', fontSize: '0.95rem', fontWeight: 600,
            }}>
              You&apos;re in! Watch your inbox for updates.
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const trimmed = newsletterEmail.trim();
                if (!trimmed || !trimmed.includes("@")) return;
                setNewsletterStatus("loading");
                try {
                  await fetch("/api/newsletter", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: trimmed }),
                  });
                  setNewsletterStatus("success");
                  track("newsletter_signup", { location: "landing_page" });
                } catch {
                  setNewsletterStatus("error");
                }
              }}
              style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}
            >
              <input
                type="email"
                placeholder="you@example.com"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                required
                style={{
                  flex: '1 1 260px', maxWidth: 340, padding: '12px 16px',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.9rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={newsletterStatus === "loading"}
                style={{ padding: '12px 28px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
              >
                {newsletterStatus === "loading" ? "..." : "Subscribe"}
              </button>
            </form>
          )}
          {newsletterStatus === "error" && (
            <p style={{ color: '#ff6b6b', fontSize: '0.85rem', marginTop: 8 }}>
              Something went wrong. Please try again.
            </p>
          )}
        </div>
      </section>

      <section id="cta" className="final-cta fade-in-section">
        <div className="final-cta-card">
          <h2>{t.site_cta_final}</h2>
          <p className="section-subtitle">
            {t.site_cta_final_sub}
          </p>
          <div className="cta-buttons">
            <a href="/get-app" className="btn-primary" onClick={() => track("cta_click", { location: "footer_cta", label: "download_app" })}>{t.site_cta}</a>
            <a href="https://github.com/christopherlhammer11-ai/hammerlock" target="_blank" rel="noreferrer" className="btn-secondary" onClick={() => track("cta_click", { location: "footer_cta", label: "github" })}>{t.site_github}</a>
          </div>
          <p className="contact-line">{t.site_footer_contact} <a href="mailto:info@hammerlockai.com">info@hammerlockai.com</a></p>
        </div>
      </section>

      <footer className="site-footer" style={{ padding: '60px 24px 32px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 40, marginBottom: 40 }}>
          {/* Brand */}
          <div>
            <a href="/" className="logo-mark" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Image src="/brand/hammerlock-icon-192.png" alt="" width={22} height={22} style={{ borderRadius: 4 }} /> HammerLock AI
            </a>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px' }}>
              Your AI. Your Data. Your Rules.<br />Private, encrypted, open-source AI for professionals.
            </p>
            <div className="trust-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <span className="trust-badge">🔐 {t.site_footer_aes}</span>
              <span className="trust-badge">🖥️ {t.site_footer_local}</span>
              <span className="trust-badge">🛡️ {t.site_footer_pii}</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Product</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="#features" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem' }}>Features</a>
              <a href="#agents" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem' }}>AI Agents</a>
              <a href="#setup" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem' }}>Setup</a>
              <a href="/get-app" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem' }}>Download App</a>
              <a href="/blog/blog-index.html" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem' }}>Blog &amp; Guides</a>
            </div>
          </div>

          {/* OpenClaw */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>OpenClaw</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="https://github.com/christopherlhammer11-ai/hammerlock" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem' }}>GitHub Repository</a>
              <a href="/blog/parallel-provider-racing.html" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem' }}>Architecture Deep-Dives</a>
              <a href="/blog/ai-glossary.html" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem' }}>AI Glossary</a>
              <a href="/blog/citation-library.html" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem' }}>Citation Library</a>
              <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem' }}>Ollama (Local AI)</a>
            </div>
          </div>

          {/* Contact & Support */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Contact &amp; Support</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href="mailto:info@hammerlockai.com" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.82rem', fontWeight: 600 }}>info@hammerlockai.com</a>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Customer Service &amp; Sales</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Enterprise Inquiries</span>
              <a href="/alliance" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.82rem' }}>Partnership Opportunities</a>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4 }}>We typically respond within 24 hours.</span>
            </div>

            {/* Social Media */}
            <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
              <a href={HAMMERLOCK_X_URL} target="_blank" rel="noopener noreferrer" title="Follow HammerLock AI on X" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.86rem', transition: 'color 0.2s', fontWeight: 700 }}>𝕏 @HammerlockAI</a>
              <a href="https://instagram.com/hammerlockai" target="_blank" rel="noopener noreferrer" title="Follow on Instagram" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '1.1rem' }}>📷</a>
              <a href="https://tiktok.com/@hammerlockai" target="_blank" rel="noopener noreferrer" title="Follow on TikTok" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '1.1rem' }}>♪</a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ maxWidth: 1100, margin: '0 auto', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            &copy; {new Date().getFullYear()} HammerLock AI. All rights reserved. Built on OpenClaw (MIT License).
          </p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.75rem' }}>Terms of Service</a>
            <a href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.75rem' }}>Privacy Policy</a>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cancel anytime &middot; No long-term contracts</span>
            <a href="mailto:info@hammerlockai.com" style={{ color: 'var(--text-muted)', textDecoration: 'underline', fontSize: '0.75rem' }}>Contact us</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
