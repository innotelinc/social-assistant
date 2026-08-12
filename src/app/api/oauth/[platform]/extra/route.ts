// Update platform extra config (page / board / org selections) without touching client creds.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, json, error } from "@/lib/api";
import { getCredentialsRow, saveCredentialsRow } from "@/lib/db";
import { saveUser } from "@/lib/db";
import { platformName } from "@/lib/types";
import { log } from "@/lib/engine";

export const dynamic = "force-dynamic";

const PLATFORM_ALIASES: Record<string, string> = { twitter: "x" };

export async function POST(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const { platform: raw } = await params;
  const platform = PLATFORM_ALIASES[raw] || raw;
  const patch = (await req.json().catch(() => ({}))).extra;
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    return error("extra object required");
  }
  const row = getCredentialsRow(user.id, platform);
  if (!row && !process.env[`${platform.toUpperCase()}_CLIENT_ID`]) {
    return error("Platform not configured", 404);
  }
  saveCredentialsRow(user.id, platform, {
    clientId: row?.clientId || process.env[`${platform.toUpperCase()}_CLIENT_ID`] || "",
    clientSecret: row?.clientSecret || process.env[`${platform.toUpperCase()}_CLIENT_SECRET`] || "",
    extra: { ...(row?.extra || {}), ...patch },
  });
  log(user, `Updated ${platformName(platform)} posting target`, "settings");
  saveUser(user);
  return json({ ok: true });
}
