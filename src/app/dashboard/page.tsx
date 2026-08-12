"use client";

import React from "react";
import Link from "next/link";
import { api } from "@/lib/client-api";
import { StatCard, Card, Badge, Button, useToast, Spinner } from "@/components/ui";
import { Sparkline } from "@/components/charts";
import { PlatformIcon } from "@/components/platform-icon";

interface DashboardStats {
  fameScore: number;
  channelsConnected: number;
  channelsEnabled: number;
  totalFollowers: number;
  postsPublished: number;
  postsScheduled: number;
  activeCampaigns: number;
  reach: number;
  engagementRate: number;
  upcoming: { id: string; content: string; scheduledAt: number; channelIds: string[] }[];
  nextCampaignRuns: { id: string; name: string; at: number; channels: number }[];
  activity: { id: string; message: string; kind: string; at: number }[];
  growth: { date: number; followers: number; engagement: number }[];
  plan: { id: string; name: string };
}

const timeAgo = (t: number) => {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

export default function OverviewPage() {
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [error, setError] = React.useState("");
  const { push, node } = useToast();

  React.useEffect(() => {
    api<DashboardStats>("/api/dashboard")
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return <Card className="p-8 text-center text-[#f87171]">{error}</Card>;
  }
  if (!stats) {
    return (
      <div className="flex items-center justify-center py-32 text-muted">
        <Spinner className="mr-2" /> Loading your command center…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="mt-1 text-sm text-muted">
            {stats.activeCampaigns > 0
              ? `${stats.activeCampaigns} autopilot campaign${stats.activeCampaigns > 1 ? "s" : ""} running for you.`
              : "Nothing on autopilot yet — start a campaign in minutes."}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/composer" className="btn btn-secondary btn-sm">✍️ Write a post</Link>
          <Link href="/dashboard/campaigns" className="btn btn-primary btn-sm">🚀 Start campaign</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Fame Score"
          value={
            <span className="gradient-text">{stats.fameScore}<span className="text-base text-muted">/100</span></span>
          }
          sub="Your brand momentum"
        />
        <StatCard label="Channels" value={`${stats.channelsConnected}/${stats.channelsEnabled}`} sub="Connected / enabled" />
        <StatCard label="Followers" value={fmt(stats.totalFollowers)} sub="Across connected platforms" accent="#22d3ee" />
        <StatCard label="Posts" value={stats.postsPublished} sub={`${stats.postsScheduled} scheduled · ${stats.reach.toLocaleString()} reach`} accent="#34d399" />
      </div>

      {/* Growth + campaigns */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Follower growth</h2>
            <Badge tone="brand">{stats.plan.name} plan</Badge>
          </div>
          <div className="mt-4">
            <Sparkline points={stats.growth.map((g) => g.followers)} height={120} />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted">
            <span>14 days ago</span>
            <span>Today</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 border-t border-border pt-4 text-center">
            <div>
              <p className="text-lg font-bold text-[#22d3ee]">{stats.engagementRate.toFixed(1)}%</p>
              <p className="text-xs text-muted">Avg engagement</p>
            </div>
            <div>
              <p className="text-lg font-bold">{fmt(stats.reach)}</p>
              <p className="text-xs text-muted">Total reach</p>
            </div>
            <div>
              <p className="text-lg font-bold">{stats.activeCampaigns}</p>
              <p className="text-xs text-muted">Active campaigns</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold">Next autopilot runs</h2>
          {stats.nextCampaignRuns.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No scheduled runs. Create a campaign to start autopilot.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {stats.nextCampaignRuns.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted">{c.channels} channels</p>
                  </div>
                  <Badge tone="accent">{new Date(c.at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</Badge>
                </li>
              ))}
            </ul>
          )}

          <h2 className="mt-6 font-semibold">Upcoming posts</h2>
          {stats.upcoming.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Nothing scheduled. Write a post or turn on autopilot.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {stats.upcoming.slice(0, 4).map((p) => (
                <li key={p.id} className="flex items-start gap-2.5">
                  <div className="flex shrink-0 -space-x-1">
                    {p.channelIds.slice(0, 3).map((c) => (
                      <PlatformIcon key={c} platform={c} size="sm" className="ring-2 ring-surface" />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-xs text-muted">{p.content}</p>
                    <p className="mt-0.5 text-[10px] text-[#c4b5fd]">
                      {new Date(p.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Activity */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Activity feed</h2>
          <Button variant="ghost" size="sm" onClick={() => api<DashboardStats>("/api/dashboard").then(setStats).catch(() => push("Refresh failed", "danger")).then(() => push("Refreshed"))}>
            ↻ Refresh
          </Button>
        </div>
        {stats.activity.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Your activity will appear here — connect a channel to get started.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {stats.activity.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                <p className="min-w-0 truncate text-sm text-muted">{a.message}</p>
                <span className="shrink-0 text-xs text-muted/60">{timeAgo(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {node}
    </div>
  );
}
