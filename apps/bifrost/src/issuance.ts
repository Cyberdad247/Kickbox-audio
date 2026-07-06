import crypto from 'node:crypto';

/**
 * Issue a short-lived, server-side HMAC signature for an authorized KBA
 * action. The PWA receives this bundle and re-presents it to
 * `/api/bifrost/hitl` with the same actionId in `x-webhook-action` so the
 * verifier can re-derive the raw body and re-check the HMAC.
 *
 * TTL is 5 minutes by default. Freshness tolerance on the verify side
 * absorbs up to 5 s of clock skew.
 */

export const TTL_MS = 5 * 60_000;
export const FRESHNESS_TOLERANCE_MS = 5_000;

/**
 * Proxy-auth flows use a longer TTL (10 min) than KBA HITL flows because
 * human review windows (AaliyahComposer render → draft → publish) regularly
 * span more than 5 minutes.
 */
export const PROXY_SIGNED_ACTION_TTL_MS = 10 * 60_000;

export interface SignedAction {
  /** Canonical raw body: `${actionId}:${timestamp}` (or rawBody if body-bound). */
  payload: string;
  /** HMAC-SHA256 hex digest of `payload` under `secret`. */
  signature: string;
  /** ms epoch of issuance. */
  timestamp: number;
  /** timestamp + TTL_MS. The verifier rejects bundles past this point. */
  expiresAt: number;
}

export function issueSignedAction(actionId: string, secret: string): SignedAction {
  if (!secret) {
    throw new Error('WEBHOOK_SECRET is undefined; issuance forbidden');
  }
  const timestamp = Date.now();
  const payload = `${actionId}:${timestamp}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return {
    payload,
    signature,
    timestamp,
    expiresAt: timestamp + TTL_MS,
  };
}

/**
 * Issue a proxy-auth signed bundle for PWA→Bifrost CMS calls. Differs from
 * `issueSignedAction` in two ways:
 *   - Default TTL is `PROXY_SIGNED_ACTION_TTL_MS` (10 min), overridable via
 *     `options.ttlMs`.
 *   - When `options.rawBody` is provided, the HMAC is computed over JUST the
 *     raw body (not `${actionId}:${timestamp}`) — this is the body-binding
 *     mode used for the destructive /api/cms/content/publish route.
 *
 * The verifier's `verifyActionSignature({ rawBody, ... })` mirrors this
 * contract exactly.
 */
export function issueProxySignedAction(
  actionId: string,
  secret: string,
  options: { ttlMs?: number; rawBody?: string } = {},
): SignedAction {
  if (!secret) {
    throw new Error('WEBHOOK_SECRET is undefined; issuance forbidden');
  }
  const ttlMs = options.ttlMs ?? PROXY_SIGNED_ACTION_TTL_MS;
  const timestamp = Date.now();
  const payload = options.rawBody ?? `${actionId}:${timestamp}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return {
    payload,
    signature,
    timestamp,
    expiresAt: timestamp + ttlMs,
  };
}
