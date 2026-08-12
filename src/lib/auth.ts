// Local auth: scrypt password hashing + httpOnly session cookies + plan gating.

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getSessionUser, createSession, deleteSession, getSubscriptionByUserId } from "./db";
import { PLANS, type PlanId, type User } from "./types";

export const SESSION_COOKIE = "sa_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const hash = (pw: string, salt: string) => crypto.scryptSync(pw, salt, 32).toString("hex");
const uid = () => crypto.randomUUID();

export function hashPassword(pw: string): { salt: string; hash: string } {
  const salt = uid();
  return { salt, hash: hash(pw, salt) };
}

export function verifyPassword(pw: string, salt: string, expected: string): boolean {
  return hash(pw, salt) === expected;
}

export async function setSessionCookie(userId: string): Promise<void> {
  const token = createSession(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token);
  store.delete(SESSION_COOKIE);
}

/** Server-component / route-handler helper: resolve the logged-in user or null. */
export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionUser(token);
}

// ------------------------------------------------------------------ plan gating

/** Resolve the user's effective plan id. */
export function getPlanId(user: User): PlanId {
  const sub = getSubscriptionByUserId(user.id);
  const status = sub?.status;
  const active = status === "active" || status === "trialing";
  const name = sub?.planName?.toLowerCase() || "";
  if (active && (name === "creator" || name === "business" || name === "agency")) {
    return name as PlanId;
  }
  return "free";
}

export function getPlanLimits(user: User) {
  const id = getPlanId(user);
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

/** How many AI generations the user has left today (respects plan limit). */
export function aiGenerationsLeft(user: User): number {
  const limit = getPlanLimits(user).aiGenerationsPerDay;
  if (limit === -1) return Infinity;
  const today = new Date().toISOString().slice(0, 10);
  const used = user.aiUsage?.date === today ? user.aiUsage.count : 0;
  return Math.max(0, limit - used);
}

export function recordAiGeneration(user: User): void {
  const today = new Date().toISOString().slice(0, 10);
  const used = user.aiUsage?.date === today ? user.aiUsage.count : 0;
  user.aiUsage = { date: today, count: used + 1 };
}

/** Whether the user may connect more platforms under their current plan. */
export function canConnectChannel(user: User): boolean {
  const limit = getPlanLimits(user).maxChannels;
  const connected = user.channels.filter((c) => c.connected).length;
  return connected < limit;
}
