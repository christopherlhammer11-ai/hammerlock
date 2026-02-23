import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { deriveKeyFromSession } from "@/lib/license-keys";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!STRIPE_SECRET) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET not set — rejecting webhook");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const stripe = new Stripe(STRIPE_SECRET, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[webhook] ${event.type}`, event.id);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log("[webhook] Checkout completed:", {
        sessionId: session.id,
        customerId: session.customer,
        subscriptionId: session.subscription,
        email: session.customer_details?.email,
      });

      try {
        // Derive the same deterministic key that /api/license/key returns
        const licenseKey = deriveKeyFromSession(session.id);

        // Store license key in Stripe session metadata so it can be looked up later
        try {
          await stripe.checkout.sessions.update(session.id, {
            metadata: { license_key: licenseKey },
          });
        } catch (metaErr) {
          console.warn("[webhook] Could not update session metadata:", (metaErr as Error).message);
        }

        // Also store on the customer object for cross-session lookup
        if (session.customer && typeof session.customer === "string") {
          try {
            const existingMeta = (await stripe.customers.retrieve(session.customer) as Stripe.Customer).metadata || {};
            await stripe.customers.update(session.customer, {
              metadata: {
                ...existingMeta,
                license_key: licenseKey,
                license_session_id: session.id,
              },
            });
          } catch (custErr) {
            console.warn("[webhook] Could not update customer metadata:", (custErr as Error).message);
          }
        }

        console.log("[webhook] License key derived:", { licenseKey, sessionId: session.id });
      } catch (err) {
        console.error("[webhook] Failed to process checkout:", (err as Error).message);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("[webhook] Subscription updated:", {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
      // No DB action needed — Stripe is source of truth.
      // Desktop app re-validates by querying Stripe through /api/license/validate.
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("[webhook] Subscription cancelled:", {
        id: subscription.id,
        status: subscription.status,
      });
      // No DB action needed — next desktop validation will see subscription is cancelled.
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log("[webhook] Payment failed:", {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amountDue: invoice.amount_due,
      });
      break;
    }

    case "customer.subscription.trial_will_end": {
      const subscription = event.data.object as Stripe.Subscription;
      console.log("[webhook] Trial ending soon:", {
        id: subscription.id,
        trialEnd: subscription.trial_end,
      });
      break;
    }

    default:
      console.log(`[webhook] Unhandled: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ status: "active" });
}
