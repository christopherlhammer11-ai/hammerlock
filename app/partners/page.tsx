import Link from "next/link";

const partnerPaths = [
  ["Integration partners", "Help connect a local tool, model provider, or operator workflow."],
  ["Deployment partners", "Support private installs, onboarding, training, and environment-specific setup."],
  ["Community educators", "Publish honest tutorials and demos with no invented results or paid-tier claims."],
];

export default function PartnersPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#050706", color: "#f3f7f4", padding: "72px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ color: "#00ff88", fontFamily: "monospace", letterSpacing: ".12em", fontSize: 12 }}>
          HAMMERLOCK AI · PARTNERS
        </div>
        <h1 style={{ fontSize: "clamp(40px, 7vw, 72px)", lineHeight: 1.02, margin: "20px 0" }}>
          Help make private AI easier to run.
        </h1>
        <p style={{ color: "#aeb9b2", fontSize: 20, lineHeight: 1.6, maxWidth: 720 }}>
          HammerLock is free, so there is no subscription affiliate program. We welcome practical
          integration, deployment, and education partnerships; any compensation or commercial terms must be
          agreed in writing for the specific engagement.
        </p>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, margin: "48px 0" }}>
          {partnerPaths.map(([title, body]) => (
            <article key={title} style={{ border: "1px solid #1c3427", background: "#09110d", borderRadius: 14, padding: 22 }}>
              <h2 style={{ fontSize: 18, marginTop: 0 }}>{title}</h2>
              <p style={{ color: "#aeb9b2", lineHeight: 1.6 }}>{body}</p>
            </article>
          ))}
        </section>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="mailto:info@hammerlockai.com?subject=HammerLock%20partner%20idea" className="btn-primary" style={{ textDecoration: "none" }}>Propose a partnership</a>
          <Link href="/" className="btn-secondary" style={{ textDecoration: "none" }}>Back to HammerLock</Link>
        </div>
      </div>
    </main>
  );
}
