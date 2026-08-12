// Platform definitions — OAuth endpoints, scopes, and API posting functions.
// Each platform exposes: id, name, authorizeUrl, tokenUrl, scopes, and post().

import crypto from "node:crypto";
import { getUsers, saveCredentialsRow } from "./db";

// ---- OAuth 1.0a signing helper (for X/Twitter legacy auth) ----

export function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

export function oauth1aSignature(
  method: string, url: string, params: Record<string, string>,
  consumerSecret: string, tokenSecret: string
): string {
  const sorted = Object.keys(params)
    .sort()
    .reduce((acc: string[], key) => {
      acc.push(percentEncode(key) + "=" + percentEncode(params[key]));
      return acc;
    }, [])
    .join("&");

  const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(sorted)].join("&");
  const signingKey = percentEncode(consumerSecret) + "&" + percentEncode(tokenSecret || "");
  return crypto.createHmac("sha1", signingKey).update(baseString).digest("base64");
}

export function oauth1aAuthHeader(
  method: string, url: string, params: Record<string, string>,
  consumerKey: string, consumerSecret: string, token: string, tokenSecret: string
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 32),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: token,
    oauth_version: "1.0",
  };
  const sigParams = { ...oauthParams, ...params };
  const signature = oauth1aSignature(method, url, sigParams, consumerSecret, tokenSecret);
  const headerParams: Record<string, string> = { ...oauthParams, oauth_signature: signature };
  return "OAuth " + Object.keys(headerParams)
    .sort()
    .map((k) => percentEncode(k) + '="' + percentEncode(headerParams[k]) + '"')
    .join(", ");
}

// ---- Platform definitions ----

export interface PlatformApi {
  id: string;
  name: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string;
  optionalScopes?: string[];
  extraAuthParams?: Record<string, string>;
  usePkce?: boolean;
  clientCredentialsInBody?: boolean;
  post: (accessToken: string, text: string, extra?: Record<string, unknown>) => Promise<unknown>;
  getPages?: (accessToken: string) => Promise<{ id: string; name: string; token?: string }[]>;
  getBoards?: (accessToken: string) => Promise<{ id: string; name: string }[]>;
  getIGAccounts?: (accessToken: string, pageId: string) => Promise<{ id: string; username?: string } | null>;
  getOrganizationPages?: (accessToken: string) => Promise<{ id: string; name: string; vanityName: string }[]>;
}

export const X: PlatformApi = {
  id: "x",
  name: "X / Twitter",
  authorizeUrl: "https://twitter.com/i/oauth2/authorize",
  tokenUrl: "https://api.twitter.com/2/oauth2/token",
  scopes: "tweet.write users.read offline.access",
  extraAuthParams: { code_challenge_method: "S256" },
  clientCredentialsInBody: true,
  async post(accessToken, text, extra = {}) {
    const e = extra as Record<string, string>;
    if (e.consumerKey && e.accessToken) {
      const url = "https://api.twitter.com/2/tweets";
      const authHeader = oauth1aAuthHeader(
        "POST", url, {},
        e.consumerKey, e.consumerSecret || "",
        e.accessToken, e.accessTokenSecret || ""
      );
      const r = await fetch(url, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.errors?.[0]?.message || err.detail || err.title || `X API error ${r.status}`);
      }
      return r.json();
    }
    const r = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.detail || err.title || `X API error ${r.status}`);
    }
    return r.json();
  },
};

