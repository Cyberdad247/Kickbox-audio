import { describe, expect, it } from 'vitest';
import { generateQRAuthPayload, parseQRAuthPayload } from './qrAuth';

describe('QR Authentication Handshake Parser', () => {
  it('generates valid JSON payload for Camelot QR token', () => {
    const payloadStr = generateQRAuthPayload('tenant-alpha', 'Alpha Prime', '482910', 'hs_12345');
    const parsed = JSON.parse(payloadStr);

    expect(parsed.protocol).toBe('CAMELOT_AUTH_V1');
    expect(parsed.tenantId).toBe('tenant-alpha');
    expect(parsed.tenantHandle).toBe('Alpha Prime');
    expect(parsed.code).toBe('482910');
    expect(parsed.sessionId).toBe('hs_12345');
    expect(typeof parsed.timestamp).toBe('number');
  });

  it('parses structured JSON QR payload', () => {
    const raw = JSON.stringify({
      protocol: 'CAMELOT_AUTH_V1',
      tenantId: 'tenant-galahad',
      tenantHandle: 'Sir Galahad',
      code: '901234',
    });

    const result = parseQRAuthPayload(raw);
    expect(result.code).toBe('901234');
    expect(result.tenantHandle).toBe('Sir Galahad');
    expect(result.tenantId).toBe('tenant-galahad');
  });

  it('parses URI query string QR payload', () => {
    const raw = 'camelot://vault-auth?code=552190&tenantHandle=LadyApis&tenantId=tenant-apis';
    const result = parseQRAuthPayload(raw);

    expect(result.code).toBe('552190');
    expect(result.tenantHandle).toBe('LadyApis');
    expect(result.tenantId).toBe('tenant-apis');
  });

  it('parses plain numeric code strings', () => {
    const result = parseQRAuthPayload('711001');
    expect(result.code).toBe('711001');
  });

  it('extracts digits when surrounded by prefix text', () => {
    const result = parseQRAuthPayload('PASS-CODE-629143');
    expect(result.code).toBe('629143');
  });

  it('handles optical face biometric camera payloads', () => {
    const result = parseQRAuthPayload('FACE_BIOMETRIC_LOCK_tenant_prime');
    expect(result.code).toBeDefined();
  });
});
