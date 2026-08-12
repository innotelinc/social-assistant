// Publish a single post immediately.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, json, error } from "@/lib/api";
import { saveUser } from "@/lib/db";
import { publishPost } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const { id } = await params;
  const p = user.posts.find((x) => x.id === id);
  if (!p) return error("Post not found", 404);
  try {
    await publishPost(user, p);
  } catch (e) {
    saveUser(user);
    return error(e instanceof Error ? e.message : "Publish failed", 500);
  }
  saveUser(user);
  return json(p);
}
