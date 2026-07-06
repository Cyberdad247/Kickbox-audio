import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { issueProxySignedAction } from './issuance';
import {
  DEFAULT_FUTURE_SKEW_MS,
  DEFAULT_PAST_SKEW_MS,
  SignatureError,
  __resetCmsHmacDevBypassForTests,
  assertFresh,
  requireBifrostProxySignature,
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

describe('assertFresh (KBA freshness gate — symmetric past/future skew defense)', () => {
  const NOW = 1_700_000_000_000;

  it('exposes the documented default skew windows', () => {
    expect(DEFAULT_PAST_SKEW_MS).toBe(60_000);
    expect(DEFAULT_FUTURE_SKEW_MS).toBe(30_000);
  });

  it('passes when timestamp equals now and no expiresAt given', () => {
    expect(() => assertFresh({ timestamp: NOW, now: NOW })).not.toThrow();
  });

  it('passes within the past-skew window', () => {
    expect(() =>
      assertFresh({ timestamp: NOW - DEFAULT_PAST_SKEW_MS + 1000, now: NOW }),
    ).not.toThrow();
  });

  it('passes within the future-skew window', () => {
    expect(() =>
      assertFresh({ timestamp: NOW + DEFAULT_FUTURE_SKEW_MS - 1000, now: NOW }),
    ).not.toThrow();
  });

  it('rejects when timestamp is past the past-skew window', () => {
    expect(() => assertFresh({ timestamp: NOW - DEFAULT_PAST_SKEW_MS - 1000, now: NOW })).toThrow(
      SignatureError,
    );
  });

  it('rejects when timestamp is further in the future than the future-skew window', () => {
    expect(() => assertFresh({ timestamp: NOW + DEFAULT_FUTURE_SKEW_MS + 1000, now: NOW })).toThrow(
      SignatureError,
    );
  });

  it('rejects when expiresAt is past by more than the 1s hard-expiry grace', () => {
    expect(() =>
      assertFresh({
        timestamp: NOW,
        now: NOW,
        expiresAt: NOW - 60_000,
      }),
    ).toThrow(SignatureError);
  });

  it('accepts when expiresAt is within the 1s hard-expiry grace', () => {
    expect(() =>
      assertFresh({
        timestamp: NOW,
        now: NOW,
        expiresAt: NOW - 500,
      }),
    ).not.toThrow();
  });

  it('rejects non-finite timestamp with MALFORMED', () => {
    expect(() => assertFresh({ timestamp: Number.NaN, now: NOW })).toThrow(SignatureError);
  });

  it('rejects non-finite expiresAt with MALFORMED', () => {
    expect(() =>
      assertFresh({ timestamp: NOW, now: NOW, expiresAt: Number.POSITIVE_INFINITY }),
    ).toThrow(SignatureError);
  });

  it('respects caller-supplied skew overrides', () => {
    expect(() =>
      assertFresh({
        timestamp: NOW - 10_000,
        now: NOW,
        pastSkewMs: 5_000,
      }),
    ).toThrow(SignatureError);
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

  it('rejects when timestamp claims to be from the future beyond the skew window', () => {
    expect(() =>
      verifyActionSignature({
        actionId,
        timestamp: Date.now() + 5 * 60_000,
        signature: signBundle(actionId, Date.now() + 5 * 60_000, SECRET),
        expiresAt: Date.now() + 10 * 60_000,
        secret: SECRET,
      }),
    ).toThrow(SignatureError);
  });

  it('rejects when expiresAt is past hard expiration', () => {
    expect(() =>
      verifyActionSignature({
        actionId,
        timestamp: Date.now() - 10 * 60_000,
        signature: signBundle(actionId, Date.now() - 10 * 60_000, SECRET),
        expiresAt: Date.now() - 60_000,
        secret: SECRET,
      }),
    ).toThrow(SignatureError);
  });
});

// ── PWA→CMS proxy HMAC middleware (Task DAG T3) ─────────────────────

type CapturedResponse = { statusCode: number | null; payload: unknown };

function makeRes(): Response & { captured: CapturedResponse } {
  const captured: CapturedResponse = { statusCode: null, payload: undefined };
  const res = {
    captured,
    status(code: number) {
      captured.statusCode = code;
      return this as unknown as Response;
    },
    json(payload: unknown) {
      captured.payload = payload;
      return this as unknown as Response;
    },
  };
  return res as unknown as Response & { captured: CapturedResponse };
}

interface MockHeaders {
  [key: string]: string | string[] | undefined;
}

function makeReq(headers: MockHeaders, rawBody?: string): Request {
  const req = { headers, ...(rawBody !== undefined ? { rawBody } : {}) };
  return req as unknown as Request;
}

function makeNext() {
  return vi.fn() as unknown as NextFunction;
}

interface BundleHeaders {
  actionId: string;
  expiresAt: number;
  signature: string;
  timestamp: number;
}

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  __resetCmsHmacDevBypassForTests();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.resetModules();
  process.env = ORIGINAL_ENV;
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks();
});

function makeValidHeaders(b: BundleHeaders): MockHeaders {
  return {
    'x-webhook-action': b.actionId,
    'x-webhook-expires-at': String(b.expiresAt),
    'x-webhook-signature': b.signature,
    'x-webhook-timestamp': String(b.timestamp),
  };
}

describe('requireBifrostProxySignature — non-body-bound (render/draft)', () => {
  it('calls next() when all headers are valid (sign over actionId:timestamp)', () => {
    process.env.WEBHOOK_SECRET = SECRET;
    process.env.NODE_ENV = 'production';
    const actionId = 'CMS__RENDER__abc';
    const timestamp = Date.now();
    const expiresAt = timestamp + 600_000;
    const signature = crypto.createHmac('sha256', SECRET).update(`${actionId}:${timestamp}`).digest('hex');

    const req = makeReq(makeValidHeaders({ actionId, expiresAt, signature, timestamp }));
    const res = makeRes();
    const next = makeNext();

    requireBifrostProxySignature()(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.captured.statusCode).toBeNull();
  });

  it('returns 401 UNAUTHORIZED when any header is missing', () => {
    process.env.WEBHOOK_SECRET = SECRET;
    process.env.NODE_ENV = 'production';
    const req = makeReq({ 'x-webhook-action': 'CMS__RENDER__abc' }); // missing 3 others
    const res = makeRes();
    const next = makeNext();

    requireBifrostProxySignature()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.captured.statusCode).toBe(401);
    expect(res.captured.payload).toEqual({ error: 'UNAUTHORIZED' });
  });

  it('returns 401 UNAUTHORIZED when signature mismatches (no oracle)', () => {
    process.env.WEBHOOK_SECRET = SECRET;
    process.env.NODE_ENV = 'production';
    const actionId = 'CMS__DRAFT__abc';
    const timestamp = Date.now();
    const req = makeReq(makeValidHeaders({ actionId, expiresAt: timestamp + 600_000, signature: 'x'.repeat(64), timestamp }));
    const res = makeRes();
    const next = makeNext();

    requireBifrostProxySignature()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.captured.statusCode).toBe(401);
    expect(res.captured.payload).toEqual({ error: 'UNAUTHORIZED' });
  });

  it('returns 401 EXPIRED with a distinguishable payload when past hard expiration', () => {
    process.env.WEBHOOK_SECRET = SECRET;
    process.env.NODE_ENV = 'production';
    const actionId = 'CMS__RENDER__abc';
    const timestamp = Date.now() - 10 * 60_000;
    const expiresAt = Date.now() - 60_000;
    const signature = crypto.createHmac('sha256', SECRET).update(`${actionId}:${timestamp}`).digest('hex');
    const req = makeReq(makeValidHeaders({ actionId, expiresAt, signature, timestamp }));
    const res = makeRes();
    const next = makeNext();

    requireBifrostProxySignature()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.captured.statusCode).toBe(401);
    expect(res.captured.payload).toMatchObject({ error: 'EXPIRED' });
  });
});

