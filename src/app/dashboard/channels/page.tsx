"use client";

import React from "react";
import { api, post } from "@/lib/client-api";
import { Card, Button, Badge, useToast, Spinner, EmptyState } from "@/components/ui";
import { PlatformIcon } from "@/components/platform-icon";
import { PLATFORMS } from "@/lib/types";

interface Status {
  configured: boolean;
  connected: boolean;
  expiresAt: number | null;
  hasRefresh: boolean;
}

export default function ChannelsPage() {
  const [channels, setChannels] = React.useState<{ id: string; enabled: boolean; connected: boolean; handle: string; followers: number; posts: number }[]>([]);
  const [statuses, setStatuses] = React.useState<Record<string, Status>>({});
  const [connecting, setConnecting] = React.useState<string | null>(null);
  const [limits, setLimits] = React.useState<{ maxChannels: number; name: string } | null>(null);
  const { push, node } = useToast();

  const load = React.useCallback(async () => {
    try {
      const [s, st, d] = await Promise.all([
        api<{ channels: { id: string; enabled: boolean; connected: boolean; handle: string; followers: number; posts: number }[] }>("/api/state"),
        api<Record<string, Status>>("/api/oauth/status"),
        api<{ maxChannels: number; name: string }>("/api/dashboard").catch(() => null),
      ]);
      setChannels(s.channels);
      setStatuses(st);
      if (d) setLimits({ maxChannels: d.maxChannels, name: d.name });
    } catch {
      push("Failed to load channels", "danger");
    }
  }, [push]);

  React.useEffect(() => {
    load();
    const onOAuth = (event: MessageEvent) => {
      // Only trust popup messages from our own origin (the OAuth callback page).
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string } | null;
      if (data?.type !== "OAUTH_SUCCESS") return;
      push("✅ Channel connected! Syncing profile…", "info");
      load();
    };
    window.addEventListener("message", onOAuth);
    return () => window.removeEventListener("message", onOAuth);
  }, [load, push]);

  const connect = async (id: string) => {
    setConnecting(id);
    try {
      const res = await post<{ url: string }>(`/api/oauth/${id}/authorize`);
      window.open(res.url, "_blank", "width=600,height=700");
    } catch (e) {
      push(e instanceof Error ? e.message : "OAuth failed", "danger");
    } finally {
      setConnecting(null);
    }
  };

  const disconnect = async (id: string) => {
    await post(`/api/oauth/${id}/disconnect`);
    push("Disconnected");
    load();
  };

  const toggle = async (ch: { id: string; enabled: boolean }) => {
    await post("/api/channels", [{ id: ch.id, enabled: !ch.enabled }]);
    load();
  };

  const connectedCount = channels.filter((c) => c.connected).length;
  const realPlatforms = PLATFORMS.filter((p) => !["snapchat", "indeed", "website", "resume"].includes(p.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Channels</h1>
          <p className="mt-1 text-sm text-muted">
            {connectedCount} connected
            {limits && <span> · {limits.name} plan: up to {limits.maxChannels} connected platforms</span>}
          </p>
        </div>
      </div>

      {connectedCount === 0 && (
        <EmptyState
          icon="📣"
          title="Connect your first platform"
          body="One-click OAuth links your accounts. Connected platforms post for real; the rest simulate so nothing breaks."
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {realPlatforms.map((p) => {
          const ch = channels.find((c) => c.id === p.id);
          const st = statuses[p.id];
          const isConnected = !!ch?.connected || st?.connected;
          return (
            <Card key={p.id} className="flex flex-col p-5" glow>
              <div className="flex items-center gap-3">
                <PlatformIcon platform={p.id} size="lg" />
                <div className="min-w-0">
                  <h3 className="font-semibold">{p.name}</h3>
                  {ch?.handle ? (
                    <p className="truncate text-xs text-muted">{ch.handle}</p>
                  ) : (
                    <p className="text-xs text-muted/60">{p.handleType}</p>
                  )}
                </div>
                <div className="ml-auto">
                  {isConnected ? (
                    <Badge tone="success">● connected</Badge>
                  ) : (
                    <Badge tone={st?.configured ? "warning" : "neutral"}>
                      {st?.configured ? "ready to connect" : "needs API keys"}
                    </Badge>
                  )}
                </div>
              </div>

              {ch && ch.followers > 0 && (
                <p className="mt-3 text-xs text-muted">
                  👥 {ch.followers.toLocaleString()} followers · {ch.posts} posts
                </p>
              )}

              <div className="mt-4 flex items-center gap-2 pt-2">
                {isConnected ? (
                  <>
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => post(`/api/oauth/${p.id}/auto-configure`).then(() => { push("Profile synced"); load(); })}>
                      ↻ Sync
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => disconnect(p.id)}>Disconnect</Button>
                  </>
                ) : (
                  <Button size="sm" className="flex-1" onClick={() => connect(p.id)} disabled={connecting === p.id}>
                    {connecting === p.id ? <Spinner /> : "Connect"}
                  </Button>
                )}
              </div>

              {!isConnected && !st?.configured && (
                <p className="mt-3 text-[11px] leading-relaxed text-muted/70">
                  Add this platform&apos;s Client ID & Secret in <span className="text-[#c4b5fd]">Settings → Platform API Keys</span> to enable one-click connect.
                </p>
              )}
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="mb-3 mt-4 font-semibold">Simulated channels</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORMS.filter((p) => ["snapchat", "indeed", "website", "resume"].includes(p.id)).map((p) => {
            const ch = channels.find((c) => c.id === p.id);
            return (
              <Card key={p.id} className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <PlatformIcon platform={p.id} size="lg" />
                  <div>
                    <h3 className="text-sm font-semibold">{p.name}</h3>
                    <p className="text-xs text-muted">No public posting API — posts are logged</p>
                  </div>
                </div>
                {ch && (
                  <button
                    onClick={() => toggle(ch)}
                    className={`relative h-6 w-11 rounded-full transition ${ch.enabled ? "bg-[#a855f7]" : "bg-[#2a2a44]"}`}
                    aria-label={`Toggle ${p.name}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${ch.enabled ? "left-[22px]" : "left-0.5"}`} />
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {node}
    </div>
  );
}
