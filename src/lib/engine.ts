// Shared engine — publishing, fame scoring, dashboard stats, the campaign
// autopilot tick, and the optional real-AI proxy. Mirrors the proven logic of
// the original engine, adapted to SQLite persistence.

import crypto from "node:crypto";
import { getUsers, saveUser, getCredentialedPlatforms } from "./db";
import { postToPlatform } from "./post-engine";
import * as ai from "./ai-engine";
import { platformName, type Campaign, type Channel, type Post, type User } from "./types";

const uid = () => crypto.randomUUID();
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Client-safe view of a user's state: strips OAuth tokens + credential secrets. */
export function sanitize(user: User) {
  const maskedCreds: Record<string, { configured: boolean; oauth2Configured?: boolean; extra: Record<string, unknown> }> = {};
  // Mark every platform that has saved API credentials (so the Settings UI's
  // "saved" badge survives reloads) or an active connection.
  for (const pid of getCredentialedPlatforms(user.id)) {
    maskedCreds[pid] = { configured: true, oauth2Configured: true, extra: {} };
  }
  for (const ch of user.channels) {
    if (ch.connected || ch.oauth) {
      maskedCreds[ch.id] = {
        configured: true,
        oauth2Configured: true,
        extra: {},
      };
    }
  }
  const safeChannels = user.channels.map((ch) => {
    const { oauth, ...safe } = ch;
    void oauth;
    return safe;
  });
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    channels: safeChannels,
    profile: user.profile,
    settings: user.settings,
    campaigns: user.campaigns,
    posts: user.posts,
    activity: user.activity,
    fame: user.fame,
    resume: user.resume,
    site: user.site,
    platformCredentials: maskedCreds,
    aiUsage: user.aiUsage,
  };
}

export function log(user: User, message: string, kind: string): void {
  user.activity.unshift({ id: uid(), message, kind, at: Date.now() });
  user.activity = user.activity.slice(0, 50);
}

export function mockEngagement(ch?: Channel) {
  const f = (ch?.followers || 500) || 100;
  const likes = Math.round(f * (0.04 + Math.random() * 0.09));
  const comments = Math.round(likes * (0.05 + Math.random() * 0.08));
  const shares = Math.round(likes * (0.02 + Math.random() * 0.05));
  const reach = Math.round(f * (0.3 + Math.random() * 0.7));
  return { likes, comments, shares, reach, rate: clamp(((likes + comments * 2 + shares * 3) / Math.max(1, reach)) * 100, 0, 30) };
}

export async function publishPost(user: User, post: Post): Promise<void> {
  post.publishedAt = Date.now();
  post.scheduledAt = null;
  const channels = (post.channelIds || [])
    .map((id) => user.channels.find((c) => c.id === id))
    .filter((c): c is Channel => Boolean(c));

  const results: Post["results"] = [];
  const sentChannels: Channel[] = [];
  for (const ch of channels) {
    const result = await postToPlatform(user.id, ch.id, post.content);
    results.push({
      channelId: ch.id,
      ok: !!result.real,
      real: !!result.real,
      simulated: !!result.simulated,
      error: result.error,
    });
    if (result.real || (result.simulated && !result.error)) sentChannels.push(ch);
    if (result.real) {
      log(user, `Posted to ${platformName(ch.id)} via API ✨`, "post");
    } else if (result.error) {
      log(user, `${platformName(ch.id)}: ${result.error}`, "post");
    } else {
      log(user, `Published ${platformName(ch.id)} post (simulated)`, "post");
    }
  }
  post.results = results;

  if (sentChannels.length > 0) {
    post.status = "published";
    post.engagement = mockEngagement(sentChannels[0]);
    for (const ch of sentChannels) ch.posts = (ch.posts || 0) + 1;
  } else {
    post.status = "failed";
    post.engagement = null;
  }
}

export async function publishCampaignAsync(user: User, campaign: Campaign): Promise<Post[]> {
  const channels = user.channels.filter((c) => campaign.channels.includes(c.id) && c.enabled);
  if (!channels.length) return [];
  const opts = {
    topic: campaign.topic || campaign.product || campaign.name,
    product: campaign.product,
    audience: campaign.audience,
    type: campaign.ai.type || "promo",
    tone: campaign.ai.tone || "hype",
    length: campaign.ai.length || "medium",
    brand: user.settings.brand,
  };
  const results: Post[] = [];
  for (const ch of channels) {
    const gen = campaign.ai.enabled
      ? ai.generatePost({ ...opts, platform: ch.id, seed: Date.now() + Math.floor(Math.random() * 1000) })
      : null;
    const content = campaign.content || (gen ? (Array.isArray(gen) ? gen[0] : gen).text : `${campaign.name} — ${campaign.topic}`);

    const result = await postToPlatform(user.id, ch.id, content);
    const failed = !!result.error;

    const post: Post = {
      id: uid(),
      channelIds: [ch.id],
      content,
      status: failed ? "failed" : "published",
      scheduledAt: null,
      publishedAt: Date.now(),
      campaignId: campaign.id,
      engagement: failed ? null : mockEngagement(ch),
      createdAt: Date.now(),
      results: [{ channelId: ch.id, ok: !!result.real, real: !!result.real, simulated: !!result.simulated, error: result.error }],
    };
    user.posts.unshift(post);
    if (!failed) ch.posts = (ch.posts || 0) + 1;
    log(user, `Campaign post → ${platformName(ch.id)} ${result.real ? "(API ✅)" : failed ? "(failed)" : "(simulated)"}`, "post");
    results.push(post);
  }
  return results;
}

