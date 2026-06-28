import { describe, it, expect } from 'vitest';
import { buildCspHeader } from './middleware';

const NONCE = 'Y2I5MDFhNDMtNjkwYS00Mzc1LTkwNDgtZGIwYjYxMjdlM2Yx';

describe('buildCspHeader (v1.3.0 Tier 4.2 CSP)', () => {
  it('returns a single-line CSP (no embedded newlines)', () => {
    const csp = buildCspHeader(NONCE, false);
    expect(csp).not.toContain('\n');
  });

  it('stamps the nonce onto script-src', () => {
    const csp = buildCspHeader(NONCE, false);
    expect(csp).toContain(`'nonce-${NONCE}'`);
  });

  it('includes strict-dynamic in script-src so nonced scripts can load more scripts transitively', () => {
    const csp = buildCspHeader(NONCE, false);
    expect(csp).toContain("'strict-dynamic'");
  });

  it('drops unsafe-eval from script-src in production (H severity on XSS blast radius)', () => {
    const csp = buildCspHeader(NONCE, false);
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('keeps unsafe-eval in development so webpack HMR works', () => {
    const csp = buildCspHeader(NONCE, true);
    expect(csp).toContain("'unsafe-eval'");
  });

  it('allow-lists Sentry telemetry and ingestion endpoints in connect-src', () => {
    const csp = buildCspHeader(NONCE, false);
    expect(csp).toContain('https://*.sentry.io');
    expect(csp).toContain('https://*.ingest.sentry.io');
  });

  it('sets frame-ancestors none so the PWA cannot be iframe-embedded', () => {
    const csp = buildCspHeader(NONCE, false);
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('allows unsafe-inline on style-src (next/font + Tailwind compat; nonce-only is v1.4.0)', () => {
    const csp = buildCspHeader(NONCE, false);
    expect(csp).toMatch(/style-src[^;]*'unsafe-inline'/);
  });

  it('closes plugin / base-hijack / form-exfil vectors with object-src none + base-uri self + form-action self', () => {
    const csp = buildCspHeader(NONCE, false);
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it('keeps default-src self and upgrade-insecure-requests', () => {
    const csp = buildCspHeader(NONCE, false);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
  });
});
