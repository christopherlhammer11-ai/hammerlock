/**
 * POST /api/download-lead
 *
 * Captures email leads from download page and newsletter signup.
 * Adds contacts to Resend audience for marketing emails.
 * Falls back to console logging if Resend is not configured.
 */

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createRateLimiter } from "@/lib/rate-limit";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID;
const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 5 });

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const limited = limiter.check(ip);
    if (limited) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { email, source, platform } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required." },
        { status: 400 }
      );
    }

    const normalized = email.trim().toLowerCase();

    // Log the lead (visible in Vercel function logs)
    console.warn(
      `[download-lead] ${normalized} | source=${source || "get-app"} | platform=${platform || "unknown"} | ${new Date().toISOString()}`
    );

    // Add contact to Resend audience if configured
    if (RESEND_API_KEY && RESEND_AUDIENCE_ID) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        await resend.contacts.create({
          audienceId: RESEND_AUDIENCE_ID,
          email: normalized,
          firstName: "", // Can be enriched later
          unsubscribed: false,
        });
        console.warn(`[download-lead] Added to Resend audience: ${normalized}`);
      } catch (resendError) {
        // Don't block the download if Resend fails
        console.error("[download-lead] Resend error:", (resendError as Error).message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[download-lead] Error:", (error as Error).message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