// ------------------------------------------------------------------ fame score

export function fameScore(user: User): number {
  const connected = user.channels.filter((c) => c.connected).length;
  const followers = user.channels.reduce((s, c) => s + (c.connected ? c.followers || 0 : 0), 0);
  const posts7 = user.posts.filter((p) => p.status === "published" && p.publishedAt && p.publishedAt > Date.now() - 7 * 864e5).length;
  const pro = user.profile;
  const profileComplete = [
    pro.headline, pro.about, pro.location, pro.website,
    pro.skills?.length, pro.experience?.length, pro.education?.length, pro.services?.length,
  ].filter(Boolean).length;
  const siteLive = user.site.published ? 6 : 0;
  const score = 10
    + connected * 4
    + Math.min(followers / 250, 25)
    + Math.min(posts7 * 2, 20)
    + Math.min(user.campaigns.filter((c) => c.active).length * 2, 10)
    + Math.min(profileComplete * 1.5, 15)
    + siteLive
    + Math.min(user.resume.summary ? 2 : 0, 2);
  return Math.round(clamp(score, 0, 100));
}

// ------------------------------------------------------------------ dashboard

export function dashboardStats(user: User) {
  return {
    fameScore: fameScore(user),
    channelsConnected: user.channels.filter((c) => c.connected).length,
    channelsEnabled: user.channels.filter((c) => c.enabled).length,
    totalFollowers: user.channels.reduce((s, c) => s + (c.connected ? c.followers || 0 : 0), 0),
    postsPublished: user.posts.filter((p) => p.status === "published").length,
    postsScheduled: user.posts.filter((p) => p.status === "scheduled").length,
    activeCampaigns: user.campaigns.filter((c) => c.active).length,
    reach: user.posts.filter((p) => p.status === "published").reduce((s, p) => s + (p.engagement?.reach || 0), 0),
    engagementRate:
      user.posts.filter((p) => p.status === "published").reduce((s, p) => s + (p.engagement?.rate || 0), 0) /
      Math.max(1, user.posts.filter((p) => p.status === "published").length),
    upcoming: user.posts
      .filter((p) => p.status === "scheduled")
      .sort((a, b) => (a.scheduledAt || 0) - (b.scheduledAt || 0))
      .slice(0, 6),
    nextCampaignRuns: user.campaigns
      .filter((c) => c.active && c.nextRunAt)
      .map((c) => ({ id: c.id, name: c.name, at: c.nextRunAt, channels: c.channels.length }))
      .sort((a, b) => (a.at ?? 0) - (b.at ?? 0))
      .slice(0, 6),
    activity: user.activity.slice(0, 12),
    growth: buildGrowth(user),
    lastPost: user.posts.find((p) => p.status === "published"),
  };
}

function buildGrowth(user: User) {
  const history = user.fame?.history || [];
  if (history.length >= 2) {
    return history.slice(-14).map((h) => ({ date: h.t, followers: h.followers, engagement: 0 }));
  }
  const published = user.posts
    .filter((p) => p.status === "published")
    .sort((a, b) => (a.publishedAt || 0) - (b.publishedAt || 0));
  const totalFollowers = user.channels.reduce((s, c) => s + (c.connected ? c.followers || 0 : 0), 0);
  const series: { date: number; followers: number; engagement: number }[] = [];
  const start = published[0]?.publishedAt || Date.now() - 14 * 864e5;
  for (let i = 0; i < 14; i++) {
    const day = start + i * 864e5;
    const dayPosts = published.filter((p) => p.publishedAt && p.publishedAt < day + 864e5);
    series.push({ date: day, followers: totalFollowers, engagement: dayPosts.length });
  }
  return series;
}

// ------------------------------------------------------------------ scheduler

export const SCHEDULE_MS = 15 * 1000;

export function nextRunAt(
  schedule: Campaign["schedule"],
  from: number = Date.now()
): number {
  const { mode = "recurring", frequency = "daily", time = "09:00", days = [], intervalDays = 1 } = schedule || {};
  if (mode === "once") return schedule.at || from;
  const [h, m] = (time || "09:00").split(":").map(Number);
  const base = new Date(from);
  if (frequency === "hourly") return from + 60 * 60 * 1000;
  if (frequency === "interval") return from + Math.max(1, Number(intervalDays) || 1) * 864e5;
  for (let i = 0; i < 8; i++) {
    const d = new Date(base.getTime() + i * 864e5);
    d.setHours(h || 9, m || 0, 0, 0);
    if (d.getTime() <= from) continue;
    if (frequency === "weekly" && days.length && !days.includes(d.getDay())) continue;
    return d.getTime();
  }
  return from + 864e5;
}

