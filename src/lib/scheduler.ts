// Campaign autopilot — runs in the long-lived Node server (next start / Docker).
// A 15-second tick fires due campaigns, publishes scheduled posts, and snapshots
// the Fame Score daily.

import { SCHEDULE_MS, tick } from "./engine";

declare global {
  var __socialaiSchedulerStarted: boolean | undefined;
}

export function startScheduler(): void {
  // Guard against double-start (Next dev hot reload / instrumentation re-run).
  if (globalThis.__socialaiSchedulerStarted) return;
  globalThis.__socialaiSchedulerStarted = true;

  const run = async () => {
    try {
      await tick();
    } catch (err) {
      console.error("[scheduler] tick failed:", err);
    }
  };

  run();
  const interval = setInterval(run, SCHEDULE_MS);
  if (typeof interval.unref === "function") interval.unref();
  console.log("[scheduler] campaign autopilot running every " + SCHEDULE_MS / 1000 + "s");
}