export const LINKEDIN: PlatformApi = {
  id: "linkedin",
  name: "LinkedIn",
  authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
  tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
  usePkce: false,
  clientCredentialsInBody: true,
  scopes: "openid profile email w_member_social",
  optionalScopes: ["w_organization_social"],
  async post(accessToken, text, extra = {}) {
    const orgId = typeof extra.orgId === "string" ? extra.orgId : undefined;
    let author: string;
    if (orgId) {
      author = `urn:li:organization:${orgId}`;
    } else {
      const meR = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!meR.ok) throw new Error(`LinkedIn userinfo error ${meR.status}`);
      const me = await meR.json();
      author = `urn:li:person:${me.sub}`;
    }

    const r = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202505",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author,
        commentary: text,
        visibility: "PUBLIC",
        lifecycleState: "PUBLISHED",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || `LinkedIn API error ${r.status}`);
    }
    return r.json();
  },
  async getOrganizationPages(accessToken) {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
    };
    const aclR = await fetch(
      "https://api.linkedin.com/rest/organizationalEntityAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED&count=20",
      { headers }
    );
    if (!aclR.ok) return [];
    const acl = await aclR.json();
    const orgIds = (acl.elements || [])
      .map((el: { organizationalTarget?: string }) => (el.organizationalTarget || ""))
      .filter((urn: string) => urn.startsWith("urn:li:organization:"))
      .map((urn: string) => urn.replace("urn:li:organization:", ""))
      .filter(Boolean);
    const pages: { id: string; name: string; vanityName: string }[] = [];
    for (const id of orgIds.slice(0, 10)) {
      try {
        const r = await fetch(
          `https://api.linkedin.com/rest/organizations/${id}?projection=(localizedName,vanityName)`,
          { headers }
        );
        if (r.ok) {
          const org = await r.json();
          pages.push({ id, name: org.localizedName || `Organization ${id}`, vanityName: org.vanityName || "" });
        }
      } catch { /* skip unreadable org */ }
    }
    return pages;
  },
};

export const FACEBOOK: PlatformApi = {
  id: "facebook",
  name: "Facebook",
  authorizeUrl: "https://www.facebook.com/v26.0/dialog/oauth",
  tokenUrl: "https://graph.facebook.com/v26.0/oauth/access_token",
  usePkce: false,
  clientCredentialsInBody: true,
  scopes: "pages_manage_posts pages_show_list",
  async post(accessToken, text, extra = {}) {
    const pageId = typeof extra.pageId === "string" ? extra.pageId : undefined;
    const pageToken = (typeof extra.pageToken === "string" ? extra.pageToken : undefined) || accessToken;
    if (!pageId) throw new Error("Facebook page ID required. Connect a Facebook Page in Settings.");

    const r = await fetch(`https://graph.facebook.com/v26.0/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, access_token: pageToken }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error?.message || `Facebook API error ${r.status}`);
    }
    return r.json();
  },
  async getPages(accessToken) {
    const r = await fetch(`https://graph.facebook.com/v26.0/me/accounts?access_token=${accessToken}`);
    if (!r.ok) return [];
    const data = await r.json();
    return (data.data || []).map((p: { id: string; name: string; access_token?: string }) => ({ id: p.id, name: p.name, token: p.access_token }));
  },
};

export const INSTAGRAM: PlatformApi = {
  id: "instagram",
  name: "Instagram",
  authorizeUrl: "https://www.facebook.com/v26.0/dialog/oauth",
  tokenUrl: "https://graph.facebook.com/v26.0/oauth/access_token",
  usePkce: false,
  clientCredentialsInBody: true,
  scopes: "instagram_business_basic instagram_business_content_publish pages_read_user_content pages_show_list",
  async post() {
    throw new Error(
      "Instagram API requires an image or video. Use the Composer to attach media, or post to other platforms. Text-only posts are not supported by the Instagram Graph API."
    );
  },
  async getIGAccounts(accessToken, pageId) {
    const r = await fetch(
      `https://graph.facebook.com/v26.0/${pageId}?fields=instagram_business_account{id,username}&access_token=${accessToken}`
    );
    if (!r.ok) return null;
    const data = await r.json();
    return data.instagram_business_account || null;
  },
};

export const THREADS: PlatformApi = {
  id: "threads",
  name: "Threads",
  authorizeUrl: "https://www.facebook.com/v26.0/dialog/oauth",
  tokenUrl: "https://graph.facebook.com/v26.0/oauth/access_token",
  usePkce: false,
  clientCredentialsInBody: true,
  scopes: "threads_basic threads_content_publish",
  async post(accessToken, text, extra = {}) {
    const threadsUserId = typeof extra.threadsUserId === "string" ? extra.threadsUserId : undefined;
    if (!threadsUserId) throw new Error("Threads user ID required. Connect Threads in Settings.");

    const container = await fetch(`https://graph.facebook.com/v26.0/${threadsUserId}/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_type: "TEXT", text, access_token: accessToken }),
    });
    if (!container.ok) {
      const err = await container.json().catch(() => ({}));
      throw new Error(err.error?.message || `Threads container error ${container.status}`);
    }
    const { id: containerId } = await container.json();

    const pub = await fetch(`https://graph.facebook.com/v26.0/${threadsUserId}/threads_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: containerId, access_token: accessToken }),
    });
    if (!pub.ok) {
      const err = await pub.json().catch(() => ({}));
      throw new Error(err.error?.message || `Threads publish error ${pub.status}`);
    }
    return pub.json();
  },
};