describe('requireBifrostProxySignature — body-bound (publish)', () => {
  it('calls next() when signature is over the rawBody', () => {
    process.env.WEBHOOK_SECRET = SECRET;
    process.env.NODE_ENV = 'production';
    const rawBody = '{"html":"<p>hi</p>"}';
    const actionId = 'CMS__PUBLISH__abc';
    const timestamp = Date.now();
    const expiresAt = timestamp + 600_000;
    const signature = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
    const req = makeReq(makeValidHeaders({ actionId, expiresAt, signature, timestamp }), rawBody);
    const res = makeRes();
    const next = makeNext();

    requireBifrostProxySignature({ bindBody: true })(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.captured.statusCode).toBeNull();
  });

  it('returns 401 UNAUTHORIZED when body is tampered (signature over original, request has new body)', () => {
    process.env.WEBHOOK_SECRET = SECRET;
    process.env.NODE_ENV = 'production';
    const originalBody = '{"html":"<p>original</p>"}';
    const tamperedBody = '{"html":"<p>EVIL</p>"}';
    const actionId = 'CMS__PUBLISH__abc';
    const timestamp = Date.now();
    const expiresAt = timestamp + 600_000;
    const signature = crypto.createHmac('sha256', SECRET).update(originalBody).digest('hex');
    const req = makeReq(makeValidHeaders({ actionId, expiresAt, signature, timestamp }), tamperedBody);
    const res = makeRes();
    const next = makeNext();

    requireBifrostProxySignature({ bindBody: true })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.captured.statusCode).toBe(401);
    expect(res.captured.payload).toEqual({ error: 'UNAUTHORIZED' });
  });

  it('returns 400 BAD_PROXY_AUTH when bindBody=true but req.rawBody is undefined (defends against attacker suppressing Content-Type to skip express.json)', () => {
    // Hard guard (round-2 review followup): when bindBody is requested but the
    // express.json verify hook never captured a body — e.g. attacker sent a
    // non-JSON Content-Type to skip JSON parsing — the middleware refuses with
    // 400 BAD_PROXY_AUTH instead of silently falling back to actionId+timestamp
    // verification, which would invalidate the publish body-binding contract.
    process.env.WEBHOOK_SECRET = SECRET;
    process.env.NODE_ENV = 'production';
    const actionId = 'CMS__PUBLISH__abc';
    const timestamp = Date.now();
    const expiresAt = timestamp + 600_000;
    const signature = crypto.createHmac('sha256', SECRET).update(`${actionId}:${timestamp}`).digest('hex');
    const req = makeReq(makeValidHeaders({ actionId, expiresAt, signature, timestamp }));
    const res = makeRes();
    const next = makeNext();

    requireBifrostProxySignature({ bindBody: true })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.captured.statusCode).toBe(400);
    expect(res.captured.payload).toEqual({ error: 'BAD_PROXY_AUTH' });
  });

  it('end-to-end round-trip: issueProxySignedAction(rawBody) → requireBifrostProxySignature({bindBody:true}) with matching rawBody → next() called once, statusCode null', () => {
    // Mint through the real `issueProxySignedAction` issuer (not a local
    // crypto.createHmac shortcut) and verify through the real middleware — closes
    // the half-asserted body-binding contract so any drift between
    // issueProxySignedAction and verifyActionSignature surfaces as a vitest failure.
    process.env.WEBHOOK_SECRET = SECRET;
    process.env.NODE_ENV = 'production';
    const actionId = 'CMS__PUBLISH__end2end';
    const rawBody = '{"html":"hi"}';
    const bundle = issueProxySignedAction(actionId, SECRET, { rawBody });

    const req = makeReq(
      makeValidHeaders({
        actionId,
        expiresAt: bundle.expiresAt,
        signature: bundle.signature,
        timestamp: bundle.timestamp,
      }),
      rawBody,
    );
    const res = makeRes();
    const next = makeNext();

    requireBifrostProxySignature({ bindBody: true })(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.captured.statusCode).toBeNull();
  });

  it('end-to-end round-trip with mismatched rawBody → 401 UNAUTHORIZED, next NOT called', () => {
    // Same mint, but the request carries a different body — the body-binding
    // contract must reject. Symmetric to the locally-signed tamper test, but uses
    // the real issuer to defend against any drift between mint and middleware.
    process.env.WEBHOOK_SECRET = SECRET;
    process.env.NODE_ENV = 'production';
    const actionId = 'CMS__PUBLISH__end2end';
    const originalBody = '{"html":"hi"}';
    const tamperedBody = '{"html":"EVIL"}';
    const bundle = issueProxySignedAction(actionId, SECRET, { rawBody: originalBody });

    const req = makeReq(
      makeValidHeaders({
        actionId,
        expiresAt: bundle.expiresAt,
        signature: bundle.signature,
        timestamp: bundle.timestamp,
      }),
      tamperedBody,
    );
    const res = makeRes();
    const next = makeNext();

    requireBifrostProxySignature({ bindBody: true })(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.captured.statusCode).toBe(401);
    expect(res.captured.payload).toEqual({ error: 'UNAUTHORIZED' });
  });
});

describe('requireBifrostProxySignature — dev bypass', () => {
  it('bypasses silently in development when WEBHOOK_SECRET is unset', () => {
    delete process.env.WEBHOOK_SECRET;
    process.env.NODE_ENV = 'development';
    const req = makeReq({});
    const res = makeRes();
    const next = makeNext();

    requireBifrostProxySignature()(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.captured.statusCode).toBeNull();
  });

  it('fail-closes (401) in production when WEBHOOK_SECRET is unset', () => {
    delete process.env.WEBHOOK_SECRET;
    process.env.NODE_ENV = 'production';
    const req = makeReq({});
    const res = makeRes();
    const next = makeNext();

    requireBifrostProxySignature()(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.captured.statusCode).toBe(401);
    expect(res.captured.payload).toEqual({ error: 'UNAUTHORIZED' });
  });
});
