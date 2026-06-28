/**
 * v1.4.0 + v1.4.3: distributed rate-limit (Upstash-backed sliding window
 * + daily hard-circuit) with in-memory fallback when UPSTASH_* env vars
 * are unset; unlinkable IP hashing via HMAC-SHA256 with a vault-stored
 * key.
 *
 * v1.5.0: per-IP daily hard-circuit observability. The 1000 req / IP /
 * 24 h ceiling is a deliberate cost guardrail for the Upstash free tier
 * (10K commands/day), but was previously INVISIBLE to operators: the
 * route returned 429 + `Retry-After` + `scope: 'day'` silently. v1.5.0
 * adds a `Sentry.captureException` call when the daily circuit fires
 * (BOTH in the Upstash path and the in-memory fallback path), tagged
 * `rate_limit.daily_circuit_breached: 'true'` so the operator can set
 * up a Sentry alert rule on the tag and decide whether to bump
 * `DAILY_HARD_CIRCUIT_MAX` if the guardrail is too aggressive for
 * legitimate traffic. Mirrors the v1.4.6 alert pattern
 * (`alert.upstash_degraded`); these are SEPARATE events with DIFFERENT
 * tags — operators wire 2 Sentry alert rules (or 1 rule matching either
 * tag). See PRODUCTION_RUNBOOK §6.8 + docs/ALERTING.md for the operator
 * handoff.
 *
 * v1.3.1 used an in-memory `Map<ip, number[]>` in the route file; v1.4.0
 * lifts to Upstash Redis so the 60 req / IP / 60 s ceiling is shared across
 * all Vercel edge regions (closes the v1.4.0 ticket in THREAT_MODEL §4 A2
 * + §5 item 7).
 *
 * Identifier (v1.4.3): `HMAC-SHA256(ip, RATE_LIMIT_HMAC_SECRET)`. HMAC is
 * unlinkable — without the secret, the hash cannot be reversed even by a
 * rainbow table (the IPv4 space is ~2^32 and brute-forcing a HMAC key
 * requires the secret). Plain `sha256(ip)` was vulnerable to rainbow-table
 * attacks (closes the v1.4.0 code-reviewer B ⚠️ minor). The HMAC key is
 * stored in Doppler (vault key `pwa/rate-limit-hmac-secret`) + Vercel env.
 *
 * Fail-open (Upstash only): when `UPSTASH_REDIS_REST_URL` /
 * `UPSTASH_REDIS_REST_TOKEN` are unset OR the Upstash call throws, the
 * helper falls back to the in-memory sliding-window logic (single-
 * instance only). A `console.warn` surfaces the degradation. Mirrors
 * the existing pattern in `apps/pwa/src/lib/secrets.ts` (Doppler → env
 * → throw) and `apps/bifrost/src/sentry.ts` (no-op when DSN unset).
 *
 * Fail-closed (HMAC, v1.4.3): if `RATE_LIMIT_HMAC_SECRET` is unset, the
 * helper THROWS on first use. We deliberately do NOT fall back to plain
 * `sha256(ip)` (loses unlinkability) or to a hardcoded dev secret
 * (brute-forceable from the source). The route propagates the throw as
 * a 500; the operator sees the clear error in Vercel logs and must set
 * the env var. See PRODUCTION_RUNBOOK §6.8 for the provisioning drill.
 *
 * Implementation note: @upstash/ratelimit v2 removed the `Ratelimit.chain`
 * helper. We use two separate `Ratelimit` instances (one per algorithm)
 * and call them in parallel via `Promise.all`. The minute-limit fires
 * first in the 429 response (more frequent, more actionable for the
 * operator); the day-limit fires if the minute passes but the day is
 * exhausted.
 */

import { createHmac } from 'node:crypto';
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

// HMAC secret cache (v1.4.3). `null` could mean "not yet probed" OR
// "probed and unset"; `hmacSecretProbed` disambiguates. The secret is
// read once on first call and cached; subsequent calls skip the env
// var lookup. If the secret is unset, getHmacSecret() throws on every
// call (the error message names the env var + Doppler vault key +
// provisioning drill so the operator can fix it).
let cachedHmacSecret: string | null = null;
let hmacSecretProbed = false;

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

