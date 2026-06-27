import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  SignatureError,
  assertFresh,
  verifyActionSignature,
  verifyWebhookSignature,
} from './security';

const SECRET = 'test-secret';
const body = JSON.stringify({ message: 'add transaction 100' });
const sign = (b: string, secret = SECRET) =>
  crypto.createHmac('sha256', secret).update(b).digest('hex');

describe('verifyWebhookSignature (Task 2.4 ingress security)', () => {
  it('accepts a valid signature', () => {
    expect(verifyWebhookSignature(body, sign(body), SECRET)).toBe(true);
  });

  it('rejects a tampered body', () => {
    expect(verifyWebhookSignature(`${body} `, sign(body), SECRET)).toBe(false);
  });

  it('rejects a signature made with the wrong secret', () => {
    expect(verifyWebhookSignature(body, sign(body, 'wrong'), SECRET)).toBe(false);
  });

  it('rejects missing signature or secret', () => {
    expect(verifyWebhookSignature(body, undefined, SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body), '')).toBe(false);
  });
});

// ── KBA Cartridge additions ──

describe('assertFresh (KBA freshness gate)', () => {
  it('passes when expiresAt is in the future', () => {
    expect(() => assertFresh(Date.now() + 60_000)).not.toThrow();
  });

  it('rejects when expiresAt is past tolerance window', () => {
    expect(() => assertFresh(Date.now() - 60_000)).toThrow(SignatureError);
  });

  it('allows small clock skew within tolerance', () => {
    expect(() => assertFresh(Date.now() - 3_000)).not.toThrow();
  });
});

describe('verifyActionSignature (KBA bundle validator)', () => {
  const SECRET = 'unit-secret';
  const actionId = 'KBA_SYNC_001';
  const timestamp = Date.now();
  const expiresAt = timestamp + 5 * 60_000;
  const signBundle = (aid: string, ts: number, secret: string) =>
    crypto.createHmac('sha256', secret).update(`${aid}:${ts}`).digest('hex');

  it('accepts a valid signed bundle', () => {
    expect(() =>
      verifyActionSignature({
        actionId,
        timestamp,
        signature: signBundle(actionId, timestamp, SECRET),
        expiresAt,
        secret: SECRET,
      }),
    ).not.toThrow();
  });

  it('rejects when signature is invalid', () => {
    expect(() =>
      verifyActionSignature({
        actionId,
        timestamp,
        signature: 'x'.repeat(64),
        expiresAt,
        secret: SECRET,
      }),
    ).toThrow(SignatureError);
  });

  it('rejects when expiresAt is past', () => {
    expect(() =>
      verifyActionSignature({
        actionId,
        timestamp,
        signature: signBundle(actionId, timestamp, SECRET),
        expiresAt: timestamp - 60_000,
        secret: SECRET,
      }),
    ).toThrow(SignatureError);
  });
});

