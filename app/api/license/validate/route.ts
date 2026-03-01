/**
 * POST /api/license/validate
 *
 * Database-free license re-validation. Called by the desktop app every 7 days.
 * Searches Stripe for the customer with this license key and verifies the
 * subscription is still active.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { isValidKeyFormat, deriveKeyFromSession } from "@/lib/license-keys";
import { createRateLimiter } from "@/lib/rate-limit";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 20 });

/**
 * CORS headers — wildcard is intentional here.
 * Desktop Electron app calls from unpredictable localhost ports / file:// origins.
 * Security is enforced via rate limiting + license key validation, not origin restriction.
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/** Handle CORS preflight */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** JSON response with CORS headers */
function corsJson(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { ...CORS_HEADERS, ...(init?.headers || {}) },
  });
}

function determineTierFromPrice(priceId: string | undefined): string {
  if (!priceId) return "core";
  if (priceId === process.env.STRIPE_PRICE_CORE_ONETIME) return "core";
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return "pro";
  if (priceId === process.env.STRIPE_PRICE_TEAMS_MONTHLY) return "teams";
  return "core";
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
    const limited = limiter.check(ip);
    if (limited) {
      return corsJson(
        { valid: false, error: "Too many requests." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) } }
      );
    }

    const { licenseKey, deviceId } = await req.json();

    if (!licenseKey || !isValidKeyFormat(licenseKey)) {
      return corsJson({ valid: false, error: "Invalid license key format" }, { status: 400 });
    }
    if (!STRIPE_SECRET) {
      return corsJson({ valid: false, error: "Not configured" }, { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const upperKey = licenseKey.toUpperCase();

    // Search Stripe customers by license key metadata
    const customers = await stripe.customers.search({
      query: `metadata["license_key"]:"${upperKey}"`,
    });

    if (customers.data.length === 0) {
      // Fallback: search recent sessions
      const sessions = await stripe.checkout.sessions.list({ limit: 50, status: "complete" });
      for (const session of sessions.data) {
        if (session.payment_status !== "paid") continue;
        if (deriveKeyFromSession(session.id) === upperKey) {
          // Found it — get tier info
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
          const tier = determineTierFromPrice(lineItems.data[0]?.price?.id);
          const billingType = session.mode === "payment" ? "onetime" : "subscription";
          let currentPeriodEnd: string | null = null;
          let cancelAtPeriodEnd = false;

          if (session.subscription) {
            try {
              const sub = await stripe.subscriptions.retrieve(session.subscription as string);
              cancelAtPeriodEnd = sub.cancel_at_period_end;
              const periodEnd = (sub as unknown as Record<string, unknown>).current_period_end
                ?? sub.items?.data?.[0]?.current_period_end;
              if (typeof periodEnd === "number") {
                currentPeriodEnd = new Date(periodEnd * 1000).toISOString();
              }
              if (sub.status !== "active" && sub.status !== "trialing") {
                return corsJson(
                  { valid: false, error: "Subscription expired", tier: "free" },
                  { status: 403 }
                );
              }
            } catch { /* ok */ }
          }

          // Backfill customer metadata for future lookups
          if (session.customer && typeof session.customer === "string") {
            try {
              await stripe.customers.update(session.customer, {
                metadata: { license_key: upperKey, license_session_id: session.id },
              });
            } catch { /* ok */ }
          }

          return corsJson({
            valid: true,
            tier,
            billingType,
            currentPeriodEnd,
            cancelAtPeriodEnd,
            validatedAt: new Date().toISOString(),
          });
        }
      }

      return corsJson({ valid: false, error: "License key not found" }, { status: 404 });
    }

    const customer = customers.data[0];
    const sessionId = customer.metadata.license_session_id;

    // Check device binding
    if (customer.metadata.device_id && deviceId && customer.metadata.device_id !== deviceId) {
      return corsJson(
        { valid: false, error: "This license is activated on a different device" },
        { status: 403 }
      );
    }

    // Get tier and subscription status from Stripe
    let tier = "core";
    let billingType = "onetime";
    let currentPeriodEnd: string | null = null;
    let cancelAtPeriodEnd = false;

    if (sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        billingType = session.mode === "payment" ? "onetime" : "subscription";
        const lineItems = await stripe.checkout.sessions.listLineItems(sessionId);
        tier = determineTierFromPrice(lineItems.data[0]?.price?.id);

        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          cancelAtPeriodEnd = sub.cancel_at_period_end;
          const periodEnd = (sub as unknown as Record<string, unknown>).current_period_end
            ?? sub.items?.data?.[0]?.current_period_end;
          if (typeof periodEnd === "number") {
            currentPeriodEnd = new Date(periodEnd * 1000).toISOString();
          }

          // Check subscription is still active
          if (sub.status !== "active" && sub.status !== "trialing") {
            const gracePeriod = currentPeriodEnd
              ? new Date(new Date(currentPeriodEnd).getTime() + 3 * 24 * 60 * 60 * 1000)
              : null;
            if (!gracePeriod || new Date() > gracePeriod) {
              return corsJson(
                { valid: false, error: "Subscription expired", tier: "free" },
                { status: 403 }
              );
            }
          }
        }
      } catch (e) {
        console.warn("[validate] Could not fetch session details:", (e as Error).message);
      }
    }

    return corsJson({
      valid: true,
      tier,
      billingType,
      currentPeriodEnd,
      cancelAtPeriodEnd,
      validatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[license/validate] Error:", (err as Error).message);
    return corsJson({ valid: false, error: "Internal error" }, { status: 500 });
  }
}
