import crypto from 'node:crypto';

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

export function assertFresh(expiresAt: number, now: number = Date.now()): void {
  if (!Number.isFinite(expiresAt)) {
    throw new SignatureError('MALFORMED', 'expiresAt must be a finite number');
  }
  if (now > expiresAt + 5_000) {
    throw new SignatureError('EXPIRED', 'signature expired');
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
  assertFresh(expiresAt);
}
