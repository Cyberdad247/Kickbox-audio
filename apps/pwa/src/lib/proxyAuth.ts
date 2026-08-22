import crypto from 'node:crypto';
import { buildBifrostHttpUrl } from './bifrostHttp';

export type ProxyVerb = 'RENDER' | 'DRAFT' | 'PUBLISH';

export interface ProxyAuthHeaders {
  'x-webhook-action': string;
  'x-webhook-signature': string;
  'x-webhook-timestamp': string;
  'x-webhook-expires-at': string;
}

const PROXY_TTL_BUFFER_MS = 5_000; // 5 s jitter buffer before expiry
const PROXY_HTTP_TIMEOUT_MS = 5_000;

const cache = new Map<string, CacheEntry>();

interface CacheEntry {
  headers: ProxyAuthHeaders;
  bodyHash: string | null;
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function mintProxyAuth(
  verb: ProxyVerb,
  rawBody: string | undefined,
  fetchImpl: typeof fetch,
): Promise<ProxyAuthHeaders> {
  const actionId = `CMS__${verb}__${crypto.randomUUID()}`;
  const mintBody = rawBody !== undefined ? { actionId, rawBody } : { actionId };

  const res = await fetchWithTimeout(
    fetchImpl,
    buildBifrostHttpUrl('/api/bifrost/proxy-sign'),
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(mintBody),
      cache: 'no-store',
    },
    PROXY_HTTP_TIMEOUT_MS,
  );

  if (!res.ok) {
    throw new Error(`[pwa/cms proxy] proxy-sign mint failed: HTTP ${res.status} ${res.statusText}`);
  }

  const signed = (await res.json()) as {
    expiresAt: number;
    signature: string;
    timestamp: number;
  };

  return {
    'x-webhook-action': actionId,
    'x-webhook-signature': signed.signature,
    'x-webhook-timestamp': String(signed.timestamp),
    'x-webhook-expires-at': String(signed.expiresAt),
  };
}

export interface GetOrMintOptions {
  /** When provided, signature is bound to this raw body (used for /publish). */
  rawBody?: string;
  /** Test/injection seam — defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * Returns the four `x-webhook-*` headers the PWA proxy attaches to every
 * `/api/cms/*` request to Bifrost. Mints via `/api/bifrost/proxy-sign` when
 * the cache is empty or stale, otherwise returns the cached bundle.
 *
 * Cache key:
 *   - verbs without body binding → just the verb (e.g. `"RENDER"`)
 *   - verbs with body binding → `"<verb>:<sha256(body)>"`
 *
 * Cache pruning is lazy: entries past `expiresAt - PROXY_TTL_BUFFER_MS`
 * are re-minted on next read. No background sweeper.
 */
export async function getOrMintProxyAuthHeaders(
  verb: ProxyVerb,
  opts: GetOrMintOptions = {},
): Promise<ProxyAuthHeaders> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const bodyHash =
    opts.rawBody !== undefined
      ? crypto.createHash('sha256').update(opts.rawBody).digest('hex')
      : null;

  const cacheKey = bodyHash !== null ? `${verb}:${bodyHash}` : verb;
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (
    cached &&
    cached.bodyHash === bodyHash &&
    Number(cached.headers['x-webhook-expires-at']) - PROXY_TTL_BUFFER_MS > now
  ) {
    return cached.headers;
  }

  const fresh = await mintProxyAuth(verb, opts.rawBody, fetchImpl);
  cache.set(cacheKey, { headers: fresh, bodyHash });
  return fresh;
}

/** @internal Test-only: clears the proxy signature cache. */
export function __clearProxySignatureCacheForTests(): void {
  cache.clear();
}

/** @internal Test-only: returns the current proxy signature cache size. */
export function __peekProxySignatureCacheSizeForTests(): number {
  return cache.size;
}
