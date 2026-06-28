/**
 * v1.4.0: distributed rate-limit (Upstash-backed sliding window + daily
 * hard-circuit) with in-memory fallback when UPSTASH_* env vars are unset.
 *
 * v1.3.1 used an in-memory `Map<ip, number[]>` in the route file; v1.4.0
 * lifts to Upstash Redis so the 60 req / IP / 60 s ceiling is shared across
 * all Vercel edge regions (closes the v1.4.0 ticket in THREAT_MODEL §4 A2
 * + §5 item 7).
 *
 * Identifier: `sha256(ip)`. Hashing the IP prevents storing raw network PII
 * in a third-party managed DB. The dev fallback (in-memory Map) also uses
 * the hashed IP for consistency.
 *
 * Fail-open: when `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are
 * unset OR the Upstash call throws, the helper falls back to the in-memory
 * sliding-window logic (single-instance only). This mirrors the existing
 * pattern in `apps/pwa/src/lib/secrets.ts` (Doppler → env → throw) and
 * `apps/bifrost/src/sentry.ts` (no-op when DSN unset). A `console.warn`
 * surfaces the degradation so the operator can investigate.
 *
 * Implementation note: @upstash/ratelimit v2 removed the `Ratelimit.chain`
 * helper. We use two separate `Ratelimit` instances (one per algorithm)
 * and call them in parallel via `Promise.all`. The minute-limit fires
 * first in the 429 response (more frequent, more actionable for the
 * operator); the day-limit fires if the minute passes but the day is
 * exhausted.
 */

import { createHash } from 'node:crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const RATE_LIMIT_MAX_REQS = 60;
const RATE_LIMIT_WINDOW = '60 s' as const;
const DAILY_HARD_CIRCUIT_MAX = 1000;
const DAILY_HARD_CIRCUIT_WINDOW = '24 h' as const;
const RATE_LIMIT_PREFIX = 'kickbox:pwa:replay-coverage';

export type RateLimitScope = 'minute' | 'day';
export type RateLimitBackend = 'upstash' | 'memory';

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
  scope: RateLimitScope | null;
  backend: RateLimitBackend;
}

interface UpstashLimiters {
  minute: Ratelimit;
  day: Ratelimit;
}

let cachedLimiters: UpstashLimiters | null = null;
// `null` = not yet probed. `false` = env vars confirmed unset, skip the
// env-var lookup on every subsequent call. `true` = Upstash is wired.
let cachedEnabled: boolean | null = null;

function getLimiters(): UpstashLimiters | null {
  if (cachedEnabled === false) return null;
  if (cachedLimiters) return cachedLimiters;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cachedEnabled = false;
    return null;
  }
  const redis = new Redis({ url, token });
  cachedLimiters = {
    minute: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX_REQS, RATE_LIMIT_WINDOW),
      prefix: `${RATE_LIMIT_PREFIX}:m`,
      analytics: false,
    }),
    day: new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(DAILY_HARD_CIRCUIT_MAX, DAILY_HARD_CIRCUIT_WINDOW),
      prefix: `${RATE_LIMIT_PREFIX}:d`,
      analytics: false,
    }),
  };
  cachedEnabled = true;
  return cachedLimiters;
}

// In-memory fallback: same sliding-window + 24h fixed-window logic.
const memoryMinuteLog = new Map<string, number[]>();
const memoryDayLog = new Map<string, number[]>();

function checkMemory(
  hashedIp: string,
  now: number,
): { ok: boolean; retryAfterSec: number; scope: RateLimitScope | null } {
  const minuteCutoff = now - 60 * 1000;
  const dayCutoff = now - 24 * 60 * 60 * 1000;
  const recentMinute = (memoryMinuteLog.get(hashedIp) ?? []).filter((t) => t > minuteCutoff);
  if (recentMinute.length >= RATE_LIMIT_MAX_REQS) {
    const oldest = recentMinute[0];
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + 60_000 - now) / 1000)),
      scope: 'minute',
    };
  }
  const recentDay = (memoryDayLog.get(hashedIp) ?? []).filter((t) => t > dayCutoff);
  if (recentDay.length >= DAILY_HARD_CIRCUIT_MAX) {
    const oldest = recentDay[0];
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + 24 * 60 * 60_000 - now) / 1000)),
      scope: 'day',
    };
  }
  recentMinute.push(now);
  recentDay.push(now);
  memoryMinuteLog.set(hashedIp, recentMinute);
  memoryDayLog.set(hashedIp, recentDay);
  return { ok: true, retryAfterSec: 0, scope: null };
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const hashedIp = hashIp(ip);
  const lims = getLimiters();
  if (lims) {
    try {
      const [minute, day] = await Promise.all([
        lims.minute.limit(hashedIp),
        lims.day.limit(hashedIp),
      ]);
      if (!minute.success) {
        const retryAfterSec = Math.max(1, Math.ceil((minute.reset - Date.now()) / 1000));
        return { ok: false, retryAfterSec, scope: 'minute', backend: 'upstash' };
      }
      if (!day.success) {
        const retryAfterSec = Math.max(1, Math.ceil((day.reset - Date.now()) / 1000));
        return { ok: false, retryAfterSec, scope: 'day', backend: 'upstash' };
      }
      return { ok: true, retryAfterSec: 0, scope: null, backend: 'upstash' };
    } catch (err) {
      // Redis is down: fall through to in-memory. The route's outer
      // try/catch would not catch this (it runs after the rate-limit
      // check), so the warn surfaces the degradation in Vercel logs.
      console.warn(
        '[rateLimit] Upstash unreachable, falling back to in-memory:',
        (err as Error).message,
      );
    }
  }
  const mem = checkMemory(hashedIp, Date.now());
  return { ...mem, backend: 'memory' };
}

// Test exports (not part of the public API).
export const __test = {
  checkMemory,
  getLimiters,
  hashIp,
  memoryMinuteLog,
  memoryDayLog,
  RATE_LIMIT_MAX_REQS,
  DAILY_HARD_CIRCUIT_MAX,
};
