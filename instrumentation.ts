// Next.js instrumentation — starts the campaign autopilot in the long-running
// Node server (next start / Docker). No-ops on serverless/edge.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("./src/lib/scheduler");
    startScheduler();
  }
}
