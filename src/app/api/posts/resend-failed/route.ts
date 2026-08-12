// Resend every failed post in one call.

import { NextResponse } from "next/server";
import { requireUser, json } from "@/lib/api";
import { saveUser } from "@/lib/db";
import { publishPost } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST() {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const failed = user.posts.filter((p) => p.status === "failed");
  if (!failed.length) return json({ resent: 0, stillFailed: 0, posts: [] });
  let resent = 0;
  let stillFailed = 0;
  for (const p of failed) {
    try {
      await publishPost(user, p);
      if (p.status === "failed") stillFailed++;
      else resent++;
    } catch {
      saveUser(user);
      stillFailed++;
    }
  }
  saveUser(user);
  return json({ resent, stillFailed, posts: failed });
}
