# SocialAI — single-container build (Next.js standalone + SQLite)
# The whole app (frontend + API + autopilot scheduler) runs as one process.

FROM node:22-alpine AS deps
WORKDIR /app
# Native module (better-sqlite3) needs build tools if a musl prebuild is missing.
RUN apk add --no-cache libc6-compat python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# The standalone server doesn't run instrumentation.ts, so compile the
# autopilot into its own process (run alongside server.js in the container).
RUN npx tsc -p tsconfig.scheduler.json

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/dist-scheduler ./dist-scheduler

RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "const r=require('http').get('http://localhost:3000/api/health',res=>process.exit(res.statusCode<500?0:1));r.on('error',()=>process.exit(1));r.setTimeout(4000,()=>{r.destroy();process.exit(1)})"

CMD ["sh", "-c", "node server.js & node dist-scheduler/scripts/scheduler.js & trap 'kill 0' EXIT INT TERM; wait"]