/**
 * v1.4.3: HMAC-SHA256 the IP with the vault-stored secret. The output is
 * unlinkable (cannot be reversed to the raw IP without the secret). Throws
 * if `RATE_LIMIT_HMAC_SECRET` is unset (fail-closed) — see the file
 * docstring for the rationale.
 */
function getHmacSecret(): string {
  if (hmacSecretProbed) {
    if (cachedHmacSecret) return cachedHmacSecret;
    throw new Error(
      'RATE_LIMIT_HMAC_SECRET is not set. The rate-limit helper requires ' +
      'this env var to HMAC IP addresses before storing them in Upstash ' +
      '(or the in-memory fallback). Without it, the IP would be stored ' +
      'in plaintext, defeating the unlinkability posture. Set the env ' +
      'var in Vercel (Production + Preview); Doppler vault key is ' +
      'pwa/rate-limit-hmac-secret (prd config). See PRODUCTION_RUNBOOK ' +
      '§6.8 for the provisioning drill. Generate with: openssl rand -hex 32',
    );
  }
  hmacSecretProbed = true;
  const secret = process.env.RATE_LIMIT_HMAC_SECRET;
  if (!secret) {
    throw new Error(
      'RATE_LIMIT_HMAC_SECRET is not set. The rate-limit helper requires ' +
      'this env var to HMAC IP addresses before storing them in Upstash ' +
      '(or the in-memory fallback). Without it, the IP would be stored ' +
      'in plaintext, defeating the unlinkability posture. Set the env ' +
      'var in Vercel (Production + Preview); Doppler vault key is ' +
      'pwa/rate-limit-hmac-secret (prd config). See PRODUCTION_RUNBOOK ' +
      '§6.8 for the provisioning drill. Generate with: openssl rand -hex 32',
    );
  }
  cachedHmacSecret = secret;
  return secret;
}

