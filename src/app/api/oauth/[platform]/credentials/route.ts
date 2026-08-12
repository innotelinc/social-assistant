// Save platform developer credentials (Client ID + Secret) for a user.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, json } from "@/lib/api";
import { saveCredentials } from "@/lib/oauth";
import { saveUser } from "@/lib/db";
import { platformName } from "@/lib/types";
import { log } from "@/lib/engine";

export const dynamic = "force-dynamic";

const PLATFORM_ALIASES: Record<string, string> = { twitter: "x" };

export async function PUT(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const { platform: raw } = await params;
  const platform = PLATFORM_ALIASES[raw] || raw;
  const { clientId, clientSecret, extra, replaceExtra } = await req.json().catch(() => ({}));
  saveCredentials(user.id, platform, clientId, clientSecret, extra || {}, replaceExtra === true);
  log(user, `Updated ${platformName(platform)} API credentials`, "settings");
  saveUser(user);
  return json({ ok: true });
}
