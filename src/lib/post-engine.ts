// Post engine — routes publishing to real APIs or simulated fallback.

import { getValidAccessToken } from "./oauth";
import { PLATFORM_APIS, TEXT_POSTABLE, MEDIA_ONLY, SIMULATED_ONLY } from "./platforms";
import { getUser } from "./db";

export interface PostResult {
  success: boolean;
  real: boolean;
  simulated: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Attempt to post content to a platform via its real API.
 * Falls back to simulation when no credentials/tokens exist, or the platform
 * doesn't support text-only posting.
 */
export async function postToPlatform(userId: string, channelId: string, text: string): Promise<PostResult> {
  if (SIMULATED_ONLY.includes(channelId)) {
    return { success: true, real: false, simulated: true };
  }

  const platform = PLATFORM_APIS[channelId];
  if (!platform) {
    return { success: true, real: false, simulated: true };
  }

  if (MEDIA_ONLY.includes(channelId)) {
    return {
      success: true,
      real: false,
      simulated: true,
      error: `${platform.name} requires media (image/video). Post was simulated — attach media to post for real.`,
    };
  }

  const user = getUser(userId);
  const { getCredentialsRow } = await import("./db");
  const creds = getCredentialsRow(userId, channelId);
  const extra = creds?.extra || {};

  const hasOAuth2Creds = !!creds?.clientId || !!process.env[`${channelId.toUpperCase()}_CLIENT_ID`];
  const hasOAuth1a = channelId === "x" && !!extra.consumerKey && !!extra.accessToken;

  let token: string | null = null;
  if (hasOAuth2Creds) {
    token = await getValidAccessToken(userId, channelId);
    if (!token && hasOAuth1a) token = "oauth1a";
  } else if (hasOAuth1a) {
    token = "oauth1a";
  } else {
    token = await getValidAccessToken(userId, channelId);
  }
  if (!token) {
    return { success: true, real: false, simulated: true };
  }

  void user;
  try {
    const result = await platform.post(token, text, extra);
    return { success: true, real: true, simulated: false, result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isAuthError = /unauthorized|forbidden|401|403|invalid.token|expired.token/i.test(msg);
    const hint = isAuthError
      ? ` — Your ${platform.name} access token may be expired or revoked. Reconnect the channel to refresh it.`
      : "";
    return { success: true, real: false, simulated: true, error: msg + hint };
  }
}

/** Platforms that can actually post text via API. */
export { TEXT_POSTABLE };

/** Check if a real post is possible for a channel right now. */
export async function canPostReal(userId: string, channelId: string): Promise<boolean> {
  if (SIMULATED_ONLY.includes(channelId)) return false;
  if (MEDIA_ONLY.includes(channelId)) return false;
  const token = await getValidAccessToken(userId, channelId);
  return !!token;
}
