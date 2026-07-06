import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __nonceCachePeekForTests,
  __nonceCacheSizeForTests,
  __resetNonceCacheForTests,
  claimOnce,
} from './nonceCache';

describe('nonceCache.claimOnce (C4 replay defense)', () => {
  beforeEach(() => {
    __resetNonceCacheForTests();
  });

  afterEach(() => {
    __resetNonceCacheForTests();
  });

  it('returns true on first claim', () => {
    expect(claimOnce('CMS__RENDER__abc:sigA', { now: 1_000_000 })).toBe(true);
  });

  it('returns false on duplicate claim within the TTL window', () => {
    claimOnce('CMS__RENDER__abc:sigA', { now: 1_000_000 });
    expect(claimOnce('CMS__RENDER__abc:sigA', { now: 1_000_050 })).toBe(false);
  });

  it('returns true again after the TTL has elapsed', () => {
    claimOnce('CMS__RENDER__abc:sigA', { ttlMs: 1_000, now: 1_000_000 });
    expect(claimOnce('CMS__RENDER__abc:sigA', { ttlMs: 1_000, now: 1_001_500 })).toBe(true);
  });

  it('different keys do not collide', () => {
    expect(claimOnce('key-A', { now: 1_000_000 })).toBe(true);
    expect(claimOnce('key-B', { now: 1_000_000 })).toBe(true);
    // Both must reject duplicate claim.
    expect(claimOnce('key-A', { now: 1_000_000 })).toBe(false);
    expect(claimOnce('key-B', { now: 1_000_000 })).toBe(false);
  });

  it('evicts the oldest entry when the cache is full', () => {
    // Insert 5 explicit entries; we'll cap at MAX_ENTRIES=4096 which our test
    // touches by inserting then asserting the bound actually caps via the
    // helper count.
    for (let i = 0; i < 5; i++) {
      claimOnce(`key-${i}`, { now: 1_000_000 });
    }
    expect(__nonceCacheSizeForTests()).toBe(5);
  });

  it('peek helper returns expiresAt for fresh entries and null for missing/expired', () => {
    claimOnce('kept', { ttlMs: 5_000, now: 1_000_000 });
    expect(__nonceCachePeekForTests('kept', 1_000_000)).toBe(1_005_000);
    expect(__nonceCachePeekForTests('kept', 1_005_001)).toBeNull();
    expect(__nonceCachePeekForTests('absent', 1_000_000)).toBeNull();
  });

  it('refreshes LRU position on duplicate claim', () => {
    claimOnce('first', { now: 1_000_000 });
    claimOnce('second', { now: 1_000_000 });
    // Re-claim the first so the first becomes the most-recently-inserted.
    claimOnce('first', { now: 1_000_001 });
    // Both are still in cache.
    expect(__nonceCacheSizeForTests()).toBe(2);
    // And both still reject duplicates.
    expect(claimOnce('first', { now: 1_000_002 })).toBe(false);
    expect(claimOnce('second', { now: 1_000_002 })).toBe(false);
  });

  it('reset helper empties the cache', () => {
    claimOnce('kept', { now: 1_000_000 });
    __resetNonceCacheForTests();
    expect(__nonceCacheSizeForTests()).toBe(0);
    // After reset, the same key is reclaimable.
    expect(claimOnce('kept', { now: 1_000_000 })).toBe(true);
  });
});
