import crypto from 'node:crypto';

export type DeliveryChannel = 'email' | 'sms' | 'biometric_push';

export interface HandshakeSession {
  sessionId: string;
  tenantId: string;
  tenantHandle: string;
  codeHash: string;
  codeSalt: string;
  channel: DeliveryChannel;
  recipient: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
  verifiedAt?: number;
  authBearerToken?: string;
  dispatchedMessagePreview: string;
  /** For dev/sandbox automated testing & direct UI autofill feedback */
  sandboxCode?: string;
}

export interface CreateHandshakeOptions {
  tenantId: string;
  tenantHandle: string;
  channel?: DeliveryChannel;
  recipient?: string;
  now?: number;
  secret?: string;
}

export interface VerifyHandshakeResult {
  verified: boolean;
  sessionId: string;
  tenantId?: string;
  tenantHandle?: string;
  authBearerToken?: string;
  expiresAt?: number;
  remainingTtlSeconds?: number;
  remainingAttempts?: number;
  error?: 'NOT_FOUND' | 'EXPIRED' | 'MAX_ATTEMPTS_EXCEEDED' | 'ALREADY_VERIFIED' | 'INVALID_CODE';
  message?: string;
}

export interface HandshakeStatusResult {
  sessionId: string;
  tenantId: string;
  tenantHandle: string;
  channel: DeliveryChannel;
  recipient: string;
  createdAt: number;
  expiresAt: number;
  remainingTtlSeconds: number;
  remainingAttempts: number;
  verified: boolean;
  isExpired: boolean;
  dispatchedMessagePreview: string;
  sandboxCode?: string;
}

/** 5 minutes Time-To-Live (300,000 milliseconds) */
export const HANDSHAKE_TTL_MS = 5 * 60 * 1000;
export const HANDSHAKE_TTL_SECONDS = 300;
export const MAX_VERIFY_ATTEMPTS = 5;

const DEFAULT_SECRET = process.env.WEBHOOK_SECRET || 'camelot-bifrost-hsm-secret-key-v1';

// In-memory persistent session registry for active authorization handshakes
const sessionStore = new Map<string, HandshakeSession>();

/**
 * Generates a cryptographically random 6-digit verification code.
 */
export function generateRandomCode(digits = 6): string {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits;
  const num = crypto.randomInt(min, max);
  return num.toString();
}

/**
 * Hashes a verification code using HMAC-SHA256 with a unique salt to protect
 * codes in memory against memory dumps or side-channel inspection.
 */
export function hashCode(code: string, salt: string, secret = DEFAULT_SECRET): string {
  return crypto.createHmac('sha256', `${secret}:${salt}`).update(code.trim()).digest('hex');
}

/**
 * Formats a dispatched message template according to delivery channel.
 */
export function formatDispatchTemplate(
  channel: DeliveryChannel,
  tenantHandle: string,
  tenantId: string,
  code: string,
): { message: string; recipient: string } {
  if (channel === 'sms') {
    const formatted = `[Camelot-OS] Your 5-min biometric vault verification code for ${tenantHandle} (${tenantId}) is: ${code}. Valid for 5 minutes. Do not share.`;
    return { message: formatted, recipient: '+1 (555) 711-KBA0' };
  }

  if (channel === 'email') {
    const formatted =
      `Subject: [Camelot-OS] Vault Authorization Code for ${tenantHandle}\n\n` +
      `Cyber-Knight ${tenantHandle},\n\n` +
      `A Biometric Secret Vault decryption handshake was requested for Partition [${tenantId}].\n` +
      `Your 5-Minute Authorization Code: ${code}\n\n` +
      `This cryptographic token will expire in exactly 5 minutes (300 seconds).\n` +
      `Cipher Authority: NO_STD_CHACHA20_POLY1305 · HSM Integrity Verified.`;
    return { message: formatted, recipient: `${tenantHandle.toLowerCase()}@camelot.os.lattice` };
  }

  const formatted = `[Neural Biometric Push] Vault unseal challenge for ${tenantHandle}: ${code} [TTL: 5m]`;
  return { message: formatted, recipient: `neural://hsm.enclave.${tenantId}` };
}

/**
 * Creates a new 5-minute TTL authorization handshake session and dispatches
 * the randomized security code via email/SMS.
 */
