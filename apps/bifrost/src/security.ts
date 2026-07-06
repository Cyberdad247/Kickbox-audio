import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const DEFAULT_PAST_SKEW_MS = 60_000;
export const DEFAULT_FUTURE_SKEW_MS = 30_000;

/**
 * Verify an HMAC-SHA256 hex signature of the raw request body using a shared
 * secret. Uses a constant-time comparison to avoid timing attacks.
 * Returns false on any missing input or length mismatch.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || !secret) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);

  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

export class SignatureError extends Error {
  readonly code: 'INVALID' | 'EXPIRED' | 'MALFORMED';
  constructor(code: 'INVALID' | 'EXPIRED' | 'MALFORMED', message: string) {
    super(message);
    this.code = code;
  }
}

export interface FreshnessOptions {
  /** Unix epoch ms when the signature was minted. */
  timestamp: number;
  /** Optional absolute hard expiration set by the issuer. */
  expiresAt?: number;
  /** Override current time (testing). */
  now?: number;
  /** Past-skew window in ms. Default 60_000. */
  pastSkewMs?: number;
  /** Future-skew window in ms. Default 30_000. */
  futureSkewMs?: number;
}

export function assertFresh(opts: FreshnessOptions): void {
  const now = opts.now ?? Date.now();
  const pastSkewMs = opts.pastSkewMs ?? DEFAULT_PAST_SKEW_MS;
  const futureSkewMs = opts.futureSkewMs ?? DEFAULT_FUTURE_SKEW_MS;

  if (!Number.isFinite(opts.timestamp)) {
    throw new SignatureError('MALFORMED', 'timestamp must be a finite number');
  }

  const skewMs = now - opts.timestamp;
  if (skewMs > pastSkewMs) {
    throw new SignatureError('EXPIRED', `signature too old (age=${skewMs}ms > ${pastSkewMs}ms)`);
  }
  if (skewMs < -futureSkewMs) {
    throw new SignatureError(
      'INVALID',
      `signature timestamp too far in future (skew=${-skewMs}ms > ${futureSkewMs}ms)`,
    );
  }

  if (opts.expiresAt !== undefined) {
    if (!Number.isFinite(opts.expiresAt)) {
      throw new SignatureError('MALFORMED', 'expiresAt must be a finite number');
    }
    if (now > opts.expiresAt + 1000) {
      throw new SignatureError(
        'EXPIRED',
        `signature past hard expiration (now=${now} > expiresAt+1s=${opts.expiresAt + 1000})`,
      );
    }
  }
}

export function verifyActionSignature(args: {
  actionId: string;
  timestamp: number;
  signature: string | undefined;
  expiresAt: number;
  secret: string;
  rawBody?: string;
}): void {
  const { actionId, timestamp, signature, expiresAt, secret } = args;
  const rawBody = args.rawBody ?? `${actionId}:${timestamp}`;
  if (!Number.isFinite(timestamp)) {
    throw new SignatureError('MALFORMED', 'timestamp must be a finite number');
  }
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    throw new SignatureError('INVALID', 'signature mismatch');
  }
  assertFresh({ timestamp, expiresAt });
}

// ── PWA→CMS proxy HMAC middleware (Task DAG T2) ──────────────────────

interface ProxySignatureRequest extends Request {
  rawBody?: string;
}

export interface ProxySignatureMiddlewareOptions {
  /** When true, signature verification binds to req.rawBody (used on /publish). */
  bindBody?: boolean;
}

let cmsHmacDevBypassWarned = false;

function readSingleHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Express middleware that validates an HMAC-signed nonce on the four
 * `x-webhook-*` headers that the PWA proxy attaches to every `/api/cms/*`
 * call. The secret is the same `WEBHOOK_SECRET` used for `/webhook/sms` and
 * `/api/bifrost/hitl` — there's no separate proxy secret any more.
 *
 * Per-route body binding:
 *   - bindBody=false (default) — verifies signature against `${actionId}:${timestamp}`
 *   - bindBody=true              — verifies signature against `req.rawBody`
 *
 * Behavior matrix:
 *   - WEBHOOK_SECRET PRESENT + headers MATCH (and body binds if configured) -> next()
 *   - WEBHOOK_SECRET PRESENT + missing/expired/malformed -> 401 (mirror SignatureError.code)
 *   - WEBHOOK_SECRET UNSET + NODE_ENV=production -> 401 { error: 'UNAUTHORIZED' } (fail closed)
 *   - WEBHOOK_SECRET UNSET + NODE_ENV!=production -> next() with warn-once
 */
export function requireBifrostProxySignature(
  opts: ProxySignatureMiddlewareOptions = {},
): (req: Request, res: Response, next: NextFunction) => void {
  return function middleware(req: Request, res: Response, next: NextFunction): void {
    const secret = process.env.WEBHOOK_SECRET ?? '';
    const isProd = process.env.NODE_ENV === 'production';

    if (!secret) {
      if (isProd) {
        res.status(401).json({ error: 'UNAUTHORIZED' });
        return;
      }
      if (!cmsHmacDevBypassWarned) {
        console.warn(
          '[bifrost/cms] WEBHOOK_SECRET unset; CMS HMAC proxy auth bypassed (development only)',
        );
        cmsHmacDevBypassWarned = true;
      }
      next();
      return;
    }

    const actionId = readSingleHeader(req.headers['x-webhook-action']);
    const signature = readSingleHeader(req.headers['x-webhook-signature']);
    const timestampRaw = readSingleHeader(req.headers['x-webhook-timestamp']);
    const expiresAtRaw = readSingleHeader(req.headers['x-webhook-expires-at']);

    if (!actionId || !signature || !timestampRaw || !expiresAtRaw) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    const timestamp = Number(timestampRaw);
    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(timestamp) || !Number.isFinite(expiresAt)) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    // bindBody=true: HMAC must be over req.rawBody, the raw bytes captured by
    // `express.json({ verify: ... })` — which only fires for Content-Type:
    // application/json. If rawBody is undefined here the parser was skipped
    // (e.g. a non-JSON Content-Type sent by an attacker), strict body-binding
    // cannot be enforced and we must hard-fail. Falling back to
    // actionId+timestamp verification would silently invalidate the publish
    // body-binding contract (round-2 review footgun: anyone who can mint a
    // signature via the open `/api/bifrost/proxy-sign` route could then
    // publish arbitrary bodies by simply suppressing Content-Type). 400
    // BAD_PROXY_AUTH is the targeted refusal; downstream zod never runs, so
    // no SMTP dispatch happens for a body-suppression attempt.
    if (opts.bindBody && (req as ProxySignatureRequest).rawBody === undefined) {
      res.status(400).json({ error: 'BAD_PROXY_AUTH' });
      return;
    }

    try {
      verifyActionSignature({
        actionId,
        expiresAt,
        secret,
        signature,
        timestamp,
        ...(opts.bindBody
          ? { rawBody: (req as ProxySignatureRequest).rawBody as string }
          : { rawBody: undefined }),
      });
    } catch (err) {
      if (err instanceof SignatureError) {
        // Differentiate EXPIRED vs INVALID for the caller; both are 401.
        if (err.code === 'EXPIRED') {
          res.status(401).json({ error: 'EXPIRED', message: err.message });
          return;
        }
        // INVALID or MALFORMED — keep blind to the exact reason.
        res.status(401).json({ error: 'UNAUTHORIZED' });
        return;
      }
      res.status(401).json({ error: 'UNKNOWN_SIG_ERROR' });
      return;
    }
    next();
  };
}

/** @internal Test-only: resets the cms HMAC dev-bypass warn-once flag. */
export function __resetCmsHmacDevBypassForTests(): void {
  cmsHmacDevBypassWarned = false;
}
