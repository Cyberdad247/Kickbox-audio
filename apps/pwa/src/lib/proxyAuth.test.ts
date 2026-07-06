import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __clearProxySignatureCacheForTests,
  __peekProxySignatureCacheSizeForTests,
  getOrMintProxyAuthHeaders,
} from './proxyAuth';

type FetchFn = typeof fetch;

/**
 * Realistic timestamp factory — uses Date.now()-anchored values so the
 * cached bundle has ~10 min of remaining TTL when the cache check runs.
 */
function makeFactory(opts: { ttlMs?: number; alreadyExpired?: boolean } = {}) {
  let count = 0;
  return (_url: string, init?: RequestInit): Promise<Response> => {
    count += 1;
    const sentBody = init?.body ? JSON.parse(init.body as string) : {};
    const ts = Date.now();
    const ttl = opts.ttlMs ?? 600_000;
    const exp = opts.alreadyExpired ? ts - 60_000 : ts + ttl;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          expiresAt: exp,
          payload: sentBody.actionId,
          signature: `sig-${count}`,
          timestamp: ts,
        }),
        { headers: { 'content-type': 'application/json' }, status: 200 },
      ),
    );
  };
}

function errorFactory(status = 400) {
  return (): Promise<Response> =>
    Promise.resolve(
      new Response(JSON.stringify({ error: 'INVALID_BODY' }), { status }),
    );
}

