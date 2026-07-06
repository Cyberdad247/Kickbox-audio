/**
 * In-memory bounded LRU nonce cache used by `verifyActionSignature` and the
 * proxy-auth middleware to defeat replay attacks. Each `(actionId, signature)`
 * tuple is recorded once with a TTL; subsequent claims within the window
 * return `false` so the middleware rejects the duplicate.
 *
 * Bound:
 *   - MAX_ENTRIES = 4096 (sufficient for ~10 min of proxy traffic at the
 *     documented 120/min rate-limit × ~3 concurrent users; replay set cannot
 *     grow unbounded under attack).
 *   - TTL = PROXY_SIGNED_ACTION_TTL_MS (10 min) by default — matches the
 *     longest-lived issuer. Earlier-issued entries are evicted lazily on
 *     the next claim attempt for the same key. There is no background
 *     sweeper because the LRU bound is the actual memory cap.
 *
 * Test seam:
 *   - `__resetNonceCacheForTests` clears the cache so suites start isolated.
 *
 * Defense strategy:
 *   - Single-process Bifrost is fine for in-memory state. If we ever
 *     horizontally scale, replace this singleton with a Redis-backed
 *     `claimOnce` (signature-as-key, SETNX with PX TTL). The interface
 *     stays the same.
 */

const MAX_ENTRIES = 4096;
const DEFAULT_TTL_MS = 10 * 60_000;

interface CacheEntry {
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Atomically claims a nonce once. Returns `true` on the first call within
 * the TTL window, `false` on every subsequent duplicate call. The TTL is
 * reread from clock insensitivity to test-injected `now`.
 */
export function claimOnce(key: string, options: { ttlMs?: number; now?: number } = {}): boolean {
  const now = options.now ?? Date.now();
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const existing = cache.get(key);
  if (existing !== undefined) {
    if (existing.expiresAt > now) {
      // Refresh LRU position on duplicate claim so hot keys aren't evicted.
      cache.delete(key);
      cache.set(key, existing);
      return false;
    }
    // Expired — fall through to refresh.
    cache.delete(key);
  }

  // Bound the cache: evict the oldest entry (Map iteration is insertion-order).
  if (cache.size >= MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }

  cache.set(key, { expiresAt: now + ttlMs });
  return true;
}

/** @internal Test-only: clears the nonce cache. */
export function __resetNonceCacheForTests(): void {
  cache.clear();
}

/** @internal Test-only: returns the current cache size. */
export function __nonceCacheSizeForTests(): number {
  return cache.size;
}

/** @internal Test-only: peeks at expiresAt for a given key, if present. */
export function __nonceCachePeekForTests(key: string, now: number = Date.now()): number | null {
  const entry = cache.get(key);
  if (entry === undefined) return null;
  if (entry.expiresAt <= now) return null;
  return entry.expiresAt;
}
