/**
 * POST /api/license/activate
 *
 * Database-free license activation. Validates the license key by searching
 * Stripe for the checkout session that produced it (via deterministic derivation).
 * Stripe metadata stores the license key and device binding.
 *
 * Flow:
 * 1. User enters license key in desktop app
 * 2. App calls this endpoint with key + deviceId
 * 3. We search Stripe customers for one whose metadata.license_key matches
 * 4. We verify the subscription/payment is still active
 * 5. We store deviceId in Stripe customer metadata (device binding)
 * 6. Return tier info for the desktop app to cache
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { isValidKeyFormat, deriveKeyFromSession } from "@/lib/license-keys";
import { createRateLimiter } from "@/lib/rate-limit";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;

const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });

/** CORS headers — allow desktop app (localhost) to call this endpoint */
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

/** Map a Stripe price ID to a tier name */
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
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)) } }
      );
    }

    const { licenseKey, deviceId, deviceName } = await req.json();

    if (!licenseKey || !isValidKeyFormat(licenseKey)) {
      return corsJson({ error: "Invalid license key format" }, { status: 400 });
    }
    if (!deviceId || typeof deviceId !== "string") {
      return corsJson({ error: "Device ID required" }, { status: 400 });
    }
    if (!STRIPE_SECRET) {
      return corsJson({ error: "Not configured" }, { status: 500 });
    }

    const stripe = new Stripe(STRIPE_SECRET, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const upperKey = licenseKey.toUpperCase();

    // Strategy 1: Search Stripe customers by metadata (webhook stores license_key there)
    const customers = await stripe.customers.search({
      query: `metadata["license_key"]:"${upperKey}"`,
    });

    if (customers.data.length > 0) {
      const customer = customers.data[0];
      const sessionId = customer.metadata.license_session_id;

      // Verify key derivation matches
      if (sessionId && deriveKeyFromSession(sessionId) !== upperKey) {
        return corsJson({ error: "License key mismatch" }, { status: 404 });
      }

      // Track device (allow multiple devices — store latest, log previous)
      // No longer blocks activation on a different device

      // Determine tier from the session's line items
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

          // Get subscription period info
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
              return corsJson(
                { error: "Subscription is no longer active" },
                { status: 403 }
              );
            }
          }
        } catch (e) {
          console.warn("[activate] Could not fetch session details:", (e as Error).message);
        }
      }

      // Bind device to customer metadata
      await stripe.customers.update(customer.id, {
        metadata: {
          ...customer.metadata,
          device_id: deviceId,
          device_name: deviceName || "",
          activated_at: new Date().toISOString(),
        },
      });

      return corsJson({
        activated: true,
        tier,
        billingType,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        activatedAt: new Date().toISOString(),
      });
    }

    // Strategy 2: Brute-force search recent sessions to find one that derives to this key
    // (fallback if webhook didn't fire or customer metadata wasn't set)
    const sessions = await stripe.checkout.sessions.list({
      limit: 50,
      status: "complete",
    });

    for (const session of sessions.data) {
      if (session.payment_status !== "paid") continue;
      const derivedKey = deriveKeyFromSession(session.id);
      if (derivedKey === upperKey) {
        // Found the matching session
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
                { error: "Subscription is no longer active" },
                { status: 403 }
              );
            }
          } catch { /* ok */ }
        }

        // Store metadata on customer for faster future lookups
        if (session.customer && typeof session.customer === "string") {
          try {
            await stripe.customers.update(session.customer, {
              metadata: {
                license_key: upperKey,
                license_session_id: session.id,
                device_id: deviceId,
                device_name: deviceName || "",
                activated_at: new Date().toISOString(),
              },
            });
          } catch { /* ok */ }
        }

        return corsJson({
          activated: true,
          tier,
          billingType,
          currentPeriodEnd,
          cancelAtPeriodEnd,
          activatedAt: new Date().toISOString(),
        });
      }
    }

    return corsJson({ error: "License key not found" }, { status: 404 });
  } catch (err) {
    console.error("[license/activate] Error:", (err as Error).message);
    return corsJson({ error: "Internal error" }, { status: 500 });
  }
}
