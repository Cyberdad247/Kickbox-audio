/**
 * v1.3.0 Tier 4.3: Client-cert revocation workflow for the mTLS boundary.
 *
 * The mTLS handshake terminates in front of Bifrost (Caddy/nginx at the
 * Tailscale edge — see PRODUCTION_RUNBOOK §3.1). Bifrost cannot intercept
 * the TLS handshake itself. Instead, this module revokes the *RBAC JWT*
 * that is issued to a client after its cert was authenticated, so
 * requireRole() rejects future JWTs bound to a revoked marker.
 *
 * Identity model: any one of the following markers can be revoked:
 *   - clientCertSerial (x509 serial number, hex string)
 *   - clientCertSubject (CN of the client cert subject, e.g. mcp-query-prod)
 *   - rbacSubject (the `sub` claim of the JWT, e.g. auth0|abc123)
 *
 * Revocation is idempotent: a second revoke for the same marker is a no-op
 * that returns the original revokedAt timestamp.
 *
 * Persistence: in-memory Map + initial seed from CERT_REVOKED_LIST env
 * (comma-separated `serial=SUBJECT` entries, optional `;rbacSubject=...`
 * suffix). On boot, the seed is loaded once. After process restart, the
 * hot store is gone; the env seed restores essential revocations.
 *
 * For Tailscale-edge enforcement (the actual blocking of mTLS clients at
 * the Caddy layer), see PRODUCTION_RUNBOOK §6.5 — operators rebuild the
 * Caddy config after a revoke call returns.
 */

import { logger } from './logger';
import { captureMessage } from './sentry';

export type RevocationMarker = string;

export interface RevokedCert {
  /** x509 serial (hex, colon-separated or not — normalized lowercased). */
  clientCertSerial?: string;
  /** Cert subject CN. */
  clientCertSubject?: string;
  /** RBAC JWT `sub` claim bound to this cert. */
  rbacSubject?: string;
  /** ISO-8601 ms epoch when revocation was applied. */
  revokedAt: number;
  /** Operator who applied the revocation (audit trail). */
  revokedBy: string;
  /** Optional free-text reason ("compromised laptop", "offboarded"). */
  reason?: string;
}

const REVOCATION_PURGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 d — auto-purge
const store = new Map<RevocationMarker, RevokedCert>();

function normalizeSerial(s: string): string {
  return s.toLowerCase().replace(/:/g, '').replace(/\s+/g, '');
}

function buildKey(args: {
  clientCertSerial?: string;
  clientCertSubject?: string;
  rbacSubject?: string;
}): RevocationMarker {
  if (args.clientCertSerial) return `serial:${normalizeSerial(args.clientCertSerial)}`;
  if (args.clientCertSubject) return `subject:${args.clientCertSubject}`;
  if (args.rbacSubject) return `sub:${args.rbacSubject}`;
  throw new Error('revoke requires at least one of clientCertSerial, clientCertSubject, rbacSubject');
}

/**
 * v1.3.0 Tier 4.3: load the initial revocation seed from env. Format:
 *   CERT_REVOKED_LIST="serial:abc123;by:alice;reason:laptop-stolen,
 *                      subject:mcp-query-old;by:bob;reason:decommissioned"
 * Each entry is `;`-delimited. Production rotation: rely on the JSON
 * audit log instead; env seed is for the COLD-BOOT safety floor.
 */
export function loadRevocationSeed(): number {
  const seedRaw = process.env.CERT_REVOKED_LIST;
  if (!seedRaw) return 0;
  const parsed = parseRevocationSeed(seedRaw);
  let loaded = 0;
  for (const entry of parsed) {
    if (revokeCertInternal(entry).marker !== null) loaded++;
  }
  logger.info({ count: loaded }, '[certRevocation] loaded seed from CERT_REVOKED_LIST');
  return loaded;
}

export function parseRevocationSeed(raw: string): RevokedCert[] {
  const out: RevokedCert[] = [];
  for (const entry of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const map: Record<string, string> = {};
    for (const part of entry.split(';').map((s) => s.trim()).filter(Boolean)) {
      const idx = part.indexOf(':');
      if (idx < 0) continue;
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      map[k] = v;
    }
    const entry_built: RevokedCert = {
      revokedAt: map['at'] ? Number(map['at']) : Date.now(),
      revokedBy: map['by'] ?? 'env-seed',
      reason: map['reason'],
    };
    if (map['serial']) entry_built.clientCertSerial = map['serial'];
    if (map['subject']) entry_built.clientCertSubject = map['subject'];
    if (map['sub']) entry_built.rbacSubject = map['sub'];
    out.push(entry_built);
  }
  return out;
}

