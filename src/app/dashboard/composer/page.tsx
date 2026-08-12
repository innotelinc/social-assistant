"use client";

import React from "react";
import { api, post } from "@/lib/client-api";
import { Card, Button, TextArea, Input, Select, useToast, Spinner } from "@/components/ui";
import { PlatformIcon } from "@/components/platform-icon";
import { PLATFORMS, platformName } from "@/lib/types";

interface StateShape {
  channels: { id: string; enabled: boolean; connected: boolean; handle: string }[];
  settings: { brand: { voice: string; emoji: string; signature: string }; ai: { mode: string } };
  posts: { id: string; status: string; scheduledAt: number | null }[];
}

const TONES = ["hype", "pro", "witty", "warm", "bold", "mysterious", "minimal", "educational", "inspirational", "relatable", "urgent", "luxurious"];
const TYPES = ["promo", "hook", "tip", "story", "question", "listicle", "hot-take", "testimonial", "behind-the-scenes", "tutorial", "comparison", "education", "motivation", "event", "quote"];

export default function ComposerPage() {
  const [state, setState] = React.useState<StateShape | null>(null);
  const [channels, setChannels] = React.useState<string[]>([]);
  const [content, setContent] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [product, setProduct] = React.useState("");
  const [audience, setAudience] = React.useState("");
  const [tone, setTone] = React.useState("hype");
  const [type, setType] = React.useState("promo");
  const [length, setLength] = React.useState("medium");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [generating, setGenerating] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [headlines, setHeadlines] = React.useState<string[]>([]);
  const [ideas, setIdeas] = React.useState<{ type: string; title: string; preview: string }[]>([]);
  const { push, node } = useToast();

  React.useEffect(() => {
    api<StateShape>("/api/state")
      .then((s) => {
        setState(s);
        setChannels(s.channels.filter((c) => c.enabled && c.id !== "website" && c.id !== "resume").map((c) => c.id));
      })
      .catch(() => push("Failed to load workspace", "danger"));
  }, [push]);

  const maxLen = channels.length ? Math.min(...channels.map((c) => PLATFORMS.find((p) => p.id === c)?.charLimit || 99999)) : 99999;

  const generate = async (kind: string, extra: Record<string, unknown> = {}) => {
    setGenerating(true);
    try {
      const out = await post<Record<string, unknown>>("/api/ai/generate", { kind, topic, product, audience, tone, type, length, ...extra });
      const text = typeof out.text === "string" ? out.text : "";
      const hashtags = Array.isArray(out.hashtags) ? (out.hashtags as string[]) : [];
      const headlines = Array.isArray(out.headlines) ? (out.headlines as string[]) : [];
      const ideas = Array.isArray(out.ideas) ? (out.ideas as { type: string; title: string; preview: string }[]) : [];
      if (kind === "post") {
        setContent(text + (hashtags.length ? "\n\n" + hashtags.join(" ") : ""));
        push("✨ Aria wrote your post");
      } else if (kind === "headlines") {
        setHeadlines(headlines);
        push("🎯 Headlines generated");
      } else if (kind === "ideas") {
        setIdeas(ideas);
        push("💡 Post ideas generated");
      } else {
        setContent(text);
        push("✨ Generated");
      }
    } catch (e) {
      push(e instanceof Error ? e.message : "Generation failed", "danger");
    } finally {
      setGenerating(false);
    }
  };

  const save = async (action: "draft" | "schedule" | "publish") => {
    if (!channels.length) return push("Select at least one channel", "danger");
    if (!content.trim()) return push("Write something first", "danger");
    setSaving(true);
    try {
      const body: Record<string, unknown> = { channelIds: channels, content };
      if (action === "schedule") {
        const t = new Date(scheduledAt).getTime();
        if (!t || t <= Date.now()) {
          setSaving(false);
          return push("Pick a future time to schedule", "danger");
        }
        body.scheduledAt = t;
      }
      if (action === "publish") body.publish = true;
      await post("/api/posts", body);
      push(action === "publish" ? "🚀 Published!" : action === "schedule" ? "📅 Scheduled" : "💾 Saved as draft");
      if (action !== "draft") setContent("");
    } catch (e) {
      push(e instanceof Error ? e.message : "Failed", "danger");
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (id: string) => {
    setChannels((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  if (!state) {
    return <div className="flex items-center justify-center py-32 text-muted"><Spinner className="mr-2" /> Loading composer…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Composer</h1>
        <p className="mt-1 text-sm text-muted">Write once, publish everywhere. Aria can write it for you.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: channels + content */}
        <div className="space-y-6 lg:col-span-3">
          <Card className="p-6">
            <h2 className="mb-3 font-semibold">1 · Where should this go?</h2>
            <div className="flex flex-wrap gap-2">
              {state.channels
                .filter((c) => c.id !== "website" && c.id !== "resume")
                .map((ch) => {
                  const active = channels.includes(ch.id);
                  const def = PLATFORMS.find((p) => p.id === ch.id)!;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => toggleChannel(ch.id)}
                      className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                        active ? "text-foreground" : "border-border bg-surface-muted text-muted hover:text-foreground"
                      }`}
                      style={active ? { borderColor: def.color, background: `${def.color}1a` } : undefined}
                    >
                      <PlatformIcon platform={ch.id} size="sm" />
                      {def.name}
                      {ch.connected && active && <span className="text-[#34d399]">●</span>}
                    </button>
                  );
                })}
            </div>
            {!channels.length && <p className="mt-3 text-xs text-muted">Select at least one platform above.</p>}
          </Card>

          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">2 · Your post</h2>
              <span className={`text-xs font-medium ${content.length > maxLen ? "text-[#f87171]" : "text-muted"}`}>
                {content.length.toLocaleString()} / {maxLen.toLocaleString()}
              </span>
            </div>
            <TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want to say? Leave it blank and let Aria write it from your topic…"
              className="min-h-44 text-sm leading-relaxed"
            />
            {state.settings.brand.signature && content && !content.includes(state.settings.brand.signature) && (
              <p className="mt-2 text-xs text-muted">
                ✍️ Signature: <span className="text-[#c4b5fd]">— {state.settings.brand.signature}</span> {state.settings.brand.emoji}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => save("draft")} disabled={saving}>
                💾 Save draft
              </Button>
              <label className="flex items-center gap-2 text-xs text-muted">
                <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-auto" />
                <Button variant="secondary" size="sm" onClick={() => save("schedule")} disabled={saving}>
                  📅 Schedule
                </Button>
              </label>
              <Button size="sm" onClick={() => save("publish")} disabled={saving || !content.trim()}>
                🚀 Publish now
              </Button>
            </div>
          </Card>
        </div>

        {/* Right: AI panel */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff2d78] to-[#a855f7] text-sm">✦</span>
              <h2 className="font-semibold">Aria · AI Director</h2>
            </div>
            <p className="mt-2 text-xs text-muted">
              Voice: <span className="font-medium text-[#c4b5fd]">{state.settings.brand.voice}</span> · {state.settings.brand.emoji}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Topic / idea</label>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. launching a sales training webinar" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Tone</label>
                  <Select value={tone} onChange={(e) => setTone(e.target.value)}>
                    {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Format</label>
                  <Select value={type} onChange={(e) => setType(e.target.value)}>
                    {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Length</label>
                  <Select value={length} onChange={(e) => setLength(e.target.value)}>
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Audience</label>
                  <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="small business owners" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Product / offer</label>
                <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="optional" />
              </div>

              <Button className="w-full" onClick={() => generate("post")} disabled={generating || !topic.trim()}>
                {generating ? <Spinner /> : "✨ Generate post for every platform"}
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" size="sm" onClick={() => generate("headlines", { count: 5 })} disabled={generating || !topic.trim()}>
                  🎯 Headlines
                </Button>
                <Button variant="secondary" size="sm" onClick={() => generate("ideas")} disabled={generating || !topic.trim()}>
                  💡 Ideas
                </Button>
              </div>
            </div>

            {headlines.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted">Headlines</p>
                {headlines.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setContent(h)}
                    className="block w-full rounded-lg border border-border bg-surface-muted p-2.5 text-left text-xs text-muted transition hover:border-[#a855f7]/40 hover:text-foreground"
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}

            {ideas.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted">Post ideas</p>
                {ideas.map((idea, i) => (
                  <button
                    key={i}
                    onClick={() => setTopic(idea.title)}
                    className="block w-full rounded-lg border border-border bg-surface-muted p-2.5 text-left transition hover:border-[#a855f7]/40"
                  >
                    <p className="text-xs font-medium">{idea.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-muted">{idea.preview}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold">Quick tips</h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-muted">
              <li>• {platformName("x")} has a 280-character limit — Aria auto-trims.</li>
              <li>• Attach your brand signature so every post ends on-brand.</li>
              <li>• Scheduled posts fire even when you&apos;re offline — the autopilot handles it.</li>
              <li>• Connected channels (●) post for real; others simulate so your pipeline never breaks.</li>
            </ul>
          </Card>
        </div>
      </div>

      {node}
    </div>
  );
}
