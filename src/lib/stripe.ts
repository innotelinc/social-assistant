// Stripe billing — subscription plans mirror the SaaS tiers from the social
// project (Creator / Business / Agency), self-hosted and optional.

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder");
  }
  return stripeClient;
}

/** Proxy that lazily creates the client so importing never throws without a key. */
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripeClient()[prop as keyof Stripe];
  },
});

export type PaidPlanId = "creator" | "business" | "agency";

export const PLAN_PRICE_IDS: Record<PaidPlanId, string | undefined> = {
  creator: process.env.STRIPE_CREATOR_PRICE_ID,
  business: process.env.STRIPE_BUSINESS_PRICE_ID,
  agency: process.env.STRIPE_AGENCY_PRICE_ID,
};

export const PLAN_NAMES: Record<PaidPlanId, string> = {
  creator: "Creator",
  business: "Business",
  agency: "Agency",
};

export function isPlanId(value: string | null): value is PaidPlanId {
  return value === "creator" || value === "business" || value === "agency";
}

export function stripeEnabled(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_CREATOR_PRICE_ID);
}

/** Map a Stripe price ID back to its plan id (for webhook-driven plan updates). */
export function planIdForPrice(priceId: string | null | undefined): PaidPlanId | null {
  if (!priceId) return null;
  for (const [id, pid] of Object.entries(PLAN_PRICE_IDS)) {
    if (pid === priceId) return id as PaidPlanId;
  }
  return null;
}