describe('getOrMintProxyAuthHeaders (PWA \u2192 Bifrost HMAC mint+cache)', () => {
  beforeEach(() => {
    __clearProxySignatureCacheForTests();
  });

  afterEach(() => {
    __clearProxySignatureCacheForTests();
    vi.restoreAllMocks();
  });

  it('mints a fresh bundle for RENDER on first call', async () => {
    const fetchImpl: FetchFn = vi.fn(makeFactory()) as unknown as FetchFn;
    const h = await getOrMintProxyAuthHeaders('RENDER', { fetchImpl });
    expect(h['x-webhook-action']).toMatch(/^CMS__RENDER__[0-9a-f-]{36}$/i);
    expect(h['x-webhook-signature']).toBe('sig-1');
    expect(Number(h['x-webhook-timestamp'])).toBeGreaterThan(0);
    expect(Number(h['x-webhook-expires-at'])).toBeGreaterThan(Number(h['x-webhook-timestamp']));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('mints separate bundles per verb (RENDER, DRAFT, PUBLISH are uncached across verbs)', async () => {
    const fetchImpl: FetchFn = vi.fn(makeFactory()) as unknown as FetchFn;
    await getOrMintProxyAuthHeaders('RENDER', { fetchImpl });
    await getOrMintProxyAuthHeaders('DRAFT', { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('reuses cached bundle for RENDER within TTL (no second mint)', async () => {
    const fetchImpl: FetchFn = vi.fn(makeFactory()) as unknown as FetchFn;
    const h1 = await getOrMintProxyAuthHeaders('RENDER', { fetchImpl });
    const h2 = await getOrMintProxyAuthHeaders('RENDER', { fetchImpl });
    expect(h1).toBe(h2);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('reuses cached bundle for PUBLISH on identical rawBody', async () => {
    const fetchImpl: FetchFn = vi.fn(makeFactory()) as unknown as FetchFn;
    await getOrMintProxyAuthHeaders('PUBLISH', { rawBody: 'body-A', fetchImpl });
    await getOrMintProxyAuthHeaders('PUBLISH', { rawBody: 'body-A', fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('mints separate bundles for PUBLISH when rawBody changes (separate cache key)', async () => {
    const fetchImpl: FetchFn = vi.fn(makeFactory()) as unknown as FetchFn;
    await getOrMintProxyAuthHeaders('PUBLISH', { rawBody: 'body-A', fetchImpl });
    await getOrMintProxyAuthHeaders('PUBLISH', { rawBody: 'body-B', fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('re-mints when cached bundle is within the 5s jitter buffer of expiry', async () => {
    const fetchImpl: FetchFn = vi.fn(makeFactory({ ttlMs: 4_000 })) as unknown as FetchFn;
    const first = await getOrMintProxyAuthHeaders('RENDER', { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const second = await getOrMintProxyAuthHeaders('RENDER', { fetchImpl });
    expect(second).not.toBe(first);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('re-mints when cached bundle has already expired', async () => {
    const fetchImpl: FetchFn = vi.fn(makeFactory({ alreadyExpired: true })) as unknown as FetchFn;
    await getOrMintProxyAuthHeaders('RENDER', { fetchImpl });
    await getOrMintProxyAuthHeaders('RENDER', { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('throws when the mint endpoint returns non-OK status', async () => {
    const fetchImpl: FetchFn = vi.fn(errorFactory(400)) as unknown as FetchFn;
    await expect(getOrMintProxyAuthHeaders('RENDER', { fetchImpl })).rejects.toThrow(/400/);
  });

  it('sends the actionId in the mint body for the unbound verbs', async () => {
    const fetchImpl: FetchFn = vi.fn(makeFactory()) as unknown as FetchFn;
    await getOrMintProxyAuthHeaders('RENDER', { fetchImpl });
    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const body = JSON.parse(init.body as string);
    expect(body.actionId).toMatch(/^CMS__RENDER__[0-9a-f-]{36}$/i);
    expect(body.rawBody).toBeUndefined();
  });

  it('sends rawBody in the mint body for the bound verbs (PUBLISH)', async () => {
    const fetchImpl: FetchFn = vi.fn(makeFactory()) as unknown as FetchFn;
    const body = '{"html":"<p>hi</p>"}';
    await getOrMintProxyAuthHeaders('PUBLISH', { rawBody: body, fetchImpl });
    const init = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const sent = JSON.parse(init.body as string);
    expect(sent.actionId).toMatch(/^CMS__PUBLISH__[0-9a-f-]{36}$/i);
    expect(sent.rawBody).toBe(body);
  });

  it('re-mints after the cached bundle expires past TTL + 1 (symmetric across-TTL re-mint)', async () => {
    // Default makeFactory uses ttlMs=600_000 (10 min). After advancing the fake
    // clock past (expiresAt - 5s jitter buffer) the cache check should
    // fall through and re-mint via /api/bifrost/proxy-sign. This is the
    // symmetric counterpart to the `ttlMs: 4_000` short-circuit test above —
    // it proves the real-TTL expiry path actually re-mints, not just that
    // a sub-buffer TTL does.
    const fetchImpl: FetchFn = vi.fn(makeFactory()) as unknown as FetchFn;
    const h1 = await getOrMintProxyAuthHeaders('RENDER', { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    try {
      // Advance past the default 600_000ms TTL by 1ms; well past the 5s
      // buffer, so the cache.is-fresh predicate must return false.
      vi.setSystemTime(Date.now() + 600_001);
      const h2 = await getOrMintProxyAuthHeaders('RENDER', { fetchImpl });
      expect(h2).not.toBe(h1);
      expect(h2['x-webhook-signature']).toBe('sig-2');
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('mints distinct signatures + actionIds for PUBLISH across differing rawBody (body-hash cache-key partition)', async () => {
    // Cache key for body-bound verbs is `"<verb>:<sha256(body)>"` so two
    // different payloads must produce two fully independent bundles —
    // distinct actionId, signature, expiresAt. This is the PWA-side mirror
    // of the bifrost `requireBifrostProxySignature({ bindBody: true })`
    // tampered-body test; it guards against a future refactor that
    // collapses `PUBLISH` cache entries across bodies (which would let a
    // cached PUBLISH bundle authorize a different downstream payload).
    const fetchImpl: FetchFn = vi.fn(makeFactory()) as unknown as FetchFn;
    const h1 = await getOrMintProxyAuthHeaders('PUBLISH', {
      rawBody: '{"html":"<p>A</p>"}',
      fetchImpl,
    });
    const h2 = await getOrMintProxyAuthHeaders('PUBLISH', {
      rawBody: '{"html":"<p>B</p>"}',
      fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(h1).not.toBe(h2);
    expect(h1['x-webhook-action']).not.toBe(h2['x-webhook-action']);
    expect(h1['x-webhook-signature']).toBe('sig-1');
    expect(h2['x-webhook-signature']).toBe('sig-2');
  });

  it('cache.Map stays bounded under (verb × body) permutations — no collision, no entry leak', async () => {
    // 9 calls across 4 unique cache keys (RENDER, DRAFT, PUBLISH:body-1,
    // PUBLISH:body-2). Second occurrences of each key must be cache
    // hits; expected upstreams: 4. Internal cache Map should hold
    // exactly 4 entries — one per unique (verb, sha256(body)) key.
    // Guards against future refactors that:
    //   - collapse the cache key (e.g. drop `bodyHash` from the key formula)
    //   - or stop pruning expired entries (cache would grow unbounded)
    //   - or fail to call `cache.set` after a mint (silent miss-loops)
    const fetchImpl: FetchFn = vi.fn(makeFactory()) as unknown as FetchFn;

    await getOrMintProxyAuthHeaders('RENDER', { fetchImpl });
    await getOrMintProxyAuthHeaders('RENDER', { fetchImpl }); // hit
    await getOrMintProxyAuthHeaders('DRAFT', { fetchImpl });
    await getOrMintProxyAuthHeaders('DRAFT', { fetchImpl }); // hit
    await getOrMintProxyAuthHeaders('PUBLISH', { rawBody: 'body-1', fetchImpl });
    await getOrMintProxyAuthHeaders('PUBLISH', { rawBody: 'body-1', fetchImpl }); // hit
    await getOrMintProxyAuthHeaders('PUBLISH', { rawBody: 'body-2', fetchImpl });
    await getOrMintProxyAuthHeaders('PUBLISH', { rawBody: 'body-2', fetchImpl }); // hit
    await getOrMintProxyAuthHeaders('PUBLISH', { rawBody: 'body-1', fetchImpl }); // hit

    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(__peekProxySignatureCacheSizeForTests()).toBe(4);
  });
});
