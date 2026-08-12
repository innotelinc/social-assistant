// OAuth connection status for every platform.

import { NextResponse } from "next/server";
import { requireUser, json } from "@/lib/api";
import { getConnectionStatus } from "@/lib/oauth";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const statuses: Record<string, ReturnType<typeof getConnectionStatus>> = {};
  for (const ch of user.channels) {
    statuses[ch.id] = getConnectionStatus(user.id, ch.id);
  }
  return json(statuses);
}