/** One pass of the autopilot: fire due campaigns, publish due scheduled posts, snapshot fame. */
export async function tick(): Promise<void> {
  for (const user of Object.values(getUsers())) {
    const now = Date.now();
    let changed = false;
    for (const c of user.campaigns) {
      if (!c.active || !c.nextRunAt || c.nextRunAt > now) continue;
      const posts = await publishCampaignAsync(user, c);
      c.postsCreated += posts.length;
      c.nextRunAt = nextRunAt(c.schedule, now);
      if (c.schedule.mode === "once") c.active = false;
      changed = true;
    }
    const due = user.posts.filter((p) => p.status === "scheduled" && p.scheduledAt && p.scheduledAt <= now);
    for (const p of due) {
      await publishPost(user, p);
      changed = true;
    }
    const lastSnap = user.fame.history[user.fame.history.length - 1];
    if (!lastSnap || now - lastSnap.t > 864e5) {
      user.fame.history.push({
        t: now,
        score: fameScore(user),
        followers: user.channels.reduce((s, c) => s + (c.connected ? c.followers || 0 : 0), 0),
      });
      if (user.fame.history.length > 60) user.fame.history = user.fame.history.slice(-60);
      changed = true;
    }
    if (changed) saveUser(user);
  }
}

// ------------------------------------------------------------------ optional real AI

export async function realAI(
  aiCfg: { provider: string; apiKey: string; baseUrl: string; model: string },
  kind: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const base = (aiCfg.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  const model =
    aiCfg.model ||
    (aiCfg.provider === "anthropic" ? "claude-3-5-sonnet-latest" : process.env.AI_MODEL || "gpt-4o-mini");
  const system =
    "You are a world-class social media growth strategist and copywriter. You write scroll-stopping, click-bait-worthy content that converts, matched to each platform's style and limits. Return ONLY valid JSON with the exact keys requested.";
  const userMsg = `Generate ${kind === "post" ? "a social media post" : kind === "bio" ? "a profile bio" : kind === "about" ? "an about section" : "click-bait headlines"}.\nPayload: ${JSON.stringify(payload)}\nReturn JSON ${
    kind === "post"
      ? "with keys {text, hashtags (array), headline}"
      : kind === "headlines"
        ? "as an array of {title}"
        : "with key {text}"
  }`;

  if (aiCfg.provider === "anthropic" || base.includes("anthropic")) {
    const r = await fetch(`${base}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": aiCfg.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const text = data.content?.[0]?.text || "";
    const json = text.replace(/```json|```/g, "").trim();
    try { return JSON.parse(json); } catch { return null; }
  }

  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiCfg.apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: userMsg }],
      temperature: 0.9,
    }),
  });
  if (!r.ok) return null;
  const data = await r.json();
  const text = data.choices?.[0]?.message?.content || "";
  const json = text.replace(/```json|```/g, "").trim();
  try { return JSON.parse(json); } catch { return null; }
}

/** Resolve effective AI config: per-user settings win, env falls back, else builtin. */
export function effectiveAiConfig(user: User) {
  const s = user.settings.ai;
  const envKey = process.env.AI_API_KEY || "";
  const provider = s.apiKey ? s.provider : envKey ? (process.env.AI_PROVIDER || "openai") : "builtin";
  const apiKey = s.apiKey || envKey;
  const baseUrl = s.baseUrl || process.env.AI_BASE_URL || "";
  const model = s.model || process.env.AI_MODEL || "";
  return { mode: provider, provider, apiKey, baseUrl, model } as const;
}

export function builtinAI(kind: string, body: Record<string, unknown>, user: User) {
  const b = { emoji: user.settings.brand.emoji, signature: user.settings.brand.signature };
  const opts = body as ai.GeneratePostOpts;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const num = (v: unknown) => (typeof v === "number" ? v : undefined);
  switch (kind) {
    case "post":
      return ai.generatePost({ ...opts, brand: { ...b, ...(opts.brand || {}) } });
    case "bio":
      return ai.generateBio({ ...opts, profile: user.profile, brand: b });
    case "about":
      return { text: ai.generateAbout(user.profile, str(opts.tone) || "professional") };
    case "headlines":
      return { headlines: ai.generateHeadlines(str(opts.topic) || "", num(opts.count) || 5) };
    case "ideas":
      return { ideas: ai.generatePostIdeas(str(opts.topic) || "", str(opts.audience) || "") };
    default:
      return { text: (ai.generatePost({ ...opts, brand: b }) as { text: string }).text };
  }
}
