"use client";

import Link from "next/link";

export default function TermsPage() {
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
          Terms of Service
        </h1>

        <p style={{
          color: "var(--text-muted)",
          fontSize: "0.85rem",
          marginBottom: 48,
        }}>
          Last updated: August 11, 2026
        </p>

        {/* 1. Acceptance of Terms */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            1. Acceptance of Terms
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            By accessing or using HammerLock AI (&quot;the Service&quot;), including the desktop application, website,
            and any associated services, you agree to be bound by these Terms of Service. If you do not agree
            to these terms, do not use the Service. We reserve the right to update these terms at any time, and
            continued use of the Service constitutes acceptance of any modifications.
          </p>
        </section>

        {/* 2. Service Description */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            2. Service Description
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            HammerLock AI provides a privacy-first AI desktop application and complementary web services. The
            desktop application runs locally on your device and includes features such as an encrypted vault,
            AI-powered chat with multiple model providers, document analysis, and agent workflows. Web services
            include downloads, documentation, and optional support or custom rollout help.
          </p>
        </section>

        {/* 3. Free App and Optional Services */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            3. Free App and Optional Services
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: 12 }}>
            HammerLock AI is available as a free desktop app. The app does not require an account,
            subscription, activation key, or per-device purchase. Local models may require separate downloads,
            and optional cloud providers charge under their own terms.
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            Optional managed support, custom integrations, or enterprise deployment services may be governed
            by a separate written agreement.
          </p>
        </section>

        {/* 4. Optional Paid Services */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            4. Optional Paid Services
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: 12 }}>
            HammerLock AI may offer optional paid services such as support, deployment assistance, or custom
            integrations. If you purchase those services, pricing and billing terms will be disclosed at the
            time of purchase or in a separate written agreement.
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: 12 }}>
            If a paid service is canceled or expires, any managed or hosted service access tied to that
            purchase may end, but your locally stored data and vault remain on your own device.
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            We reserve the right to update pricing for optional paid services with reasonable notice.
          </p>
        </section>

        {/* 5. Acceptable Use */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            5. Acceptable Use
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: 12 }}>
            You agree to use HammerLock AI only for lawful purposes and in compliance with all applicable
            laws and regulations. You may not:
          </p>
          <ul style={{ color: "var(--text-secondary)", lineHeight: 1.9, fontSize: "0.95rem", paddingLeft: 24 }}>
            <li>Use the Service to generate, store, or distribute illegal or harmful content</li>
            <li>Attempt to reverse engineer, decompile, or tamper with the application beyond what is permitted by the HammerLock AI Freeware License or applicable law</li>
            <li>Circumvent or attempt to circumvent activation, deployment, or access controls for managed services</li>
            <li>Use the Service to harass, abuse, or harm others</li>
            <li>Resell, sublicense, or redistribute the application or restricted managed-service access without permission</li>
            <li>Overload or interfere with the Service&apos;s infrastructure or cloud endpoints</li>
          </ul>
        </section>

        {/* 6. Intellectual Property */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            6. Intellectual Property
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: 12 }}>
            The HammerLock AI desktop application is built on the OpenClaw open-source engine, which is
            released under the MIT License. You are free to use, modify, and distribute the OpenClaw engine
            in accordance with the MIT License terms.
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            The HammerLock AI application is free to use under the HammerLock AI Freeware License; it is not
            itself offered under the MIT License. The brand, name, logo, website content, and application are
            owned by HammerLock AI. All content you create and store within the
            application remains your property. We claim no ownership over your data, chats, vault contents, or
            generated outputs.
          </p>
        </section>

        {/* 7. Limitation of Liability */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            7. Limitation of Liability
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: 12 }}>
            HammerLock AI is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either
            express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or
            that AI-generated outputs will be accurate, complete, or suitable for any particular purpose.
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: 12 }}>
            To the fullest extent permitted by law, HammerLock AI and its creators shall not be liable for
            any indirect, incidental, special, consequential, or punitive damages arising from your use of the
            Service, including but not limited to loss of data, loss of profits, or business interruption.
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            Our total liability for any claim arising from the Service shall not exceed US$100.
          </p>
        </section>

        {/* 8. Termination */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            8. Termination
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem", marginBottom: 12 }}>
            You may stop using HammerLock AI at any time by uninstalling the application. We may suspend or
            terminate your access to managed or hosted services if you violate these Terms of
            Service, engage in abusive behavior, or if required by law.
          </p>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            Upon termination, any managed keys or hosted services may be deactivated. Your locally stored
            data, vault contents, and encrypted files remain on your device and are not affected by account termination.
          </p>
        </section>

        {/* 9. Governing Law */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            9. Governing Law
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            These terms shall be governed by and construed in accordance with the laws of the United States.
            Any disputes arising from these terms or the Service shall be resolved through good-faith
            negotiation, and if necessary, binding arbitration.
          </p>
        </section>

        {/* 10. Contact */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--accent)", marginBottom: 12 }}>
            10. Contact
          </h2>
          <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: "0.95rem" }}>
            If you have questions about these Terms of Service, please contact us at{" "}
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
          <Link href="/privacy" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
