// Campaigns — create + list.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, json } from "@/lib/api";
import { saveUser } from "@/lib/db";
import { log, nextRunAt } from "@/lib/engine";
import type { Campaign } from "@/lib/types";

export const dynamic = "force-dynamic";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export async function GET() {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  return json(result.user.campaigns);
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const body = await req.json().catch(() => ({}));
  const campaign: Campaign = {
    id: uid(),
    name: "Untitled campaign",
    goal: "promote",
    topic: "",
    product: "",
    audience: "",
    channels: user.channels.filter((c) => c.enabled && c.id !== "website" && c.id !== "resume").map((c) => c.id),
    schedule: { mode: "recurring", frequency: "daily", time: "09:00", days: [1, 2, 3, 4, 5], intervalDays: 1 },
    ai: { enabled: true, tone: "hype", type: "promo", length: "medium" },
    active: true,
    autoPilot: true,
    nextRunAt: null,
    postsCreated: 0,
    createdAt: Date.now(),
    ...body,
  };
  campaign.nextRunAt = nextRunAt(campaign.schedule, Date.now());
  user.campaigns.unshift(campaign);
  log(user, `Campaign "${campaign.name}" created`, "campaign");
  saveUser(user);
  return json(campaign);
}
