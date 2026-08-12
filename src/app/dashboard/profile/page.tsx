"use client";

import React from "react";
import { api, post, put } from "@/lib/client-api";
import { Card, Button, Input, TextArea, Select, useToast, Spinner } from "@/components/ui";
import { PlatformIcon } from "@/components/platform-icon";
import { PLATFORMS } from "@/lib/types";

interface ProfileState {
  profile: {
    name: string;
    headline: string;
    about: string;
    location: string;
    website: string;
    skills: string[];
  };
  settings: { brand: { voice: string; emoji: string; signature: string } };
}

const VOICES = ["hype", "pro", "witty", "warm", "bold", "mysterious", "minimal", "educational", "inspirational", "relatable", "luxurious"];

export default function ProfilePage() {
  const [state, setState] = React.useState<ProfileState | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [generating, setGenerating] = React.useState<string | null>(null);
  const [bioPlatform, setBioPlatform] = React.useState("linkedin");
  const [bios, setBios] = React.useState<Record<string, string>>({});
  const [aboutTone, setAboutTone] = React.useState("professional");
  const { push, node } = useToast();

  const load = React.useCallback(async () => {
    setState(await api<ProfileState>("/api/state"));
  }, []);

  React.useEffect(() => {
    load().catch(() => push("Failed to load profile", "danger"));
  }, [load, push]);

  const saveProfile = async () => {
    if (!state) return;
    setSaving(true);
    try {
      const res = await put<{ profile: ProfileState["profile"] }>("/api/state", { profile: state.profile });
      setState((s) => (s ? { ...s, profile: res.profile } : s));
      push("Profile saved");
    } catch {
      push("Save failed", "danger");
    } finally {
      setSaving(false);
    }
  };

  const saveBrand = async () => {
    if (!state) return;
    await put("/api/state", { settings: { brand: state.settings.brand } });
    push("Brand voice saved — Aria will use it everywhere");
  };

  const genBio = async (platform: string) => {
    if (!state) return;
    setGenerating(platform);
    try {
      const res = await post<{ text: string }>("/api/ai/generate", {
        kind: "bio",
        platform,
        tone: state.settings.brand.voice,
        seed: Date.now(),
      });
      setBios((b) => ({ ...b, [platform]: res.text }));
      push(`✨ ${PLATFORMS.find((p) => p.id === platform)?.name} bio ready`);
    } catch (e) {
      push(e instanceof Error ? e.message : "Generation failed", "danger");
    } finally {
      setGenerating(null);
    }
  };

  const genAbout = async () => {
    if (!state) return;
    setGenerating("about");
    try {
      const res = await post<{ text: string }>("/api/ai/generate", { kind: "about", tone: aboutTone });
      setState((s) => (s ? { ...s, profile: { ...s.profile, about: res.text } } : s));
      push("✨ About section generated");
    } catch (e) {
      push(e instanceof Error ? e.message : "Generation failed", "danger");
    } finally {
      setGenerating(null);
    }
  };

  if (!state) {
    return <div className="flex items-center justify-center py-32 text-muted"><Spinner className="mr-2" /> Loading profile…</div>;
  }

  const { profile, settings } = state;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile Hub</h1>
        <p className="mt-1 text-sm text-muted">Your brand voice, bio, and about — everywhere at once.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Brand voice */}
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Brand voice</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Voice</label>
              <Select
                value={settings.brand.voice}
                onChange={(e) => setState({ ...state, settings: { ...settings, brand: { ...settings.brand, voice: e.target.value } } })}
              >
                {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Emoji accent</label>
                <Input
                  value={settings.brand.emoji}
                  onChange={(e) => setState({ ...state, settings: { ...settings, brand: { ...settings.brand, emoji: e.target.value } } })}
                  placeholder="🔥"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">Signature</label>
                <Input
                  value={settings.brand.signature}
                  onChange={(e) => setState({ ...state, settings: { ...settings, brand: { ...settings.brand, signature: e.target.value } } })}
                  placeholder="Your name"
                />
              </div>
            </div>
            <Button onClick={saveBrand}>Save brand voice</Button>
            <p className="text-xs leading-relaxed text-muted">
              Aria appends your signature and uses this voice for every generated post, bio, and headline.
            </p>
          </div>
        </Card>

        {/* About */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">About me</h2>
            <div className="flex items-center gap-2">
              <Select value={aboutTone} onChange={(e) => setAboutTone(e.target.value)} className="w-auto">
                <option value="professional">Professional</option>
                <option value="hype">Hype</option>
                <option value="minimal">Minimal</option>
              </Select>
              <Button size="sm" variant="secondary" onClick={genAbout} disabled={generating === "about"}>
                {generating === "about" ? <Spinner /> : "✨ Generate"}
              </Button>
            </div>
          </div>
          <TextArea
            value={profile.about}
            onChange={(e) => setState({ ...state, profile: { ...profile, about: e.target.value } })}
            placeholder="What do you do? Aria can write this for you."
            className="min-h-36"
          />
        </Card>
      </div>

      {/* Details */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Details</h2>
          <Button onClick={saveProfile} disabled={saving}>
            {saving ? <Spinner /> : "Save profile"}
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Name</label>
            <Input value={profile.name} onChange={(e) => setState({ ...state, profile: { ...profile, name: e.target.value } })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Headline</label>
            <Input value={profile.headline} onChange={(e) => setState({ ...state, profile: { ...profile, headline: e.target.value } })} placeholder="AI growth strategist" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Location</label>
            <Input value={profile.location} onChange={(e) => setState({ ...state, profile: { ...profile, location: e.target.value } })} placeholder="Austin, TX" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">Website</label>
            <Input value={profile.website} onChange={(e) => setState({ ...state, profile: { ...profile, website: e.target.value } })} placeholder="https://…" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted">
              Skills <span className="text-muted/50">(comma separated)</span>
            </label>
            <Input
              value={profile.skills.join(", ")}
              onChange={(e) => setState({ ...state, profile: { ...profile, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })}
              placeholder="AI, marketing, content strategy"
            />
          </div>
        </div>
      </Card>

      {/* Bios */}
      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Platform bios</h2>
          <div className="flex items-center gap-2">
            <Select value={bioPlatform} onChange={(e) => setBioPlatform(e.target.value)} className="w-auto">
              {PLATFORMS.filter((p) => !["website", "resume"].includes(p.id)).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
            <Button size="sm" variant="secondary" onClick={() => genBio(bioPlatform)} disabled={generating === bioPlatform}>
              {generating === bioPlatform ? <Spinner /> : "✨ Generate bio"}
            </Button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(bios).map(([platform, text]) => (
            <div key={platform} className="rounded-xl border border-border bg-surface-muted p-4">
              <div className="flex items-center gap-2">
                <PlatformIcon platform={platform} size="sm" />
                <span className="text-sm font-semibold">{PLATFORMS.find((p) => p.id === platform)?.name}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-3"
                onClick={() => {
                  navigator.clipboard.writeText(text);
                  push("Copied to clipboard");
                }}
              >
                📋 Copy
              </Button>
            </div>
          ))}
          {Object.keys(bios).length === 0 && (
            <p className="text-sm text-muted md:col-span-2">Pick a platform and hit Generate — Aria writes bios tuned to each network&apos;s style and limits.</p>
          )}
        </div>
      </Card>

      {node}
    </div>
  );
}
