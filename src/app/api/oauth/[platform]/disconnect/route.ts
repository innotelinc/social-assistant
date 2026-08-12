// Disconnect a platform — clears OAuth tokens.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, json } from "@/lib/api";
import { disconnectPlatform } from "@/lib/oauth";
import { saveUser } from "@/lib/db";
import { platformName } from "@/lib/types";
import { log } from "@/lib/engine";

export const dynamic = "force-dynamic";

const PLATFORM_ALIASES: Record<string, string> = { twitter: "x" };

export async function POST(_req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const { platform: raw } = await params;
  const platform = PLATFORM_ALIASES[raw] || raw;
  disconnectPlatform(user.id, platform);
  log(user, `Disconnected ${platformName(platform)} (OAuth tokens cleared)`, "channel");
  saveUser(user);
  return json({ ok: true });
}