export const YOUTUBE: PlatformApi = {
  id: "youtube",
  name: "YouTube",
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes: "https://www.googleapis.com/auth/youtube.upload openid profile",
  extraAuthParams: { access_type: "offline", prompt: "consent" },
  async post() {
    throw new Error(
      "YouTube Community Posts API is not publicly available for text posts. Video uploads require media files."
    );
  },
};

export const PINTEREST: PlatformApi = {
  id: "pinterest",
  name: "Pinterest",
  authorizeUrl: "https://www.pinterest.com/oauth/",
  tokenUrl: "https://api.pinterest.com/v5/oauth/token",
  scopes: "pins:write,boards:read,user_accounts:read",
  async post(accessToken, text, extra = {}) {
    const boardId = typeof extra.boardId === "string" ? extra.boardId : undefined;
    const imageUrl = typeof extra.imageUrl === "string" ? extra.imageUrl : undefined;
    const link = typeof extra.link === "string" ? extra.link : undefined;
    if (!boardId) throw new Error("Pinterest board ID required. Select a board in Settings.");
    if (!imageUrl && !link) {
      throw new Error("Pinterest Pins require an image URL or link. Text-only Pins are not supported.");
    }
    const body: Record<string, unknown> = {
      board_id: boardId,
      title: text.slice(0, 100),
      description: text,
    };
    if (link) body.link = link;
    if (imageUrl) body.media_source = { source_type: "image_url", url: imageUrl };

    const r = await fetch("https://api.pinterest.com/v5/pins", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || `Pinterest API error ${r.status}`);
    }
    return r.json();
  },
  async getBoards(accessToken) {
    const r = await fetch("https://api.pinterest.com/v5/boards?page_size=25", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!r.ok) return [];
    const data = await r.json();
    return (data.items || []).map((b: { id: string; name: string }) => ({ id: b.id, name: b.name }));
  },
};

export const TIKTOK: PlatformApi = {
  id: "tiktok",
  name: "TikTok",
  authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
  tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
  scopes: "user.info.basic,video.publish",
  extraAuthParams: {},
  clientCredentialsInBody: true,
  async post() {
    throw new Error(
      "TikTok API requires a video file for posting. Text-only posts are not supported. In dev mode, posts are private and limited to 5 accounts until your app passes TikTok audit."
    );
  },
};

// ---- Post-OAuth auto-configuration ----

