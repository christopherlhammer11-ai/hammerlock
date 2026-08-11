import Link from "next/link";

const facts = [
  ["Product", "Free local-first desktop AI application"],
  ["Runtime", "Local Ollama models or user-supplied cloud API keys"],
  ["Storage", "AES-256-GCM encrypted local vault"],
  ["Workflow", "11 built-in agents plus configurable local tools"],
  ["Distribution", "Desktop artifacts published through GitHub Releases"],
  ["Business", "Optional setup, integration, and private deployment services"],
];

export default function ProductBriefPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#050706", color: "#f3f7f4", padding: "72px 24px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>
        <div style={{ color: "#00ff88", fontFamily: "monospace", letterSpacing: ".12em", fontSize: 12 }}>
          HAMMERLOCK AI · PRODUCT BRIEF
        </div>
        <h1 style={{ fontSize: "clamp(42px, 7vw, 76px)", lineHeight: 1, margin: "20px 0" }}>
          Private AI without a product paywall.
        </h1>
        <p style={{ maxWidth: 720, color: "#aeb9b2", fontSize: 20, lineHeight: 1.6 }}>
          HammerLock is a free desktop application for running AI locally or with your own provider keys.
          The product is in active development; this brief describes shipped architecture and the current
          release path, not customer traction or audited security certification.
        </p>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, margin: "48px 0" }}>
          {facts.map(([label, value]) => (
            <article key={label} style={{ border: "1px solid #1c3427", background: "#09110d", borderRadius: 14, padding: 20 }}>
              <div style={{ color: "#00ff88", fontSize: 12, textTransform: "uppercase", letterSpacing: ".08em" }}>{label}</div>
              <p style={{ margin: "10px 0 0", lineHeight: 1.5 }}>{value}</p>
            </article>
          ))}
        </section>

        <section style={{ borderTop: "1px solid #1c3427", paddingTop: 36 }}>
          <h2>What still needs proof</h2>
          <p style={{ color: "#aeb9b2", lineHeight: 1.7 }}>
            Platform-specific packaging, signing, installer smoke tests, broader workflow coverage, independent
            security review, and real user outcomes should be verified release by release. No ARR, conversion,
            customer-count, compliance, or penetration-test claim is made here.
          </p>
        </section>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 40 }}>
          <Link href="/get-app" className="btn-primary" style={{ textDecoration: "none" }}>Get HammerLock free</Link>
          <a href="https://github.com/christopherlhammer11-ai/hammerlock" className="btn-secondary" style={{ textDecoration: "none" }}>Inspect the repository</a>
        </div>
      </div>
    </main>
  );
}
