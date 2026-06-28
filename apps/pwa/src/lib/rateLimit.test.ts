/**
 * v1.4.0 + v1.4.3: unit tests for the distributed rate-limit helper.
 *
 * Covers:
 *   - In-memory sliding window (60/IP/60s)
 *   - In-memory daily hard-circuit (1000/IP/24h) via fake timers
 *   - Per-IP isolation
 *   - IP HMAC-hashing (v1.4.3: HMAC-SHA256 not plain sha256) — raw IP
 *     never stored; output is 64-char hex; deterministic with the same
 *     secret; different inputs produce different outputs
 *   - HMAC fail-closed (v1.4.3): throws if RATE_LIMIT_HMAC_SECRET unset
 *   - Upstash backend: success → ok=true, backend='upstash'
 *   - Upstash backend: 429 → ok=false with retryAfterSec computed from reset
 *   - Upstash backend: throw → fallback to in-memory (console.warn)
 *
 * Mocks use `vi.doMock` to avoid hoisting; the @upstash/ratelimit v2 mock
 * must include the static `slidingWindow` / `fixedWindow` methods (used by
 * the helper's `getLimiters()` to construct the per-algorithm instances).
 *
 * IMPORTANT (v1.4.3): any new describe block that calls `checkRateLimit`
 * MUST set `process.env.RATE_LIMIT_HMAC_SECRET = TEST_HMAC_SECRET` in its
 * `beforeEach` — the helper throws if the env var is unset (fail-closed).
 * Both existing describes already do this; add it to any future block.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// --- In-memory tests (no Upstash env) ---------------------------------------

const TEST_HMAC_SECRET = 'test-hmac-secret-do-not-use-in-prod-32-chars-min';

describe('rateLimit (in-memory fallback)', () => {
  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.RATE_LIMIT_HMAC_SECRET = TEST_HMAC_SECRET;
    // v1.4.6: set a syntactically-valid test DSN so the helper's
    // Sentry.captureException call (in the Upstash-unreachable catch
    // block) doesn't print Sentry's "no DSN configured" warning to
    // stderr and pollute the vitest output. The DSN is fake (the
    // test project doesn't exist on Sentry) so events are silently
    // dropped by the SDK; the call still exercises the code path.
    process.env.SENTRY_DSN = 'https://test@test.ingest.sentry.io/1';
    vi.resetModules();
    vi.unmock('@upstash/ratelimit');
    vi.unmock('@upstash/redis');
  });
  // v1.4.3: defensive afterEach to re-set the HMAC env var after the
  // "throws if RATE_LIMIT_HMAC_SECRET is unset" test deletes it. Without
  // this, the Upstash describe's beforeEach (which didn't originally
  // set the HMAC env var) would inherit the unset state and fail.
  afterEach(() => {
    process.env.RATE_LIMIT_HMAC_SECRET = TEST_HMAC_SECRET;
  });

  it('allows 60 calls in 60s and blocks the 61st with scope="minute"', async () => {
    const { checkRateLimit, __test } = await import('./rateLimit');
    __test.memoryMinuteLog.clear();
    __test.memoryDayLog.clear();
    for (let i = 0; i < 60; i++) {
      const r = await checkRateLimit('1.1.1.1');
      expect(r.ok).toBe(true);
      expect(r.backend).toBe('memory');
    }
    const blocked = await checkRateLimit('1.1.1.1');
    expect(blocked.ok).toBe(false);
    expect(blocked.scope).toBe('minute');
    expect(blocked.retryAfterSec).toBeGreaterThanOrEqual(1);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it('isolates IPs (IP A blocked does not block IP B)', async () => {
    const { checkRateLimit, __test } = await import('./rateLimit');
    __test.memoryMinuteLog.clear();
    __test.memoryDayLog.clear();
    for (let i = 0; i < 60; i++) await checkRateLimit('2.2.2.2');
    const a = await checkRateLimit('2.2.2.2');
    const b = await checkRateLimit('3.3.3.3');
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(true);
  });

  it('releases the 60s window after 60s elapses (sliding window)', async () => {
    vi.useFakeTimers();
    try {
      const base = 1_700_000_000_000;
      vi.setSystemTime(base);
      const { checkRateLimit, __test } = await import('./rateLimit');
      __test.memoryMinuteLog.clear();
      __test.memoryDayLog.clear();
      for (let i = 0; i < 60; i++) await checkRateLimit('4.4.4.4');
      expect((await checkRateLimit('4.4.4.4')).ok).toBe(false);
      // Advance 61s — the 60 oldest timestamps fall outside the window.
      vi.setSystemTime(base + 61_000);
      expect((await checkRateLimit('4.4.4.4')).ok).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('blocks with scope="day" when the 1000/day hard-circuit is hit', async () => {
    vi.useFakeTimers();
    try {
      const base = 1_700_000_000_000;
      vi.setSystemTime(base);
      const { checkRateLimit, __test } = await import('./rateLimit');
      __test.memoryMinuteLog.clear();
      __test.memoryDayLog.clear();
      // Spread 1000 calls across ~17 minutes so the per-minute window
      // does not block us (60 per 60s = ~17 min for 1000 calls).
      for (let i = 0; i < 1000; i++) {
        vi.setSystemTime(base + i * 1100); // +1.1s per call → 17 min spread
        const r = await checkRateLimit('5.5.5.5');
        expect(r.ok).toBe(true);
      }
      // 1001st call: within 24h, so daily circuit fires (minute is fine
      // because we've only made one call in the last 60s of fake time).
      vi.setSystemTime(base + 1000 * 1100 + 61_000); // +61s past the 1000th
      const r = await checkRateLimit('5.5.5.5');
      expect(r.ok).toBe(false);
      expect(r.scope).toBe('day');
      expect(r.retryAfterSec).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('hashes the IP — raw IP never appears in the storage key', async () => {
    const { checkRateLimit, __test } = await import('./rateLimit');
    __test.memoryMinuteLog.clear();
    __test.memoryDayLog.clear();
    await checkRateLimit('203.0.113.42');
    const keys = [
      ...Array.from(__test.memoryMinuteLog.keys()),
      ...Array.from(__test.memoryDayLog.keys()),
    ];
    expect(keys).toHaveLength(2);
    for (const k of keys) {
      expect(k).not.toContain('203.0.113.42');
      expect(k).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
    }
  });

  it('hashes the same input deterministically', async () => {
    const { __test } = await import('./rateLimit');
    const h1 = __test.hashIp('10.0.0.1');
    const h2 = __test.hashIp('10.0.0.1');
    const h3 = __test.hashIp('10.0.0.2');
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it('throws if RATE_LIMIT_HMAC_SECRET is unset (fail-closed, v1.4.3)', async () => {
    delete process.env.RATE_LIMIT_HMAC_SECRET;
    vi.resetModules();
    const { checkRateLimit, __test } = await import('./rateLimit');
    // Direct getHmacSecret throw (no env read) — sharpest assertion.
    expect(() => __test.getHmacSecret()).toThrow(/RATE_LIMIT_HMAC_SECRET/);
    // Also confirm the public surface throws (caller-facing behavior).
    await expect(checkRateLimit('1.1.1.1')).rejects.toThrow(/RATE_LIMIT_HMAC_SECRET/);
  });
});

// --- Upstash backend (mocked) ----------------------------------------------

describe('rateLimit (Upstash backend)', () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://fake.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'fake-token';
    // v1.4.3: the helper requires RATE_LIMIT_HMAC_SECRET for every
    // checkRateLimit() call (even when Upstash is wired). Set it here
    // so the 4 Upstash tests don't inherit the unset state from the
    // in-memory "throws" test (which deletes the env var in its body).
    process.env.RATE_LIMIT_HMAC_SECRET = TEST_HMAC_SECRET;
    vi.resetModules();
  });
  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.RATE_LIMIT_HMAC_SECRET;
    vi.resetModules();
    vi.unmock('@upstash/ratelimit');
    vi.unmock('@upstash/redis');
  });

  /** Build a complete @upstash/ratelimit v2 mock: constructor + the static
   * `slidingWindow` / `fixedWindow` methods (the helper's `getLimiters()`
   * calls them as static methods to construct per-algorithm instances). */
  function buildRatelimitMock(limitMock: ReturnType<typeof vi.fn>) {
    const ratelimitInstance = { limit: limitMock };
    const slidingWindowStub = { kind: 'sliding' };
    const fixedWindowStub = { kind: 'fixed' };
    const RatelimitCtor = vi.fn().mockImplementation(() => ratelimitInstance);
    const RatelimitMock = Object.assign(RatelimitCtor, {
      slidingWindow: vi.fn().mockReturnValue(slidingWindowStub),
      fixedWindow: vi.fn().mockReturnValue(fixedWindowStub),
    });
    return { RatelimitMock, ratelimitInstance, slidingWindowStub, fixedWindowStub };
  }

  it('uses Upstash when env vars are set + returns ok=true on success', async () => {
    const limitMock = vi.fn().mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60_000,
    });
    const { RatelimitMock } = buildRatelimitMock(limitMock);
    vi.doMock('@upstash/redis', () => ({ Redis: vi.fn() }));
    vi.doMock('@upstash/ratelimit', () => ({ Ratelimit: RatelimitMock }));
    const { checkRateLimit } = await import('./rateLimit');
    const r = await checkRateLimit('6.6.6.6');
    expect(r.ok).toBe(true);
    expect(r.backend).toBe('upstash');
    // Two limit() calls per checkRateLimit (minute + day, parallel).
    expect(limitMock).toHaveBeenCalledTimes(2);
    // Two Ratelimit constructors (minute + day instances).
    expect(RatelimitMock).toHaveBeenCalledTimes(2);
  });

  it('returns 429-shape on Upstash rate-limit (success=false on minute)', async () => {
    const resetMs = Date.now() + 42_000;
    const limitMock = vi
      .fn()
      .mockResolvedValueOnce({
        success: false,
        limit: 60,
        remaining: 0,
        reset: resetMs,
      })
      .mockResolvedValueOnce({
        success: true,
        limit: 1000,
        remaining: 999,
        reset: Date.now() + 24 * 60 * 60_000,
      });
    const { RatelimitMock } = buildRatelimitMock(limitMock);
    vi.doMock('@upstash/redis', () => ({ Redis: vi.fn() }));
    vi.doMock('@upstash/ratelimit', () => ({ Ratelimit: RatelimitMock }));
    const { checkRateLimit } = await import('./rateLimit');
    const r = await checkRateLimit('7.7.7.7');
    expect(r.ok).toBe(false);
    expect(r.backend).toBe('upstash');
    expect(r.scope).toBe('minute');
    // 42000ms - now() ≈ 42s; allow ±2s for execution latency.
    expect(r.retryAfterSec).toBeGreaterThanOrEqual(40);
    expect(r.retryAfterSec).toBeLessThanOrEqual(43);
  });

  it('returns scope="day" when the daily hard-circuit fires (minute passes)', async () => {
    const limitMock = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        limit: 60,
        remaining: 59,
        reset: Date.now() + 60_000,
      })
      .mockResolvedValueOnce({
        success: false,
        limit: 1000,
        remaining: 0,
        reset: Date.now() + 12 * 60 * 60_000,
      });
    const { RatelimitMock } = buildRatelimitMock(limitMock);
    vi.doMock('@upstash/redis', () => ({ Redis: vi.fn() }));
    vi.doMock('@upstash/ratelimit', () => ({ Ratelimit: RatelimitMock }));
    const { checkRateLimit } = await import('./rateLimit');
    const r = await checkRateLimit('7.7.7.7');
    expect(r.ok).toBe(false);
    expect(r.backend).toBe('upstash');
    expect(r.scope).toBe('day');
  });

  it('falls back to in-memory when Upstash throws', async () => {
    const limitMock = vi.fn().mockRejectedValue(new Error('Upstash 503'));
    const { RatelimitMock } = buildRatelimitMock(limitMock);
    vi.doMock('@upstash/redis', () => ({ Redis: vi.fn() }));
    vi.doMock('@upstash/ratelimit', () => ({ Ratelimit: RatelimitMock }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const { checkRateLimit, __test } = await import('./rateLimit');
      __test.memoryMinuteLog.clear();
      __test.memoryDayLog.clear();
      const r = await checkRateLimit('8.8.8.8');
      expect(r.ok).toBe(true);
      expect(r.backend).toBe('memory');
      expect(warnSpy).toHaveBeenCalledWith(
        '[rateLimit] Upstash unreachable, falling back to in-memory:',
        'Upstash 503',
      );
    } finally {
      warnSpy.mockRestore();
    }
  });
});
