// Next.js instrumentation — starts the campaign autopilot in the long-running
// Node server (next start / Docker). No-ops on serverless/edge.

export async function register() {
  // NEXT_RUNTIME is only ever set to "edge" (nodejs servers leave it unset),
  // so run the autopilot on any non-edge runtime.
  if (process.env.NEXT_RUNTIME !== "edge") {
    const { startScheduler } = await import("./src/lib/scheduler");
    startScheduler();
  }
}
