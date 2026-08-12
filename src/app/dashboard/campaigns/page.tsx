"use client";

import React from "react";
import { api, post, put, del } from "@/lib/client-api";
import { Card, Button, Input, Select, TextArea, Badge, useToast, Spinner, EmptyState } from "@/components/ui";
import { PlatformIcon } from "@/components/platform-icon";
import type { Campaign } from "@/lib/types";

const TONES = ["hype", "pro", "witty", "warm", "bold", "mysterious", "minimal", "educational", "inspirational"];
const TYPES = ["promo", "education", "tip", "story", "engagement", "motivation", "hook", "event", "quote", "testimonial"];

const FREQ_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  hourly: "Hourly",
  interval: "Every N days",
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [channels, setChannels] = React.useState<{ id: string; enabled: boolean; connected: boolean }[]>([]);
  const [editing, setEditing] = React.useState<Campaign | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const [running, setRunning] = React.useState<string | null>(null);
  const { push, node } = useToast();

  const load = React.useCallback(async () => {
    try {
      const [c, s] = await Promise.all([api<Campaign[]>("/api/campaigns"), api<{ channels: { id: string; enabled: boolean; connected: boolean }[] }>("/api/state")]);
      setCampaigns(c);
      setChannels(s.channels.filter((ch) => ch.id !== "website" && ch.id !== "resume"));
    } catch {
      push("Failed to load campaigns", "danger");
    }
  }, [push]);

  React.useEffect(() => {
    load();
  }, [load]);

  const blank = (): Campaign => ({
    id: "",
    name: "",
    goal: "promote",
    topic: "",
    product: "",
    audience: "",
    channels: channels.filter((c) => c.enabled).map((c) => c.id),
    schedule: { mode: "recurring", frequency: "daily", time: "09:00", days: [1, 2, 3, 4, 5], intervalDays: 1 },
    ai: { enabled: true, tone: "hype", type: "promo", length: "medium" },
    content: "",
    active: true,
    autoPilot: true,
    nextRunAt: null,
    postsCreated: 0,
    createdAt: Date.now(),
  });

  const startEdit = (c?: Campaign) => {
    setEditing(c ? { ...c, schedule: { ...c.schedule }, ai: { ...c.ai } } : blank());
    setShowForm(true);
  };

  const toggleChannel = (id: string) => {
    if (!editing) return;
    setEditing({
      ...editing,
      channels: editing.channels.includes(id) ? editing.channels.filter((c) => c !== id) : [...editing.channels, id],
    });
  };

  const saveCampaign = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.topic.trim()) return push("Give the campaign a name and topic", "danger");
    setRunning("save");
    try {
      const saved = editing.id ? await put<Campaign>(`/api/campaigns/${editing.id}`, editing) : await post<Campaign>("/api/campaigns", editing);
      push(editing.id ? "Campaign updated" : "🚀 Campaign created — autopilot is live");
      setShowForm(false);
      setEditing(null);
      setCampaigns((prev) => (editing.id ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev]));
    } catch (e) {
      push(e instanceof Error ? e.message : "Save failed", "danger");
    } finally {
      setRunning(null);
    }
  };

  const runNow = async (c: Campaign) => {
    setRunning(c.id);
    try {
      const res = await post<{ posts: unknown[] }>(`/api/campaigns/${c.id}/run-now`);
      push(`🏁 Ran "${c.name}" — ${res.posts.length} post${res.posts.length === 1 ? "" : "s"} generated`);
      await load();
    } catch (e) {
      push(e instanceof Error ? e.message : "Run failed", "danger");
    } finally {
      setRunning(null);
    }
  };

  const toggleActive = async (c: Campaign) => {
    await put(`/api/campaigns/${c.id}`, { active: !c.active });
    push(c.active ? "Campaign paused" : "Autopilot resumed");
    await load();
  };

  const remove = async (c: Campaign) => {
    await del(`/api/campaigns/${c.id}`);
    push("Campaign deleted");
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaign Autopilot</h1>
          <p className="mt-1 text-sm text-muted">
            Set a topic and a schedule. Aria generates fresh posts and publishes to every channel — automatically.
          </p>
        </div>
        <Button onClick={() => startEdit()}>+ New campaign</Button>
      </div>

      {showForm && editing && (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">{editing.id ? "Edit campaign" : "New campaign"}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Name</label>
              <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Weekly value posts" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Topic (Aria writes about this)</label>
              <Input value={editing.topic} onChange={(e) => setEditing({ ...editing, topic: e.target.value })} placeholder="AI for small business owners" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Tone</label>
              <Select value={editing.ai.tone} onChange={(e) => setEditing({ ...editing, ai: { ...editing.ai, tone: e.target.value } })}>
                {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Format</label>
              <Select value={editing.ai.type} onChange={(e) => setEditing({ ...editing, ai: { ...editing.ai, type: e.target.value } })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Audience</label>
              <Input value={editing.audience} onChange={(e) => setEditing({ ...editing, audience: e.target.value })} placeholder="small business owners" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Product / offer</label>
              <Input value={editing.product} onChange={(e) => setEditing({ ...editing, product: e.target.value })} placeholder="optional" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Frequency</label>
              <Select
                value={editing.schedule.frequency}
                onChange={(e) => setEditing({ ...editing, schedule: { ...editing.schedule, frequency: e.target.value as Campaign["schedule"]["frequency"] } })}
              >
                {Object.entries(FREQ_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Post time</label>
              <Input
                type="time"
                value={editing.schedule.time}
                onChange={(e) => setEditing({ ...editing, schedule: { ...editing.schedule, time: e.target.value } })}
              />
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-muted">Target channels</p>
            <div className="flex flex-wrap gap-2">
              {channels.map((ch) => {
                const active = editing.channels.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    onClick={() => toggleChannel(ch.id)}
                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active ? "border-[#a855f7] bg-[#a855f7]/15 text-foreground" : "border-border bg-surface-muted text-muted hover:text-foreground"
                    }`}
                  >
                    <PlatformIcon platform={ch.id} size="sm" />
                    {ch.id}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-1 block text-xs font-medium text-muted">
              Fixed content <span className="text-muted/50">(optional — leave blank to let Aria write fresh posts)</span>
            </label>
            <TextArea value={editing.content || ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} className="min-h-20" />
          </div>

          <div className="mt-5 flex gap-3">
            <Button onClick={saveCampaign} disabled={running === "save"}>
              {running === "save" ? <Spinner /> : "Save & enable autopilot"}
            </Button>
            <Button variant="ghost" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
          </div>
        </Card>
      )}

      {campaigns.length === 0 ? (
        <EmptyState
          icon="🚀"
          title="No campaigns yet"
          body="Create a campaign with a topic and schedule — Aria will write and publish fresh content on autopilot, forever."
          action={<Button onClick={() => startEdit()}>Create your first campaign</Button>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((c) => (
            <Card key={c.id} className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted">{c.topic}</p>
                </div>
                <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "● live" : "paused"}</Badge>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {c.channels.slice(0, 6).map((id) => (
                  <PlatformIcon key={id} platform={id} size="sm" />
                ))}
                {c.channels.length > 6 && <span className="text-xs text-muted">+{c.channels.length - 6}</span>}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border bg-surface-muted p-3 text-center text-xs">
                <div>
                  <p className="font-bold text-[#c4b5fd]">{FREQ_LABELS[c.schedule.frequency] || c.schedule.frequency}</p>
                  <p className="text-muted/70">Schedule</p>
                </div>
                <div>
                  <p className="font-bold">{c.postsCreated}</p>
                  <p className="text-muted/70">Posts made</p>
                </div>
                <div>
                  <p className="font-bold capitalize">{c.ai.tone}</p>
                  <p className="text-muted/70">Voice</p>
                </div>
              </div>

              {c.nextRunAt && c.active && (
                <p className="mt-3 text-xs text-muted">
                  ⏰ Next run: <span className="text-[#c4b5fd]">{new Date(c.nextRunAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => runNow(c)} disabled={running === c.id}>
                  {running === c.id ? <Spinner /> : "🏁 Run now"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => toggleActive(c)}>{c.active ? "Pause" : "Resume"}</Button>
                <Button size="sm" variant="danger" onClick={() => remove(c)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {node}
    </div>
  );
}
