"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Cpu,
  Key,
  Search,
  Mic,
  FileText,
  Brain,
  Globe,
  Users,
  Building2,
  Scale,
  Heart,
  Landmark,
  Briefcase,
  Check,
  X,
  Minus,
  TrendingUp,
  Rocket,
  Target,
  Zap,
  ChevronDown,
  Download,
  ArrowRight,
  Mail,
  ExternalLink,
  Layers,
  Bot,
  Wrench,
  Timer,
  DollarSign,
  BarChart3,
  Calendar,
  Smartphone,
  Monitor,
  Server,
  MapPin,
} from "lucide-react";

/* ─── types ─── */
interface Slide {
  id: string;
  label: string;
}

const SLIDES: Slide[] = [
  { id: "title", label: "Title" },
  { id: "problem", label: "Problem" },
  { id: "solution", label: "Solution" },
  { id: "product", label: "Product" },
  { id: "architecture", label: "How It Works" },
  { id: "market", label: "Market" },
  { id: "competitive", label: "Competition" },
  { id: "business", label: "Business Model" },
  { id: "traction", label: "Traction" },
  { id: "gtm", label: "Go-to-Market" },
  { id: "roadmap", label: "Roadmap" },
  { id: "team", label: "Team" },
  { id: "ask", label: "The Ask" },
  { id: "why-now", label: "Why Now" },
  { id: "contact", label: "Contact" },
];

/* ─── helper components ─── */
function SlideNumber({ n }: { n: number }) {
  return (
    <span style={{
      position: "absolute", bottom: 32, left: 40,
      fontFamily: "var(--font-jetbrains)", fontSize: 13,
      color: "var(--text-muted)", letterSpacing: "0.05em",
    }}>
      {String(n).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
    </span>
  );
}

function SectionTag({ text }: { text: string }) {
  return (
    <div style={{
      display: "inline-block",
      padding: "4px 14px",
      borderRadius: "var(--radius-full)",
      border: "1px solid rgba(0,255,136,0.25)",
      background: "rgba(0,255,136,0.06)",
      fontFamily: "var(--font-jetbrains)",
      fontSize: 11,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: "var(--accent)",
      marginBottom: 20,
    }}>
      {text}
    </div>
  );
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border-color)",
      borderRadius: "var(--radius-md)",
      padding: "28px 24px",
      textAlign: "center",
      flex: "1 1 160px",
      minWidth: 140,
    }}>
      <div style={{
        fontFamily: "var(--font-brand)",
        fontSize: "clamp(28px, 4vw, 42px)",
        fontWeight: 700,
        color: "var(--accent)",
        lineHeight: 1.1,
        marginBottom: 6,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 13,
        color: "var(--text-secondary)",
        lineHeight: 1.3,
      }}>
        {label}
      </div>
    </div>
  );
}

function CompCell({ status }: { status: "yes" | "no" | "partial" | "na" }) {
  if (status === "yes") return <Check size={18} color="#00ff88" />;
  if (status === "no") return <X size={18} color="#ff5252" />;
  if (status === "partial") return <Minus size={18} color="#888" />;
  return <span style={{ color: "#555", fontSize: 12 }}>N/A</span>;
}

function FundBar({ label, pct, amount }: { label: string; pct: number; amount: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}>
        <span style={{ color: "var(--text-primary)" }}>{label}</span>
        <span style={{ fontFamily: "var(--font-jetbrains)", color: "var(--accent)", fontSize: 13 }}>{amount}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "var(--bg-card)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: 4,
          background: "linear-gradient(90deg, var(--accent), var(--accent-muted))",
          transition: "width 0.8s var(--ease-out)",
        }} />
      </div>
    </div>
  );
}

