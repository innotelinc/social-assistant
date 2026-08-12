// OAuth callback — the provider redirects the popup here after authorization.

import { NextRequest } from "next/server";
import { handleCallback } from "@/lib/oauth";
import { autoConfigurePlatform } from "@/lib/platforms";
import { htmlPage, escHtml } from "@/lib/api";

export const dynamic = "force-dynamic";

const PLATFORM_ALIASES: Record<string, string> = { twitter: "x" };

export async function GET(req: NextRequest, { params }: { params: Promise<{ platform: string }> }) {
  const { platform: raw } = await params;
  const platform = PLATFORM_ALIASES[raw] || raw;

  if (!/^[a-z]+$/.test(platform)) {
    return htmlPage("Invalid platform", "<h1 class='err'>❌ Invalid platform</h1>");
  }

  const search = req.nextUrl.searchParams;
  const code = search.get("code");
  const state = search.get("state");
  const oauthError = search.get("error");
  const errorDescription = search.get("error_description");

  if (oauthError) {
    return htmlPage(
      "Connection Failed",
      `<h1 class="err">❌ Connection Failed</h1><p>${escHtml(errorDescription || oauthError)}</p>
       <script>setTimeout(()=>{window.close()},4000)</script>`
    );
  }

  if (!code || !state) {
    return htmlPage(
      "Error",
      `<h1 class="err">❌ Invalid Callback</h1><p>Missing authorization code or state. Please try connecting again.</p>
       <script>setTimeout(()=>{window.close()},5000)</script>`
    );
  }

  try {
    const redirectBase = process.env.PUBLIC_URL || req.headers.get("origin") || "http://localhost:3000";
    const { userId } = await handleCallback(platform, code, state, redirectBase);
    await autoConfigurePlatform(userId, platform).catch(() => {});
    return htmlPage(
      "Connected!",
      `<div class="ring">✅</div><h1 style="color:#34d399">Connected!</h1><p>${escHtml(platform)} is now linked to SocialAI.</p>
       <script>
         if (window.opener) {
           window.opener.postMessage({ type: 'OAUTH_SUCCESS', platform: ${JSON.stringify(escHtml(platform))} }, window.location.origin);
           setTimeout(() => window.close(), 800);
         } else {
           setTimeout(() => { window.location.href = '/dashboard/channels'; }, 2000);
         }
       </script>`
    );
  } catch (e) {
    return htmlPage(
      "Error",
      `<h1 class="err">❌ Error</h1><p>${escHtml(e instanceof Error ? e.message : "OAuth failed")}</p>
       <script>setTimeout(()=>{window.close()},5000)</script>`
    );
  }
}
