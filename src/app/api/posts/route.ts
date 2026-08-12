// Posts — list + create (draft / schedule / publish now).

import { NextRequest, NextResponse } from "next/server";
import { requireUser, json, error } from "@/lib/api";
import { saveUser } from "@/lib/db";
import { publishPost } from "@/lib/engine";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export async function GET() {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  return json(result.user.posts);
}

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const { channelIds = [], content = "", scheduledAt = null, campaignId = null, publish = false } =
    await req.json().catch(() => ({}));
  if (!channelIds.length || !content) return error("Channels and content required");

  const post: Post = {
    id: uid(),
    channelIds: channelIds.filter((id: string) => user.channels.some((c) => c.id === id)),
    content,
    status: scheduledAt && scheduledAt > Date.now() ? "scheduled" : "draft",
    scheduledAt: scheduledAt || null,
    campaignId,
    publishedAt: null,
    engagement: null,
    results: null,
    createdAt: Date.now(),
  };
  user.posts.unshift(post);
  if (publish && post.status === "draft") {
    try {
      await publishPost(user, post);
    } catch (e) {
      saveUser(user);
      return error(e instanceof Error ? e.message : "Publish failed", 500);
    }
  }
  saveUser(user);
  return json(post);
}
