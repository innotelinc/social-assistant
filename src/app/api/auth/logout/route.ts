// Logout — clear the session cookie.

import { clearSessionCookie } from "@/lib/auth";
import { json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearSessionCookie();
  return json({ ok: true });
}