export async function autoConfigurePlatform(userId: string, platformId: string): Promise<void> {
  const { getValidAccessToken } = await import("./oauth");

  const users = getUsers();
  const user = users[userId];
  if (!user) return;

  // Per-user extra creds live in the credentials row.
  const { getCredentialsRow } = await import("./db");
  const credsRow = getCredentialsRow(userId, platformId);
  const extra = credsRow?.extra || {};
  const hasClientId = !!credsRow?.clientId || !!envClientId(platformId);
  const hasOAuth1a = platformId === "x" && !!extra.consumerKey && !!extra.accessToken;

  let token: string | null = null;
  if (hasClientId) {
    token = await getValidAccessToken(userId, platformId);
    if (!token && hasOAuth1a) token = "oauth1a";
  } else if (hasOAuth1a) {
    token = "oauth1a";
  } else {
    token = await getValidAccessToken(userId, platformId);
  }
  if (!token) return;

  const platform = PLATFORM_APIS[platformId];
  if (!platform) return;

  const mergeExtra = (pid: string, patch: Record<string, unknown>) => {
    const row = getCredentialsRow(userId, pid);
    saveCredentialsRow(userId, pid, {
      clientId: row?.clientId || "",
      clientSecret: row?.clientSecret || "",
      extra: { ...(row?.extra || {}), ...patch },
    });
  };

  if (platformId === "x") {
    if (hasOAuth1a) {
      try {
        const url = "https://api.twitter.com/2/users/me";
        const authHeader = oauth1aAuthHeader(
          "GET", url, { "user.fields": "public_metrics" },
          String(extra.consumerKey), String(extra.consumerSecret || ""),
          String(extra.accessToken), String(extra.accessTokenSecret || "")
        );
        const r = await fetch(`${url}?user.fields=public_metrics`, { headers: { Authorization: authHeader } });
        if (r.ok) {
          const { data } = await r.json();
          const ch = user.channels?.find((c) => c.id === "x");
          if (ch && data) {
            if (data.username) ch.handle = "@" + data.username;
            if (data.public_metrics?.followers_count != null) ch.followers = data.public_metrics.followers_count;
          }
        }
      } catch { /* profile fetch may fail */ }
    } else {
      try {
        const r = await fetch("https://api.twitter.com/2/users/me?user.fields=public_metrics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.ok) {
          const { data } = await r.json();
          const ch = user.channels?.find((c) => c.id === "x");
          if (ch && data) {
            if (data.username) ch.handle = "@" + data.username;
            if (data.public_metrics?.followers_count != null) ch.followers = data.public_metrics.followers_count;
          }
        }
      } catch { /* profile fetch may fail */ }
    }
  }

  if (platformId === "linkedin") {
    try {
      const r = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const me = await r.json();
        const ch = user.channels?.find((c) => c.id === "linkedin");
        if (ch && me.name) ch.handle = "/in/" + me.name.toLowerCase().replace(/\s+/g, "-");
      }
    } catch { /* profile fetch may fail */ }

    const liExtra = getCredentialsRow(userId, "linkedin")?.extra || {};
    const orgPostingEnabled = liExtra.enableOrgPosting === true || ((liExtra.linkedinOrgPages as unknown[])?.length || 0) > 0;
    if (orgPostingEnabled) {
      try {
        const pages = (await LINKEDIN.getOrganizationPages?.(token)) || [];
        const current = getCredentialsRow(userId, "linkedin")?.extra?.orgId;
        const keep = current === "" || (current && pages.some((p) => p.id === current));
        mergeExtra("linkedin", {
          linkedinOrgPages: pages,
          ...(keep ? {} : { orgId: pages.length ? pages[0].id : "" }),
        });
      } catch { /* org pages fetch may fail */ }
    }
  }

  if (platformId === "instagram") {
    try {
      const pages = (await FACEBOOK.getPages?.(token)) || [];
      if (pages.length > 0) {
        mergeExtra("facebook", { pageId: pages[0].id, pageToken: pages[0].token });
        const ig = (await INSTAGRAM.getIGAccounts?.(token, pages[0].id)) || null;
        if (ig) mergeExtra("instagram", { igUserId: ig.id });
      }
    } catch { /* pages or IG account may not be available */ }
  }

  if (platformId === "facebook") {
    try {
      const pages = (await FACEBOOK.getPages?.(token)) || [];
      if (pages.length > 0) {
        mergeExtra("facebook", { pageId: pages[0].id, pageToken: pages[0].token });
        try {
          const ig = (await INSTAGRAM.getIGAccounts?.(token, pages[0].id)) || null;
          if (ig) mergeExtra("instagram", { igUserId: ig.id });
        } catch { /* Instagram may not be connected */ }
      }
    } catch { /* pages fetch may fail */ }
  }

  if (platformId === "youtube") {
    try {
      const r = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const data = await r.json();
        const ch = user.channels?.find((c) => c.id === "youtube");
        const item = data.items?.[0];
        if (ch && item) {
          if (item.snippet?.customUrl) ch.handle = item.snippet.customUrl;
          else if (item.snippet?.title) ch.handle = "/channel/" + item.snippet.title;
          if (item.statistics?.subscriberCount != null) ch.followers = parseInt(item.statistics.subscriberCount, 10) || 0;
        }
      }
    } catch { /* channel fetch may fail */ }
  }

  if (platformId === "tiktok") {
    try {
      const r = await fetch("https://open.tiktokapis.com/v2/user/info/", { headers: { Authorization: `Bearer ${token}` } });
      if (r.ok) {
        const { data } = await r.json();
        const info = data?.user;
        const ch = user.channels?.find((c) => c.id === "tiktok");
        if (ch && info) {
          if (info.display_name) ch.handle = "@" + info.display_name.replace(/\s+/g, "");
          if (info.follower_count != null) ch.followers = info.follower_count;
        }
      }
    } catch { /* user info fetch may fail */ }
  }

  if (platformId === "threads") {
    try {
      const r = await fetch(`https://graph.facebook.com/v26.0/me?fields=id&access_token=${token}`);
      if (r.ok) {
        const data = await r.json();
        if (data.id) mergeExtra("threads", { threadsUserId: data.id });
      }
    } catch { /* may fail if token lacks threads_basic scope */ }
  }

  if (platformId === "pinterest") {
    try {
      const boards = (await PINTEREST.getBoards?.(token)) || [];
      if (boards.length > 0) mergeExtra("pinterest", { boardId: boards[0].id });
    } catch { /* boards fetch may fail */ }
  }

  // Persist channel changes
  const { saveUser } = await import("./db");
  saveUser(user);
}

