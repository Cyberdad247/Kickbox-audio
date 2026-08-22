import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  FRESHNESS_TOLERANCE_MS,
  PROXY_SIGNED_ACTION_TTL_MS,
  TTL_MS,
  issueProxySignedAction,
  issueSignedAction,
} from './issuance';

const SECRET = 'unit-test-secret';

describe('issueSignedAction (KBA Cartridge HMAC issuance)', () => {
  it('returns a signed bundle with shape { payload, signature, timestamp, expiresAt }', () => {
    const result = issueSignedAction('KBA_SYNC_001', SECRET);
    expect(result.payload).toBe(`KBA_SYNC_001:${result.timestamp}`);
    expect(result.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(result.expiresAt - result.timestamp).toBe(TTL_MS);
  });

  it('produces different signatures for different actionIds', () => {
    const a = issueSignedAction('KBA_AUDIT_001', SECRET);
    const b = issueSignedAction('KBA_AUDIT_002', SECRET);
    expect(a.signature).not.toBe(b.signature);
    expect(a.payload).not.toBe(b.payload);
  });

  it('throws on empty secret (defense-in-depth)', () => {
    expect(() => issueSignedAction('KBA_SYNC_001', '')).toThrow(/WEBHOOK_SECRET/);
  });

  it('expiresAt equals timestamp + TTL_MS exactly; FRESHNESS_TOLERANCE_MS is 5 s', () => {
    const r = issueSignedAction('KBA_SYNC_001', SECRET);
    expect(r.expiresAt - r.timestamp).toBe(TTL_MS);
    expect(FRESHNESS_TOLERANCE_MS).toBe(5_000);
  });
});

// ── PWA→CMS proxy auth (Task DAG T1) ────────────────────────────────

describe('issueProxySignedAction (PWA→Bifrost CMS HMAC issuance)', () => {
  it('defaults to a 10-min TTL distinct from the KBA 5-min TTL', () => {
    const r = issueProxySignedAction('CMS__RENDER__abc', SECRET);
    expect(r.expiresAt - r.timestamp).toBe(PROXY_SIGNED_ACTION_TTL_MS);
    expect(PROXY_SIGNED_ACTION_TTL_MS).not.toBe(TTL_MS);
    expect(PROXY_SIGNED_ACTION_TTL_MS).toBe(600_000);
  });

  it('honors a custom ttlMs override', () => {
    const r = issueProxySignedAction('CMS__DRAFT__abc', SECRET, { ttlMs: 30_000 });
    expect(r.expiresAt - r.timestamp).toBe(30_000);
  });

  it('signs the body when rawBody is provided (no actionId prefix)', () => {
    const rawBody = '{"hello":"world"}';
    const r = issueProxySignedAction('CMS__PUBLISH__abc', SECRET, { rawBody });
    expect(r.payload).toBe(rawBody);
    // Signature must be HMAC over payload only (matches verifier's behavior).
    const expectedSig = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
    expect(r.signature).toBe(expectedSig);
  });

  it('signs actionId+timestamp when rawBody is omitted (default)', () => {
    const r = issueProxySignedAction('CMS__RENDER__abc', SECRET);
    expect(r.payload).toBe(`CMS__RENDER__abc:${r.timestamp}`);
    const expectedSig = crypto.createHmac('sha256', SECRET).update(r.payload).digest('hex');
    expect(r.signature).toBe(expectedSig);
  });

  it('throws on empty secret', () => {
    expect(() => issueProxySignedAction('CMS__RENDER__abc', '')).toThrow(/WEBHOOK_SECRET/);
  });

  it('different rawBody produces different signatures (body-binding lock)', () => {
    const a = issueProxySignedAction('CMS__PUBLISH__abc', SECRET, { rawBody: 'payload-A' });
    const b = issueProxySignedAction('CMS__PUBLISH__abc', SECRET, { rawBody: 'payload-B' });
    expect(a.signature).not.toBe(b.signature);
  });

  it('with rawBody provided, signature depends ONLY on rawBody (actionId does not participate)', () => {
    const body = '{"x":1}';
    const a = issueProxySignedAction('CMS__PUBLISH__actionA', SECRET, { rawBody: body });
    const b = issueProxySignedAction('CMS__PUBLISH__actionB', SECRET, { rawBody: body });
    // Body-binding locks HMAC input to rawBody only — different actionIds produce
    // identical signatures when rawBody matches. This is the verifier-readable
    // contract: bifrost's requireBifrostProxySignature({ bindBody: true }) only
    // checks signature == HMAC(rawBody), not that actionId matches anything.
    expect(a.signature).toBe(b.signature);
  });
});
