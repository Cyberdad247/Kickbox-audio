/**
 * v1.2.0 T3.4: Secrets vault wrapper for Bifrost.
 *
 * Reads secrets from Doppler (https://doppler.com) if DOPPLER_TOKEN is
 * set, otherwise falls back to reading directly from process.env.
 *
 * Usage:
 *   const secret = await getSecret('bifrost/webhook-secret', 'WEBHOOK_SECRET')
 *   // First tries Doppler, then falls back to process.env.WEBHOOK_SECRET.
 *   // Throws if neither is set.
 *
 * Caching: secrets are cached in memory after the first read. To
 * force a re-read, call `clearSecretCache()` (e.g., in a vault-rotation
 * signal handler).
 *
 * Doppler API: https://docs.doppler.com/reference/api
 *   GET https://api.doppler.com/v3/configs/config/secrets?project={project}&config={config}
 *   Authorization: Bearer {DOPPLER_TOKEN}
 */

import { logger } from './logger';

interface CachedSecret {
  value: string;
  loadedAt: number;
}

const cache = new Map<string, CachedSecret>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — re-fetch to pick up rotations

let dopplerCache: Record<string, string> | null = null;
let dopplerLoadedAt = 0;

function isDopplerEnabled(): boolean {
  return Boolean(process.env.DOPPLER_TOKEN);
}

async function fetchDopplerSecrets(): Promise<Record<string, string>> {
  const now = Date.now();
  if (dopplerCache && now - dopplerLoadedAt < CACHE_TTL_MS) {
    return dopplerCache;
  }
  const token = process.env.DOPPLER_TOKEN;
  const project = process.env.DOPPLER_PROJECT ?? 'kickbox-audio';
  const config = process.env.DOPPLER_CONFIG ?? 'dev';
  const url = `https://api.doppler.com/v3/configs/config/secrets?project=${encodeURIComponent(project)}&config=${encodeURIComponent(config)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Doppler API ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { secrets?: Record<string, { raw?: string } | string> };
  const secrets: Record<string, string> = {};
  for (const [k, v] of Object.entries(data.secrets ?? {})) {
    if (typeof v === 'string') {
      secrets[k] = v;
    } else if (v && typeof v.raw === 'string') {
      secrets[k] = v.raw;
    }
  }
  dopplerCache = secrets;
  dopplerLoadedAt = now;
  return secrets;
}

/**
 * Resolve a secret by vault key (for Doppler) with a fallback to the
 * process.env var name. Throws if the secret is missing in both sources.
 */
export async function getSecret(vaultKey: string, envFallback: string): Promise<string> {
  const cached = cache.get(vaultKey);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.value;
  }
  let value: string | undefined;
  if (isDopplerEnabled()) {
    try {
      const secrets = await fetchDopplerSecrets();
      value = secrets[vaultKey];
    } catch (err) {
      logger.warn({ err: (err as Error).message, vaultKey }, '[secrets] Doppler fetch failed; falling back to env');
    }
  }
  if (!value) {
    value = process.env[envFallback];
  }
  if (!value) {
    throw new Error(`Secret not found: vaultKey=${vaultKey}, envFallback=${envFallback}`);
  }
  cache.set(vaultKey, { value, loadedAt: Date.now() });
  return value;
}

/**
 * Convenience for the common case: read WEBHOOK_SECRET from the vault
 * (or env fallback). Throws on missing. Used by server.ts on boot.
 */
export async function loadBifrostSecrets(): Promise<{ webhookSecret: string; actionSecret: string }> {
  const [webhookSecret, actionSecret] = await Promise.all([
    getSecret(process.env.WEBHOOK_SECRET_VAULT_KEY ?? 'bifrost/webhook-secret', 'WEBHOOK_SECRET'),
    getSecret(process.env.ACTION_SECRET_VAULT_KEY ?? 'bifrost/action-secret', 'ACTION_SECRET'),
  ]);
  return { webhookSecret, actionSecret };
}

export function clearSecretCache(): void {
  cache.clear();
  dopplerCache = null;
  dopplerLoadedAt = 0;
}
