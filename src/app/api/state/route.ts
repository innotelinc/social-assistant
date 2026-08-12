// User state — the full client-safe state document, GET + PUT patch.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, json } from "@/lib/api";
import { saveUser } from "@/lib/db";
import { sanitize } from "@/lib/engine";
import type { User } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  return json(sanitize(result.user));
}

type JsonObject = Record<string, unknown>;

const deepMerge = (a: JsonObject, b: JsonObject): JsonObject => {
  const out: JsonObject = { ...a };
  for (const k of Object.keys(b || {})) {
    const bv = b[k];
    const av = a[k];
    out[k] =
      bv && typeof bv === "object" && !Array.isArray(bv) && av && typeof av === "object" && !Array.isArray(av)
        ? deepMerge(av as JsonObject, bv as JsonObject)
        : bv;
  }
  return out;
};

export async function PUT(req: NextRequest) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user: User = result.user;
  const body = (await req.json().catch(() => ({}))) as JsonObject;
  const profile = body.profile as JsonObject | undefined;
  const settings = body.settings as JsonObject | undefined;
  const resume = body.resume as JsonObject | undefined;
  const site = body.site as JsonObject | undefined;
  if (profile) user.profile = { ...user.profile, ...profile };
  if (settings) user.settings = deepMerge(user.settings as unknown as JsonObject, settings) as unknown as typeof user.settings;
  if (resume) user.resume = { ...user.resume, ...resume };
  if (site) user.site = { ...user.site, ...site };
  saveUser(user);
  return json(sanitize(user));
}
