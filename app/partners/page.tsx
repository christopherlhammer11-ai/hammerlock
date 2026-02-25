"use client";
// HammerLock Alliance Portal v2
import { useState, useEffect, useRef } from "react";

// ===================================================================
// HAMMERLOCK AI -- PARTNER PORTAL
// Public affiliate signup + Private campaign management
// Integrated into the VaultAI Next.js site
// ===================================================================

const COLORS = {
  bg: "#0A0E17",
  bgCard: "#111827",
  bgCardHover: "#1a2235",
  accent: "#00E5A0",
  accentDim: "#00B87D",
  accentGlow: "rgba(0,229,160,0.15)",
  red: "#FF4D6A",
  yellow: "#FBBF24",
  blue: "#3B82F6",
  text: "#E5E7EB",
  textDim: "#9CA3AF",
  textMuted: "#6B7280",
  border: "#1F2937",
  borderLight: "#374151",
};

// -- FONTS: Use the site's --font-brand (Space Grotesk) and --font-inter (Inter, close to DM Sans)
const FONT_BODY = "var(--font-inter), 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
const FONT_BRAND = "var(--font-brand), 'Space Grotesk', monospace";

// -- ICONS (self-contained inline SVGs) ------------------------------------
interface IconProps {
  type: string;
  size?: number;
}

const Icon = ({ type, size = 20 }: IconProps) => {
  const s: React.CSSProperties = { width: size, height: size, display: "inline-block", verticalAlign: "middle" };
  const svgProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const icons: Record<string, React.ReactNode> = {
    shield: <svg {...svgProps}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    lock: <svg {...svgProps}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    dollar: <svg {...svgProps}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
    link: <svg {...svgProps}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
    chart: <svg {...svgProps}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    users: <svg {...svgProps}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
    check: <svg {...svgProps}><polyline points="20 6 9 17 4 12"/></svg>,
    arrow: <svg {...svgProps}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
    zap: <svg {...svgProps}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    eye: <svg {...svgProps}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    send: <svg {...svgProps}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    inbox: <svg {...svgProps}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>,
    menu: <svg {...svgProps}><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    x: <svg {...svgProps}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    home: <svg {...svgProps}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    target: <svg {...svgProps}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
    clock: <svg {...svgProps}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    trending: <svg {...svgProps}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  };
  return <span style={s}>{icons[type]}</span>;
};

// -- ANIMATED COUNTER ---------------------------------------------------
interface AnimCounterProps {
  end: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}

const AnimCounter = ({ end, prefix = "", suffix = "", duration = 2000 }: AnimCounterProps) => {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setVal(Math.floor(ease * end));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration]);
  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString()}
      {suffix}
    </span>
  );
};

// -- GLASS CARD ---------------------------------------------------------
interface GlassProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  hover?: boolean;
  onClick?: () => void;
}

const Glass = ({ children, style = {}, hover = false, onClick }: GlassProps) => (
  <div
    onClick={onClick}
    style={{
      background: "rgba(17,24,39,0.7)",
      backdropFilter: "blur(20px)",
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16,
      padding: 28,
      transition: "all 0.3s cubic-bezier(.4,0,.2,1)",
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}
    onMouseEnter={(e) => {
      if (hover) {
        e.currentTarget.style.borderColor = COLORS.accent;
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 8px 32px ${COLORS.accentGlow}`;
      }
    }}
    onMouseLeave={(e) => {
      if (hover) {
        e.currentTarget.style.borderColor = COLORS.border;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }
    }}
  >
    {children}
  </div>
);

// -- BUTTON -------------------------------------------------------------
interface BtnProps {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "ghost" | "danger";
  onClick?: () => void;
  style?: React.CSSProperties;
  size?: "sm" | "md" | "lg";
}

const Btn = ({ children, variant = "primary", onClick, style = {}, size = "md" }: BtnProps) => {
  const base: React.CSSProperties = {
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 600,
    fontFamily: FONT_BODY,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    transition: "all 0.25s cubic-bezier(.4,0,.2,1)",
    padding: size === "lg" ? "16px 32px" : size === "sm" ? "8px 16px" : "12px 24px",
    fontSize: size === "lg" ? 17 : size === "sm" ? 13 : 15,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: COLORS.accent, color: "#0A0E17" },
    outline: { background: "transparent", color: COLORS.accent, border: `1px solid ${COLORS.accent}` },
    ghost: { background: "rgba(255,255,255,0.05)", color: COLORS.text },
    danger: { background: "rgba(255,77,106,0.1)", color: COLORS.red, border: `1px solid rgba(255,77,106,0.3)` },
  };
  return (
    <button
      style={{ ...base, ...variants[variant], ...style }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (variant === "primary") e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {children}
    </button>
  );
};

// -- STAT CARD ----------------------------------------------------------
interface StatCardProps {
  icon: string;
  label: string;
  value: React.ReactNode;
  change?: number;
  color?: string;
}

const StatCard = ({ icon, label, value, change, color = COLORS.accent }: StatCardProps) => (
  <Glass style={{ padding: 20, flex: 1, minWidth: 200 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: `${color}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
        }}
      >
        <Icon type={icon} size={20} />
      </div>
      {change && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: change > 0 ? COLORS.accent : COLORS.red,
            background: change > 0 ? `${COLORS.accent}15` : `${COLORS.red}15`,
            padding: "3px 8px",
            borderRadius: 6,
          }}
        >
          {change > 0 ? "\u2191" : "\u2193"} {Math.abs(change)}%
        </span>
      )}
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color: COLORS.text, fontFamily: FONT_BRAND, letterSpacing: -1 }}>
      {value}
    </div>
    <div style={{ fontSize: 13, color: COLORS.textDim, marginTop: 4 }}>{label}</div>
  </Glass>
);

