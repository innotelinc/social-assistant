// Dashboard stats.

import { NextResponse } from "next/server";
import { requireUser, json } from "@/lib/api";
import { dashboardStats } from "@/lib/engine";
import { getPlanLimits } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const stats = dashboardStats(user);
  const plan = getPlanLimits(user);
  return json({ ...stats, plan });
}
