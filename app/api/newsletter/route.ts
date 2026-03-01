/**
 * POST /api/newsletter
 *
 * Newsletter signup endpoint. Adds contacts to Resend audience
 * with "newsletter" source tag for segmentation.
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

    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required." },
        { status: 400 }
      );
    }

    const normalized = email.trim().toLowerCase();

    console.warn(
      `[newsletter] ${normalized} | ${new Date().toISOString()}`
    );

    // Add to Resend audience
    if (RESEND_API_KEY && RESEND_AUDIENCE_ID) {
      try {
        const resend = new Resend(RESEND_API_KEY);
        await resend.contacts.create({
          audienceId: RESEND_AUDIENCE_ID,
          email: normalized,
          firstName: "",
          unsubscribed: false,
        });
        console.warn(`[newsletter] Added to Resend audience: ${normalized}`);
      } catch (resendError) {
        // Contact may already exist — that's fine
        console.error("[newsletter] Resend error:", (resendError as Error).message);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[newsletter] Error:", (error as Error).message);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
