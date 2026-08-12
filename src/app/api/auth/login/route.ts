// Login — verify scrypt password, rotate session token.

import { NextRequest } from "next/server";
import { verifyPassword, setSessionCookie } from "@/lib/auth";
import { findByEmail } from "@/lib/db";
import { error, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json().catch(() => ({}));
  const user = findByEmail((email || "").toLowerCase());
  if (!user || !verifyPassword(password || "", user.salt, user.hash)) {
    return error("Invalid email or password", 401);
  }
  await setSessionCookie(user.id);
  return json({ user: { id: user.id, name: user.name, email: user.email } });
}
