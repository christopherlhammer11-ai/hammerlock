import Link from "next/link";

export const metadata = {
  title: "HammerLock AI — v0.4 Field Notes",
  description: "Current setup, privacy, security, and release boundaries for HammerLock AI v0.4.",
};

const notes = [
  {
    title: "Local and cloud are different privacy modes",
    body: "Ollama can keep model prompts on the machine. When you configure a cloud provider, the prompt and selected context go to that provider under its terms.",
  },
  {
    title: "Encryption protects supported data at rest",
    body: "HammerLock encrypts supported vault data locally. Encryption does not make content private after you intentionally send it to another service.",
  },
  {
    title: "Redaction reduces risk; it is not a guarantee",
    body: "Pattern-based redaction can remove common identifiers before a cloud request, but sensitive inputs still need human review.",
  },
  {
    title: "The software is free, not open source",
    body: "HammerLock v0.4 is free for personal and internal business use under its included freeware license. OpenClaw and other dependencies keep their own licenses.",
  },
  {
    title: "Regulated use needs independent validation",
    body: "HammerLock does not claim HIPAA, FedRAMP, legal-privilege, classified-environment, or other compliance certification. Those outcomes depend on the full deployment and professional review.",
  },
];

export default function FieldNotesPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#070a08", color: "#f5f7f5", padding: "72px 24px" }}>
      <div style={{ width: "min(900px, 100%)", margin: "0 auto" }}>
        <p style={{ color: "#00ff88", letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 13 }}>
          HammerLock v0.4
        </p>
        <h1 style={{ fontSize: "clamp(2.4rem, 7vw, 5rem)", lineHeight: 0.98, margin: "12px 0 20px" }}>
          Field notes, with the boundaries left in.
        </h1>
        <p style={{ color: "#a7b0aa", fontSize: 18, lineHeight: 1.7, maxWidth: 720 }}>
          The older research library is being reviewed source by source. These are the current product truths to use for evaluation and release decisions.
        </p>

        <section style={{ display: "grid", gap: 16, marginTop: 44 }} aria-label="Current product boundaries">
          {notes.map((note) => (
            <article key={note.title} style={{ border: "1px solid #1b2a21", borderRadius: 14, padding: 24, background: "#0b100d" }}>
              <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>{note.title}</h2>
              <p style={{ margin: 0, color: "#a7b0aa", lineHeight: 1.65 }}>{note.body}</p>
            </article>
          ))}
        </section>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 36 }}>
          <Link href="/get-app" style={{ color: "#061008", background: "#00ff88", padding: "12px 18px", borderRadius: 9, textDecoration: "none", fontWeight: 700 }}>
            Get HammerLock free
          </Link>
          <a href="https://github.com/christopherlhammer11-ai/hammerlock" target="_blank" rel="noreferrer" style={{ color: "#e8ede9", border: "1px solid #304137", padding: "12px 18px", borderRadius: 9, textDecoration: "none" }}>
            Inspect the repository
          </a>
          <Link href="/" style={{ color: "#a7b0aa", padding: "12px 4px", textDecoration: "none" }}>
            Back to HammerLock
          </Link>
        </div>
      </div>
    </main>
  );
}
