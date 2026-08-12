// On-demand re-sync: re-fetch platform profile, pages, boards, etc.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, json } from "@/lib/api";
import { autoConfigurePlatform } from "@/lib/platforms";
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
  try {
    await autoConfigurePlatform(user.id, platform);
    const ch = user.channels.find((c) => c.id === platform);
    log(user, `Re-synced ${platformName(platform)} profile`, "channel");
    saveUser(user);
    return json({ channel: ch || null });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Auto-configure failed" }, 500);
  }
}
