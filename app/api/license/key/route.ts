/**
 * GET /api/license/key?session_id=cs_xxx
 *
 * Derives a deterministic license key from a Stripe checkout session.
 * Verifies the session is paid/complete before returning the key.
 *
 * No database required — Stripe is the source of truth,
 * and the key is derived via HMAC from the session ID.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { deriveKeyFromSession } from "@/lib/license-keys";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

/** Map a Stripe price ID to a tier name */
function determineTierFromPrice(priceId: string | undefined): string {
  if (!priceId) return "core";
  if (priceId === process.env.STRIPE_PRICE_CORE_ONETIME) return "core";
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return "pro";
  if (priceId === process.env.STRIPE_PRICE_TEAMS_MONTHLY) return "teams";
  return "core"; // fallback
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  if (!STRIPE_SECRET) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const stripe = new Stripe(STRIPE_SECRET, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Verify the session with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Only return a key if payment is complete
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 404 });
    }

    // Get line items to determine tier
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
    const priceId = lineItems.data[0]?.price?.id;
    const tier = determineTierFromPrice(priceId);

    // Derive a deterministic license key from session ID
    // Same session always produces the same key
    const licenseKey = deriveKeyFromSession(sessionId);

    return NextResponse.json({ licenseKey, tier });
  } catch (err) {
    const msg = (err as Error).message;
    console.error("[license/key] Error:", msg);

    // Stripe "resource_missing" = invalid session ID
    if (msg.includes("No such checkout")) {
      return NextResponse.json({ error: "Invalid session" }, { status: 404 });
    }

    return NextResponse.json({ error: "Unable to retrieve license" }, { status: 500 });
  }
}