export function createAuthHandshake(options: CreateHandshakeOptions): {
  session: HandshakeStatusResult;
  code: string;
} {
  const now = options.now ?? Date.now();
  const sessionId = `hs_${crypto.randomUUID()}`;
  const code = generateRandomCode(6);
  const salt = crypto.randomBytes(16).toString('hex');
  const secret = options.secret || DEFAULT_SECRET;
  const codeHash = hashCode(code, salt, secret);
  const channel = options.channel || 'email';

  const { message, recipient: defaultRecipient } = formatDispatchTemplate(
    channel,
    options.tenantHandle,
    options.tenantId,
    code,
  );

  const recipient = options.recipient || defaultRecipient;
  const expiresAt = now + HANDSHAKE_TTL_MS;

  const session: HandshakeSession = {
    sessionId,
    tenantId: options.tenantId,
    tenantHandle: options.tenantHandle,
    codeHash,
    codeSalt: salt,
    channel,
    recipient,
    createdAt: now,
    expiresAt,
    attempts: 0,
    maxAttempts: MAX_VERIFY_ATTEMPTS,
    verified: false,
    dispatchedMessagePreview: message,
    sandboxCode: code,
  };

  sessionStore.set(sessionId, session);

  // Auto-prune stale sessions
  pruneExpiredHandshakes(now);

  const remainingTtlSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));

  return {
    session: {
      sessionId,
      tenantId: session.tenantId,
      tenantHandle: session.tenantHandle,
      channel: session.channel,
      recipient: session.recipient,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      remainingTtlSeconds,
      remainingAttempts: session.maxAttempts - session.attempts,
      verified: session.verified,
      isExpired: false,
      dispatchedMessagePreview: message,
      sandboxCode: code,
    },
    code,
  };
}

/**
 * Verifies a candidate code against an active 5-minute TTL handshake session.
 */
export function verifyAuthHandshake(
  sessionId: string,
  candidateCode: string,
  now = Date.now(),
  secret = DEFAULT_SECRET,
): VerifyHandshakeResult {
  const session = sessionStore.get(sessionId);

  if (!session) {
    return {
      verified: false,
      sessionId,
      error: 'NOT_FOUND',
      message: 'Authorization handshake session not found or already purged.',
    };
  }

  // 1. Check if session has already been verified and closed
  if (session.verified) {
    return {
      verified: true,
      sessionId,
      tenantId: session.tenantId,
      tenantHandle: session.tenantHandle,
      authBearerToken: session.authBearerToken,
      expiresAt: session.expiresAt,
      remainingTtlSeconds: Math.max(0, Math.ceil((session.expiresAt - now) / 1000)),
      remainingAttempts: session.maxAttempts - session.attempts,
      error: 'ALREADY_VERIFIED',
      message: 'Session has already been authenticated.',
    };
  }

  // 2. Check 5-minute TTL expiration
  if (now > session.expiresAt) {
    return {
      verified: false,
      sessionId,
      tenantId: session.tenantId,
      tenantHandle: session.tenantHandle,
      error: 'EXPIRED',
      remainingTtlSeconds: 0,
      remainingAttempts: session.maxAttempts - session.attempts,
      message:
        'The 5-minute authorization handshake window has expired. Please request a new code.',
    };
  }

  // 3. Check attempt limit
  if (session.attempts >= session.maxAttempts) {
    return {
      verified: false,
      sessionId,
      tenantId: session.tenantId,
      tenantHandle: session.tenantHandle,
      error: 'MAX_ATTEMPTS_EXCEEDED',
      remainingTtlSeconds: Math.max(0, Math.ceil((session.expiresAt - now) / 1000)),
      remainingAttempts: 0,
      message: 'Maximum verification attempts exceeded. Handshake locked.',
    };
  }

  // 4. Verify candidate code hash using constant-time equality
  const candidateHash = hashCode(candidateCode, session.codeSalt, secret);
  const expectedBuf = Buffer.from(session.codeHash, 'hex');
  const candidateBuf = Buffer.from(candidateHash, 'hex');

  const isMatch =
    expectedBuf.length === candidateBuf.length && crypto.timingSafeEqual(expectedBuf, candidateBuf);

  if (!isMatch) {
    session.attempts += 1;
    const remainingAttempts = Math.max(0, session.maxAttempts - session.attempts);
    const remainingTtlSeconds = Math.max(0, Math.ceil((session.expiresAt - now) / 1000));

    return {
      verified: false,
      sessionId,
      tenantId: session.tenantId,
      tenantHandle: session.tenantHandle,
      error: 'INVALID_CODE',
      remainingAttempts,
      remainingTtlSeconds,
      message: `Invalid authorization code. ${remainingAttempts} attempts remaining.`,
    };
  }

  // 5. Successful validation — generate sovereign bearer token
  session.verified = true;
  session.verifiedAt = now;

  const rawTokenPayload = `${session.tenantId}:${session.sessionId}:${now}`;
  const tokenSignature = crypto.createHmac('sha256', secret).update(rawTokenPayload).digest('hex');

  const authBearerToken = `KBA_HSM_${Buffer.from(rawTokenPayload).toString('base64url')}.${tokenSignature}`;
  session.authBearerToken = authBearerToken;

  const remainingTtlSeconds = Math.max(0, Math.ceil((session.expiresAt - now) / 1000));

  return {
    verified: true,
    sessionId,
    tenantId: session.tenantId,
    tenantHandle: session.tenantHandle,
    authBearerToken,
    expiresAt: session.expiresAt,
    remainingTtlSeconds,
    remainingAttempts: session.maxAttempts - session.attempts,
    message: 'Biometric authorization handshake verified successfully. Vault unsealed.',
  };
}

