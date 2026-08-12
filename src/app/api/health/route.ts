// Liveness/version probe — used by the Docker HEALTHCHECK (public).

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "socialai",
    uptime: Math.round(process.uptime()),
    time: Date.now(),
    version: "1.0.0",
  });
}
