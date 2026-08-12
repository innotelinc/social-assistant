import Link from "next/link";
import type { Metadata } from "next";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { PLANS } from "@/lib/types";
import { stripeEnabled } from "@/lib/stripe";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  const billingEnabled = stripeEnabled();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Simple pricing. <span className="gradient-text">Serious growth.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              {billingEnabled
                ? "Start free, upgrade when your brand takes off. Cancel anytime."
                : "This instance is running without billing — everyone has unlimited access. 🎉"}
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`card flex flex-col p-6 ${plan.id === "creator" ? "ring-2 ring-[#a855f7]" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  {plan.id === "creator" && (
                    <span className="badge bg-[#a855f7]/15 text-[#c4b5fd]">Most popular</span>
                  )}
                </div>
                <p className="mt-3 text-3xl font-extrabold">
                  {(plan.priceCents ?? 0) === 0 ? "$0" : `$${Math.round((plan.priceCents ?? 0) / 100)}`}
                  <span className="text-sm font-normal text-muted">
                    {(plan.priceCents ?? 0) === 0 ? " forever" : "/mo"}
                  </span>
                </p>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{plan.description}</p>
                <ul className="mt-5 space-y-2 text-sm">
                  <li className="flex items-center gap-2"><span className="text-[#34d399]">✓</span> {plan.maxChannels === 8 ? "All 12 platforms" : `${plan.maxChannels} connected platforms`}</li>
                  <li className="flex items-center gap-2"><span className="text-[#34d399]">✓</span> {plan.aiGenerationsPerDay === -1 ? "Unlimited AI generations" : `${plan.aiGenerationsPerDay} AI generations/day`}</li>
                  <li className="flex items-center gap-2"><span className="text-[#34d399]">✓</span> Campaign autopilot</li>
                  <li className="flex items-center gap-2"><span className="text-[#34d399]">✓</span> Fame Score analytics</li>
                </ul>
                <Link href="/signup" className={`btn ${plan.id === "free" ? "btn-secondary" : "btn-primary"} mt-6`}>
                  {plan.priceCents === 0 ? "Start Free" : "Choose " + plan.name}
                </Link>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-14 max-w-3xl">
            <div className="card p-8">
              <h2 className="text-xl font-bold">What&apos;s included in every plan</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {[
                  ["✍️", "AI Content Engine", "12 tones, 11 formats, platform-native hashtags & headlines."],
                  ["📣", "Real multi-platform posting", "OAuth 2.0 to X, LinkedIn, Facebook, Threads, YouTube, Pinterest, TikTok."],
                  ["📅", "Posting queue & calendar", "Schedule anything; the autopilot fires campaigns for you."],
                  ["💼", "Profile Hub", "AI bios and about-me text tuned per platform, in your brand voice."],
                  ["📊", "Fame Score™ dashboard", "Followers, engagement, reach, and growth trends."],
                  ["🔒", "Private by default", "Self-hostable. Your content and tokens stay on your server."],
                ].map(([icon, title, body]) => (
                  <div key={title} className="flex gap-3">
                    <span className="text-xl">{icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold">{title}</h3>
                      <p className="mt-1 text-sm text-muted">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
