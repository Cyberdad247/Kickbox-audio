/**
 * v1.3.0 Tier 3.2: minimal secrets helper for the PWA diagnostics route.
 *
 * Mirrors apps/bifrost/src/secrets.ts but trimmed for the PWA surface:
 *   - 60-second in-memory cache (PWA reads are rare + admin-only)
 *   - Doppler REST fetch with `Authorization: Bearer {DOPPLER_TOKEN}`
 *   - Falls back to process.env on missing Doppler token or API failure
 *
 * Use only from server-side route handlers (this module is not safe to
 * import from client components — the DOPPLER_TOKEN would never be
 * available there anyway, so a runtime check throws).
 */

interface CachedSecret {
  value: string;
  loadedAt: number;
}

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map<string, CachedSecret>();

export async function getSecret(vaultKey: string, envFallback: string): Promise<string> {
  const cached = cache.get(vaultKey);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.value;
  }
  const token = process.env.DOPPLER_TOKEN;
  let value: string | undefined;
  if (token) {
    try {
      const project = process.env.DOPPLER_PROJECT ?? 'kickbox-audio';
      const config = process.env.DOPPLER_CONFIG ?? 'prd';
      const url =
        `https://api.doppler.com/v3/configs/config/secrets?project=${encodeURIComponent(project)}` +
        `&config=${encodeURIComponent(config)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = (await res.json()) as { secrets?: Record<string, { raw?: string } | string> };
        const entry = data.secrets?.[vaultKey];
        value = typeof entry === 'string' ? entry : entry?.raw;
      }
    } catch {
      // fall through to env
    }
  }
  if (!value) value = process.env[envFallback];
  if (!value) throw new Error(`Secret not found: vaultKey=${vaultKey}, envFallback=${envFallback}`);
  cache.set(vaultKey, { value, loadedAt: Date.now() });
  return value;
}

export function clearSecretCache(): void {
  cache.clear();
}
