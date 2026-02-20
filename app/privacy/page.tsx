"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      color: "var(--text-primary)",
      padding: "60px 24px 80px",
    }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        <Link href="/" style={{
          color: "var(--accent)",
          textDecoration: "none",
          fontSize: "0.9rem",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 32,
        }}>
          &larr; Back to HammerLock AI
        </Link>

        <h1 style={{
          fontSize: "2.2rem",
          fontWeight: 700,
          marginBottom: 8,
          color: "var(--text-primary)",
        }}>
          Privacy Policy
        </h1>

        <p style={{
          color: "var(--text-muted)",
          fontSize: "0.85rem",
          marginBottom: 48,
        }}>
          Last updated: February 2026
        </p>

        {/* Introduction */}
        <section style={{ marginBottom: 40 }}>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            HammerLock AI is built on the principle that your data belongs to you. We designed our
            architecture from the ground up to minimize data collection and maximize your privacy. This
            policy explains what we collect, what we do not collect, and how your information is protected.
          </p>
        </section>

        {/* 1. What We Collect */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            1. What We Collect
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: 12 }}>
            We collect the minimum amount of information necessary to provide the Service:
          </p>
          <ul style={{ color: "var(--text-secondary)", lineHeight: 1.9, fontSize: "0.95rem", paddingLeft: 24 }}>
            <li><strong>Email address</strong> &mdash; provided at the time of purchase through Stripe, used for license key delivery and essential account communications</li>
            <li><strong>License key records</strong> &mdash; generated upon purchase to activate your subscription in the desktop application</li>
            <li><strong>Payment information</strong> &mdash; processed and stored entirely by Stripe; we never see or store your full credit card number</li>
            <li><strong>Basic purchase metadata</strong> &mdash; subscription tier, purchase date, and billing status for account management</li>
          </ul>
        </section>

        {/* 2. What We Do NOT Collect */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            2. What We Do NOT Collect
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: 12 }}>
            This is the most important section of our privacy policy. HammerLock AI does <strong>not</strong> collect:
          </p>
          <ul style={{ color: "var(--text-secondary)", lineHeight: 1.9, fontSize: "0.95rem", paddingLeft: 24 }}>
            <li><strong>Your chat conversations</strong> &mdash; all chats are stored locally on your device and never leave it</li>
            <li><strong>Your vault data</strong> &mdash; all encrypted vault contents remain on your machine</li>
            <li><strong>Your documents or files</strong> &mdash; files you analyze or import stay on-device</li>
            <li><strong>Browsing or usage telemetry</strong> &mdash; we do not track how you use the application</li>
            <li><strong>Analytics or tracking data</strong> &mdash; no third-party analytics, no cookies for tracking, no fingerprinting</li>
            <li><strong>Keystrokes, clipboard data, or screen content</strong> &mdash; the application does not monitor your system activity</li>
            <li><strong>IP-based location tracking</strong> &mdash; we do not log or store IP addresses for profiling</li>
          </ul>
        </section>

        {/* 3. Local-First Architecture */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            3. Local-First Architecture
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: 12 }}>
            HammerLock AI uses a local-first architecture. This means:
          </p>
          <ul style={{ color: "var(--text-secondary)", lineHeight: 1.9, fontSize: "0.95rem", paddingLeft: 24, marginBottom: 12 }}>
            <li>All AI processing can happen entirely on your device using local models (via Ollama)</li>
            <li>Your encrypted vault, chat history, personas, and settings are stored locally</li>
            <li>The application works fully offline when using local AI models</li>
            <li>No data is sent to our servers during normal application use</li>
          </ul>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            When you choose to use cloud AI providers (OpenAI, Anthropic, Google, etc.), your prompts are
            sent directly to those providers according to their respective privacy policies. HammerLock AI
            does not intercept, log, or store these communications. If you use bundled cloud credits through
            your subscription, requests are routed through our API proxy but are not logged or retained.
          </p>
        </section>

        {/* 4. Encryption */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            4. Encryption
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: 12 }}>
            HammerLock AI encrypts your vault data using <strong>AES-256-GCM</strong>, a military-grade
            encryption standard. Your encryption key is derived from your password using a secure key
            derivation function and is never transmitted or stored outside your device.
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            We cannot access your vault contents. If you lose your encryption password, we cannot recover
            your data. This is by design &mdash; true privacy means only you hold the keys.
          </p>
        </section>

        {/* 5. Third-Party Services */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            5. Third-Party Services
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: 12 }}>
            HammerLock AI integrates with the following third-party services:
          </p>
          <ul style={{ color: "var(--text-secondary)", lineHeight: 1.9, fontSize: "0.95rem", paddingLeft: 24 }}>
            <li><strong>Stripe</strong> &mdash; payment processing for subscriptions. Stripe handles all financial data under their own privacy policy. We never store your credit card details.</li>
            <li><strong>Cloud AI providers (optional)</strong> &mdash; if you choose to use cloud-based AI models (OpenAI, Anthropic, Google, Groq, Mistral, DeepSeek), your prompts are sent to those providers. Each provider has its own privacy policy and data handling practices. Use of cloud providers is entirely optional; local models via Ollama provide a fully private alternative.</li>
          </ul>
        </section>

        {/* 6. PII Anonymization */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            6. PII Anonymization
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            HammerLock AI includes a built-in PII (Personally Identifiable Information) anonymization feature.
            When enabled, this feature automatically detects and redacts sensitive information &mdash; such as
            names, email addresses, phone numbers, social security numbers, and other personal data &mdash;
            before it is sent to any cloud AI provider. This adds an extra layer of privacy protection when
            using external AI services, ensuring that your personal information is never exposed to third
            parties even during cloud-based AI interactions.
          </p>
        </section>

        {/* 7. Data Retention */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            7. Data Retention
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: 12 }}>
            Since HammerLock AI is local-first, you control your own data retention. You can delete chats,
            vault contents, and application data at any time directly from your device.
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            For the minimal server-side data we hold (email address, license key records, and billing metadata),
            we retain this information for as long as your account is active or as needed to provide the Service.
            If you cancel your subscription and request data deletion, we will remove your information from our
            systems within 30 days, except where retention is required by law or for legitimate business
            purposes such as fraud prevention.
          </p>
        </section>

        {/* 8. Children's Privacy */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            8. Children&apos;s Privacy
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            HammerLock AI is not intended for use by children under the age of 13. We do not knowingly
            collect personal information from children under 13. If we become aware that we have inadvertently
            collected data from a child under 13, we will take steps to delete that information promptly. If
            you are a parent or guardian and believe your child has provided us with personal information,
            please contact us at{" "}
            <a href="mailto:info@hammerlockai.com" style={{ color: "var(--accent)", textDecoration: "none" }}>
              info@hammerlockai.com
            </a>.
          </p>
        </section>

        {/* 9. Changes to This Policy */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            9. Changes to This Policy
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            We may update this Privacy Policy from time to time. If we make material changes, we will notify
            users through the application or via email. The &quot;Last updated&quot; date at the top of this page
            reflects the most recent revision. Continued use of the Service after changes constitutes
            acceptance of the updated policy.
          </p>
        </section>

        {/* 10. Contact */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            10. Contact
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            If you have questions about this Privacy Policy or how your data is handled, please contact us at{" "}
            <a href="mailto:info@hammerlockai.com" style={{ color: "var(--accent)", textDecoration: "none" }}>
              info@hammerlockai.com
            </a>.
          </p>
        </section>

        {/* Footer nav */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 32,
          marginTop: 48,
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
          fontSize: "0.85rem",
        }}>
          <Link href="/" style={{ color: "var(--accent)", textDecoration: "none" }}>Home</Link>
          <Link href="/terms" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