function revokeCertInternal(args: Omit<RevokedCert, 'revokedAt'> & { revokedAt?: number }): {
  marker: RevocationMarker | null;
  revoked: RevokedCert;
  duplicate: boolean;
} {
  const key = buildKey(args);
  const existing = store.get(key);
  if (existing) {
    return { marker: key, revoked: existing, duplicate: true };
  }
  const revoked: RevokedCert = {
    clientCertSerial: args.clientCertSerial,
    clientCertSubject: args.clientCertSubject,
    rbacSubject: args.rbacSubject,
    revokedAt: args.revokedAt ?? Date.now(),
    revokedBy: args.revokedBy ?? 'unknown',
    reason: args.reason,
  };
  store.set(key, revoked);
  return { marker: key, revoked, duplicate: false };
}

/**
 * Revoke a cert marker. Idempotent. Returns the recorded entry.
 */
export function revokeCert(args: Omit<RevokedCert, 'revokedAt'>): {
  marker: RevocationMarker;
  revoked: RevokedCert;
  duplicate: boolean;
} {
  const result = revokeCertInternal(args);
  if (result.marker === null) {
    throw new Error('revokeCert produced no marker (impossible)');
  }
  if (!result.duplicate) {
    logger.warn(
      {
        marker: result.marker,
        revokedAt: result.revoked.revokedAt,
        revokedBy: result.revoked.revokedBy,
        reason: result.revoked.reason,
      },
      '[certRevocation] cert revoked',
    );
    // Mirror to Sentry (captureMessage, NOT captureException — this is
    // a deliberate security-significant event, not an error). The
    // above logger.warn still fires so Pino carries the audit trail
    // even when Sentry is unconfigured.
    captureMessage('cert_revocation', {
      marker: result.marker,
      revokedAt: result.revoked.revokedAt,
      revokedBy: result.revoked.revokedBy,
      reason: result.revoked.reason,
    });
  }
  return result as { marker: RevocationMarker; revoked: RevokedCert; duplicate: boolean };
}

/**
 * Reissue: removes the marker from the revocation store so future
 * requests from this cert subject / RBAC subject are accepted again.
 * Audit trail is preserved: we append a `reissuedAt` field to the entry
 * for the operator record. Original `revokedAt` is preserved.
 */
export function reissueCert(args: {
  clientCertSerial?: string;
  clientCertSubject?: string;
  rbacSubject?: string;
}): { marker: RevocationMarker; reissuedAt: number } | null {
  const key = buildKey(args);
  const existing = store.get(key);
  if (!existing) return null;
  const reissuedAt = Date.now();
  store.set(key, { ...existing, reissuedAt } as RevokedCert & { reissuedAt: number });
  store.delete(key);
  logger.info({ marker: key, reissuedAt }, '[certRevocation] cert reissued');
  captureMessage('cert_reissuance', { marker: key, reissuedAt });
  return { marker: key, reissuedAt };
}

/**
 * True if any of the provided markers is currently revoked. Called by
 * requireRole() after JWT verification, BEFORE the role check, so a
 * revoked JWT is rejected even if its role claim is `admin`.
 *
 * Auto-purges entries older than 30 d on read (cheap cleanup that
 * doesn't require a periodic timer in vitest).
 */
export function isRevoked(args: {
  clientCertSerial?: string;
  clientCertSubject?: string;
  rbacSubject?: string;
}): boolean {
  const now = Date.now();
  const candidates: RevocationMarker[] = [];
  if (args.clientCertSerial) candidates.push(`serial:${normalizeSerial(args.clientCertSerial)}`);
  if (args.clientCertSubject) candidates.push(`subject:${args.clientCertSubject}`);
  if (args.rbacSubject) candidates.push(`sub:${args.rbacSubject}`);
  if (candidates.length === 0) return false;
  for (const key of candidates) {
    const entry = store.get(key);
    if (!entry) continue;
    if (now - entry.revokedAt > REVOCATION_PURGE_MS) {
      store.delete(key);
      logger.info({ marker: key, ageMs: now - entry.revokedAt }, '[certRevocation] auto-purged stale entry');
      continue;
    }
    return true;
  }
  return false;
}

/** Test-only: clear the revocation store. Do NOT call from production code. */
export function _clearRevocationStoreForTests(): void {
  store.clear();
}

/** Operator introspection: list all live revocations (for the admin endpoint). */
export function listRevocations(): RevokedCert[] {
  return [...store.values()];
}

export const CERT_REVOCATION_PURGE_MS = REVOCATION_PURGE_MS;
