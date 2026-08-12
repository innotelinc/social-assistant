// Channel — single update (toggle enabled / mark connected).

import { NextRequest, NextResponse } from "next/server";
import { requireUser, json, error } from "@/lib/api";
import { saveUser } from "@/lib/db";
import { platformName } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const { id } = await params;
  const ch = user.channels.find((c) => c.id === id);
  if (!ch) return error("Channel not found", 404);
  Object.assign(ch, await req.json().catch(() => ({})));
  saveUser(user);
  return json({ id: ch.id, enabled: ch.enabled, connected: ch.connected, handle: ch.handle, followers: ch.followers });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const { id } = await params;
  const ch = user.channels.find((c) => c.id === id);
  if (!ch) return error("Channel not found", 404);
  void platformName;
  return json({ id: ch.id, enabled: ch.enabled, connected: ch.connected, handle: ch.handle, followers: ch.followers });
}
