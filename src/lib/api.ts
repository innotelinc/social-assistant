// Server-side helpers for API route handlers.

import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import type { User } from "./types";

export async function requireUser(): Promise<{ user: User } | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { user };
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

const esc = (s: unknown) => {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(s ?? "").replace(/[&<>"']/g, (c) => map[c]);
};

/** HTML pages for the OAuth popup (provider redirects here after authorize). */
export function htmlPage(title: string, bodyHtml: string, extraHead = ""): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>
        body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a14;color:#f5f5fb;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center}
        .wrap{max-width:420px;padding:24px}
        .ring{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#ff2d78,#a855f7);display:grid;place-items:center;font-size:36px;margin:0 auto 20px;animation:pop .4s cubic-bezier(.34,1.56,.64,1)}
        @keyframes pop{from{transform:scale(0);opacity:0}}
        h1{font-size:22px;margin:0 0 8px}
        p{color:#a1a1c2;font-size:14px;line-height:1.5;margin:0}
        .err{color:#f87171}
        ${extraHead}
      </style></head><body><div class="wrap">${bodyHtml}</div></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}

export const escHtml = esc;
