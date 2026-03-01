/**
 * POST /api/partner-apply
 *
 * Partner/affiliate application endpoint.
 * - Sends application details to info@hammerlockai.com
 * - Generates a unique referral code
 * - Adds contact to Resend audience with "partner" tag
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import crypto from "crypto";
import { createRateLimiter } from "@/lib/rate-limit";

/** Escape HTML special characters to prevent injection in emails */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 3 });

function generateReferralCode(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
  const hash = crypto.randomBytes(3).toString("hex");
  return `HL-${slug}-${hash}`.toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limited = limiter.check(ip);
    if (limited) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const body = await req.json();
    const { name, email, platform, handle, audienceSize, reason } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required." },
        { status: 400 }
      );
    }
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    const normalized = email.trim().toLowerCase();
    const referralCode = generateReferralCode(name);

    console.warn(
      `[partner-apply] ${name} <${normalized}> | code: ${referralCode} | ${new Date().toISOString()}`
    );

    if (RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY);

      // Send application email to info@hammerlockai.com
      const safeName = escapeHtml(name);
      const safeEmail = escapeHtml(normalized);
      const safePlatform = escapeHtml(platform || "N/A");
      const safeHandle = escapeHtml(handle || "N/A");
      const safeAudience = escapeHtml(audienceSize || "N/A");
      const safeReason = escapeHtml(reason || "N/A");

      await resend.emails.send({
        from: "HammerLock Partners <partners@hammerlockai.com>",
        to: "info@hammerlockai.com",
        subject: `New Partner Application: ${safeName} (${safePlatform})`,
        html: `
          <h2>New Affiliate Partner Application</h2>
          <table style="border-collapse:collapse;font-family:sans-serif;">
            <tr><td style="padding:8px;font-weight:bold;">Name</td><td style="padding:8px;">${safeName}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Email</td><td style="padding:8px;">${safeEmail}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Platform</td><td style="padding:8px;">${safePlatform}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Handle / URL</td><td style="padding:8px;">${safeHandle}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Audience Size</td><td style="padding:8px;">${safeAudience}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Why HammerLock</td><td style="padding:8px;">${safeReason}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Referral Code</td><td style="padding:8px;font-family:monospace;font-size:16px;color:#00E5A0;">${referralCode}</td></tr>
          </table>
          <p style="margin-top:20px;color:#666;">Approve this partner and send them their referral link:<br>
          <code>https://hammerlockai.com?ref=${referralCode}</code></p>
        `,
      });

      // Add to Resend audience with partner tag
      if (RESEND_AUDIENCE_ID) {
        try {
          await resend.contacts.create({
            audienceId: RESEND_AUDIENCE_ID,
            email: normalized,
            firstName: name.split(" ")[0],
            unsubscribed: false,
          });
        } catch (resendError) {
          console.error("[partner-apply] Resend audience error:", (resendError as Error).message);
        }
      }

      console.warn(`[partner-apply] Application email sent for ${name}`);
    }

    return NextResponse.json({ ok: true, referralCode });
  } catch (error) {
    console.error("[partner-apply] Error:", (error as Error).message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
