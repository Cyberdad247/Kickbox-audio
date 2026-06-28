import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test';

/**
 * v1.4.1 (post-ship follow-up): e2e regression test for the
 * `/api/diagnostics/replay-coverage` rate-limit (v1.4.0 lift to Upstash
 * Redis). Asserts the 60-req-per-minute sliding-window contract on a
 * live deployment so the rate-limit is regression-tested on every prod
 * build (not just covered by the in-process vitest cases).
 *
 * PRECONDITIONS (the test will FAIL on a misconfigured env):
 *   1. `E2E_BASE_URL` and `E2E_ADMIN_TOKEN` must be set in the env.
 *      Otherwise the entire describe is skipped (no false negatives on
 *      dev/PR-CI without Doppler secrets).
 *   2. The target deployment MUST have `UPSTASH_REDIS_REST_URL` +
 *      `UPSTASH_REDIS_REST_TOKEN` wired (Doppler + Vercel). Without
 *      Upstash, the in-memory fallback is per-Vercel-instance and the
 *      61 requests can split across instances — the rate-limit would
 *      NOT fire (you'd see 61 × 200 instead of 60 pass + 1 × 429).
 *      See PRODUCTION_RUNBOOK §6.8 for the provisioning drill.
 *   3. (Optional) `SENTRY_AUTH_TOKEN` for the route to return 200
 *      instead of 503 on the first 60 calls. The test treats 200 and
 *      503 as equivalent "pass" (the rate-limit fires before the
 *      Sentry fetch, so 429 still lands on the 61st call either way).
 *
 * To run against a real deploy:
 *
 *   E2E_BASE_URL=https://pwa-eight-gamma.vercel.app \
 *   E2E_ADMIN_TOKEN=$(doppler secrets get --project kickbox-audio \
 *     --config prd bifrost/admin-token --plain) \
 *   npx playwright test --config=playwright.burst.config.ts
 *
 * IP isolation per run: the helper generates a unique random IP from
 * the RFC 5737 TEST-NET-1 range (`192.0.2.0/24`, reserved for
 * documentation + testing) and injects it via `X-Forwarded-For`.
 * Vercel appends the real egress IP to the chain, but the route reads
 * the FIRST value via `.split(',')[0]`, so the unique IP is what the
 * rate-limit's `sha256(ip)` key sees. This makes the test idempotent
 * and prevents CI runs from polluting each other's state.
 *
 * Response contract (per PRODUCTION_RUNBOOK §10):
 *   - First 60 calls: `200` (Sentry wired) OR `503` (Sentry unwired,
 *     `TELEMETRY_UNAVAILABLE`). Both are "pass" because the rate-limit
 *     check fires BEFORE the Sentry fetch.
 *   - 61st call: `429` with `Retry-After: N` header (N ∈ [1, 60]).
 *   - Response body shape: `{ error: 'RATE_LIMIT_EXCEEDED',
 *     retryAfterSec: N, scope: 'minute' | 'day' }`. The `scope` is
 *     `'minute'` under normal conditions; `'day'` only fires if the
 *     same IP has burned the 1000-req/24h hard-circuit (vanishingly
 *     unlikely with random IPs but the test handles both).
 */

const E2E_BASE_URL = process.env.E2E_BASE_URL;
const E2E_ADMIN_TOKEN = process.env.E2E_ADMIN_TOKEN;

test.describe('replay-coverage rate-limit (v1.4.0 Upstash lift)', () => {
  test.skip(
    !E2E_BASE_URL || !E2E_ADMIN_TOKEN,
    'E2E_BASE_URL + E2E_ADMIN_TOKEN must be set to run against a live deploy',
  );

  /** Random unique IP in RFC 5737 TEST-NET-1 (192.0.2.0/24). */
  function uniqueTestIp(): string {
    const last = Math.floor(Math.random() * 253) + 1; // 1..254
    return `192.0.2.${last}`;
  }

  /** Send a burst of N requests with the supplied `X-Forwarded-For`.
   * Returns an array of {status, retryAfter, body} in call order. */
  async function burst(
    request: APIRequestContext,
    ip: string,
    count: number,
    path = '/api/diagnostics/replay-coverage?since=24h',
  ): Promise<{ status: number; retryAfter: string | null; body: unknown }[]> {
    const results: { status: number; retryAfter: string | null; body: unknown }[] = [];
    for (let i = 0; i < count; i++) {
      const res: APIResponse = await request.get(path, {
        headers: {
          Authorization: `Bearer ${E2E_ADMIN_TOKEN}`,
          'X-Forwarded-For': ip,
        },
      });
      const retryAfter = res.headers()['retry-after'] ?? null;
      const body: unknown = await res.json().catch(() => null);
      results.push({ status: res.status(), retryAfter, body });
    }
    return results;
  }

  test('61-request burst returns 60 pass + 1 × 429', async ({ request }) => {
    const ip = uniqueTestIp();
    const results = await burst(request, ip, 61);

    const pass = results.filter((r) => r.status === 200 || r.status === 503);
    const blocked = results.filter((r) => r.status === 429);

    // The 60th call must still pass; the 61st must be 429.
    expect(pass.length, `expected 60 pass, got ${pass.length} (statuses: ${results.map((r) => r.status).join(',')})`).toBe(60);
    expect(blocked.length, `expected 1 × 429, got ${blocked.length}`).toBe(1);
    // The LAST response (index 60) must be the 429.
    expect(results[60]?.status).toBe(429);
  });

  test('429 response carries a numeric Retry-After header (1..60) and a structured body', async ({ request }) => {
    const ip = uniqueTestIp();
    const results = await burst(request, ip, 61);
    const last = results[60];
    expect(last).toBeDefined();
    expect(last!.status).toBe(429);

    // Header: Retry-After must be a positive integer ≤ 60.
    expect(last!.retryAfter, 'Retry-After header must be set on 429').toBeTruthy();
    const n = Number(last!.retryAfter);
    expect(Number.isFinite(n), `Retry-After must parse as a number, got "${last!.retryAfter}"`).toBe(true);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(60);

    // Body: structured { error, retryAfterSec, scope }.
    const body = last!.body as { error?: string; retryAfterSec?: number; scope?: string } | null;
    expect(body).toBeTruthy();
    expect(body?.error).toBe('RATE_LIMIT_EXCEEDED');
    expect(body?.retryAfterSec).toBeGreaterThan(0);
    // The `scope` is normally `'minute'` (60/60s ceiling); `'day'` only
    // fires if this IP has already burned the 1000/24h hard-circuit
    // (vanishingly unlikely with random RFC 5737 IPs but asserted
    // defensively).
    expect(['minute', 'day']).toContain(body?.scope);
  });
});