// -- MINI BAR CHART -----------------------------------------------------
interface MiniBarProps {
  data: Array<{ l: string; v: number }>;
  maxH?: number;
}

const MiniBar = ({ data, maxH = 60 }: MiniBarProps) => {
  const max = Math.max(...data.map((d) => d.v));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: maxH }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
          <div
            style={{
              width: "100%",
              minWidth: 20,
              borderRadius: "4px 4px 0 0",
              height: Math.max(4, (d.v / max) * maxH),
              background: `linear-gradient(180deg, ${COLORS.accent}, ${COLORS.accentDim})`,
              opacity: 0.5 + (d.v / max) * 0.5,
              transition: "height 0.5s ease",
            }}
          />
          <span style={{ fontSize: 10, color: COLORS.textMuted, marginTop: 4 }}>{d.l}</span>
        </div>
      ))}
    </div>
  );
};

// -- PROGRESS RING ------------------------------------------------------
interface RingProps {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
}

const Ring = ({ pct, size = 80, stroke = 6, color = COLORS.accent }: RingProps) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={COLORS.border} strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct / 100)}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease" }}
      />
    </svg>
  );
};

// ===================================================================
// PUBLIC LANDING PAGE
// ===================================================================
const PublicPage = ({ onLogin }: { onLogin: () => void }) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const tiers = [
    { name: "Nano", range: "1K\u201310K", rate: "30\u201340%", type: "Rev-share", color: COLORS.blue },
    { name: "Mid", range: "50K\u2013200K", rate: "25% + $500\u20131K", type: "Hybrid", color: COLORS.accent },
    { name: "Macro", range: "200K\u20131M", rate: "20% + $1K\u20133K", type: "Hybrid", color: COLORS.yellow },
    { name: "Mega", range: "1M+", rate: "Custom Deal", type: "Partnership", color: COLORS.red },
  ];

  const steps = [
    { icon: "link", title: "Apply", desc: "Fill out the form. We review within 24 hours." },
    { icon: "zap", title: "Get Your Link", desc: "Custom affiliate URL + dashboard access via Rewardful." },
    { icon: "send", title: "Create & Share", desc: "Review, post, or mention HammerLock AI your way." },
    { icon: "dollar", title: "Get Paid", desc: "Automatic tracking. Monthly payouts. No chasing invoices." },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: FONT_BODY,
        overflowX: "hidden",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 40px",
          borderBottom: `1px solid ${COLORS.border}`,
          position: "sticky",
          top: 0,
          background: "rgba(10,14,23,0.9)",
          backdropFilter: "blur(20px)",
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${COLORS.accent}, #00B87D)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon type="shield" size={20} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>
            HammerLock <span style={{ color: COLORS.accent }}>Alliance</span>
          </span>
        </div>
        <Btn variant="ghost" size="sm" onClick={onLogin}>
          Partner Login &rarr;
        </Btn>
      </nav>

      {/* Hero */}
      <section style={{ padding: "100px 40px 80px", textAlign: "center", position: "relative", maxWidth: 900, margin: "0 auto" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${COLORS.accentGlow} 0%, transparent 70%)`,
            filter: "blur(80px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-block",
              padding: "6px 16px",
              borderRadius: 20,
              background: `${COLORS.accent}15`,
              border: `1px solid ${COLORS.accent}30`,
              fontSize: 13,
              fontWeight: 600,
              color: COLORS.accent,
              marginBottom: 24,
            }}
          >
            <Icon type="lock" size={14} /> &nbsp;Privacy-First AI &middot; Alliance Program
          </div>
          <h1
            style={{
              fontSize: "clamp(36px, 5vw, 60px)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -2,
              margin: "0 0 24px",
              fontFamily: FONT_BRAND,
            }}
          >
            Earn recurring revenue
            <br />
            promoting <span style={{ color: COLORS.accent }}>AI that respects privacy</span>
          </h1>
          <p style={{ fontSize: 19, color: COLORS.textDim, maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.6 }}>
            HammerLock AI is the encrypted, local-first AI assistant. Your audience cares about privacy — now you can get
            paid helping them protect it.
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn size="lg" onClick={() => document.getElementById("apply")?.scrollIntoView({ behavior: "smooth" })}>
              Apply Now <Icon type="arrow" size={18} />
            </Btn>
            <Btn
              variant="outline"
              size="lg"
              onClick={() => document.getElementById("tiers")?.scrollIntoView({ behavior: "smooth" })}
            >
              See Commission Tiers
            </Btn>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 48,
          padding: "40px 20px",
          borderTop: `1px solid ${COLORS.border}`,
          borderBottom: `1px solid ${COLORS.border}`,
          flexWrap: "wrap",
        }}
      >
        {[
          { val: <AnimCounter end={30} suffix="%" />, label: "Commission Rate" },
          { val: <AnimCounter end={90} suffix=" day" />, label: "Cookie Duration" },
          { val: <AnimCounter prefix="$" end={0} />, label: "Setup Cost" },
          { val: "Lifetime", label: "Rev-Share Option" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.accent, fontFamily: FONT_BRAND }}>{s.val}</div>
            <div style={{ fontSize: 13, color: COLORS.textDim, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </section>

      {/* Why Promote */}
      <section style={{ padding: "80px 40px", maxWidth: 1000, margin: "0 auto" }}>
        <h2 style={{ fontSize: 36, fontWeight: 700, textAlign: "center", marginBottom: 12, fontFamily: FONT_BRAND }}>
          Why promote HammerLock AI?
        </h2>
        <p style={{ textAlign: "center", color: COLORS.textDim, marginBottom: 48, fontSize: 16 }}>
          Your audience is already worried about AI privacy. Give them the solution.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {[
            {
              icon: "lock",
              title: "AES-256-GCM Encryption",
              desc: "Military-grade encryption. Conversations never leave the device. Zero cloud. Zero compromise.",
            },
            {
              icon: "dollar",
              title: "Recurring Revenue",
              desc: "Earn on every subscription renewal \u2014 not just the first sale. Your link pays you as long as they stay.",
            },
            {
              icon: "users",
              title: "Built for Professionals",
              desc: "Lawyers, founders, consultants \u2014 people who pay for tools and stick around. High LTV = high commissions.",
            },
            {
              icon: "trending",
              title: "Growing Market",
              desc: "AI privacy is the #1 concern in 2026. You\u2019re not selling \u2014 you\u2019re solving a problem everyone has.",
            },
            {
              icon: "zap",
              title: "Fast Conversion",
              desc: "Free trial \u2192 paid in under 7 days average. Short sales cycle means faster payouts for you.",
            },
            {
              icon: "shield",
              title: "Trusted Brand",
              desc: "Founded by a compliance veteran with 25+ years in regulated industries. USDA, ISO 9001, cGMP certified.",
            },
          ].map((c, i) => (
            <Glass key={i} hover>
              <div style={{ color: COLORS.accent, marginBottom: 12 }}>
                <Icon type={c.icon} size={24} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, margin: "0 0 8px" }}>{c.title}</h3>
              <p style={{ fontSize: 14, color: COLORS.textDim, lineHeight: 1.6, margin: 0 }}>{c.desc}</p>
            </Glass>
          ))}
        </div>
      </section>

      {/* Commission Tiers */}
      <section id="tiers" style={{ padding: "80px 40px", maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ fontSize: 36, fontWeight: 700, textAlign: "center", marginBottom: 48, fontFamily: FONT_BRAND }}>
          Commission Tiers
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {tiers.map((t, i) => (
            <Glass
              key={i}
              hover
              style={{ textAlign: "center", borderColor: i === 1 ? COLORS.accent : COLORS.border, position: "relative" }}
            >
              {i === 1 && (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: COLORS.accent,
                    color: COLORS.bg,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 12px",
                    borderRadius: 10,
                  }}
                >
                  MOST POPULAR
                </div>
              )}
              <div style={{ fontSize: 11, fontWeight: 700, color: t.color, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
                {t.name}
              </div>
              <div style={{ fontSize: 14, color: COLORS.textDim, marginBottom: 16 }}>{t.range} followers</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: COLORS.text, fontFamily: FONT_BRAND, marginBottom: 8 }}>
                {t.rate}
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>{t.type}</div>
            </Glass>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: "80px 40px", maxWidth: 800, margin: "0 auto" }}>
        <h2 style={{ fontSize: 36, fontWeight: 700, textAlign: "center", marginBottom: 48, fontFamily: FONT_BRAND }}>
          How it works
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {steps.map((s, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 20,
                alignItems: "flex-start",
                padding: "24px 0",
                borderLeft: `2px solid ${i === steps.length - 1 ? "transparent" : COLORS.border}`,
                marginLeft: 19,
                paddingLeft: 32,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: -20,
                  top: 24,
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: COLORS.bg,
                  border: `2px solid ${COLORS.accent}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: COLORS.accent,
                  fontSize: 16,
                  fontWeight: 800,
                  fontFamily: FONT_BRAND,
                }}
              >
                {i + 1}
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, margin: "0 0 6px" }}>{s.title}</h3>
                <p style={{ fontSize: 15, color: COLORS.textDim, margin: 0, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Apply Form */}
      <section id="apply" style={{ padding: "80px 40px", maxWidth: 600, margin: "0 auto" }}>
        <Glass style={{ borderColor: COLORS.accent + "40" }}>
          <h2
            style={{
              fontSize: 28,
              fontWeight: 700,
              textAlign: "center",
              marginBottom: 8,
              fontFamily: FONT_BRAND,
            }}
          >
            {submitted ? "Application Received" : "Apply to Partner Program"}
          </h2>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: `${COLORS.accent}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  color: COLORS.accent,
                }}
              >
                <Icon type="check" size={32} />
              </div>
              <p style={{ color: COLORS.textDim, fontSize: 16, marginBottom: 16 }}>
                We&apos;ll review your application and get back to you within 24 hours with your affiliate link and
                dashboard access.
              </p>
              {referralCode && (
                <div style={{ background: "rgba(0,229,160,0.1)", border: `1px solid ${COLORS.accent}40`, borderRadius: 8, padding: "12px 16px", marginTop: 12 }}>
                  <p style={{ fontSize: 12, color: COLORS.textDim, margin: "0 0 4px" }}>Your referral code:</p>
                  <p style={{ fontSize: 20, fontFamily: "monospace", color: COLORS.accent, margin: 0, fontWeight: 700 }}>{referralCode}</p>
                </div>
              )}
            </div>
          ) : (
            <>
              <p style={{ textAlign: "center", color: COLORS.textDim, marginBottom: 28, fontSize: 14 }}>
                Takes 60 seconds. We review every application within 24 hours.
              </p>
              <div ref={formRef}>
              {[
                { label: "Your Name", placeholder: "Full name", type: "text" },
                { label: "Email", placeholder: "you@example.com", type: "email" },
                { label: "Primary Platform", placeholder: "YouTube, X, Blog, Newsletter, Podcast..." },
                { label: "Handle / URL", placeholder: "@handle or channel URL" },
                { label: "Audience Size (approx)", placeholder: "e.g. 50K YouTube subscribers" },
                { label: "Why HammerLock AI?", placeholder: "Why is this a fit for your audience?", textarea: true },
              ].map((f, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <label
                    style={{ fontSize: 13, fontWeight: 600, color: COLORS.textDim, display: "block", marginBottom: 6 }}
                  >
                    {f.label}
                  </label>
                  {f.textarea ? (
                    <textarea
                      rows={3}
                      placeholder={f.placeholder}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 8,
                        color: COLORS.text,
                        fontSize: 14,
                        fontFamily: FONT_BODY,
                        resize: "vertical",
                        boxSizing: "border-box",
                      }}
                    />
                  ) : (
                    <input
                      type={f.type || "text"}
                      placeholder={f.placeholder}
                      onChange={f.label === "Email" ? (e) => setEmail(e.target.value) : undefined}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        background: "rgba(255,255,255,0.04)",
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: 8,
                        color: COLORS.text,
                        fontSize: 14,
                        fontFamily: FONT_BODY,
                        boxSizing: "border-box",
                      }}
                    />
                  )}
                </div>
              ))}
              </div>
              <Btn size="lg" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} onClick={async () => {
                if (submitting) return;
                setSubmitting(true);
                try {
                  const inputs = formRef.current?.querySelectorAll("input, textarea") as NodeListOf<HTMLInputElement | HTMLTextAreaElement>;
                  const fields = Array.from(inputs).map((el) => el.value.trim());
                  const [name, emailVal, platform, handle, audienceSize, reason] = fields;
                  if (!name || !emailVal) { alert("Name and email are required."); setSubmitting(false); return; }
                  const res = await fetch("/api/partner-apply", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email: emailVal, platform, handle, audienceSize, reason }),
                  });
                  const data = await res.json();
                  if (data.ok) {
                    setReferralCode(data.referralCode || "");
                    setSubmitted(true);
                  } else {
                    alert(data.error || "Something went wrong.");
                  }
                } catch (err) { alert("Network error. Please try again."); }
                setSubmitting(false);
              }}>
                {submitting ? "Submitting..." : "Submit Application"} <Icon type="arrow" size={18} />
              </Btn>
            </>
          )}
        </Glass>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: "40px",
          textAlign: "center",
          borderTop: `1px solid ${COLORS.border}`,
          color: COLORS.textMuted,
          fontSize: 13,
        }}
      >
        &copy; 2026 HammerLock AI — Hammer Enterprises. All rights reserved. &nbsp;&middot;&nbsp;{" "}
        <span style={{ color: COLORS.textDim, cursor: "pointer" }}>Terms</span> &nbsp;&middot;&nbsp;{" "}
        <span style={{ color: COLORS.textDim, cursor: "pointer" }}>Privacy</span>
      </footer>
    </div>
  );
};

// ===================================================================
// PRIVATE DASHBOARD
// ===================================================================
const Dashboard = ({ onLogout }: { onLogout: () => void }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { id: "overview", icon: "home", label: "Overview" },
    { id: "pipeline", icon: "target", label: "Pipeline" },
    { id: "affiliates", icon: "users", label: "Affiliates" },
    { id: "outreach", icon: "send", label: "Outreach" },
    { id: "analytics", icon: "chart", label: "Analytics" },
  ];

  // Mock pipeline data
  const pipeline = [
    { name: "Rob Braxman", platform: "YouTube", status: "Replied - Interested", priority: "HIGH", lastContact: "Feb 22", channel: "Privacy/Security" },
    { name: "Matt Wolfe", platform: "YouTube", status: "DM Sent", priority: "HIGH", lastContact: "Feb 21", channel: "AI Tools" },
    { name: "Techlore", platform: "YouTube", status: "Negotiating", priority: "HIGH", lastContact: "Feb 23", channel: "Privacy/Security" },
    { name: "Rowan Cheung", platform: "X/Newsletter", status: "Deal Closed", priority: "HIGH", lastContact: "Feb 20", channel: "AI Newsletter" },
    { name: "Ali Abdaal", platform: "YouTube", status: "DM Sent", priority: "HIGH", lastContact: "Feb 22", channel: "Productivity" },
    { name: "Fireship", platform: "YouTube", status: "Not Contacted", priority: "HIGH", lastContact: "\u2014", channel: "AI Tools" },
    { name: "Naomi Brockwell", platform: "YouTube", status: "Replied - Interested", priority: "HIGH", lastContact: "Feb 23", channel: "Privacy" },
    { name: "Restore Privacy", platform: "Blog", status: "Content Live", priority: "HIGH", lastContact: "Feb 18", channel: "Privacy" },
    { name: "Wes Roth", platform: "YouTube", status: "Follow Up Needed", priority: "HIGH", lastContact: "Feb 15", channel: "AI News" },
    { name: "Ben Tossell", platform: "Newsletter", status: "DM Sent", priority: "HIGH", lastContact: "Feb 21", channel: "AI Newsletter" },
  ];

  const statusColor = (s: string) => {
    if (s.includes("Interested") || s.includes("Closed") || s.includes("Live")) return COLORS.accent;
    if (s.includes("Sent") || s.includes("Negotiating")) return COLORS.yellow;
    if (s.includes("Follow")) return COLORS.blue;
    return COLORS.textMuted;
  };

  const affiliates = [
    { name: "Rowan Cheung", clicks: 2847, signups: 142, revenue: 4260, rate: "30%", status: "Active" },
    { name: "Restore Privacy", clicks: 1923, signups: 96, revenue: 2880, rate: "35%", status: "Active" },
    { name: "Techlore", clicks: 1456, signups: 73, revenue: 2190, rate: "30%", status: "Pending Content" },
    { name: "Sun Knudsen", clicks: 834, signups: 42, revenue: 1260, rate: "35%", status: "Active" },
    { name: "Privacy Guides", clicks: 621, signups: 31, revenue: 930, rate: "30%", status: "Active" },
  ];

  const todayFollowUps = [
    { name: "Wes Roth", action: "Follow-Up #2", platform: "X DM", due: "Today", seq: "A" },
    { name: "Ali Abdaal", action: "Follow-Up #1", platform: "X DM", due: "Today", seq: "A" },
    { name: "Matt Wolfe", action: "Follow-Up #1", platform: "YouTube Email", due: "Tomorrow", seq: "A" },
    { name: "Liam Ottley", action: "Initial Outreach", platform: "X DM", due: "Tomorrow", seq: "A" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: FONT_BODY }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? 240 : 60,
          minHeight: "100vh",
          background: "rgba(17,24,39,0.95)",
          borderRight: `1px solid ${COLORS.border}`,
          padding: "20px 0",
          transition: "width 0.3s ease",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px", marginBottom: 32, cursor: "pointer" }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${COLORS.accent}, #00B87D)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon type="shield" size={16} />
          </div>
          {sidebarOpen && (
            <span style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap" }}>
              HammerLock <span style={{ color: COLORS.accent }}>HQ</span>
            </span>
          )}
        </div>

        <div style={{ flex: 1 }}>
          {navItems.map((n) => (
            <div
              key={n.id}
              onClick={() => setActiveTab(n.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 16px",
                cursor: "pointer",
                color: activeTab === n.id ? COLORS.accent : COLORS.textDim,
                background: activeTab === n.id ? `${COLORS.accent}10` : "transparent",
                borderRight: activeTab === n.id ? `2px solid ${COLORS.accent}` : "2px solid transparent",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                if (activeTab !== n.id) e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }}
              onMouseLeave={(e) => {
                if (activeTab !== n.id) e.currentTarget.style.background = "transparent";
              }}
            >
              <Icon type={n.icon} size={18} />
              {sidebarOpen && (
                <span style={{ fontSize: 14, fontWeight: activeTab === n.id ? 600 : 400, whiteSpace: "nowrap" }}>
                  {n.label}
                </span>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: "0 16px" }}>
          <div
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 0",
              cursor: "pointer",
              color: COLORS.textMuted,
              fontSize: 13,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = COLORS.red)}
            onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.textMuted)}
          >
            <Icon type="x" size={16} />
            {sidebarOpen && <span>Back to Public Site</span>}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: 32, maxWidth: 1200, overflow: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, fontFamily: FONT_BRAND }}>
              {navItems.find((n) => n.id === activeTab)?.label || "Overview"}
            </h1>
            <p style={{ fontSize: 13, color: COLORS.textDim, margin: "4px 0 0" }}>Campaign Dashboard &middot; February 2026</p>
          </div>
          <Btn size="sm">+ New Outreach</Btn>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
              <StatCard icon="users" label="Total Prospects" value="100" change={12} />
              <StatCard icon="send" label="Contacted" value="34" change={8} color={COLORS.blue} />
              <StatCard icon="inbox" label="Responses" value="12" change={25} color={COLORS.yellow} />
              <StatCard icon="check" label="Deals Closed" value="5" change={40} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
              <Glass>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Outreach Activity (Last 7 Days)</h3>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>Messages Sent</span>
                </div>
                <MiniBar
                  data={[
                    { l: "Mon", v: 8 },
                    { l: "Tue", v: 12 },
                    { l: "Wed", v: 6 },
                    { l: "Thu", v: 15 },
                    { l: "Fri", v: 10 },
                    { l: "Sat", v: 2 },
                    { l: "Sun", v: 0 },
                  ]}
                  maxH={80}
                />
              </Glass>

              <Glass>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>Response Rate</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ position: "relative" }}>
                    <Ring pct={35} size={90} />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        fontWeight: 700,
                        fontFamily: FONT_BRAND,
                      }}
                    >
                      35%
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.textDim, lineHeight: 1.8 }}>
                    <div>
                      <span style={{ color: COLORS.accent }}>12</span> responded
                    </div>
                    <div>
                      <span style={{ color: COLORS.yellow }}>22</span> pending
                    </div>
                    <div>
                      <span style={{ color: COLORS.textMuted }}>66</span> not yet contacted
                    </div>
                  </div>
                </div>
              </Glass>
            </div>

            {/* Today's Actions */}
            <Glass style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>
                <Icon type="clock" size={18} /> &nbsp;Today&apos;s Follow-Ups
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {todayFollowUps.map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: f.due === "Today" ? COLORS.accent : COLORS.blue,
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</span>
                      <span style={{ fontSize: 12, color: COLORS.textDim }}>{f.action}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 12, color: COLORS.textMuted }}>{f.platform}</span>
                      <Btn variant="ghost" size="sm">
                        Send
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            </Glass>
          </>
        )}

        {/* PIPELINE TAB */}
        {activeTab === "pipeline" && (
          <Glass>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Name", "Platform", "Channel", "Status", "Priority", "Last Contact"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "12px 16px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: COLORS.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          borderBottom: `1px solid ${COLORS.border}`,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pipeline.map((p, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: `1px solid ${COLORS.border}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "12px 16px", fontSize: 14, fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.textDim }}>{p.platform}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.textDim }}>{p.channel}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: statusColor(p.status),
                            background: `${statusColor(p.status)}15`,
                            padding: "3px 10px",
                            borderRadius: 6,
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: p.priority === "HIGH" ? COLORS.red : COLORS.yellow }}>
                          {p.priority}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.textMuted }}>{p.lastContact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Glass>
        )}

        {/* AFFILIATES TAB */}
        {activeTab === "affiliates" && (
          <>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
              <StatCard icon="users" label="Active Affiliates" value="5" />
              <StatCard icon="eye" label="Total Clicks" value={<AnimCounter end={7681} />} color={COLORS.blue} />
              <StatCard icon="check" label="Total Signups" value={<AnimCounter end={384} />} color={COLORS.yellow} />
              <StatCard icon="dollar" label="Revenue Generated" value={<AnimCounter prefix="$" end={11520} />} />
            </div>
            <Glass>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>Affiliate Leaderboard</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["#", "Affiliate", "Clicks", "Signups", "Conv. Rate", "Revenue", "Commission", "Status"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "10px 14px",
                          fontSize: 12,
                          fontWeight: 600,
                          color: COLORS.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                          borderBottom: `1px solid ${COLORS.border}`,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {affiliates.map((a, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: i === 0 ? COLORS.accent : COLORS.textDim }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 600 }}>{a.name}</td>
                      <td style={{ padding: "12px 14px", color: COLORS.textDim }}>{a.clicks.toLocaleString()}</td>
                      <td style={{ padding: "12px 14px", color: COLORS.textDim }}>{a.signups}</td>
                      <td style={{ padding: "12px 14px", color: COLORS.accent, fontFamily: FONT_BRAND }}>
                        {((a.signups / a.clicks) * 100).toFixed(1)}%
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: 600, color: COLORS.accent, fontFamily: FONT_BRAND }}>
                        ${a.revenue.toLocaleString()}
                      </td>
                      <td style={{ padding: "12px 14px", color: COLORS.textDim }}>{a.rate}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: a.status === "Active" ? COLORS.accent : COLORS.yellow,
                            background: a.status === "Active" ? `${COLORS.accent}15` : `${COLORS.yellow}15`,
                            padding: "3px 10px",
                            borderRadius: 6,
                          }}
                        >
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Glass>
          </>
        )}

        {/* OUTREACH TAB */}
        {activeTab === "outreach" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <Glass>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>Outreach Queue</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {todayFollowUps.map((f, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.02)",
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                        <div style={{ fontSize: 12, color: COLORS.textDim }}>
                          {f.action} &middot; {f.platform}
                        </div>
                      </div>
                      <Btn size="sm" variant={f.due === "Today" ? "primary" : "outline"}>
                        {f.due === "Today" ? "Send Now" : f.due}
                      </Btn>
                    </div>
                  ))}
                </div>
              </Glass>
              <Glass>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px" }}>Template Performance</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { name: "Cold DM \u2014 Privacy Creator", sent: 12, responses: 5, rate: 42 },
                    { name: "Cold DM \u2014 AI YouTuber", sent: 15, responses: 4, rate: 27 },
                    { name: "Cold Email \u2014 Newsletter", sent: 8, responses: 3, rate: 38 },
                    { name: "Warm Follow-Up", sent: 6, responses: 3, rate: 50 },
                  ].map((t, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.02)",
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: t.rate >= 40 ? COLORS.accent : t.rate >= 25 ? COLORS.yellow : COLORS.textDim,
                          }}
                        >
                          {t.rate}%
                        </span>
                      </div>
                      <div style={{ width: "100%", height: 4, borderRadius: 2, background: COLORS.border }}>
                        <div
                          style={{
                            width: `${t.rate}%`,
                            height: "100%",
                            borderRadius: 2,
                            background: t.rate >= 40 ? COLORS.accent : t.rate >= 25 ? COLORS.yellow : COLORS.textDim,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>
                        {t.sent} sent &middot; {t.responses} responses
                      </div>
                    </div>
                  ))}
                </div>
              </Glass>
            </div>
          </>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
              <StatCard icon="dollar" label="Total Revenue" value={<AnimCounter prefix="$" end={11520} />} change={35} />
              <StatCard icon="trending" label="Avg CPA" value="$14.20" color={COLORS.blue} />
              <StatCard icon="chart" label="ROI" value="340%" change={18} color={COLORS.accent} />
              <StatCard icon="zap" label="Avg Time to Deal" value="8.2 days" color={COLORS.yellow} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Glass>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px" }}>Revenue by Channel</h3>
                <MiniBar
                  data={[
                    { l: "Privacy", v: 5340 },
                    { l: "AI Tools", v: 3210 },
                    { l: "Productivity", v: 1890 },
                    { l: "Newsletter", v: 780 },
                    { l: "Cannabis", v: 300 },
                  ]}
                  maxH={100}
                />
              </Glass>
              <Glass>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px" }}>Funnel Breakdown</h3>
                {[
                  { label: "Prospects", value: 100, pct: 100 },
                  { label: "Contacted", value: 34, pct: 34 },
                  { label: "Responded", value: 12, pct: 12 },
                  { label: "Deals Closed", value: 5, pct: 5 },
                  { label: "Content Live", value: 3, pct: 3 },
                ].map((f, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: COLORS.textDim }}>{f.label}</span>
                      <span style={{ fontWeight: 600, fontFamily: FONT_BRAND }}>
                        {f.value} <span style={{ color: COLORS.textMuted }}>({f.pct}%)</span>
                      </span>
                    </div>
                    <div style={{ width: "100%", height: 6, borderRadius: 3, background: COLORS.border }}>
                      <div
                        style={{
                          width: `${f.pct}%`,
                          height: "100%",
                          borderRadius: 3,
                          background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentDim})`,
                          transition: "width 1s ease",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </Glass>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

// ===================================================================
// MAIN PAGE -- VIEW ROUTING
// ===================================================================
export default function PartnersPage() {
  const [view, setView] = useState<"public" | "dashboard">("public");

  return (
    <>
      {/* Scoped styles for the partner portal page */}
      <style jsx global>{`
        /* Override the site-wide body::before gradient for the partners page */
        body::before {
          background-image: none !important;
        }
        /* Partner portal form focus styles */
        .partners-page input:focus,
        .partners-page textarea:focus {
          outline: none;
          border-color: ${COLORS.accent} !important;
        }
        /* Partner portal scrollbar styles */
        .partners-page ::-webkit-scrollbar {
          width: 6px;
        }
        .partners-page ::-webkit-scrollbar-track {
          background: transparent;
        }
        .partners-page ::-webkit-scrollbar-thumb {
          background: ${COLORS.border};
          border-radius: 3px;
        }
        .partners-page ::-webkit-scrollbar-thumb:hover {
          background: ${COLORS.borderLight};
        }
        /* Selection color */
        .partners-page ::selection {
          background: ${COLORS.accent}40;
          color: #fff;
        }
      `}</style>
      <div className="partners-page">
        {view === "public" ? (
          <PublicPage onLogin={() => setView("dashboard")} />
        ) : (
          <Dashboard onLogout={() => setView("public")} />
        )}
      </div>
    </>
  );
}
