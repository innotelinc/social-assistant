"use client";

import React from "react";
import { api, put } from "@/lib/client-api";
import { Card, Button, Input, Select, useToast, Spinner, Badge } from "@/components/ui";
import { PlatformIcon } from "@/components/platform-icon";
import { PLATFORMS } from "@/lib/types";

interface SettingsState {
  settings: {
    ai: { mode: string; provider: string; apiKey: string; baseUrl: string; model: string };
  };
  platformCredentials: Record<string, { configured: boolean }>;
}

const KEY_PLATFORMS = PLATFORMS.filter((p) => ["x", "linkedin", "facebook", "instagram", "threads", "youtube", "pinterest", "tiktok"].includes(p.id));

export default function SettingsPage() {
  const [state, setState] = React.useState<SettingsState | null>(null);
  const [keys, setKeys] = React.useState<Record<string, { clientId: string; clientSecret: string }>>({});
  const [saving, setSaving] = React.useState<string | null>(null);
  const [me, setMe] = React.useState<{ name: string; email: string } | null>(null);
  const { push, node } = useToast();

  React.useEffect(() => {
    api<SettingsState>("/api/state")
      .then((s) => {
        setState(s);
        setKeys(
          Object.fromEntries(KEY_PLATFORMS.map((p) => [p.id, { clientId: "", clientSecret: "" }]))
        );
      })
      .catch(() => push("Failed to load settings", "danger"));
    api<{ user: { name: string; email: string } | null }>("/api/auth/me")
      .then((r) => setMe(r.user))
      .catch(() => {});
  }, [push]);

  const saveAi = async () => {
    if (!state) return;
    setSaving("ai");
    try {
      await put("/api/state", { settings: { ai: state.settings.ai } });
      push("AI settings saved");
    } catch {
      push("Save failed", "danger");
    } finally {
      setSaving(null);
    }
  };

  const saveKeys = async (platform: string) => {
    setSaving(platform);
    try {
      const k = keys[platform];
      await put(`/api/oauth/${platform}/credentials`, { clientId: k.clientId, clientSecret: k.clientSecret });
      push(`Saved ${PLATFORMS.find((p) => p.id === platform)?.name} API credentials`);
      setKeys((prev) => ({ ...prev, [platform]: { clientId: "", clientSecret: "" } }));
      setState((s) =>
        s ? { ...s, platformCredentials: { ...s.platformCredentials, [platform]: { configured: true } } } : s
      );
    } catch (e) {
      push(e instanceof Error ? e.message : "Save failed", "danger");
    } finally {
      setSaving(null);
    }
  };

  if (!state) {
    return <div className="flex items-center justify-center py-32 text-muted"><Spinner className="mr-2" /> Loading settings…</div>;
  }

  const ai = state.settings.ai;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">AI engine, platform API keys, and account preferences.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* AI */}
        <Card className="p-6">
          <h2 className="mb-1 font-semibold">AI engine</h2>
          <p className="mb-4 text-xs text-muted">
            The built-in engine needs nothing and works out of the box. Paste your own OpenAI / Anthropic key for premium generation.
          </p>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Mode</label>
              <Select
                value={ai.mode}
                onChange={(e) => setState({ ...state, settings: { ...state.settings, ai: { ...ai, mode: e.target.value } } })}
              >
                <option value="builtin">Built-in engine (free, no key)</option>
                <option value="api">Use my API key</option>
              </Select>
            </div>
            {ai.mode === "api" && (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Provider</label>
                  <Select
                    value={ai.provider}
                    onChange={(e) => setState({ ...state, settings: { ...state.settings, ai: { ...ai, provider: e.target.value } } })}
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="custom">Custom (OpenAI-compatible)</option>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">API key</label>
                  <Input
                    type="password"
                    value={ai.apiKey}
                    onChange={(e) => setState({ ...state, settings: { ...state.settings, ai: { ...ai, apiKey: e.target.value } } })}
                    placeholder="sk-…"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Base URL (optional)</label>
                    <Input
                      value={ai.baseUrl}
                      onChange={(e) => setState({ ...state, settings: { ...state.settings, ai: { ...ai, baseUrl: e.target.value } } })}
                      placeholder="https://api.openai.com/v1"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Model (optional)</label>
                    <Input
                      value={ai.model}
                      onChange={(e) => setState({ ...state, settings: { ...state.settings, ai: { ...ai, model: e.target.value } } })}
                      placeholder="gpt-4o-mini"
                    />
                  </div>
                </div>
              </>
            )}
            <Button onClick={saveAi} disabled={saving === "ai"}>
              {saving === "ai" ? <Spinner /> : "Save AI settings"}
            </Button>
          </div>
        </Card>

        {/* Platform keys */}
        <Card className="p-6">
          <h2 className="mb-1 font-semibold">Platform API keys</h2>
          <p className="mb-4 text-xs text-muted">
            Create a developer app on each platform and paste the Client ID + Secret. These are stored per-account (encrypted at rest is on the roadmap).
          </p>
          <div className="space-y-4">
            {KEY_PLATFORMS.map((p) => {
              const configured = state.platformCredentials[p.id]?.configured;
              return (
                <div key={p.id} className="rounded-xl border border-border bg-surface-muted p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PlatformIcon platform={p.id} size="sm" />
                      <span className="text-sm font-semibold">{p.name}</span>
                    </div>
                    {configured && <Badge tone="success">saved</Badge>}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      value={keys[p.id]?.clientId || ""}
                      onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: { ...prev[p.id], clientId: e.target.value } }))}
                      placeholder="Client ID / App ID"
                    />
                    <Input
                      type="password"
                      value={keys[p.id]?.clientSecret || ""}
                      onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: { ...prev[p.id], clientSecret: e.target.value } }))}
                      placeholder="Client Secret"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    onClick={() => saveKeys(p.id)}
                    disabled={saving === p.id || (!keys[p.id]?.clientId && !keys[p.id]?.clientSecret)}
                  >
                    {saving === p.id ? <Spinner /> : "Save keys"}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Account */}
      <Card className="p-6">
        <h2 className="mb-3 font-semibold">Account</h2>
        <p className="text-sm text-muted">
          Signed in as <span className="font-semibold text-foreground">{me?.name || "—"}</span>
          {me?.email && <span className="text-muted"> · {me.email}</span>}
        </p>
        <p className="mt-1 text-xs text-muted/70">
          Local account · data stored in SQLite on this server · self-host anytime
        </p>
      </Card>

      {node}
    </div>
  );
}
