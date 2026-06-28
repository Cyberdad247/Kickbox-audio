import { describe, expect, it, beforeEach } from 'vitest';
import {
  _clearRevocationStoreForTests,
  CERT_REVOCATION_PURGE_MS,
  isRevoked,
  listRevocations,
  loadRevocationSeed,
  parseRevocationSeed,
  reissueCert,
  revokeCert,
} from './certRevocation';

beforeEach(() => {
  _clearRevocationStoreForTests();
  delete process.env.CERT_REVOKED_LIST;
});

describe('revokeCert (Tier 4.3 client-cert revocation)', () => {
  it('records a revocation by serial and returns the marker', () => {
    const result = revokeCert({
      clientCertSerial: 'AA:BB:CC:01',
      revokedBy: 'op-test',
      reason: 'laptop stolen',
    });
    expect(result.marker).toBe('serial:aabbcc01');
    expect(result.duplicate).toBe(false);
    expect(result.revoked.revokedBy).toBe('op-test');
    expect(result.revoked.reason).toBe('laptop stolen');
  });

  it('normalizes serial casing/colons before keying', () => {
    revokeCert({ clientCertSerial: 'AB:cd:EF:02', revokedBy: 'op' });
    expect(isRevoked({ clientCertSerial: 'ab:cdef:02' })).toBe(true);
    expect(isRevoked({ clientCertSerial: 'ABCDEF02' })).toBe(true);
  });

  it('records revocation by subject CN', () => {
    const result = revokeCert({ clientCertSubject: 'mcp-query-old', revokedBy: 'op' });
    expect(result.marker).toBe('subject:mcp-query-old');
    expect(isRevoked({ clientCertSubject: 'mcp-query-old' })).toBe(true);
    expect(isRevoked({ clientCertSubject: 'mcp-query-other' })).toBe(false);
  });

  it('records revocation by RBAC sub', () => {
    const result = revokeCert({ rbacSubject: 'auth0|abc', revokedBy: 'op' });
    expect(result.marker).toBe('sub:auth0|abc');
    expect(isRevoked({ rbacSubject: 'auth0|abc' })).toBe(true);
  });

  it('throws when no marker field is provided', () => {
    expect(() => revokeCert({ revokedBy: 'op' } as unknown as Parameters<typeof revokeCert>[0])).toThrow(
      /clientCertSerial|clientCertSubject|rbacSubject/,
    );
  });

  it('is idempotent — second revoke returns duplicate=true', () => {
    const a = revokeCert({ clientCertSerial: 'deadbeef', revokedBy: 'alice' });
    const b = revokeCert({ clientCertSerial: 'DEADBEEF', revokedBy: 'bob' });
    expect(a.duplicate).toBe(false);
    expect(b.duplicate).toBe(true);
    expect(b.revoked.revokedBy).toBe('alice'); // original preserved
  });
});

describe('reissueCert (Tier 4.3 client-cert reissue)', () => {
  it('un-revokes so isRevoked returns false afterwards', () => {
    revokeCert({ clientCertSerial: 'aa11', revokedBy: 'op' });
    expect(isRevoked({ clientCertSerial: 'aa11' })).toBe(true);
    const reissued = reissueCert({ clientCertSerial: 'aa11' });
    expect(reissued?.marker).toBe('serial:aa11');
    expect(reissued?.reissuedAt).toBeTypeOf('number');
    expect(isRevoked({ clientCertSerial: 'aa11' })).toBe(false);
  });

  it('returns null when nothing is revoked', () => {
    expect(reissueCert({ clientCertSerial: 'never-revoked' })).toBeNull();
  });
});

describe('isRevoked + 30-day auto-purge', () => {
  it('does NOT purge fresh entries', () => {
    revokeCert({ clientCertSerial: '00aa', revokedBy: 'op' });
    expect(isRevoked({ clientCertSerial: '00aa' })).toBe(true);
  });

  it('auto-purges entries older than CERT_REVOCATION_PURGE_MS (30 d)', () => {
    // Direct mutation of the timestamp for the test: revoke with a 31d-old timestamp.
    const old = Date.now() - (CERT_REVOCATION_PURGE_MS + 24 * 60 * 60 * 1000);
    revokeCert({ clientCertSerial: '00bb', revokedBy: 'op', revokedAt: old } as Parameters<typeof revokeCert>[0]);
    expect(isRevoked({ clientCertSerial: '00bb' })).toBe(false);
  });

  it('returns false for an empty marker set (defense against empty req)', () => {
    expect(isRevoked({})).toBe(false);
  });
});

describe('parseRevocationSeed + loadRevocationSeed (env-boot path)', () => {
  it('parses a 2-entry seed', () => {
    const parsed = parseRevocationSeed(
      'serial:abc123;by:alice;reason:compromised,subject:mcp-query-stg;by:bob',
    );
    expect(parsed).toHaveLength(2);
    expect(parsed[0].clientCertSerial).toBe('abc123');
    expect(parsed[0].revokedBy).toBe('alice');
    expect(parsed[0].reason).toBe('compromised');
    expect(parsed[1].clientCertSubject).toBe('mcp-query-stg');
    expect(parsed[1].revokedBy).toBe('bob');
  });

  it('parses a seed with at= epoch override', () => {
    const epoch = 1700000000000;
    const parsed = parseRevocationSeed(`serial:abc;by:alice;at:${epoch}`);
    expect(parsed[0].revokedAt).toBe(epoch);
  });

  it('loadRevocationSeed returns 0 when env unset, N when set', () => {
    expect(loadRevocationSeed()).toBe(0);
    process.env.CERT_REVOKED_LIST =
      'serial:env-seed-1;by:env,subject:env-seed-2;by:env';
    expect(loadRevocationSeed()).toBe(2);
    expect(listRevocations()).toHaveLength(2);
    expect(isRevoked({ clientCertSerial: 'env-seed-1' })).toBe(true);
    expect(isRevoked({ clientCertSubject: 'env-seed-2' })).toBe(true);
  });
});

describe('isRevoked marker-keying (cross-marker safety)', () => {
  it('does NOT cross-match between different marker KINDS for the same string', () => {
    // Edge case defense: a stale operator may revoke a CN as
    // `subject:mcp-query-x`; the same string passed as a cert serial
    // should NOT match (different keyspace).
    revokeCert({ clientCertSubject: 'lookup-id-1', revokedBy: 'op' });
    expect(isRevoked({ clientCertSubject: 'lookup-id-1' })).toBe(true);
    expect(isRevoked({ rbacSubject: 'lookup-id-1' })).toBe(false);
  });
});
