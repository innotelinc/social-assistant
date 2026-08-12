"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { api, post } from "@/lib/client-api";
import { Card, Button, Badge, useToast, Spinner } from "@/components/ui";
import { PLANS } from "@/lib/types";

interface SubscriptionInfo {
  sub: { status: string; planName: string | null; currentPeriodEnd: number | null; cancelAtPeriodEnd: boolean } | null;
  plan: { id: string; name: string; maxChannels: number; aiGenerationsPerDay: number };
  aiLeft: number;
  connected: number;
}

export default function BillingPage() {
  const search = useSearchParams();
  const [info, setInfo] = React.useState<SubscriptionInfo | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const { push, node } = useToast();

  const load = React.useCallback(async () => {
    try {
      const sub = await api<SubscriptionInfo>("/api/subscription");
      setInfo(sub);
    } catch {
      push("Failed to load billing info", "danger");
    }
  }, [push]);

  React.useEffect(() => {
    load();
    if (search.get("success")) push("🎉 Subscription activated — welcome aboard!");
    if (search.get("canceled")) push("Checkout canceled — no changes made", "info");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upgrade = async (planId: string) => {
    setBusy(planId);
    try {
      const res = await post<{ url: string }>("/api/stripe/checkout", { plan: planId });
      window.location.assign(res.url);
    } catch (e) {
      push(e instanceof Error ? e.message : "Checkout failed", "danger");
      setBusy(null);
    }
  };

  const manage = async () => {
    setBusy("portal");
    try {
      const res = await post<{ url: string }>("/api/stripe/portal");
      window.location.assign(res.url);
    } catch (e) {
      push(e instanceof Error ? e.message : "Portal failed", "danger");
      setBusy(null);
    }
  };

  if (!info) {
    return <div className="flex items-center justify-center py-32 text-muted"><Spinner className="mr-2" /> Loading billing…</div>;
  }

  const current = info.plan.id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          Current plan: <Badge tone="brand">{info.plan.name}</Badge>
          {info.sub?.status === "active" && info.sub.currentPeriodEnd && (
            <span className="ml-2 text-xs text-muted">
              renews {new Date(info.sub.currentPeriodEnd).toLocaleDateString()}
              {info.sub.cancelAtPeriodEnd && " · cancels at period end"}
            </span>
          )}
        </p>
      </div>

      {info.sub && info.sub.status === "active" && (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h3 className="font-semibold">{info.sub.planName} subscription</h3>
            <p className="mt-1 text-sm text-muted">
              Status: <span className="text-[#34d399] capitalize">{info.sub.status}</span>
            </p>
          </div>
          <Button variant="secondary" onClick={manage} disabled={busy === "portal"}>
            {busy === "portal" ? <Spinner /> : "Manage billing →"}
          </Button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = current === plan.id;
          return (
            <Card key={plan.id} className={`flex flex-col p-5 ${isCurrent ? "ring-2 ring-[#a855f7]" : ""}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{plan.name}</h3>
                {isCurrent && <Badge tone="accent">current</Badge>}
              </div>
              <p className="mt-2 text-2xl font-bold">
                {(plan.priceCents ?? 0) === 0 ? "$0" : `$${Math.round((plan.priceCents ?? 0) / 100)}`}
                <span className="text-sm font-normal text-muted">{(plan.priceCents ?? 0) === 0 ? " forever" : "/mo"}</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-xs text-muted">
                <li>✓ {plan.maxChannels === 8 ? "All 12 platforms" : `${plan.maxChannels} connected platforms`}</li>
                <li>✓ {plan.aiGenerationsPerDay === -1 ? "Unlimited AI" : `${plan.aiGenerationsPerDay} AI generations/day`}</li>
                <li>✓ Campaign autopilot</li>
                <li>✓ Fame Score analytics</li>
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <Button variant="secondary" className="w-full" disabled>Current plan</Button>
                ) : (
                  <Button variant={plan.id === "free" ? "secondary" : "primary"} className="w-full" onClick={() => upgrade(plan.id)} disabled={busy !== null}>
                    {busy === plan.id ? <Spinner /> : (plan.priceCents ?? 0) === 0 ? "Downgrade" : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-5 text-sm text-muted">
        <p>
          📊 Usage: <span className="font-semibold text-foreground">{info.connected}</span>/{info.plan.maxChannels} channels connected ·{" "}
          <span className="font-semibold text-foreground">{info.aiLeft === -1 ? "∞" : info.aiLeft}</span> AI generations left today
          {info.aiLeft === 0 && " — upgrade to keep generating"}
        </p>
        <p className="mt-2 text-xs text-muted/70">
          Payments are processed by Stripe. Cancel anytime — you keep access until the end of your billing period.
        </p>
      </Card>

      {node}
    </div>
  );
}
