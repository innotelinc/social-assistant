// Core domain types for SocialAI.

export interface PlatformDef {
  id: string;
  name: string;
  category: "social" | "professional" | "hub";
  color: string;
  glow: string;
  handleType: string;
  charLimit: number;
  emoji: string;
}

export const PLATFORMS: PlatformDef[] = [
  { id: "instagram", name: "Instagram", category: "social", color: "#E1306C", glow: "#ff2d78", handleType: "@handle", charLimit: 2200, emoji: "📸" },
  { id: "tiktok", name: "TikTok", category: "social", color: "#25F4EE", glow: "#fe2c55", handleType: "@handle", charLimit: 2200, emoji: "🎵" },
  { id: "x", name: "X / Twitter", category: "social", color: "#e7e9ea", glow: "#94a3b8", handleType: "@handle", charLimit: 280, emoji: "✖️" },
  { id: "facebook", name: "Facebook", category: "social", color: "#1877F2", glow: "#1877f2", handleType: "/page", charLimit: 63206, emoji: "👍" },
  { id: "youtube", name: "YouTube", category: "social", color: "#FF0000", glow: "#ff0000", handleType: "/channel", charLimit: 5000, emoji: "▶️" },
  { id: "snapchat", name: "Snapchat", category: "social", color: "#FFFC00", glow: "#ffd60a", handleType: "@username", charLimit: 250, emoji: "👻" },
  { id: "threads", name: "Threads", category: "social", color: "#f5f5f5", glow: "#c084fc", handleType: "@handle", charLimit: 500, emoji: "🧵" },
  { id: "pinterest", name: "Pinterest", category: "social", color: "#E60023", glow: "#e60023", handleType: "/user", charLimit: 500, emoji: "📌" },
  { id: "linkedin", name: "LinkedIn", category: "professional", color: "#0A66C2", glow: "#0a66c2", handleType: "/in/name", charLimit: 3000, emoji: "💼" },
  { id: "indeed", name: "Indeed", category: "professional", color: "#2557A7", glow: "#3b82f6", handleType: "/profile", charLimit: 4000, emoji: "🔍" },
  { id: "website", name: "Personal Website", category: "hub", color: "#a855f7", glow: "#a855f7", handleType: "URL", charLimit: 99999, emoji: "🌐" },
  { id: "resume", name: "Resume / Portfolio", category: "hub", color: "#ff2d78", glow: "#ff2d78", handleType: "PDF", charLimit: 99999, emoji: "📄" },
];

export const platformName = (id: string) => PLATFORMS.find((p) => p.id === id)?.name || "Social";

export interface Channel {
  id: string;
  enabled: boolean;
  connected: boolean;
  handle: string;
  followers: number;
  posts: number;
  // OAuth tokens live here server-side only; stripped before sending to the client.
  oauth?: {
    accessToken?: string;
    refreshToken?: string | null;
    expiresAt?: number | null;
    scope?: string;
  } | null;
}

export interface Post {
  id: string;
  channelIds: string[];
  content: string;
  status: "draft" | "scheduled" | "published" | "failed";
  scheduledAt: number | null;
  campaignId: string | null;
  publishedAt: number | null;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    reach: number;
    rate: number;
  } | null;
  results: {
    channelId: string;
    ok: boolean;
    real: boolean;
    simulated: boolean;
    error?: string;
  }[] | null;
  createdAt: number;
}

export interface Campaign {
  id: string;
  name: string;
  goal: string;
  topic: string;
  product: string;
  audience: string;
  channels: string[];
  schedule: {
    mode: "recurring" | "once";
    frequency: "daily" | "weekly" | "hourly" | "interval";
    time: string;
    days: number[];
    intervalDays: number;
    at?: number;
  };
  ai: { enabled: boolean; tone: string; type: string; length: string };
  content?: string;
  active: boolean;
  autoPilot: boolean;
  nextRunAt: number | null;
  postsCreated: number;
  createdAt: number;
}

export interface ActivityItem {
  id: string;
  message: string;
  kind: string;
  at: number;
}