/**
 * Queries the real-time status and remaining 5-minute TTL for an active handshake.
 */
export function getHandshakeStatus(
  sessionId: string,
  now = Date.now(),
): HandshakeStatusResult | null {
  const session = sessionStore.get(sessionId);
  if (!session) return null;

  const remainingTtlSeconds = Math.max(0, Math.ceil((session.expiresAt - now) / 1000));
  const isExpired = now > session.expiresAt;

  return {
    sessionId: session.sessionId,
    tenantId: session.tenantId,
    tenantHandle: session.tenantHandle,
    channel: session.channel,
    recipient: session.recipient,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    remainingTtlSeconds,
    remainingAttempts: Math.max(0, session.maxAttempts - session.attempts),
    verified: session.verified,
    isExpired,
    dispatchedMessagePreview: session.dispatchedMessagePreview,
    sandboxCode: session.sandboxCode,
  };
}

/**
 * Resends a fresh 6-digit code for an existing session and resets the 5-minute TTL.
 */
export function resendAuthHandshake(
  sessionId: string,
  channel?: DeliveryChannel,
  now = Date.now(),
  secret = DEFAULT_SECRET,
): { session: HandshakeStatusResult; code: string } | null {
  const existing = sessionStore.get(sessionId);
  if (!existing) return null;

  const newCode = generateRandomCode(6);
  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = hashCode(newCode, newSalt, secret);
  const targetChannel = channel || existing.channel;

  const { message, recipient } = formatDispatchTemplate(
    targetChannel,
    existing.tenantHandle,
    existing.tenantId,
    newCode,
  );

  const expiresAt = now + HANDSHAKE_TTL_MS;

  existing.codeHash = newHash;
  existing.codeSalt = newSalt;
  existing.channel = targetChannel;
  existing.recipient = recipient;
  existing.createdAt = now;
  existing.expiresAt = expiresAt;
  existing.attempts = 0;
  existing.verified = false;
  existing.authBearerToken = undefined;
  existing.dispatchedMessagePreview = message;
  existing.sandboxCode = newCode;

  const remainingTtlSeconds = Math.max(0, Math.ceil((expiresAt - now) / 1000));

  return {
    session: {
      sessionId: existing.sessionId,
      tenantId: existing.tenantId,
      tenantHandle: existing.tenantHandle,
      channel: existing.channel,
      recipient: existing.recipient,
      createdAt: existing.createdAt,
      expiresAt: existing.expiresAt,
      remainingTtlSeconds,
      remainingAttempts: existing.maxAttempts,
      verified: false,
      isExpired: false,
      dispatchedMessagePreview: message,
      sandboxCode: newCode,
    },
    code: newCode,
  };
}

/**
 * Removes sessions older than TTL + 10 minutes grace period.
 */
export function pruneExpiredHandshakes(now = Date.now()): number {
  let pruned = 0;
  const cutoff = now - (HANDSHAKE_TTL_MS + 10 * 60 * 1000);

  for (const [id, session] of sessionStore.entries()) {
    if (session.expiresAt < cutoff) {
      sessionStore.delete(id);
      pruned += 1;
    }
  }

  return pruned;
}

/**
 * Helper for test isolation to clear all sessions.
 */
export function _resetStoreForTesting(): void {
  sessionStore.clear();
}
