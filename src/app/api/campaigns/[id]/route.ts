// Campaign — update + delete.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, json, error } from "@/lib/api";
import { saveUser } from "@/lib/db";
import { log, nextRunAt } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const { id } = await params;
  const c = user.campaigns.find((x) => x.id === id);
  if (!c) return error("Campaign not found", 404);
  const wasActive = c.active;
  const patch = await req.json().catch(() => ({}));
  Object.assign(c, patch, { id: c.id });
  if (patch.schedule) c.nextRunAt = nextRunAt(c.schedule, Date.now());
  if (!wasActive && c.active) c.nextRunAt = nextRunAt(c.schedule, Date.now());
  saveUser(user);
  return json(c);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const { id } = await params;
  user.campaigns = user.campaigns.filter((c) => c.id !== id);
  log(user, "Campaign deleted", "campaign");
  saveUser(user);
  return json({ ok: true });
}