export function envClientId(platformId: string): string {
  const aliases: Record<string, string> = {
    x: "X_API_KEY",
    facebook: "FACEBOOK_APP_ID",
    instagram: "INSTAGRAM_APP_ID",
    threads: "THREADS_APP_ID",
  };
  return process.env[aliases[platformId] || `${platformId.toUpperCase()}_CLIENT_ID`] || "";
}

export function envClientSecret(platformId: string): string {
  const aliases: Record<string, string> = {
    x: "X_API_SECRET",
    facebook: "FACEBOOK_APP_SECRET",
    instagram: "INSTAGRAM_APP_SECRET",
    threads: "THREADS_APP_SECRET",
  };
  return process.env[aliases[platformId] || `${platformId.toUpperCase()}_CLIENT_SECRET`] || "";
}

// Map of all real-platform integrations keyed by channel ID
export const PLATFORM_APIS: Record<string, PlatformApi> = {
  x: X,
  linkedin: LINKEDIN,
  facebook: FACEBOOK,
  instagram: INSTAGRAM,
  threads: THREADS,
  youtube: YOUTUBE,
  pinterest: PINTEREST,
  tiktok: TIKTOK,
};

export const TEXT_POSTABLE = ["x", "linkedin", "facebook", "threads"];
export const MEDIA_ONLY = ["instagram", "tiktok", "pinterest", "youtube"];
export const SIMULATED_ONLY = ["snapchat", "indeed", "website", "resume"];
