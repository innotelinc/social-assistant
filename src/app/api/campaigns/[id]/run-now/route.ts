// Run a campaign immediately — generates + publishes on every selected channel.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, json, error } from "@/lib/api";
import { saveUser } from "@/lib/db";
import { publishCampaignAsync, nextRunAt } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const { id } = await params;
  const c = user.campaigns.find((x) => x.id === id);
  if (!c) return error("Campaign not found", 404);
  const posts = await publishCampaignAsync(user, c);
  c.postsCreated += posts.length;
  c.nextRunAt = nextRunAt(c.schedule, Date.now());
  saveUser(user);
  return json({ posts, nextRunAt: c.nextRunAt });
}
