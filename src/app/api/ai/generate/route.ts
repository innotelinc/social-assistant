// AI generation — respects plan limits; uses the user's AI key (or env) when
// configured, otherwise the built-in engine (zero-config).

import { NextRequest, NextResponse } from "next/server";
import { requireUser, json } from "@/lib/api";
import { saveUser } from "@/lib/db";
import { aiGenerationsLeft, recordAiGeneration, getPlanLimits } from "@/lib/auth";
import { realAI, builtinAI, effectiveAiConfig } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const { kind = "post", ...payload } = await req.json().catch(() => ({}));

  const left = aiGenerationsLeft(user);
  if (left <= 0) {
    const plan = getPlanLimits(user);
    return json(
      { error: `Daily AI limit reached (${plan.aiGenerationsPerDay}/day on ${plan.name}). Upgrade or try again tomorrow.`, limitReached: true },
      429
    );
  }

  let out: unknown = null;
  const cfg = effectiveAiConfig(user);
  if (cfg.mode !== "builtin" && cfg.apiKey) {
    out = await realAI(cfg, kind, payload);
  }
  if (!out) {
    out = builtinAI(kind, payload as Record<string, unknown>, user);
  }

  recordAiGeneration(user);
  saveUser(user);
  return json({ ...(out as object), aiUsage: user.aiUsage });
}
