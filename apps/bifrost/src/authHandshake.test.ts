import { beforeEach, describe, expect, it } from 'vitest';
import {
  HANDSHAKE_TTL_MS,
  HANDSHAKE_TTL_SECONDS,
  MAX_VERIFY_ATTEMPTS,
  _resetStoreForTesting,
  createAuthHandshake,
  formatDispatchTemplate,
  generateRandomCode,
  getHandshakeStatus,
  resendAuthHandshake,
  verifyAuthHandshake,
} from './authHandshake';

describe('authHandshake - Biometric & Secret Vault Authorization Engine', () => {
  beforeEach(() => {
    _resetStoreForTesting();
  });

  it('generates a 6-digit cryptographically random numeric string', () => {
    const code1 = generateRandomCode(6);
    const code2 = generateRandomCode(6);
    expect(code1).toMatch(/^\d{6}$/);
    expect(code2).toMatch(/^\d{6}$/);
  });

  it('creates an authorization handshake with exact 5-minute (300s) TTL', () => {
    const baseTime = 1700000000000;
    const { session, code } = createAuthHandshake({
      tenantId: 'alpha-prime',
      tenantHandle: 'SIR_BORIS',
      channel: 'email',
      now: baseTime,
    });

    expect(session.sessionId).toMatch(/^hs_/);
    expect(session.tenantId).toBe('alpha-prime');
    expect(session.tenantHandle).toBe('SIR_BORIS');
    expect(session.channel).toBe('email');
    expect(session.expiresAt - session.createdAt).toBe(HANDSHAKE_TTL_MS);
    expect(session.remainingTtlSeconds).toBe(HANDSHAKE_TTL_SECONDS);
    expect(session.remainingAttempts).toBe(MAX_VERIFY_ATTEMPTS);
    expect(session.verified).toBe(false);
    expect(session.isExpired).toBe(false);
    expect(session.sandboxCode).toBe(code);
    expect(session.dispatchedMessagePreview).toContain(code);
  });

  it('formats email and SMS dispatch templates with tenant details and 5-min warning', () => {
    const sms = formatDispatchTemplate('sms', 'SIR_CODEX', 'tenant-002', '458129');
    expect(sms.message).toContain('SIR_CODEX');
    expect(sms.message).toContain('458129');
    expect(sms.message).toContain('5 minutes');

    const email = formatDispatchTemplate('email', 'MERLIN_OMEGA', 'tenant-003', '982314');
    expect(email.message).toContain('MERLIN_OMEGA');
    expect(email.message).toContain('982314');
    expect(email.message).toContain('5 minutes');
    expect(email.recipient).toContain('merlin_omega@camelot.os.lattice');
  });

  it('successfully verifies a valid code within the 5-minute window and produces an auth token', () => {
    const baseTime = 1700000000000;
    const { session, code } = createAuthHandshake({
      tenantId: 'alpha-prime',
      tenantHandle: 'LADY_APIS',
      channel: 'sms',
      now: baseTime,
    });

    // Verify 1 minute later (well within 5-minute TTL)
    const verifyTime = baseTime + 60 * 1000;
    const result = verifyAuthHandshake(session.sessionId, code, verifyTime);

    expect(result.verified).toBe(true);
    expect(result.sessionId).toBe(session.sessionId);
    expect(result.tenantId).toBe('alpha-prime');
    expect(result.tenantHandle).toBe('LADY_APIS');
    expect(result.authBearerToken).toMatch(/^KBA_HSM_/);
    expect(result.remainingTtlSeconds).toBe(240); // 300 - 60
  });

  it('rejects verification if 5-minute TTL has elapsed', () => {
    const baseTime = 1700000000000;
    const { session, code } = createAuthHandshake({
      tenantId: 'alpha-prime',
      tenantHandle: 'SIR_SENTINEL',
      channel: 'email',
      now: baseTime,
    });

    // 5 minutes + 1 second later -> expired
    const expiredTime = baseTime + HANDSHAKE_TTL_MS + 1000;
    const result = verifyAuthHandshake(session.sessionId, code, expiredTime);

    expect(result.verified).toBe(false);
    expect(result.error).toBe('EXPIRED');
    expect(result.remainingTtlSeconds).toBe(0);
    expect(result.message).toContain('expired');
  });

  it('decrements remaining attempts on incorrect code and locks on 5 failed attempts', () => {
    const baseTime = 1700000000000;
    const { session } = createAuthHandshake({
      tenantId: 'sandbox-01',
      tenantHandle: 'SIR_GHOST',
      now: baseTime,
    });

    // 1st wrong attempt
    const r1 = verifyAuthHandshake(session.sessionId, '000000', baseTime + 1000);
    expect(r1.verified).toBe(false);
    expect(r1.error).toBe('INVALID_CODE');
    expect(r1.remainingAttempts).toBe(4);

    // 2nd wrong attempt
    const r2 = verifyAuthHandshake(session.sessionId, '111111', baseTime + 2000);
    expect(r2.remainingAttempts).toBe(3);

    // 3rd, 4th, 5th wrong attempts
    verifyAuthHandshake(session.sessionId, '222222', baseTime + 3000);
    verifyAuthHandshake(session.sessionId, '333333', baseTime + 4000);
    const r5 = verifyAuthHandshake(session.sessionId, '444444', baseTime + 5000);
    expect(r5.remainingAttempts).toBe(0);

    // 6th attempt should return MAX_ATTEMPTS_EXCEEDED
    const r6 = verifyAuthHandshake(session.sessionId, '555555', baseTime + 6000);
    expect(r6.verified).toBe(false);
    expect(r6.error).toBe('MAX_ATTEMPTS_EXCEEDED');
  });

  it('allows resending a fresh code and resets the 5-minute TTL', () => {
    const baseTime = 1700000000000;
    const { session, code: initialCode } = createAuthHandshake({
      tenantId: 'tenant-resend',
      tenantHandle: 'SIR_FORGE',
      channel: 'email',
      now: baseTime,
    });

    // Advance 3 minutes
    const resendTime = baseTime + 3 * 60 * 1000;
    const resendResult = resendAuthHandshake(session.sessionId, 'sms', resendTime);

    expect(resendResult).not.toBeNull();
    expect(resendResult?.session.channel).toBe('sms');
    expect(resendResult?.session.expiresAt).toBe(resendTime + HANDSHAKE_TTL_MS);
    expect(resendResult?.session.remainingTtlSeconds).toBe(HANDSHAKE_TTL_SECONDS);

    // Initial code should no longer work
    const oldAttempt = verifyAuthHandshake(session.sessionId, initialCode, resendTime + 1000);
    expect(oldAttempt.verified).toBe(false);

    // New code should verify
    const newAttempt = verifyAuthHandshake(
      session.sessionId,
      resendResult!.code,
      resendTime + 2000,
    );
    expect(newAttempt.verified).toBe(true);
  });

  it('allows querying real-time handshake status and remaining TTL', () => {
    const baseTime = 1700000000000;
    const { session } = createAuthHandshake({
      tenantId: 'tenant-status',
      tenantHandle: 'SIR_DEBUG',
      now: baseTime,
    });

    const status1 = getHandshakeStatus(session.sessionId, baseTime + 90 * 1000);
    expect(status1).not.toBeNull();
    expect(status1?.remainingTtlSeconds).toBe(210); // 300 - 90
    expect(status1?.isExpired).toBe(false);

    const status2 = getHandshakeStatus(session.sessionId, baseTime + 301 * 1000);
    expect(status2?.remainingTtlSeconds).toBe(0);
    expect(status2?.isExpired).toBe(true);
  });
});
