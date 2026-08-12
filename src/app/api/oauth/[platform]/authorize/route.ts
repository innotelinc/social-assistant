// Start an OAuth flow for a platform — returns the provider authorize URL.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, json, error } from "@/lib/api";
import { buildAuthorizeUrl } from "@/lib/oauth";
import { canConnectChannel } from "@/lib/auth";
import { getPlanLimits } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PLATFORM_ALIASES: Record<string, string> = { twitter: "x" };

export async function POST(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const { platform: raw } = await params;
  const platform = PLATFORM_ALIASES[raw] || raw;

  // Enforce plan channel limit before kicking off an OAuth popup.
  if (!canConnectChannel(user)) {
    const limits = getPlanLimits(user);
    return error(
      `Your ${limits.name} plan allows ${limits.maxChannels} connected platforms. Upgrade to connect more.`,
      403
    );
  }

  try {
    const redirectBase = process.env.PUBLIC_URL || req.headers.get("origin") || "http://localhost:3000";
    const url = buildAuthorizeUrl(user.id, platform, redirectBase);
    return json({ url });
  } catch (e) {
    return error(e instanceof Error ? e.message : "OAuth setup failed", 400);
  }
}
