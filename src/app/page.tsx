import Link from "next/link";
import { SiteNavbar } from "@/components/site-navbar";
import { SiteFooter } from "@/components/site-footer";
import { PlatformIcon } from "@/components/platform-icon";
import { PLATFORMS } from "@/lib/types";

const exampleOutputs: Record<string, string> = {
  x: "STOP SCROLLING. 👀 I've been working on this for a while and I'm finally ready to show you: the new AI sales webinar. If you care about closing more deals, this is for you. Follow for more 🔥",
  linkedin: "3 things I wish I knew sooner. Here's the honest truth about B2B sales training: consistency beats intensity, and the audience already wants what you're building — show them. Connect with me for more insights.",
  facebook: "I remember when I was exactly where you are. Nobody starts sales training feeling ready. They start scared, they start messy — and they start anyway. So do you. 💛",
  threads: "The short version. Bottom line: your next best deal comes from showing up every single day. More coming soon. —",
  instagram: "Warning: this might change your week. 📱 I'm hosting something special around sales training and you're invited. Details dropping soon. Save this before it's gone 👇",
  tiktok: "I almost didn't post about this. Then I remembered someone out there needs to hear it. The audience already wants what you're building — show them. Comment “YES” if you want part 2. 🎵",
};

const faqs = [
  { q: "Do I need an AI API key to use SocialAI?", a: "No. SocialAI ships with a built-in content engine that generates platform-tuned posts in 12 tones and 11 formats with zero configuration. Paste your own OpenAI or Anthropic key in Settings for even more powerful generation." },
  { q: "Which platforms can I post to for real?", a: "X/Twitter, LinkedIn (profile or Company Page), Facebook Pages, Threads, YouTube, Pinterest, and TikTok all have real OAuth 2.0 integrations. Instagram requires media (coming soon). Snapchat and Indeed are simulated so your pipeline never breaks." },
  { q: "What is the campaign autopilot?", a: "You define a topic, tone, audience, schedule, and target platforms once. SocialAI generates a fresh, on-brand post for every platform and publishes on your schedule — daily, weekly, or custom — even while you sleep." },
  { q: "Is my data private?", a: "Yes. SocialAI is self-hostable and stores everything in a local SQLite database on your own server. No third party sees your content, audience, or tokens." },
  { q: "Can I cancel anytime?", a: "Absolutely. Plans are monthly and cancellable in one click from your billing page. You keep access until the end of your billing period." },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 text-center">
        <div className="absolute inset-x-0 top-0 -z-10 h-[620px] bg-gradient-to-b from-[#a855f7]/10 via-transparent to-transparent" />
        <div className="absolute left-1/2 top-24 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-[#ff2d78]/15 blur-[110px]" />
        <span className="fade-up mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-medium text-muted">
          ✦ Meet Aria — your AI Social Director
        </span>
        <h1 className="fade-up mx-auto max-w-4xl text-4xl font-extrabold tracking-tight sm:text-6xl" style={{ animationDelay: "80ms" }}>
          Your AI Social Department.{" "}
          <span className="gradient-text">Trained Once. Working Every Day.</span>
        </h1>
        <p className="fade-up mx-auto mt-6 max-w-2xl text-lg text-muted" style={{ animationDelay: "160ms" }}>
          SocialAI learns your voice, writes on-brand content for every platform, schedules it, and
          publishes everywhere on autopilot. One dashboard replaces the entire social team.
        </p>
        <div className="fade-up mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row" style={{ animationDelay: "240ms" }}>
          <Link href="/signup" className="btn btn-primary btn-lg">Start Free — No Card Needed</Link>
          <a href="#how-it-works" className="btn btn-secondary btn-lg">See How It Works</a>
        </div>

        {/* Platform marquee */}
        <div className="fade-up mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-center gap-3" style={{ animationDelay: "320ms" }}>
          {PLATFORMS.filter((p) => !["website", "resume", "indeed"].includes(p.id)).map((p) => (
            <span key={p.id} className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted transition hover:border-[#a855f7]/40 hover:text-foreground">
              <PlatformIcon platform={p.id} size="sm" />
              {p.name}
            </span>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="border-t border-border bg-surface px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold tracking-tight">
            Social media takes a full department. Most people don&apos;t have one.
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { icon: "⏰", title: "Nobody has time to post", body: "Posting gets pushed to the bottom of the list every single day — so it stops happening." },
              { icon: "🔁", title: "Every platform, redone from scratch", body: "Strategy, writing, formatting, and scheduling for eight channels is a full-time job by itself." },
              { icon: "💸", title: "A team is expensive", body: "A real social media department costs six figures a year. Most people simply go without." },
            ].map((item) => (
              <div key={item.title} className="card p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#a855f7]/10 text-xl">{item.icon}</div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Not a tool. An AI social operating system.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted">
            Everything from the world&apos;s best social tools — composer, scheduler, analytics,
            autopilot — wrapped in an assistant that does the thinking for you.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: "🤖", title: "AI Content Engine", body: "12 tones × 11 formats. Platform-aware posts, hashtags, headlines and bios — generated in seconds, on brand, no prompt engineering." },
            { icon: "📅", title: "Campaign Autopilot", body: "Set a topic and a schedule. Aria writes fresh posts daily, weekly, or hourly and publishes to every channel automatically." },
            { icon: "📣", title: "Publish Everywhere", body: "Real OAuth 2.0 connections to X, LinkedIn, Facebook, Threads, YouTube, Pinterest and TikTok. Write once, post everywhere." },
            { icon: "📊", title: "Fame Score™", body: "A 0–100 growth score with follower trends, engagement stats, and an activity feed — see momentum at a glance." },
          ].map((f) => (
            <div key={f.title} className="card glow-card p-6 text-left">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff2d78]/15 to-[#a855f7]/15 text-2xl">{f.icon}</div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border bg-surface px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">From idea to continuous daily marketing.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted">
              One pipeline replaces the entire chain of work a marketing department does by hand.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-5">
            {[
              { n: "01", title: "Connect", body: "Link your platforms with one click OAuth. No developer setup." },
              { n: "02", title: "Train Aria", body: "Tell her your topic, tone, audience and signature. 30 seconds, once." },
              { n: "03", title: "Generate", body: "Get platform-native posts, hashtags and headlines instantly." },
              { n: "04", title: "Approve", body: "Review in the composer or queue — or skip straight to autopilot." },
              { n: "05", title: "Autopilot", body: "Aria publishes on schedule and your Fame Score grows every day." },
            ].map((s, i) => (
              <div key={s.n} className="card relative p-5">
                {i < 4 && <span className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-muted/40 md:block">→</span>}
                <span className="text-xs font-bold text-[#a855f7]">{s.n}</span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI example */}
      <section id="ai" className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">One idea. Six native voices. Zero rewriting.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted">
              This is a real example of what Aria generates from a single idea — no editing, no extra prompting.
            </p>
          </div>
          <div className="mt-10 rounded-2xl border border-border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted/60">Your input</p>
            <p className="mt-2 text-lg font-medium">
              &ldquo;Announcing our new AI-powered sales training webinar for small business owners.&rdquo;
            </p>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(exampleOutputs).map(([platform, text]) => (
              <div key={platform} className="card p-5 transition hover:border-[#a855f7]/40">
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={platform} size="sm" />
                  <span className="text-sm font-semibold">{PLATFORMS.find((p) => p.id === platform)?.name}</span>
                </div>
                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="border-t border-border bg-surface px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Simple pricing that scales with you.</h2>
          <p className="mt-3 text-muted">Start free. Upgrade when your brand takes off.</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-3">
          {[
            { name: "Free", price: "$0", period: "/forever", desc: "3 connected platforms, 10 AI generations/day", cta: "Start Free", highlight: false },
            { name: "Creator", price: "$49", period: "/mo", desc: "Every platform, full autopilot, 100 AI generations/day", cta: "Start 14-day trial", highlight: true },
            { name: "Business", price: "$149", period: "/mo", desc: "Priority AI, richer analytics, 500 AI generations/day", cta: "Go Business", highlight: false },
          ].map((t) => (
            <div key={t.name} className={`card flex flex-col p-6 ${t.highlight ? "ring-2 ring-[#a855f7]" : ""}`}>
              <h3 className="font-semibold">{t.name}</h3>
              <p className="mt-2 text-3xl font-bold">
                {t.price}
                <span className="text-sm font-normal text-muted">{t.period}</span>
              </p>
              <p className="mt-3 flex-1 text-sm text-muted">{t.desc}</p>
              <Link href="/signup" className={`btn ${t.highlight ? "btn-primary" : "btn-secondary"} mt-6`}>{t.cta}</Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-muted">
          <Link href="/pricing" className="text-[#a855f7] hover:underline">Compare all plans →</Link>
        </p>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-bold tracking-tight">Frequently asked questions</h2>
          <div className="mt-10 space-y-4">
            {faqs.map((f) => (
              <details key={f.q} className="card group p-5">
                <summary className="cursor-pointer list-none font-medium transition group-open:text-[#c4b5fd]">{f.q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-gradient-to-br from-[#ff2d78] to-[#a855f7] px-6 py-20 text-center text-white">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Aria is ready to run your socials.</h2>
        <p className="mx-auto mt-4 max-w-xl text-white/85">
          Meet her once, then never wonder what to post again — she writes, schedules, and publishes
          everywhere, every day.
        </p>
        <Link href="/signup" className="btn btn-lg mt-8 bg-white text-[#d61e5f] hover:bg-zinc-100">
          Get Started Free →
        </Link>
      </section>

      <SiteFooter />
    </div>
  );
}
