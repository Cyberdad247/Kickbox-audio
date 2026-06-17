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
