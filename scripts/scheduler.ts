// Standalone autopilot process.
//
// The Next.js standalone server (node .next/standalone/server.js) does not run
// instrumentation.ts, so the Docker container runs this compiled process
// alongside the web server to drive the campaign autopilot tick.
//
// For `next start` / `next dev`, instrumentation.ts starts the same tick
// in-process — only ever one scheduler per process.

import { SCHEDULE_MS, tick } from "../src/lib/engine";

let started = false;

function start(): void {
  if (started) return;
  started = true;

  const run = async () => {
    try {
      await tick();
    } catch (err) {
      console.error("[scheduler] tick failed:", err);
    }
  };

  run();
  setInterval(run, SCHEDULE_MS);
  console.log(`[scheduler] campaign autopilot running every ${SCHEDULE_MS / 1000}s (standalone process)`);
}

start();
