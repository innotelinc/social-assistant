"use client";

import React from "react";
import { api, post, del } from "@/lib/client-api";
import { Card, Button, Badge, useToast, Spinner, EmptyState } from "@/components/ui";
import { PlatformIcon } from "@/components/platform-icon";
import { platformName } from "@/lib/types";

interface PostItem {
  id: string;
  channelIds: string[];
  content: string;
  status: "draft" | "scheduled" | "published" | "failed";
  scheduledAt: number | null;
  publishedAt: number | null;
  campaignId: string | null;
  engagement: { likes: number; comments: number; shares: number; reach: number } | null;
  results: { channelId: string; ok: boolean; real: boolean; simulated: boolean; error?: string }[] | null;
  createdAt: number;
}

const FILTERS = ["all", "draft", "scheduled", "published", "failed"] as const;
const STATUS_TONE: Record<string, "neutral" | "warning" | "success" | "danger"> = {
  draft: "neutral",
  scheduled: "warning",
  published: "success",
  failed: "danger",
};

const timeFmt = (t: number) => new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function QueuePage() {
  const [posts, setPosts] = React.useState<PostItem[]>([]);
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]>("all");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const { push, node } = useToast();

  const load = React.useCallback(async () => {
    try {
      setPosts(await api<PostItem[]>("/api/posts"));
    } catch {
      push("Failed to load queue", "danger");
    } finally {
      setLoading(false);
    }
  }, [push]);

  React.useEffect(() => {
    load();
  }, [load]);

  const visible = posts.filter((p) => filter === "all" || p.status === filter);

  const publishOne = async (p: PostItem) => {
    setBusy(true);
    try {
      await post(`/api/posts/${p.id}/publish`);
      push("🚀 Published");
      await load();
    } catch (e) {
      push(e instanceof Error ? e.message : "Publish failed", "danger");
    } finally {
      setBusy(false);
    }
  };

  const deleteOne = async (id: string) => {
    await del(`/api/posts/${id}`);
    push("Deleted");
    await load();
  };

  const bulkPublish = async () => {
    setBusy(true);
    try {
      const res = await post<{ published: number; failed: number }>("/api/posts/publish-drafts");
      push(`Published ${res.published} draft${res.published === 1 ? "" : "s"}${res.failed ? `, ${res.failed} failed` : ""}`);
      await load();
    } catch (e) {
      push(e instanceof Error ? e.message : "Failed", "danger");
    } finally {
      setBusy(false);
    }
  };

  const resendFailed = async () => {
    setBusy(true);
    try {
      const res = await post<{ resent: number; stillFailed: number }>("/api/posts/resend-failed");
      push(`Resent ${res.resent}${res.stillFailed ? `, ${res.stillFailed} still failing` : ""}`);
      await load();
    } catch (e) {
      push(e instanceof Error ? e.message : "Failed", "danger");
    } finally {
      setBusy(false);
    }
  };

  const draftCount = posts.filter((p) => p.status === "draft").length;
  const failedCount = posts.filter((p) => p.status === "failed").length;

  if (loading) {
    return <div className="flex items-center justify-center py-32 text-muted"><Spinner className="mr-2" /> Loading queue…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Publish Queue</h1>
          <p className="mt-1 text-sm text-muted">Every post — drafts, scheduled, published, and failed.</p>
        </div>
        <div className="flex gap-3">
          {draftCount > 0 && (
            <Button variant="secondary" size="sm" onClick={bulkPublish} disabled={busy}>
              🚀 Publish {draftCount} draft{draftCount > 1 ? "s" : ""}
            </Button>
          )}
          {failedCount > 0 && (
            <Button variant="danger" size="sm" onClick={resendFailed} disabled={busy}>
              🔁 Resend {failedCount} failed
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = f === "all" ? posts.length : posts.filter((p) => p.status === f).length;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-4 py-1.5 text-xs font-medium capitalize transition ${
                filter === f ? "border-[#a855f7] bg-[#a855f7]/15 text-foreground" : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              {f} <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="📭"
          title={filter === "all" ? "Nothing here yet" : `No ${filter} posts`}
          body="Head to the Composer to write your first post — or start a campaign and let Aria fill the queue."
        />
      ) : (
        <div className="space-y-3">
          {visible.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-1">
                      {p.channelIds.slice(0, 4).map((c) => (
                        <PlatformIcon key={c} platform={c} size="sm" className="ring-2 ring-surface" />
                      ))}
                    </div>
                    <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                    {p.campaignId && <Badge tone="brand">campaign</Badge>}
                    {p.status === "scheduled" && p.scheduledAt && (
                      <span className="text-xs text-muted">📅 {timeFmt(p.scheduledAt)}</span>
                    )}
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-muted">{p.content}</p>
                  {p.status === "published" && p.engagement && (
                    <p className="mt-2 text-xs text-[#34d399]">
                      ❤️ {p.engagement.likes} · 💬 {p.engagement.comments} · 🔁 {p.engagement.shares} · 👀 {p.engagement.reach.toLocaleString()}
                    </p>
                  )}
                  {p.status === "failed" && p.results?.some((r) => r.error) && (
                    <p className="mt-2 text-xs text-[#f87171]">
                      {p.results.filter((r) => r.error).map((r) => `${platformName(r.channelId)}: ${r.error}`).join(" · ")}
                    </p>
                  )}
                  {p.results?.some((r) => r.real) && (
                    <p className="mt-2 text-xs text-[#22d3ee]">✨ Posted via real API</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {p.status === "draft" && (
                    <Button size="sm" onClick={() => publishOne(p)} disabled={busy}>🚀 Publish</Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => deleteOne(p.id)}>🗑 Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {node}
    </div>
  );
}