/* ─── main ─── */
export default function PitchDeck() {
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  /* observe which slide is in view */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const sections = container.querySelectorAll<HTMLElement>("[data-slide]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number(e.target.getAttribute("data-slide"));
            setActive(idx);
          }
        });
      },
      { root: container, threshold: 0.55 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  /* keyboard nav */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        goTo(Math.min(active + 1, SLIDES.length - 1));
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        goTo(Math.max(active - 1, 0));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  const goTo = useCallback((idx: number) => {
    const container = containerRef.current;
    if (!container) return;
    const target = container.querySelector(`[data-slide="${idx}"]`) as HTMLElement;
    if (target) {
      isScrolling.current = true;
      target.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => { isScrolling.current = false; }, 800);
    }
  }, []);

  /* PDF via browser print (cleanest cross-platform approach) */
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const slideStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "80px 40px 60px",
    position: "relative",
    scrollSnapAlign: "start",
  };

  const innerStyle: React.CSSProperties = {
    maxWidth: 920,
    width: "100%",
  };

  const h1: React.CSSProperties = {
    fontFamily: "var(--font-brand)",
    fontSize: "clamp(32px, 5vw, 56px)",
    fontWeight: 700,
    lineHeight: 1.1,
    marginBottom: 16,
    letterSpacing: "-0.02em",
  };

  const h2: React.CSSProperties = {
    fontFamily: "var(--font-brand)",
    fontSize: "clamp(24px, 3.5vw, 40px)",
    fontWeight: 700,
    lineHeight: 1.15,
    marginBottom: 12,
    letterSpacing: "-0.02em",
  };

  const subtitle: React.CSSProperties = {
    fontSize: "clamp(16px, 2vw, 20px)",
    color: "var(--text-secondary)",
    lineHeight: 1.6,
    maxWidth: 680,
  };

  const bulletList: React.CSSProperties = {
    listStyle: "none",
    padding: 0,
    margin: "24px 0",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  };

  const bullet: React.CSSProperties = {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    fontSize: 15,
    lineHeight: 1.55,
    color: "var(--text-primary)",
  };

  const tableWrap: React.CSSProperties = {
    overflowX: "auto",
    margin: "24px 0",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border-color)",
  };

  const th: React.CSSProperties = {
    padding: "12px 16px",
    textAlign: "left",
    fontSize: 12,
    fontFamily: "var(--font-jetbrains)",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    borderBottom: "1px solid var(--border-color)",
    background: "var(--bg-card)",
    whiteSpace: "nowrap",
  };

  const td: React.CSSProperties = {
    padding: "12px 16px",
    fontSize: 14,
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    whiteSpace: "nowrap",
  };

  return (
    <>
      {/* Top nav */}
      <nav className="pitch-nav" style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 28px",
        background: "rgba(5,5,5,0.85)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border-color)",
      }}>
        <Link href="/" style={{
          fontFamily: "var(--font-brand)",
          fontSize: 16,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--text-primary)",
        }}>
          <Lock size={18} color="var(--accent)" />
          HammerLock AI
        </Link>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{
            fontSize: 12,
            color: "var(--text-muted)",
            fontFamily: "var(--font-jetbrains)",
            display: "none",
          }}
          className="pitch-nav-label"
          >
            INVESTOR DECK
          </span>
          <button
            onClick={handlePrint}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--accent)",
              background: "transparent",
              color: "var(--accent)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <Download size={14} />
            Save PDF
          </button>
        </div>
      </nav>

      {/* Dot nav */}
      <div className="pitch-dots" style={{
        position: "fixed",
        right: 20,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 99,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            title={s.label}
            style={{
              width: active === i ? 10 : 6,
              height: active === i ? 10 : 6,
              borderRadius: "50%",
              border: "none",
              background: active === i ? "var(--accent)" : "var(--border-hover)",
              cursor: "pointer",
              transition: "all 0.25s var(--ease-out)",
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Slide container */}
      <div
        ref={containerRef}
        className="pitch-container"
        style={{
          height: "100vh",
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          scrollBehavior: "smooth",
        }}
      >

        {/* ═══ SLIDE 1: TITLE ═══ */}
        <section data-slide={0} className="pitch-slide" style={slideStyle}>
          <div style={{ ...innerStyle, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{
              width: 72,
              height: 72,
              borderRadius: "var(--radius-lg)",
              border: "2px solid var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
              background: "rgba(0,255,136,0.06)",
            }}>
              <Lock size={32} color="var(--accent)" />
            </div>
            <h1 style={{ ...h1, fontSize: "clamp(40px, 7vw, 72px)", marginBottom: 20 }}>
              HammerLock AI
            </h1>
            <p style={{ ...subtitle, fontSize: "clamp(18px, 2.5vw, 26px)", marginBottom: 32 }}>
              Your AI. Your Data. Your Rules.
            </p>
            <p style={{ fontSize: 17, color: "var(--text-secondary)", marginBottom: 48, maxWidth: 520 }}>
              Private, encrypted AI for professionals who can&apos;t afford to leak.
            </p>
            <div style={{
              display: "inline-block",
              padding: "10px 28px",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--accent)",
              fontFamily: "var(--font-brand)",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--accent)",
              letterSpacing: "0.02em",
            }}>
              Pre-Seed &mdash; $250K
            </div>
          </div>
          <div className="pitch-scroll-hint" style={{
            position: "absolute",
            bottom: 36,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            color: "var(--text-muted)",
            fontSize: 12,
            animation: "bounce 2s infinite",
          }}>
            <span>Scroll</span>
            <ChevronDown size={16} />
          </div>
          <SlideNumber n={1} />
        </section>

        {/* ═══ SLIDE 2: PROBLEM ═══ */}
        <section data-slide={1} className="pitch-slide" style={slideStyle}>
          <div style={innerStyle}>
            <SectionTag text="The Problem" />
            <h2 style={h2}>
              Every AI tool today has the same fatal flaw:{" "}
              <span style={{ color: "var(--accent)" }}>your data leaves your device.</span>
            </h2>
            <ul style={bulletList}>
              {[
                { icon: <Eye size={18} color="#ff5252" />, text: "ChatGPT, Copilot, Gemini — all store conversations on remote servers" },
                { icon: <Server size={18} color="#ff5252" />, text: "Cloud providers retain data and may use it for training" },
                { icon: <Scale size={18} color="#ff5252" />, text: "Regulated professionals (lawyers, advisors, healthcare, gov) are blocked from using AI by compliance" },
                { icon: <BarChart3 size={18} color="#ff5252" />, text: "73% of enterprises cite data privacy as the #1 barrier to AI adoption" },
                { icon: <Wrench size={18} color="#ff5252" />, text: "Existing \"private\" solutions are too technical for non-engineers or lack polish" },
              ].map((item, i) => (
                <li key={i} style={bullet}>
                  <span style={{ flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
            <div style={{
              marginTop: 32,
              padding: "20px 24px",
              borderRadius: "var(--radius-md)",
              borderLeft: "3px solid var(--accent)",
              background: "rgba(0,255,136,0.04)",
              fontSize: 16,
              lineHeight: 1.6,
              color: "var(--text-primary)",
            }}>
              <strong>The result:</strong> Millions of knowledge workers are locked out of the AI revolution — not because the tech isn&apos;t ready, but because the trust model is broken.
            </div>
          </div>
          <SlideNumber n={2} />
        </section>

        {/* ═══ SLIDE 3: SOLUTION ═══ */}
        <section data-slide={2} className="pitch-slide" style={slideStyle}>
          <div style={innerStyle}>
            <SectionTag text="The Solution" />
            <h2 style={h2}>
              A full-power AI assistant that{" "}
              <span style={{ color: "var(--accent)" }}>never touches the cloud</span> unless you say so.
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
              marginTop: 28,
            }}
            className="pitch-grid-2"
            >
              {[
                { icon: <Lock size={20} />, title: "Encrypted Vault", desc: "AES-256-GCM encryption for all conversations, files, and memory" },
                { icon: <Cpu size={20} />, title: "Local-First", desc: "Run AI entirely on your device with Ollama (LLaMA, Mistral, DeepSeek)" },
                { icon: <Key size={20} />, title: "Bring Your Own Key", desc: "Use OpenAI, Anthropic, Google, Groq, or Mistral with your own API keys" },
                { icon: <EyeOff size={20} />, title: "PII Anonymization", desc: "Automatically scrubs personal data before any cloud query" },
                { icon: <Shield size={20} />, title: "Zero Telemetry", desc: "No tracking, no analytics, no data collection in the desktop app" },
                { icon: <Globe size={20} />, title: "Open Source", desc: "MIT license — inspect everything, trust nothing blindly" },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: "20px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-card)",
                }}>
                  <div style={{ color: "var(--accent)", marginBottom: 10 }}>{item.icon}</div>
                  <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 15 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 28, fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text-primary)" }}>Think of it as:</strong> The security of a local tool + the intelligence of ChatGPT + the workflow power of a full productivity suite.
            </p>
          </div>
          <SlideNumber n={3} />
        </section>

        {/* ═══ SLIDE 4: PRODUCT ═══ */}
        <section data-slide={3} className="pitch-slide" style={slideStyle}>
          <div style={innerStyle}>
            <SectionTag text="Product" />
            <h2 style={h2}>Desktop App — macOS, Windows, Linux</h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginTop: 24,
            }}>
              {[
                { icon: <Bot size={20} />, title: "11 AI Agents", desc: "Strategist, Counsel, Analyst, Researcher, Operator, Writer + 5 more" },
                { icon: <Wrench size={20} />, title: "27 Native Skills", desc: "Calendar, Notes, iMessage, GitHub, smart home, WhatsApp, PDF tools" },
                { icon: <Zap size={20} />, title: "Provider Racing", desc: "Fires requests to all providers simultaneously — first response wins" },
                { icon: <Mic size={20} />, title: "Voice I/O", desc: "Whisper transcription + text-to-speech" },
                { icon: <Search size={20} />, title: "Web Search", desc: "Brave Search with cited sources" },
                { icon: <Brain size={20} />, title: "Persistent Memory", desc: "Encrypted persona loaded into every conversation" },
                { icon: <Layers size={20} />, title: "Custom Agents", desc: "Build domain-specific agents in 30 seconds" },
                { icon: <Globe size={20} />, title: "11 Languages", desc: "EN, ES, PT, DE, FR, ZH, JA, KO, AR, HI, RU" },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: "16px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-card)",
                }}>
                  <div style={{ color: "var(--accent)", marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>{item.desc}</div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 20, fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
              Mobile app in beta (TestFlight / Internal App Sharing)
            </p>
          </div>
          <SlideNumber n={4} />
        </section>

        {/* ═══ SLIDE 5: ARCHITECTURE ═══ */}
        <section data-slide={4} className="pitch-slide" style={slideStyle}>
          <div style={innerStyle}>
            <SectionTag text="Architecture" />
            <h2 style={h2}>How It Works</h2>
            <div style={{
              marginTop: 28,
              padding: "32px",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-color)",
              background: "var(--bg-card)",
              fontFamily: "var(--font-jetbrains)",
              fontSize: "clamp(11px, 1.4vw, 14px)",
              lineHeight: 1.8,
              overflowX: "auto",
            }}>
              {/* Device boundary */}
              <div style={{
                border: "1px solid var(--accent)",
                borderRadius: "var(--radius-md)",
                padding: "24px",
                position: "relative",
              }}>
                <div style={{
                  position: "absolute",
                  top: -10,
                  left: 20,
                  background: "var(--bg-card)",
                  padding: "0 10px",
                  fontSize: 11,
                  color: "var(--accent)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}>
                  Your Device
                </div>
                {/* Top row */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  marginBottom: 20,
                  marginTop: 8,
                }}>
                  {[
                    { label: "Electron Shell", sub: "Desktop wrapper" },
                    { label: "Next.js 15", sub: "App server" },
                    { label: "Encrypted Vault", sub: "AES-256-GCM" },
                  ].map((b, i) => (
                    <div key={i} style={{
                      padding: "14px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-color)",
                      textAlign: "center",
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{b.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{b.sub}</div>
                    </div>
                  ))}
                </div>
                {/* Center */}
                <div style={{
                  textAlign: "center",
                  margin: "0 auto 20px",
                  padding: "12px 24px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--accent-muted)",
                  background: "rgba(0,255,136,0.04)",
                  display: "inline-block",
                  width: "auto",
                }}>
                  <div style={{ fontWeight: 600, color: "var(--accent)", fontSize: 14 }}>OpenClaw Agent Engine</div>
                </div>
                {/* Bottom row */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                }}>
                  {[
                    { label: "Ollama", sub: "Local models" },
                    { label: "PII Scrubber", sub: "Anonymization" },
                    { label: "27 Skills", sub: "Native integrations" },
                  ].map((b, i) => (
                    <div key={i} style={{
                      padding: "14px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-color)",
                      textAlign: "center",
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{b.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{b.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Arrow down */}
              <div style={{ textAlign: "center", margin: "16px 0", color: "var(--text-muted)", fontSize: 12 }}>
                ▼ only if user opts in (PII-scrubbed)
              </div>
              {/* Cloud */}
              <div style={{
                padding: "14px",
                borderRadius: "var(--radius-sm)",
                border: "1px dashed var(--border-hover)",
                textAlign: "center",
                maxWidth: 280,
                margin: "0 auto",
              }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Cloud LLMs</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>BYOK / Pro — PII-scrubbed</div>
              </div>
            </div>
            <p style={{ marginTop: 20, fontSize: 14, color: "var(--text-secondary)" }}>
              Your data stays encrypted on your device. Cloud calls are optional, PII-scrubbed, and use your own keys.
            </p>
          </div>
          <SlideNumber n={5} />
        </section>

        {/* ═══ SLIDE 6: MARKET ═══ */}
        <section data-slide={5} className="pitch-slide" style={slideStyle}>
          <div style={innerStyle}>
            <SectionTag text="Market Opportunity" />
            <h2 style={h2}>
              <span style={{ color: "var(--accent)" }}>$2.2B</span> addressable market in regulated knowledge work
            </h2>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "28px 0" }} className="pitch-metrics-row">
              <MetricCard value="$2.2B" label="TAM — 6.1M regulated workers globally" />
              <MetricCard value="$504M" label="SAM — 1.4M in U.S. & EU" />
              <MetricCard value="$21.6M" label="SOM — 60K across 12K firms (3yr)" />
            </div>
            <h3 style={{ fontFamily: "var(--font-brand)", fontSize: 18, fontWeight: 600, marginBottom: 16, marginTop: 32 }}>
              Target Verticals
            </h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
            className="pitch-grid-2"
            >
              {[
                { icon: <Scale size={18} />, name: "Legal", why: "Attorney-client privilege demands local processing" },
                { icon: <DollarSign size={18} />, name: "Financial Services", why: "Client portfolios can't live on someone else's server" },
                { icon: <Heart size={18} />, name: "Healthcare", why: "HIPAA compliance blocks most cloud AI" },
                { icon: <Landmark size={18} />, name: "Government & Defense", why: "DoD Zero Trust, ITAR/EAR compliance" },
                { icon: <Briefcase size={18} />, name: "Consulting", why: "Proprietary frameworks and client strategies" },
                { icon: <Building2 size={18} />, name: "Enterprise", why: "Any regulated industry blocked from SaaS AI" },
              ].map((v, i) => (
                <div key={i} style={{
                  display: "flex",
                  gap: 12,
                  padding: "14px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-card)",
                  alignItems: "flex-start",
                }}>
                  <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 2 }}>{v.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{v.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>{v.why}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <SlideNumber n={6} />
        </section>

        {/* ═══ SLIDE 7: COMPETITIVE ═══ */}
        <section data-slide={6} className="pitch-slide" style={slideStyle}>
          <div style={innerStyle}>
            <SectionTag text="Competition" />
            <h2 style={h2}>Powerful-but-leaky vs. private-but-painful</h2>
            <p style={{ ...subtitle, marginBottom: 24 }}>
              We&apos;re the only product that bridges both worlds.
            </p>
            <div style={tableWrap} className="pitch-table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={th}>Capability</th>
                    <th style={{ ...th, color: "var(--accent)" }}>HammerLock</th>
                    <th style={th}>ChatGPT</th>
                    <th style={th}>Copilot</th>
                    <th style={th}>Jan.ai</th>
                    <th style={th}>LM Studio</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    ["Data on device", "yes", "no", "no", "yes", "yes"],
                    ["AES-256 encryption", "yes", "no", "no", "no", "no"],
                    ["No training on data", "yes", "no", "no", "yes", "yes"],
                    ["Works offline", "yes", "no", "no", "yes", "yes"],
                    ["Cloud models (BYOK)", "yes", "na", "na", "yes", "no"],
                    ["Polished UI + agents", "yes", "yes", "yes", "partial", "no"],
                    ["27 native skills", "yes", "no", "partial", "no", "no"],
                    ["PII anonymization", "yes", "no", "no", "no", "no"],
                    ["Open source", "yes", "no", "no", "yes", "no"],
                    ["Enterprise-ready", "yes", "yes", "yes", "no", "no"],
                  ] as [string, ...("yes" | "no" | "partial" | "na")[]
                  ][]).map((row, i) => (
                    <tr key={i}>
                      <td style={{ ...td, fontWeight: 500 }}>{row[0]}</td>
                      {row.slice(1).map((v, j) => (
                        <td key={j} style={{ ...td, textAlign: "center" }}>
                          <CompCell status={v as "yes" | "no" | "partial" | "na"} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{
              padding: "16px 20px",
              borderRadius: "var(--radius-md)",
              borderLeft: "3px solid var(--accent)",
              background: "rgba(0,255,136,0.04)",
              fontSize: 14,
              color: "var(--text-primary)",
              lineHeight: 1.5,
              marginTop: 8,
            }}>
              <strong>Our moat:</strong> No one else combines cloud-grade power with local-first privacy, deep OS integrations, and enterprise compliance — in a product non-technical users actually want to use.
            </div>
          </div>
          <SlideNumber n={7} />
        </section>

        {/* ═══ SLIDE 8: BUSINESS MODEL ═══ */}
        <section data-slide={7} className="pitch-slide" style={slideStyle}>
          <div style={innerStyle}>
            <SectionTag text="Business Model" />
            <h2 style={h2}>Freemium with strong upgrade incentives</h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginTop: 24,
            }}>
              {[
                { tier: "Free", price: "$0", sub: "forever", target: "Try-before-you-buy", highlight: false },
                { tier: "Core", price: "$15", sub: "one-time", target: "BYOK power users", highlight: false },
                { tier: "Pro", price: "$29", sub: "/month", target: "Professionals", highlight: true },
                { tier: "Teams", price: "$49", sub: "/user/mo", target: "Regulated teams", highlight: false },
                { tier: "Enterprise", price: "Custom", sub: "", target: "Policy + compliance", highlight: false },
              ].map((t, i) => (
                <div key={i} style={{
                  padding: "22px 18px",
                  borderRadius: "var(--radius-md)",
                  border: t.highlight ? "1px solid var(--accent)" : "1px solid var(--border-color)",
                  background: t.highlight ? "rgba(0,255,136,0.04)" : "var(--bg-card)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-jetbrains)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                    {t.tier}
                  </div>
                  <div style={{
                    fontFamily: "var(--font-brand)",
                    fontSize: 28,
                    fontWeight: 700,
                    color: t.highlight ? "var(--accent)" : "var(--text-primary)",
                    lineHeight: 1,
                  }}>
                    {t.price}
                  </div>
                  {t.sub && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{t.sub}</div>}
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.3 }}>{t.target}</div>
                </div>
              ))}
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              marginTop: 28,
            }}
            className="pitch-grid-2"
            >
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Revenue Drivers</h4>
                <ul style={{ ...bulletList, gap: 8 }}>
                  {[
                    "Monthly/annual subscriptions (Pro, Teams)",
                    "Enterprise contracts ($50K-$500K+ ACV)",
                    "Cloud credit add-on packs",
                    "Affiliate program (30% lifetime rev-share)",
                  ].map((t, i) => (
                    <li key={i} style={{ ...bullet, fontSize: 13 }}>
                      <ArrowRight size={14} color="var(--accent)" style={{ flexShrink: 0, marginTop: 3 }} />
                      <span style={{ color: "var(--text-secondary)" }}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Unit Economics</h4>
                <ul style={{ ...bulletList, gap: 8 }}>
                  {[
                    "Near-zero marginal cost for Core/BYOK users",
                    "Pro cloud credits: ~60% gross margin",
                    "Enterprise: high-margin, long-retention",
                  ].map((t, i) => (
                    <li key={i} style={{ ...bullet, fontSize: 13 }}>
                      <ArrowRight size={14} color="var(--accent)" style={{ flexShrink: 0, marginTop: 3 }} />
                      <span style={{ color: "var(--text-secondary)" }}>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <SlideNumber n={8} />
        </section>

        {/* ═══ SLIDE 9: TRACTION ═══ */}
        <section data-slide={8} className="pitch-slide" style={slideStyle}>
          <div style={innerStyle}>
            <SectionTag text="Traction" />
            <h2 style={h2}>Early but strong signal — PMF is emerging</h2>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 24 }} className="pitch-metrics-row">
              <MetricCard value="3,000+" label="Waitlist signups" />
              <MetricCard value="~$62K" label="ARR from 250 paid seats" />
              <MetricCard value="8" label="Enterprise pilots (SOC2/ISO)" />
              <MetricCard value="0" label="Security incidents" />
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              marginTop: 24,
            }}
            className="pitch-grid-2"
            >
              <div style={{
                padding: "20px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                background: "var(--bg-card)",
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Engagement</h4>
                {[
                  { label: "Web search usage", pct: 65 },
                  { label: "Voice / PDF usage", pct: 40 },
                  { label: "BYOK LLM routing", pct: 20 },
                ].map((m, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: "var(--text-secondary)" }}>{m.label}</span>
                      <span style={{ fontFamily: "var(--font-jetbrains)", color: "var(--accent)", fontSize: 12 }}>{m.pct}%</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.05)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${m.pct}%`, borderRadius: 3, background: "var(--accent)" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{
                padding: "20px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                background: "var(--bg-card)",
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Platform Availability</h4>
                {[
                  { platform: "macOS", status: "GA", icon: <Monitor size={14} /> },
                  { platform: "Windows", status: "GA", icon: <Monitor size={14} /> },
                  { platform: "Linux", status: "GA", icon: <Monitor size={14} /> },
                  { platform: "iOS", status: "Beta", icon: <Smartphone size={14} /> },
                  { platform: "Android", status: "Beta", icon: <Smartphone size={14} /> },
                ].map((p, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    fontSize: 13,
                  }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", color: "var(--text-secondary)" }}>
                      {p.icon}
                      {p.platform}
                    </div>
                    <span style={{
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      background: p.status === "GA" ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.06)",
                      color: p.status === "GA" ? "var(--accent)" : "var(--text-muted)",
                      fontFamily: "var(--font-jetbrains)",
                    }}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <SlideNumber n={9} />
        </section>

        {/* ═══ SLIDE 10: GO-TO-MARKET ═══ */}
        <section data-slide={9} className="pitch-slide" style={slideStyle}>
          <div style={innerStyle}>
            <SectionTag text="Go-to-Market" />
            <h2 style={h2}>Bottom-up adoption in regulated verticals</h2>
            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              {[
                {
                  phase: "Phase 1",
                  title: "Community & Creator-Led",
                  when: "Now",
                  items: [
                    "Open source launch — HN, Reddit, Product Hunt",
                    "Creator affiliate program (30% lifetime rev-share)",
                    "Privacy/security influencer partnerships",
                    "Organic SEO: \"private AI assistant,\" \"encrypted ChatGPT alternative\"",
                  ],
                },
                {
                  phase: "Phase 2",
                  title: "Professional Adoption",
                  when: "Q2-Q3 2026",
                  items: [
                    "Targeted outreach to law firms, RIAs, compliance teams",
                    "Free-to-Pro conversion through cloud AI and workflow features",
                    "Case studies from enterprise pilot customers",
                    "Conference presence (RSA, LegalTech, FinovateSpring)",
                  ],
                },
                {
                  phase: "Phase 3",
                  title: "Enterprise Expansion",
                  when: "Q4 2026+",
                  items: [
                    "Enterprise control plane: policy management, audit feeds, SSO",
                    "Compliance certifications: SOC2 Type II, HIPAA BAA, FedRAMP",
                    "Channel partnerships with MSPs and legal tech platforms",
                    "Land-and-expand within existing pilot organizations",
                  ],
                },
              ].map((p, i) => (
                <div key={i} style={{
                  padding: "20px 24px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-card)",
                  borderLeft: i === 0 ? "3px solid var(--accent)" : "1px solid var(--border-color)",
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                    <span style={{
                      fontSize: 11,
                      fontFamily: "var(--font-jetbrains)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      background: "rgba(0,255,136,0.1)",
                      color: "var(--accent)",
                    }}>
                      {p.phase}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{p.title}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>{p.when}</span>
                  </div>
                  <ul style={{ ...bulletList, gap: 6, margin: 0 }}>
                    {p.items.map((item, j) => (
                      <li key={j} style={{ ...bullet, fontSize: 13 }}>
                        <ArrowRight size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 3 }} />
                        <span style={{ color: "var(--text-secondary)" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p style={{
              marginTop: 20,
              fontSize: 14,
              color: "var(--text-secondary)",
              padding: "14px 18px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(0,255,136,0.04)",
              borderLeft: "3px solid var(--accent)",
            }}>
              <strong style={{ color: "var(--text-primary)" }}>Flywheel:</strong> Open source builds trust → individuals adopt → they bring it to work → teams upgrade → enterprise contracts close.
            </p>
          </div>
          <SlideNumber n={10} />
        </section>

        {/* ═══ SLIDE 11: ROADMAP ═══ */}
        <section data-slide={10} className="pitch-slide" style={slideStyle}>
          <div style={innerStyle}>
            <SectionTag text="Roadmap" />
            <h2 style={h2}>Building toward enterprise-grade private AI</h2>
            <div style={{ marginTop: 28, position: "relative" }}>
              {/* Timeline line */}
              <div style={{
                position: "absolute",
                left: 16,
                top: 8,
                bottom: 8,
                width: 2,
                background: "linear-gradient(180deg, var(--accent), var(--border-color))",
              }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingLeft: 44 }}>
                {[
                  { when: "Q2 2026", what: "Mobile GA + encrypted sync", goal: "1,000 mobile activations, <2% crash rate" },
                  { when: "Q3 2026", what: "Enterprise control plane, 3 design partners", goal: "$500K ARR contracted" },
                  { when: "Q4 2026", what: "SOC2/SIG compliance, zero-knowledge backup", goal: "1,500 Premium seats, NRR >115%" },
                  { when: "H1 2027", what: "FedRAMP pathway, agent marketplace", goal: "$5M ARR target" },
                  { when: "H2 2027", what: "Platform API, vertical packages", goal: "Series A readiness" },
                ].map((m, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    {/* Dot */}
                    <div style={{
                      position: "absolute",
                      left: -38,
                      top: 6,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: i === 0 ? "var(--accent)" : "var(--bg-card)",
                      border: `2px solid ${i === 0 ? "var(--accent)" : "var(--border-hover)"}`,
                    }} />
                    <div style={{
                      padding: "16px 20px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-color)",
                      background: "var(--bg-card)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{
                          fontFamily: "var(--font-jetbrains)",
                          fontSize: 12,
                          color: "var(--accent)",
                        }}>
                          {m.when}
                        </span>
                        <span style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-jetbrains)",
                        }}>
                          {m.goal}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{m.what}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <SlideNumber n={11} />
        </section>

        {/* ═══ SLIDE 12: TEAM ═══ */}
        <section data-slide={11} className="pitch-slide" style={slideStyle}>
          <div style={innerStyle}>
            <SectionTag text="Team" />
            <h2 style={h2}>Built by operators, not just engineers</h2>
            {/* Founder */}
            <div style={{
              padding: "28px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--accent)",
              background: "rgba(0,255,136,0.03)",
              marginTop: 24,
              marginBottom: 20,
            }}>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
                Christopher Hammer
              </div>
              <div style={{ fontSize: 13, color: "var(--accent)", fontFamily: "var(--font-jetbrains)", marginBottom: 14 }}>
                Founder & CEO
              </div>
              <ul style={{ ...bulletList, gap: 8, margin: 0 }}>
                {[
                  "25+ years building in regulated industries (USDA Organic, ISO 9001, cGMP)",
                  "Author of OpenClaw — open-source agentic AI framework",
                  "Deep domain expertise in compliance, quality systems, and regulated operations",
                  "Building lean: AI agents as embedded operators for development, QA, and GTM",
                ].map((t, i) => (
                  <li key={i} style={{ ...bullet, fontSize: 14 }}>
                    <ArrowRight size={14} color="var(--accent)" style={{ flexShrink: 0, marginTop: 3 }} />
                    <span style={{ color: "var(--text-secondary)" }}>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Team */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
            className="pitch-grid-2"
            >
              {[
                { title: "Lead Desktop Engineer", desc: "Electron + Next.js performance specialist" },
                { title: "Security & Infrastructure Lead", desc: "Cryptography, Argon2, policy enforcement, third-party audit coordination" },
                { title: "AI Agent Operations", desc: "DevOps automation, QA pipelines, GTM content, demo engineering" },
              ].map((m, i) => (
                <div key={i} style={{
                  padding: "18px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-card)",
                }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.45 }}>{m.desc}</div>
                </div>
              ))}
            </div>
            <p style={{
              marginTop: 20,
              fontSize: 14,
              color: "var(--text-secondary)",
              textAlign: "center",
              fontStyle: "italic",
            }}>
              Small, high-leverage team augmented by AI. Every dollar goes further.
            </p>
          </div>
          <SlideNumber n={12} />
        </section>

        {/* ═══ SLIDE 13: THE ASK ═══ */}
        <section data-slide={12} className="pitch-slide" style={slideStyle}>
          <div style={innerStyle}>
            <SectionTag text="The Ask" />
            <h2 style={h2}>
              <span style={{ color: "var(--accent)" }}>$250K</span> Pre-Seed — 12 Month Runway
            </h2>
            <div style={{
              marginTop: 28,
              padding: "24px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              background: "var(--bg-card)",
            }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 20 }}>Use of Funds</h4>
              <FundBar label="Engineering" pct={40} amount="$100K (40%)" />
              <FundBar label="Go-to-Market" pct={30} amount="$75K (30%)" />
              <FundBar label="Security & Compliance" pct={20} amount="$50K (20%)" />
              <FundBar label="Buffer" pct={10} amount="$25K (10%)" />
            </div>
            <div style={{ marginTop: 24 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Milestones This Round Funds</h4>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
              }}>
                {[
                  { value: "$500K", label: "ARR from Pro, Teams, Enterprise" },
                  { value: "1,000", label: "Paid seats across all tiers" },
                  { value: "Mobile", label: "GA on iOS + Android with encrypted sync" },
                  { value: "Seed", label: "Readiness with metrics to raise $3-5M" },
                ].map((m, i) => (
                  <div key={i} style={{
                    textAlign: "center",
                    padding: "18px 14px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-color)",
                    background: "var(--bg-card)",
                  }}>
                    <div style={{
                      fontFamily: "var(--font-brand)",
                      fontSize: 26,
                      fontWeight: 700,
                      color: "var(--accent)",
                      lineHeight: 1.1,
                      marginBottom: 4,
                    }}>
                      {m.value}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <SlideNumber n={13} />
        </section>

        {/* ═══ SLIDE 14: WHY NOW ═══ */}
        <section data-slide={13} className="pitch-slide" style={slideStyle}>
          <div style={innerStyle}>
            <SectionTag text="Why Now" />
            <h2 style={h2}>Four forces are converging</h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
              marginTop: 28,
            }}
            className="pitch-grid-2"
            >
              {[
                {
                  num: "01",
                  title: "AI adoption is exploding",
                  desc: "But trust isn't keeping up. Enterprises want AI but can't accept the data risk.",
                  icon: <TrendingUp size={22} />,
                },
                {
                  num: "02",
                  title: "Local models are finally good enough",
                  desc: "LLaMA 3, Mistral, DeepSeek run on consumer hardware at near-GPT-4 quality.",
                  icon: <Cpu size={22} />,
                },
                {
                  num: "03",
                  title: "Regulation is tightening",
                  desc: "EU AI Act, state privacy laws, SEC cyber rules — compliance pressure is accelerating.",
                  icon: <Scale size={22} />,
                },
                {
                  num: "04",
                  title: "No one owns this market yet",
                  desc: "Cloud AI can't pivot to privacy. Local tools lack polish. The window is open.",
                  icon: <Target size={22} />,
                },
              ].map((f, i) => (
                <div key={i} style={{
                  padding: "24px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-card)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <span style={{
                      fontFamily: "var(--font-jetbrains)",
                      fontSize: 24,
                      fontWeight: 700,
                      color: "var(--accent)",
                      lineHeight: 1,
                    }}>
                      {f.num}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>{f.icon}</span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{f.title}</div>
                  <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>{f.desc}</div>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 28,
              padding: "20px 24px",
              borderRadius: "var(--radius-md)",
              borderLeft: "3px solid var(--accent)",
              background: "rgba(0,255,136,0.04)",
              fontSize: 15,
              lineHeight: 1.6,
            }}>
              HammerLock is the only product that combines cloud-grade AI intelligence with local-first privacy, enterprise compliance, and a UX that professionals actually adopt.
            </div>
          </div>
          <SlideNumber n={14} />
        </section>

        {/* ═══ SLIDE 15: CONTACT ═══ */}
        <section data-slide={14} className="pitch-slide" style={slideStyle}>
          <div style={{ ...innerStyle, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: "var(--radius-lg)",
              border: "2px solid var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 28,
              background: "rgba(0,255,136,0.06)",
            }}>
              <Lock size={28} color="var(--accent)" />
            </div>
            <h2 style={{ ...h2, marginBottom: 8 }}>Let&apos;s Talk</h2>
            <p style={{ ...subtitle, marginBottom: 36, textAlign: "center" }}>
              Your AI. Your Data. Your Rules.
            </p>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginBottom: 40,
              alignItems: "center",
            }}>
              <div style={{ fontFamily: "var(--font-brand)", fontSize: 22, fontWeight: 600 }}>
                Christopher Hammer
              </div>
              <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                Founder & CEO, HammerLock AI
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
              <a
                href="https://hammerlockai.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 24px",
                  borderRadius: "var(--radius-full)",
                  background: "var(--accent)",
                  color: "#000",
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                <ExternalLink size={16} />
                hammerlockai.com
              </a>
              <a
                href="mailto:info@hammerlockai.com"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 24px",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  fontWeight: 500,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                <Mail size={16} />
                info@hammerlockai.com
              </a>
            </div>
            <p style={{
              marginTop: 48,
              fontSize: 11,
              color: "var(--text-muted)",
              fontStyle: "italic",
            }}>
              This deck contains forward-looking statements. Metrics reflect data as of February 2026.
            </p>
          </div>
          <SlideNumber n={15} />
        </section>

      </div>
    </>
  );
}
