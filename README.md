# 🤖 SocialAI — Your AI Social Assistant

> **The easiest way to run your social media.** Write once, publish everywhere.
> Aria — your AI Social Director — learns your voice, writes on-brand content
> for every platform, schedules it, and publishes on autopilot while you work
> on your business.

<p align="center">
  <img src="https://img.shields.io/badge/status-live-brightgreen" alt="Status">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-purple" alt="License">
  <img src="https://img.shields.io/badge/deploy-single_container-22d3ee" alt="Deploy">
</p>

**Production instance:** [`https://socialai.innotel.us`](https://socialai.innotel.us)

---

## ✨ Why SocialAI?

Most social tools are glorified spreadsheets with a "post" button. SocialAI is
different — it's an **assistant**, not a dashboard:

- **Describe it once, post forever.** Type a topic ("launching a sales training
  webinar"), pick a tone and a schedule, and Aria writes fresh platform-native
  posts every single day — with zero prompt engineering.
- **No API keys required.** The built-in AI engine generates scroll-stopping
  content out of the box. Paste an OpenAI/Anthropic key later for premium output.
- **Real posting, real OAuth.** One-click connections to X, LinkedIn, Facebook,
  Threads, YouTube, Pinterest, and TikTok — not a "export & upload" workflow.
- **Private & self-hostable.** Everything lives in a local SQLite file on your
  own server. One container. No vendor lock-in.

Built from the lessons of three projects — a personal-brand posting engine, a
SaaS-grade AI director concept, and a battle-tested scheduling platform —
SocialAI fuses their best ideas into one clean, fast app.

---

## 🚀 Quick Start (Docker — production)

```bash
# 1. Clone & configure
git clone https://github.com/innotelinc/social-assistant.git
cd social-assistant
cp .env.example .env

# 2. Build & run
docker compose up -d --build

# 3. Open
open http://localhost:3000
```

The app runs as a **single container** (frontend + API + autopilot worker +
SQLite). A named volume keeps your posts, campaigns, and tokens across
restarts. The container runs two processes: the Next.js web server and the
autopilot worker (`scripts/scheduler.ts`, compiled and started via the Docker
CMD — the standalone server does not run `instrumentation.ts`).

### Reverse proxy for socialai.innotel.us

Point your proxy at port `3000`. Example Caddy config:

```
socialai.innotel.us {
    reverse_proxy localhost:3000
}
```

Or nginx:

```nginx
server {
    server_name socialai.innotel.us;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

---

## 🧑‍💻 Quick Start (Dev)

Requires **Node.js 20+** and **npm**.

```bash
npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:3000** and register an account. Done — the AI engine
works immediately with no configuration.

---

## 🔑 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PUBLIC_URL` | `http://localhost:3000` | Public URL of this instance (OAuth redirects + Stripe) |
| `PORT` | `3000` | Server port |
| `AI_API_KEY` | — | Optional instance-wide AI key (users can also add their own) |
| `AI_PROVIDER` | `openai` | `openai` \| `anthropic` |
| `AI_BASE_URL` | `https://api.openai.com/v1` | OpenAI-compatible endpoint |
| `AI_MODEL` | `gpt-4o-mini` | Model used when no per-user model is set |
| `STRIPE_SECRET_KEY` | — | Optional billing — leave blank to run free |
| `STRIPE_WEBHOOK_SECRET` | — | Webhook signing secret |
| `STRIPE_CREATOR_PRICE_ID` | — | Creator $49/mo recurring price |
| `STRIPE_BUSINESS_PRICE_ID` | — | Business $149/mo recurring price |
| `STRIPE_AGENCY_PRICE_ID` | — | Agency $499/mo recurring price |
| `X_API_KEY` / `X_API_SECRET` | — | Instance-wide platform keys (users can add their own in Settings) |
| `LINKEDIN_CLIENT_ID` / `_SECRET` | — | LinkedIn developer app |
| `FACEBOOK_APP_ID` / `_SECRET` | — | Facebook developer app (also Instagram/Threads) |
| `THREADS_APP_ID` / `_SECRET` | — | Threads developer app |
| `YOUTUBE_CLIENT_ID` / `_SECRET` | — | Google Cloud OAuth app |
| `PINTEREST_CLIENT_ID` / `_SECRET` | — | Pinterest developer app |
| `TIKTOK_CLIENT_ID` / `_SECRET` | — | TikTok developer app |

### Social platform OAuth

Each platform requires a developer app. The OAuth callback URL is always:

```
https://socialai.innotel.us/api/oauth/{platform}/callback
```

Users can paste their own Client ID/Secret under **Settings → Platform API
Keys**, or you can set them instance-wide via env vars.

| Platform | Real posting | Notes |
|---|---|---|
| X / Twitter | ✅ OAuth 2.0 (PKCE) + OAuth 1.0a | v2 API |
| LinkedIn | ✅ OAuth 2.0 | Posts as member **or** Company Page |
| Facebook | ✅ OAuth 2.0 | Posts as a Page |
| Threads | ✅ OAuth 2.0 | Text threads |
| YouTube | ⚠️ Community posts not public | Auto-fetches channel + subscribers |
| Pinterest | ⚠️ Requires media/link | Auto-fetches boards |
| Instagram | ⚠️ Media only | Auto-resolves Business Account |
| TikTok | ⚠️ Video only | Auto-fetches creator info |
| Snapchat / Indeed | ❌ Simulation | No public posting API — posts are logged |

### Stripe billing (optional)

1. Create three recurring Prices in Stripe: Creator $49/mo, Business $149/mo,
   Agency $499/mo.
2. Set `STRIPE_SECRET_KEY` and the three `STRIPE_*_PRICE_ID` values.
3. Configure the webhook endpoint `https://socialai.innotel.us/api/stripe/webhook`
   with event types `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.created`, and
   `customer.subscription.deleted`; paste the signing secret into
   `STRIPE_WEBHOOK_SECRET`.

Without Stripe keys the app runs in **free mode** — every account gets
unlimited access.

---

## 🧠 Features

### 📣 Publish Everywhere
- 12 channels: Instagram, TikTok, X, Facebook, YouTube, Snapchat, Threads,
  Pinterest, LinkedIn, Indeed, Personal Website, Resume
- One-click OAuth 2.0 connections with automatic profile sync (handles, pages,
  boards, follower counts)
- Write once → publish to every channel simultaneously; per-channel results so
  you always know what actually went live

### ✍️ AI Content Engine
- **12 tone profiles** — hype, witty, professional, casual, viral,
  inspirational, educational, controversial, relatable, urgent, luxurious,
  minimalist
- **11+ post formats** — promo, hook, tip, story, question, listicle, hot-take,
  testimonial, behind-the-scenes, tutorial, comparison
- Platform-aware hashtags, scroll-stopping headlines, and post ideas
- AI **bios** and **about** sections tuned per platform
- Optional real AI: bring your own OpenAI / Anthropic key

### 🚀 Campaign Autopilot
- Recurring schedules — daily, weekly, hourly, or every N days
- Aria generates fresh content and publishes automatically (15-second tick)
- Multi-channel targeting, pause/resume, run-now, and post history per campaign

### 📅 Publish Queue
- Drafts, scheduled posts, published history, and failed posts with reasons
- Bulk "publish all drafts" and "resend failed"
- Engagement snapshots per published post

### 📊 Command Center
- **Fame Score™** — 0–100 brand momentum score
- Follower growth trends, reach, engagement rate, upcoming posts
- Next autopilot runs and a full activity feed

### 👤 Profile Hub & Billing
- Brand voice training (tone, emoji, signature) used by every generation
- Creator $49 / Business $149 / Agency $499 plans with per-plan limits
  (free plan included)

---

## 🏗 Architecture

```
social-assistant/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Marketing landing (about SocialAI)
│   │   ├── pricing/ login/ signup/
│   │   ├── dashboard/          # Overview · Composer · Queue · Campaigns ·
│   │   │                       # Channels · Profile · Billing · Settings
│   │   └── api/                # Route handlers (auth, posts, campaigns,
│   │                           #  oauth, ai, stripe, dashboard, health)
│   ├── components/             # UI kit, sidebar, platform icons, charts
│   └── lib/
│       ├── db.ts               # SQLite (better-sqlite3) persistence
│       ├── auth.ts             # scrypt auth + sessions + plan limits
│       ├── ai-engine.ts        # Built-in content engine (12 tones × 11 formats)
│       ├── platforms.ts        # Per-platform OAuth + posting integrations
│       ├── oauth.ts            # Unified OAuth 2.0 (PKCE) + token refresh
│       ├── post-engine.ts      # Real API posting w/ simulation fallback
│       ├── engine.ts           # Publishing, Fame Score, dashboard, autopilot tick
│       ├── scheduler.ts        # 15s autopilot loop (via instrumentation.ts)
│       └── stripe.ts           # Stripe client + plan mapping
├── instrumentation.ts          # Boots the scheduler in the Node server
├── Dockerfile                  # Multi-stage, single container
├── docker-compose.yml
└── .env.example
```

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Next.js Route Handlers (Node runtime) |
| AI | Built-in engine + optional OpenAI/Anthropic |
| Auth | Local accounts, scrypt, httpOnly session cookies |
| Storage | SQLite (better-sqlite3), WAL mode |
| Billing | Stripe subscriptions (optional) |
| Deploy | Single Docker container + reverse proxy |

---

## 🛠 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server on :3000 |
| `npm run build` | Production build (standalone output) |
| `npm start` | Serve the standalone build (`node .next/standalone/server.js`) |
| `npm run scheduler` | Compile + run the autopilot worker standalone |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |

---

## 🔒 Privacy & Security

- Passwords are hashed with scrypt + per-user salt
- Session cookies are httpOnly and SameSite=Lax
- OAuth tokens are never sent to the browser — only connection status is
- Platform secrets can be set per-user or instance-wide via env
- Everything is self-hostable; your content and credentials never leave your
  server unless you choose a cloud platform provider

---

## 🤝 Contributing

Pull requests are welcome. For major changes, open an issue first to discuss
what you'd like to change.

---

## 📄 License

MIT © [Darnel Hunter](https://github.com/innotelinc) — innotelinc

---

<p align="center">
  <b>Built with 🔥 by <a href="https://github.com/innotelinc">innotelinc</a></b>
  <br/>
  <span>Live at <a href="https://socialai.innotel.us">socialai.innotel.us</a></span>
</p>
