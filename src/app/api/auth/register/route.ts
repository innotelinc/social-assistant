// Auth endpoints — register, login, logout, me. Local accounts with scrypt
// hashing and httpOnly session cookies (no third-party auth required).

import { NextRequest } from "next/server";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { addUser, findByEmail } from "@/lib/db";
import { defaultState } from "@/lib/types";
import { error, json } from "@/lib/api";

export const dynamic = "force-dynamic";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json().catch(() => ({}));
  if (!name || !email || !password) return error("Name, email and password are required");
  if (password.length < 6) return error("Password must be at least 6 characters");

  if (findByEmail(email)) return error("An account with this email already exists", 409);

  const { salt, hash } = hashPassword(password);
  const user = {
    ...defaultState(name, email),
    id: uid(),
    name,
    email: email.toLowerCase(),
    salt,
    hash,
    aiUsage: { date: "", count: 0 },
  };
  addUser(user);
  await setSessionCookie(user.id);
  return json({ user: { id: user.id, name: user.name, email: user.email } });
}
