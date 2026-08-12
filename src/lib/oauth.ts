// Unified OAuth 2.0 with PKCE handler.
// Handles: authorize redirect → callback → token exchange → token refresh → secure storage.

import crypto from "node:crypto";
import { getUser, updateUser, getCredentialsRow, saveCredentialsRow } from "./db";
import { PLATFORM_APIS, envClientId, envClientSecret, type PlatformApi } from "./platforms";

// In-memory state store — maps state → { userId, platform, codeVerifier }
const pendingStates = new Map<string, { userId: string; platform: string; verifier: string; createdAt: number }>();

const uid = () => crypto.randomUUID();
const base64URL = (buf: Buffer) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest();

function pkceChallenge() {
  const verifier = base64URL(crypto.randomBytes(48));
  const challenge = base64URL(sha256(verifier));
  return { verifier, challenge };
}

// Build the authorize URL for a given platform
export function buildAuthorizeUrl(userId: string, platformId: string, redirectBase: string): string {
  const platform: PlatformApi | undefined = PLATFORM_APIS[platformId];
  if (!platform) throw new Error(`Unknown platform: ${platformId}`);

  const { verifier, challenge } = pkceChallenge();
  const state = uid();
  const creds = getCreds(userId, platformId);

  if (!creds.clientId) {
    throw new Error(
      `No API credentials configured for ${platform.name}. Add your ${platform.name} Client ID & Secret in Settings → Platform API Keys first.`
    );
  }

  const redirectUri = `${redirectBase}/api/oauth/${platformId}/callback`;

  pendingStates.set(state, { userId, platform: platformId, verifier, createdAt: Date.now() });
  for (const [k, v] of pendingStates) {
    if (Date.now() - v.createdAt > 600_000) pendingStates.delete(k);
  }

  const usePkce = platform.usePkce !== false;

  const orgPostingEnabled =
    creds.extra?.enableOrgPosting === true || ((creds.extra?.linkedinOrgPages as unknown[])?.length || 0) > 0;
  let scopes = platform.scopes;
  if (platform.optionalScopes?.length && orgPostingEnabled) {
    scopes = [scopes, ...platform.optionalScopes].filter(Boolean).join(" ");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: creds.clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state,
    ...(platform.extraAuthParams || {}),
  });

  if (usePkce) {
    params.set("code_challenge", challenge);
    params.set("code_challenge_method", platform.extraAuthParams?.code_challenge_method || "S256");
  }

  return `${platform.authorizeUrl}?${params.toString()}`;
}

// Handle OAuth callback — exchange code for tokens
export async function handleCallback(platformId: string, code: string, state: string, redirectBase: string) {
  const pending = pendingStates.get(state);
  if (!pending || pending.platform !== platformId) {
    throw new Error("Invalid or expired OAuth state. Please try connecting again.");
  }
  pendingStates.delete(state);

  const platform: PlatformApi | undefined = PLATFORM_APIS[platformId];
  if (!platform) throw new Error(`Unknown platform: ${platformId}`);

  const creds = getCreds(pending.userId, platformId);
  const base = redirectBase || process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
  const redirectUri = `${base}/api/oauth/${platformId}/callback`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: creds.clientId,
  });

  if (platform.usePkce !== false) {
    body.set("code_verifier", pending.verifier);
  }

  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (!platform.clientCredentialsInBody) {
    const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
    headers["Authorization"] = `Basic ${basic}`;
  } else if (creds.clientSecret) {
    body.set("client_secret", creds.clientSecret);
  }

  const r = await fetch(platform.tokenUrl, { method: "POST", headers, body: body.toString() });
  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    throw new Error(`Token exchange failed (${r.status}): ${errText.slice(0, 200)}`);
  }

  const data = await r.json();
  const tokens: { accessToken: string; refreshToken: string | null; expiresAt: number | null; scope: string } = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
    scope: data.scope || platform.scopes,
  };

  // Meta platforms: exchange short-lived token (~2h) for long-lived (~60 days)
  if (platform.tokenUrl.includes("graph.facebook.com") && tokens.accessToken) {
    try {
      const llBody = new URLSearchParams({
        grant_type: "fb_exchange_token",
        fb_exchange_token: tokens.accessToken,
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
      });
      const llR = await fetch(platform.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: llBody.toString(),
      });
      if (llR.ok) {
        const llData = await llR.json();
        tokens.accessToken = llData.access_token;
        tokens.expiresAt = llData.expires_in ? Date.now() + llData.expires_in * 1000 : Date.now() + 60 * 864e5;
        tokens.refreshToken = llData.access_token;
      }
    } catch { /* best-effort */ }
  }

  storeTokens(pending.userId, platformId, tokens);
  return { platformId, tokens, userId: pending.userId };
}