export interface UserState {
  email: string;
  name: string;
  channels: Channel[];
  profile: {
    name: string;
    headline: string;
    about: string;
    location: string;
    email: string;
    phone: string;
    website: string;
    avatar: { style: string; from: string; to: string; emoji: string; label: string };
    skills: string[];
    experience: unknown[];
    education: unknown[];
    services: string[];
  };
  resume: {
    template: string;
    accent: string;
    targetRole: string;
    summary: string;
    sections: Record<string, boolean>;
  };
  site: {
    theme: string;
    accent: string;
    headline: string;
    subheadline: string;
    slug: string;
    published: boolean;
    ctaText: string;
    ctaLink: string;
    sections: Record<string, boolean>;
  };
  settings: {
    ai: { mode: "builtin" | "api"; provider: string; apiKey: string; baseUrl: string; model: string };
    brand: { voice: string; emoji: string; signature: string };
  };
  campaigns: Campaign[];
  posts: Post[];
  activity: ActivityItem[];
  fame: { history: { t: number; score: number; followers: number }[] };
  createdAt: number;
}

export interface User extends UserState {
  id: string;
  salt: string;
  hash: string;
  aiUsage: { date: string; count: number };
}

export function defaultChannels(): Channel[] {
  return PLATFORMS.map((p) => ({
    id: p.id,
    enabled: true,
    connected: false,
    handle: "",
    followers: 0,
    posts: 0,
  }));
}

export function defaultState(name: string, email: string): UserState {
  return {
    email,
    name,
    channels: defaultChannels(),
    profile: {
      name,
      headline: "",
      about: "",
      location: "",
      email,
      phone: "",
      website: "",
      avatar: { style: "gradient", from: "#ff2d78", to: "#a855f7", emoji: "🔥", label: (name || "S").slice(0, 2).toUpperCase() },
      skills: [],
      experience: [],
      education: [],
      services: [],
    },
    resume: {
      template: "modern",
      accent: "#ff2d78",
      targetRole: "",
      summary: "",
      sections: { summary: true, skills: true, experience: true, education: true, services: true, socials: true },
    },
    site: {
      theme: "dark",
      accent: "#ff2d78",
      headline: "",
      subheadline: "",
      slug: "",
      published: false,
      ctaText: "Work With Me",
      ctaLink: "",
      sections: { hero: true, about: true, services: true, socials: true, contact: true },
    },
    settings: {
      ai: { mode: "builtin", provider: "openai", apiKey: "", baseUrl: "", model: "" },
      brand: { voice: "hype", emoji: "🔥", signature: name ? name.split(" ")[0] : "Me" },
    },
    campaigns: [],
    posts: [],
    activity: [],
    fame: { history: [] },
    createdAt: Date.now(),
  };
}

// Merge a parsed state blob with defaults so old records never crash endpoints.
export function migrateState(state: Partial<UserState>, name: string, email: string): UserState {
  const base = defaultState(name, email);
  const out = { ...base, ...state } as UserState;
  if (!Array.isArray(out.channels) || out.channels.length === 0) out.channels = base.channels;
  if (!Array.isArray(out.campaigns)) out.campaigns = [];
  if (!Array.isArray(out.posts)) out.posts = [];
  if (!Array.isArray(out.activity)) out.activity = [];
  out.settings = { ...base.settings, ...(out.settings || {}) };
  out.profile = { ...base.profile, ...(out.profile || {}) };
  out.resume = { ...base.resume, ...(out.resume || {}) };
  out.site = { ...base.site, ...(out.site || {}) };
  out.fame = { ...base.fame, ...(out.fame || {}) };
  return out;
}

export type PlanId = "free" | "creator" | "business" | "agency";

export interface PlanLimits {
  id: PlanId;
  name: string;
  priceCents: number | null;
  maxChannels: number; // connected platforms allowed
  aiGenerationsPerDay: number; // -1 = unlimited
  description: string;
}

export const PLANS: PlanLimits[] = [
  { id: "free", name: "Free", priceCents: 0, maxChannels: 3, aiGenerationsPerDay: 10, description: "Perfect for trying SocialAI — 3 connected platforms and daily AI help." },
  { id: "creator", name: "Creator", priceCents: 4900, maxChannels: 8, aiGenerationsPerDay: 100, description: "For solo creators — connect every platform, full autopilot." },
  { id: "business", name: "Business", priceCents: 14900, maxChannels: 8, aiGenerationsPerDay: 500, description: "For growing brands — priority AI and richer analytics." },
  { id: "agency", name: "Agency", priceCents: 49900, maxChannels: 8, aiGenerationsPerDay: -1, description: "For agencies & teams — unlimited AI, everything unlocked." },
];
