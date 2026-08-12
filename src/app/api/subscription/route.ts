// Current subscription info (for the billing page).

import { NextResponse } from "next/server";
import { requireUser, json } from "@/lib/api";
import { getSubscriptionByUserId } from "@/lib/db";
import { getPlanLimits, aiGenerationsLeft } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const sub = getSubscriptionByUserId(user.id);
  return json({
    sub: sub
      ? {
          status: sub.status,
          planName: sub.planName,
          currentPeriodEnd: sub.currentPeriodEnd,
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        }
      : null,
    plan: getPlanLimits(user),
    aiLeft: aiGenerationsLeft(user),
    connected: user.channels.filter((c) => c.connected).length,
  });
}