// Refresh an expired access token
export async function refreshToken(userId: string, platformId: string): Promise<string | null> {
  const platform: PlatformApi | undefined = PLATFORM_APIS[platformId];
  if (!platform) return null;

  const tokens = getStoredTokens(userId, platformId);
  if (!tokens?.refreshToken) return null;

  const creds = getCreds(userId, platformId);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokens.refreshToken,
    client_id: creds.clientId,
  });
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (!platform.clientCredentialsInBody) {
    const basic = Buffer.from(`${creds.clientId}:${creds.clientSecret}`).toString("base64");
    headers["Authorization"] = `Basic ${basic}`;
  } else if (creds.clientSecret) {
    body.set("client_secret", creds.clientSecret);
  }

  try {
    const r = await fetch(platform.tokenUrl, { method: "POST", headers, body: body.toString() });
    if (!r.ok) return null;
    const data = await r.json();
    const newTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || tokens.refreshToken,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
      scope: data.scope || tokens.scope,
    };
    storeTokens(userId, platformId, newTokens);
    return newTokens.accessToken;
  } catch {
    return null;
  }
}

// Get a valid access token (refreshing if needed)
export async function getValidAccessToken(userId: string, platformId: string): Promise<string | null> {
  const tokens = getStoredTokens(userId, platformId);
  if (!tokens?.accessToken) return null;
  if (!tokens.expiresAt || tokens.expiresAt > Date.now() + 60_000) {
    return tokens.accessToken;
  }
  const fresh = await refreshToken(userId, platformId);
  return fresh || tokens.accessToken;
}

// ---- Storage helpers ----

export function getCreds(userId: string, platformId: string): {
  clientId: string;
  clientSecret: string;
  extra: Record<string, unknown>;
} {
  const row = getCredentialsRow(userId, platformId);
  return {
    clientId: row?.clientId || envClientId(platformId),
    clientSecret: row?.clientSecret || envClientSecret(platformId),
    extra: row?.extra || {},
  };
}

export function getStoredTokens(userId: string, platformId: string) {
  const user = getUser(userId);
  if (!user) return null;
  const ch = user.channels?.find((c) => c.id === platformId);
  return ch?.oauth || null;
}

export function storeTokens(
  userId: string, platformId: string,
  tokens: { accessToken: string; refreshToken: string | null; expiresAt: number | null; scope: string }
): void {
  updateUser(userId, (user) => {
    const ch = user.channels.find((c) => c.id === platformId);
    if (ch) {
      ch.oauth = tokens;
      ch.connected = true;
    }
  });
}

export function disconnectPlatform(userId: string, platformId: string): void {
  updateUser(userId, (user) => {
    const ch = user.channels.find((c) => c.id === platformId);
    if (ch) {
      delete ch.oauth;
      ch.connected = false;
    }
  });
}

export function getConnectionStatus(userId: string, platformId: string) {
  const tokens = getStoredTokens(userId, platformId);
  const creds = getCreds(userId, platformId);
  return {
    configured: !!creds.clientId,
    connected: !!tokens?.accessToken,
    expiresAt: tokens?.expiresAt || null,
    hasRefresh: !!tokens?.refreshToken,
  };
}

// Save platform developer credentials (patch semantics, extra merged)
export function saveCredentials(
  userId: string, platformId: string,
  clientId?: string, clientSecret?: string,
  extra: Record<string, unknown> = {}, replaceExtra = false
): void {
  const existing = getCredentialsRow(userId, platformId);
  saveCredentialsRow(userId, platformId, {
    clientId: clientId !== undefined ? clientId : existing?.clientId || envClientId(platformId),
    clientSecret: clientSecret !== undefined ? clientSecret : existing?.clientSecret || envClientSecret(platformId),
    extra: replaceExtra ? extra : { ...(existing?.extra || {}), ...extra },
  });
}

// Every OAuth popup success must mark the channel connected even before
// auto-configure runs; storeTokens does this on callback.