function hashIp(ip: string): string {
  const secret = getHmacSecret();
  return createHmac('sha256', secret).update(ip).digest('hex');
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
        // v1.5.0: emit Sentry event for daily hard-circuit breach
        // (Upstash path). The daily ceiling is a deliberate cost
        // guardrail (Upstash free tier = 10K commands/day); when an
        // IP hits it, the operator needs real-time visibility to
        // decide whether to bump DAILY_HARD_CIRCUIT_MAX (legitimate
        // client) or block (misbehaving scraper / attacker). The
        // lazy import no-ops when @sentry/nextjs is not installed
        // (test env, dev builds without Sentry) AND when SENTRY_DSN
        // is unset (Sentry v8 silent no-op). Tagged with
        // `rate_limit.daily_circuit_breached=true` so the operator
        // can set up a Sentry alert rule that fires on this exact
        // tag (sentry.io -> kickbox-audio -> Alerts -> New Alert ->
        // Issues -> filter
        // `tags[rate_limit.daily_circuit_breached]: true`). See
        // PRODUCTION_RUNBOOK §6.8 + docs/ALERTING.md for the
        // operator handoff. The retryAfterSec is included in the
        // error message so the Sentry Issue's title is
        // self-describing (e.g. "Daily hard-circuit breached
        // (<DAILY_HARD_CIRCUIT_MAX> req / IP / 24 h);
        // retryAfter=4200s" tells the operator exactly when the
        // window resets; the constant is interpolated so the
        // message stays accurate after a bump).
        try {
          const Sentry = await import('@sentry/nextjs');
          Sentry.captureException(
            new Error(
              // Interpolate the constant so the message stays
              // accurate after a bump (PRODUCTION_RUNBOOK §6.8
              // "Daily hard-circuit visibility (v1.5.0)" §"When
              // to bump `DAILY_HARD_CIRCUIT_MAX`"). A hardcoded
              // "1000" would lie if the operator bumped the
              // constant to e.g. 5000.
              `Daily hard-circuit breached (${DAILY_HARD_CIRCUIT_MAX} req / IP / 24 h); retryAfter=${retryAfterSec}s`,
            ),
            {
              level: 'warning',
              tags: {
                'rate_limit.daily_circuit_breached': 'true',
                'rate_limit.backend': 'upstash',
              },
            },
          );
        } catch {
          // Sentry not installed or not configured; the 429
          // response is the fallback (visible to the client,
          // surfaced in the route's audit log + Vercel logs).
        }
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
      // v1.4.6: also capture in Sentry for real-time prod alerting.
      // The lazy import no-ops when @sentry/nextjs is not installed
      // (test env, dev builds without Sentry) AND when SENTRY_DSN is
      // unset (silent no-op in Sentry v8). Tagged with
      // `alert.upstash_degraded=true` so the operator can set up a
      // Sentry alert rule that fires on this exact tag (sentry.io
      // -> kickbox-audio -> Alerts -> New Alert -> Issues -> filter
      // `tags[alert.upstash_degraded]: true`). See PRODUCTION_RUNBOOK
      // §6.8 + docs/ALERTING.md for the operator handoff.
      try {
        const Sentry = await import('@sentry/nextjs');
        Sentry.captureException(err, {
          level: 'warning',
          tags: {
            'alert.upstash_degraded': 'true',
            'rate_limit.backend': 'memory',
          },
        });
      } catch {
        // Sentry not installed or not configured; the console.warn is
        // the fallback (visible in Vercel logs, picked up by the
        // optional Vercel log-drain in docs/ALERTING.md Layer 2).
      }
    }
  }
  const mem = checkMemory(hashedIp, Date.now());
  // Emit a Sentry event when the daily hard-circuit fires in
  // the in-memory fallback path. Same rationale as the Upstash
  // path above: the daily ceiling is a cost guardrail, and the
  // operator needs real-time visibility when an IP hits it. The
  // in-memory path is the fail-open fallback (Upstash is down or
  // env vars are unset), so this event also surfaces day-breach
  // activity that the Upstash path would otherwise miss during a
  // degradation. Tagged with `rate_limit.backend: memory` to
  // distinguish from the Upstash-path events (operators can
  // filter on backend in the Sentry alert rule if they want
  // separate alerts for the degraded vs normal paths).
  //
  // Non-overlap with the v1.4.6 upstash_degraded event: the
  // in-memory day log is ONLY written when the in-memory path
  // is the primary path (Upstash env vars unset). If Upstash is
  // wired and throws on a request, the catch block fires
  // upstash_degraded but the in-memory day log is still empty
  // for that IP (we never reached checkMemory), so this emit
  // will not fire from the catch path. The only way to reach
  // `mem.scope === 'day'` is via the primary in-memory path —
  // a separate, persistent state, not the same request that
  // triggered upstash_degraded. The 2 events are orthogonal in
  // practice. If a future refactor ever changes this invariant,
  // operators can filter on the `rate_limit.backend` tag in the
  // Sentry alert rule to deduplicate.
  if (mem.scope === 'day') {
    try {
      const Sentry = await import('@sentry/nextjs');
      Sentry.captureException(
        new Error(
          // Interpolate the constant (see Upstash path comment
          // for rationale).
          `Daily hard-circuit breached (${DAILY_HARD_CIRCUIT_MAX} req / IP / 24 h); retryAfter=${mem.retryAfterSec}s`,
        ),
        {
          level: 'warning',
          tags: {
            'rate_limit.daily_circuit_breached': 'true',
            'rate_limit.backend': 'memory',
          },
        },
      );
    } catch {
      // Sentry not installed or not configured; the 429
      // response is the fallback.
    }
  }
  return { ...mem, backend: 'memory' };
}

// Test exports (not part of the public API).
export const __test = {
  checkMemory,
  getHmacSecret,
  getLimiters,
  hashIp,
  memoryMinuteLog,
  memoryDayLog,
  RATE_LIMIT_MAX_REQS,
  DAILY_HARD_CIRCUIT_MAX,
};
