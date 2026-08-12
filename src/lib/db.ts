// SQLite persistence layer (better-sqlite3).
// One row per user holding the full state document (channels, posts,
// campaigns, activity, profile, settings) — the same proven shape as the
// original engine, now with real durability and a relational edge.

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { migrateState, type User, type UserState } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "socialai.db");

let db: Database.Database | null = null;

function getDB(): Database.Database {
  if (db) return db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      salt TEXT NOT NULL,
      hash TEXT NOT NULL,
      state TEXT NOT NULL,
      ai_usage TEXT NOT NULL DEFAULT '{"date":"","count":0}',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS platform_credentials (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform_id TEXT NOT NULL,
      creds TEXT NOT NULL,
      PRIMARY KEY (user_id, platform_id)
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT UNIQUE,
      plan_name TEXT,
      status TEXT NOT NULL DEFAULT 'incomplete',
      current_period_start INTEGER,
      current_period_end INTEGER,
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sub_user ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sub_customer ON subscriptions(stripe_customer_id);
  `);
  return db;
}

const uid = () => crypto.randomUUID();

function rowToUser(row: {
  id: string; name: string; email: string; salt: string; hash: string;
  state: string; ai_usage: string; created_at: number;
}): User {
  let state: Partial<UserState> = {};
  try { state = JSON.parse(row.state); } catch { /* fall back to defaults */ }
  let aiUsage: User["aiUsage"] = { date: "", count: 0 };
  try { aiUsage = JSON.parse(row.ai_usage); } catch { /* default */ }
  return {
    id: row.id,
    salt: row.salt,
    hash: row.hash,
    aiUsage,
    ...migrateState(state, row.name, row.email),
  };
}

export function getUsers(): Record<string, User> {
  const rows = getDB().prepare("SELECT * FROM users").all() as {
    id: string; name: string; email: string; salt: string; hash: string;
    state: string; ai_usage: string; created_at: number;
  }[];
  const out: Record<string, User> = {};
  for (const r of rows) out[r.id] = rowToUser(r);
  return out;
}

export function getUser(id: string): User | null {
  const row = getDB().prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | { id: string; name: string; email: string; salt: string; hash: string; state: string; ai_usage: string; created_at: number }
    | undefined;
  return row ? rowToUser(row) : null;
}

export function findByEmail(email: string): User | null {
  const row = getDB().prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as
    | { id: string; name: string; email: string; salt: string; hash: string; state: string; ai_usage: string; created_at: number }
    | undefined;
  return row ? rowToUser(row) : null;
}

export function addUser(user: User): User {
  const { id, name, email, salt, hash, aiUsage, ...state } = user;
  getDB().prepare(
    `INSERT INTO users (id, name, email, salt, hash, state, ai_usage, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, email, salt, hash, JSON.stringify(state), JSON.stringify(aiUsage), Date.now());
  return user;
}

export function saveUser(user: User): void {
  const { id, name, email, salt, hash, aiUsage, ...state } = user;
  getDB().prepare(
    `UPDATE users SET name = ?, email = ?, salt = ?, hash = ?, state = ?, ai_usage = ? WHERE id = ?`
  ).run(name, email, salt, hash, JSON.stringify(state), JSON.stringify(aiUsage), id);
}

/** psa-compatible updateUser: patch (object) or mutate (function) then persist. */
export function updateUser(id: string, patch: Partial<User> | ((u: User) => void)): User | null {
  const user = getUser(id);
  if (!user) return null;
  if (typeof patch === "function") patch(user);
  else Object.assign(user, patch);
  saveUser(user);
  return user;
}

export function deleteUser(id: string): void {
  getDB().prepare("DELETE FROM users WHERE id = ?").run(id);
}

// ------------------------------------------------------------------ sessions

export function createSession(userId: string): string {
  const token = uid();
  getDB().prepare("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)")
    .run(token, userId, Date.now());
  return token;
}

export function getSessionUser(token: string): User | null {
  const row = getDB().prepare("SELECT user_id FROM sessions WHERE token = ?").get(token) as { user_id: string } | undefined;
  if (!row) return null;
  return getUser(row.user_id);
}

export function deleteSession(token: string): void {
  getDB().prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

// ------------------------------------------------------------------ platform credentials

export interface PlatformCreds {
  clientId: string;
  clientSecret: string;
  extra: Record<string, unknown>;
  /** OAuth tokens are stored on the channel object (state), not here. */
}

export function getCredentialsRow(userId: string, platformId: string): PlatformCreds | null {
  const row = getDB().prepare("SELECT creds FROM platform_credentials WHERE user_id = ? AND platform_id = ?")
    .get(userId, platformId) as { creds: string } | undefined;
  if (!row) return null;
  try {
    const parsed = JSON.parse(row.creds);
    return {
      clientId: parsed.clientId || "",
      clientSecret: parsed.clientSecret || "",
      extra: parsed.extra || {},
    };
  } catch {
    return { clientId: "", clientSecret: "", extra: {} };
  }
}

export function saveCredentialsRow(userId: string, platformId: string, creds: PlatformCreds): void {
  getDB().prepare(
    `INSERT INTO platform_credentials (user_id, platform_id, creds) VALUES (?, ?, ?)
     ON CONFLICT (user_id, platform_id) DO UPDATE SET creds = excluded.creds`
  ).run(userId, platformId, JSON.stringify(creds));
}

/** Platform ids that have a saved credentials row for this user. */
export function getCredentialedPlatforms(userId: string): string[] {
  const rows = getDB().prepare("SELECT platform_id FROM platform_credentials WHERE user_id = ?").all(userId) as { platform_id: string }[];
  return rows.map((r) => r.platform_id);
}

// ------------------------------------------------------------------ subscriptions

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planName: string | null;
  status: string;
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  createdAt: number;
  updatedAt: number;
}

export function getSubscriptionByUserId(userId: string): Subscription | null {
  const row = getDB().prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1").get(userId) as
    | Record<string, unknown> | undefined;
  return row ? rowToSub(row) : null;
}

export function getSubscriptionByCustomer(customerId: string): Subscription | null {
  const row = getDB().prepare("SELECT * FROM subscriptions WHERE stripe_customer_id = ? ORDER BY updated_at DESC LIMIT 1").get(customerId) as
    | Record<string, unknown> | undefined;
  return row ? rowToSub(row) : null;
}

export function getSubscriptionByStripeId(subscriptionId: string): Subscription | null {
  const row = getDB().prepare("SELECT * FROM subscriptions WHERE stripe_subscription_id = ?").get(subscriptionId) as
    | Record<string, unknown> | undefined;
  return row ? rowToSub(row) : null;
}

function rowToSub(row: Record<string, unknown>): Subscription {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    stripeCustomerId: row.stripe_customer_id ? String(row.stripe_customer_id) : null,
    stripeSubscriptionId: row.stripe_subscription_id ? String(row.stripe_subscription_id) : null,
    planName: row.plan_name ? String(row.plan_name) : null,
    status: String(row.status),
    currentPeriodStart: row.current_period_start != null ? Number(row.current_period_start) : null,
    currentPeriodEnd: row.current_period_end != null ? Number(row.current_period_end) : null,
    cancelAtPeriodEnd: Number(row.cancel_at_period_end) === 1,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

export function upsertSubscription(input: {
  userId: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  planName?: string | null;
  status?: string;
  currentPeriodStart?: number | null;
  currentPeriodEnd?: number | null;
  cancelAtPeriodEnd?: boolean;
}): Subscription {
  const existing = input.stripeSubscriptionId
    ? getSubscriptionByStripeId(input.stripeSubscriptionId)
    : getSubscriptionByUserId(input.userId);
  const now = Date.now();
  const sub: Subscription = {
    id: existing?.id || uid(),
    userId: input.userId,
    stripeCustomerId: input.stripeCustomerId !== undefined ? input.stripeCustomerId : existing?.stripeCustomerId ?? null,
    stripeSubscriptionId: input.stripeSubscriptionId !== undefined ? input.stripeSubscriptionId : existing?.stripeSubscriptionId ?? null,
    planName: input.planName !== undefined ? input.planName : existing?.planName ?? null,
    status: input.status || existing?.status || "incomplete",
    currentPeriodStart: input.currentPeriodStart !== undefined ? input.currentPeriodStart : existing?.currentPeriodStart ?? null,
    currentPeriodEnd: input.currentPeriodEnd !== undefined ? input.currentPeriodEnd : existing?.currentPeriodEnd ?? null,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd !== undefined ? input.cancelAtPeriodEnd : existing?.cancelAtPeriodEnd ?? false,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  getDB().prepare(
    `INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, plan_name, status,
       current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at)
     VALUES (@id, @userId, @stripeCustomerId, @stripeSubscriptionId, @planName, @status,
       @currentPeriodStart, @currentPeriodEnd, @cancelAtPeriodEnd, @createdAt, @updatedAt)
     ON CONFLICT (id) DO UPDATE SET
       stripe_customer_id = excluded.stripe_customer_id,
       stripe_subscription_id = excluded.stripe_subscription_id,
       plan_name = excluded.plan_name,
       status = excluded.status,
       current_period_start = excluded.current_period_start,
       current_period_end = excluded.current_period_end,
       cancel_at_period_end = excluded.cancel_at_period_end,
       updated_at = excluded.updated_at`
  ).run({
    id: sub.id, userId: sub.userId, stripeCustomerId: sub.stripeCustomerId,
    stripeSubscriptionId: sub.stripeSubscriptionId, planName: sub.planName,
    status: sub.status, currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd, cancelAtPeriodEnd: sub.cancelAtPeriodEnd ? 1 : 0,
    createdAt: sub.createdAt, updatedAt: sub.updatedAt,
  });
  return sub;
}

export { uid };
