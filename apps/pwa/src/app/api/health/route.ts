import { NextResponse } from 'next/server';

/**
 * GET /api/health
 *
 * Liveness/readiness probe for the PWA. Used by Vercel, uptime
 * monitors, and Kubernetes-style health checks.
 *
 * Returns 200 OK with a JSON body summarizing the process state.
 * Intentionally does NOT check the database (this is the PWA
 * surface, not the gateway) — for DB health see the Bifrost
 * gateway's internal health endpoint or the Prisma health check
 * in `packages/db`.
 *
 * Caching is disabled so every request gets a fresh timestamp.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'kickbox-pwa',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version ?? '0.1.0',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  );
}
