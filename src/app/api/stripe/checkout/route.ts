// Stripe checkout — create a subscription checkout session for a plan.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, json, error } from "@/lib/api";
import { stripe, PLAN_PRICE_IDS, PLAN_NAMES, isPlanId, stripeEnabled } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;

  if (!stripeEnabled()) {
    return error("Billing is not configured on this instance", 501);
  }

  const { plan } = await req.json().catch(() => ({}));
  if (!isPlanId(plan)) return error("Invalid plan");

  const priceId = PLAN_PRICE_IDS[plan];
  if (!priceId) return error(`No Stripe price configured for ${PLAN_NAMES[plan]}`);

  const baseUrl = process.env.PUBLIC_URL || "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { userId: user.id, plan },
    success_url: `${baseUrl}/dashboard/billing?success=1&plan=${plan}`,
    cancel_url: `${baseUrl}/dashboard/billing?canceled=1`,
    allow_promotion_codes: true,
  });

  return json({ url: session.url });
}
