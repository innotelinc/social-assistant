// Stripe billing portal — manage subscription / invoices.

import { NextResponse } from "next/server";
import { requireUser, json, error } from "@/lib/api";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { getSubscriptionByUserId } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;

  if (!stripeEnabled()) return error("Billing is not configured on this instance", 501);

  const sub = getSubscriptionByUserId(user.id);
  if (!sub?.stripeCustomerId) return error("No billing account found — subscribe to a plan first", 404);

  const baseUrl = process.env.PUBLIC_URL || "http://localhost:3000";
  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${baseUrl}/dashboard/billing`,
  });

  return json({ url: session.url });
}
