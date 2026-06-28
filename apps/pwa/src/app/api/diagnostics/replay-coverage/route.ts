/**
 * v1.3.0 Tier 3.2: replay-coverage telemetry endpoint.
 *
 * Proxies Sentry's "replay stats" sub-endpoint so the operator can curl
 * the PWA itself (with their admin token) and see whether replays are
 * actually being captured — without having to log into sentry.io.
 *
 * Sentry sub-endpoint used:
 *   GET https://sentry.io/api/0/projects/{org}/{project}/replay-stats/?since=...
 *   Authorization: Bearer {SENTRY_AUTH_TOKEN}
 *
 * Auth on this PWA route: ADMIN_TOKEN via Bearer header. The token is
 * stored in Doppler (vault key pwa/admin-token, env fallback ADMIN_TOKEN)
 * and rotated per PRODUCTION_RUNBOOK §6.6 cadence.
 *
 * Returns 200 with normalized stats: sessionCount, errorCaptureRate,
 * p75ReplayBytes. Returns 503 if SENTRY_AUTH_TOKEN is unset (the operator
 * needs to wire it before relying on this endpoint).
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getSecret } from '../../../../lib/secrets';

interface SentryReplayStats {
  sessionCount: number;
  errorCaptureRate: number;
  p75ReplayBytes: number;
}

// v1.3.1 follow-up: in-memory rate limit (60 req/IP/60 s). The endpoint
// is already admin-gated by ADMIN_TOKEN, but a leaked token in a tight
// loop would hammer Sentry without bound. Note: in-memory only — for
// multi-region Vercel instances, lift to Vercel Edge KV (v1.4.0 ticket).
const RATE_LIMIT_MAX_REQS = 60;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const rateLimitLog = new Map<string, number[]>();

function checkRateLimit(ip: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const recent = (rateLimitLog.get(ip) ?? []).filter((t) => t > cutoff);
  if (recent.length >= RATE_LIMIT_MAX_REQS) {
    const oldestInWindow = recent[0];
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldestInWindow + RATE_LIMIT_WINDOW_MS - now) / 1000),
    );
    rateLimitLog.set(ip, recent);
    return { ok: false, retryAfterSec };
  }
  recent.push(now);
  rateLimitLog.set(ip, recent);
  return { ok: true, retryAfterSec: 0 };
}

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = req.headers.get('authorization') ?? '';
  const token = process.env.ADMIN_TOKEN ?? '';
  if (!token || !auth.startsWith('Bearer ') || auth.slice('Bearer '.length) !== token) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'RATE_LIMIT_EXCEEDED', retryAfterSec: rl.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    );
  }
  try {
    const sentryToken = await getSecret('pwa/sentry-auth-token', 'SENTRY_AUTH_TOKEN');
    const org = process.env.SENTRY_ORG ?? 'kickbox-audio';
    const project = process.env.SENTRY_PROJECT ?? 'pwa';
    const since = req.nextUrl.searchParams.get('since') ?? '24h';
    const url =
      `https://sentry.io/api/0/projects/${encodeURIComponent(org)}/${encodeURIComponent(project)}` +
      `/replay-stats/?since=${encodeURIComponent(since)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${sentryToken}`, Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: 'SENTRY_UPSTREAM_ERROR', status: res.status, body: await res.text() },
        { status: 502 },
      );
    }
    const raw = (await res.json()) as Record<string, number>;
    const stats: SentryReplayStats = {
      sessionCount: Number(raw['sessionCount'] ?? 0),
      errorCaptureRate: Number(raw['errorCaptureRate'] ?? 0),
      p75ReplayBytes: Number(raw['p75ReplayBytes'] ?? 0),
    };
    return NextResponse.json(stats, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: 'TELEMETRY_UNAVAILABLE', message: (err as Error).message },
      { status: 503 },
    );
  }
}
