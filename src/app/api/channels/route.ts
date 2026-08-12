// Channels — bulk update (enable/disable toggles).

import { NextRequest, NextResponse } from "next/server";
import { requireUser, json } from "@/lib/api";
import { saveUser } from "@/lib/db";

export const dynamic = "force-dynamic";

interface ChannelPatch {
  id: string;
  enabled?: boolean;
  connected?: boolean;
  handle?: string;
}

export async function PUT(req: NextRequest) {
  const result = await requireUser();
  if (result instanceof NextResponse) return result;
  const user = result.user;
  const patches = (await req.json().catch(() => [])) as ChannelPatch[];
  const map = new Map(patches.map((c) => [c.id, c]));
  for (const ch of user.channels) {
    const patch = map.get(ch.id);
    if (patch) {
      if (patch.enabled !== undefined) ch.enabled = patch.enabled;
      if (patch.connected !== undefined) ch.connected = patch.connected;
      if (patch.handle !== undefined) ch.handle = patch.handle;
    }
  }
  saveUser(user);
  return json(
    user.channels.map(({ oauth: _oauth, ...safe }) => {
      void _oauth;
      return safe;
    })
  );
}
