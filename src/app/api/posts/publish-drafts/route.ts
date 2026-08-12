// Publish every draft post in one call.

import { NextResponse } from "next/server";
import { requireUser, json } from "@/lib/api";
import { saveUser } from "@/lib/db";
import { publishPost } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const drafts = user.posts.filter((p) => p.status === "draft");
  if (!drafts.length) return json({ published: 0, failed: 0, posts: [] });
  let published = 0;
  let failed = 0;
  for (const p of drafts) {
    try {
      await publishPost(user, p);
      if (p.status === "failed") failed++;
      else published++;
    } catch {
      saveUser(user);
      failed++;
    }
  }
  saveUser(user);
  return json({ published, failed, posts: drafts });
}
