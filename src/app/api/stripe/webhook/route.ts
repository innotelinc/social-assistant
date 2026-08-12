// Stripe webhook — sync subscription state from Stripe events.

import { NextRequest, NextResponse } from "next/server";
import { stripe, planIdForPrice, stripeEnabled } from "@/lib/stripe";
import {
  upsertSubscription,
  getSubscriptionByCustomer,
  getSubscriptionByStripeId,
  getUser,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!stripeEnabled()) return NextResponse.json({ error: "not configured" }, { status: 501 });

  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event;
  try {
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err instanceof Error ? err.message : ""}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as {
          customer?: string; subscription?: string; metadata?: Record<string, string>; client_reference_id?: string;
        };
        const userId = session.metadata?.userId || session.client_reference_id || "";
        if (userId && getUser(userId)) {
          upsertSubscription({
            userId,
            stripeCustomerId: session.customer || null,
            stripeSubscriptionId: session.subscription || null,
            status: "active",
          });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as {
          id: string; customer?: string; status?: string; items?: { data: { price: { id: string } }[] };
          current_period_start?: number; current_period_end?: number; cancel_at_period_end?: boolean;
        };
        const priceId = sub.items?.data?.[0]?.price?.id;
        const planName = planIdForPrice(priceId);
        const existing = getSubscriptionByCustomer(sub.customer || "");
        if (existing) {
          upsertSubscription({
            userId: existing.userId,
            stripeCustomerId: sub.customer || null,
            stripeSubscriptionId: sub.id,
            planName: planName || existing.planName,
            status: sub.status || existing.status,
            currentPeriodStart: sub.current_period_start ? sub.current_period_start * 1000 : null,
            currentPeriodEnd: sub.current_period_end ? sub.current_period_end * 1000 : null,
            cancelAtPeriodEnd: !!sub.cancel_at_period_end,
          });
        } else {
          // The checkout.session.completed handler already links customer → user.
          console.warn("[stripe-webhook] subscription event for unknown customer, skipping:", sub.customer);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as { id: string };
        const existing = getSubscriptionByStripeId(sub.id);
        if (existing) {
          upsertSubscription({ userId: existing.userId, stripeSubscriptionId: sub.id, status: "canceled" });
        }
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "webhook failed" }, { status: 500 });
  }
}
