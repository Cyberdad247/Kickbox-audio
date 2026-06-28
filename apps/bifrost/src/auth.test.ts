import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { verifyToken, issueToken, requireRole, setRbacPublicKey, type Role } from './auth';

const SECRET = 'test-secret-for-rbac-vitest-32bytes';
const OTHER_SECRET = 'different-secret-for-rbac-vitest-32b';

// ── HS256 / v1.2.0 legacy path ──────────────────────────────────
beforeAll(() => {
  process.env.WEBHOOK_SECRET = SECRET;
  process.env.RBAC_ENABLED = 'true';
  // Pin HS256 so the legacy describe block is isolated from any
  // RS256 state set by the describe block below. Default is HS256
  // when this is unset, so explicit assertion is belt-and-suspenders.
  process.env.RBAC_JWT_ALGORITHM = 'HS256';
});

describe('verifyToken (HS256 — v1.2.0 legacy)', () => {
  it('returns the payload for a valid HS256 token', () => {
    const token = jwt.sign({ sub: 'alice', role: 'admin' }, SECRET, { algorithm: 'HS256', expiresIn: 60 });
    const payload = verifyToken(token, SECRET);
    expect(payload?.sub).toBe('alice');
    expect(payload?.role).toBe('admin');
  });

  it('returns null for an invalid signature', () => {
    const token = jwt.sign({ sub: 'alice', role: 'admin' }, OTHER_SECRET, { algorithm: 'HS256', expiresIn: 60 });
    expect(verifyToken(token, SECRET)).toBeNull();
  });

  it('returns null for an expired token', () => {
    const token = jwt.sign({ sub: 'alice', role: 'admin' }, SECRET, { algorithm: 'HS256', expiresIn: -1 });
    expect(verifyToken(token, SECRET)).toBeNull();
  });

  it('returns null for a token with an invalid role claim', () => {
    const token = jwt.sign({ sub: 'alice', role: 'superuser' }, SECRET, { algorithm: 'HS256', expiresIn: 60 });
    expect(verifyToken(token, SECRET)).toBeNull();
  });

  it('returns null for an empty token', () => {
    expect(verifyToken('', SECRET)).toBeNull();
  });
});

describe('issueToken (HS256 round-trip)', () => {
  it('mints a token that round-trips through verifyToken', () => {
    const token = issueToken({ sub: 'bob', role: 'operator', secret: SECRET });
    const payload = verifyToken(token, SECRET);
    expect(payload?.sub).toBe('bob');
    expect(payload?.role).toBe('operator');
  });
});

describe('requireRole middleware (HS256)', () => {
  function mockReqRes(authHeader?: string) {
    const headers: Record<string, string> = {};
    if (authHeader) headers['authorization'] = authHeader;
    const req = { header: (k: string) => headers[k.toLowerCase()] } as unknown as Request;
    const res = {
      statusCode: 200,
      body: undefined,
      status(this: Response, n: number) {
        (this as unknown as { statusCode: number }).statusCode = n;
        return this;
      },
      json(this: Response, body: unknown) {
        (this as unknown as { body: unknown }).body = body;
        return this;
      },
    } as unknown as Response;
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
      return nextCalled;
    };
    return { req, res, next, wasNext: () => nextCalled };
  }

  it('passes through when RBAC is disabled', () => {
    process.env.RBAC_ENABLED = 'false';
    const mw = requireRole('admin');
    const { req, res, next } = mockReqRes();
    mw(req, res, next);
    expect(next()).toBe(true);
    process.env.RBAC_ENABLED = 'true';
  });

  it('rejects with 401 when no Authorization header is present', () => {
    const mw = requireRole('operator');
    const { req, res, next } = mockReqRes();
    mw(req, res, next);
    expect(res.statusCode).toBe(401);
    expect((res as { body?: { error: string } }).body?.error).toBe('MISSING_BEARER');
  });

  it('rejects with 401 when token signature is invalid', () => {
    const token = jwt.sign({ sub: 'eve', role: 'admin' }, OTHER_SECRET, { algorithm: 'HS256', expiresIn: 60 });
    const mw = requireRole('operator');
    const { req, res, next } = mockReqRes(`Bearer ${token}`);
    mw(req, res, next);
    expect(res.statusCode).toBe(401);
    expect((res as { body?: { error: string } }).body?.error).toBe('INVALID_TOKEN');
  });

  it('rejects with 403 when role is insufficient', () => {
    const token = issueToken({ sub: 'carol', role: 'viewer', secret: SECRET });
    const mw = requireRole('operator');
    const { req, res, next } = mockReqRes(`Bearer ${token}`);
    mw(req, res, next);
    expect(res.statusCode).toBe(403);
    expect((res as { body?: { error: string; required: Role; actual: Role } }).body).toEqual({
      error: 'FORBIDDEN',
      required: 'operator',
      actual: 'viewer',
    });
  });

  it('passes through for an admin role on an operator route', () => {
    const token = issueToken({ sub: 'dave', role: 'admin', secret: SECRET });
    const mw = requireRole('operator');
    const { req, res, next } = mockReqRes(`Bearer ${token}`);
    mw(req, res, next);
    expect(next()).toBe(true);
  });
});

// ── RS256 / v1.3.0 Tier 4.1 ────────────────────────────────────
describe('verifyToken + issueToken (RS256 — v1.3.0 Tier 4.1)', () => {
  let privateKey: string;
  let publicKey: string;

  beforeAll(() => {
    // Generate ephemeral RSA keypair so tests are hermetic. PEM SPKI for
    // the public key (what Bifrost accepts) + PKCS8 for the private key
    // (what an external IdP would use to sign).
    const pair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    privateKey = pair.privateKey;
    publicKey = pair.publicKey;

    process.env.RBAC_JWT_ALGORITHM = 'RS256';
    process.env.RBAC_PUBLIC_KEY = publicKey;
    setRbacPublicKey(publicKey);
  });

  afterAll(() => {
    delete process.env.RBAC_JWT_ALGORITHM;
    delete process.env.RBAC_PUBLIC_KEY;
    setRbacPublicKey(null);
  });

  it('returns the payload for a valid RS256 token', () => {
    const token = jwt.sign({ sub: 'alice', role: 'admin' }, privateKey, { algorithm: 'RS256', expiresIn: 60 });
    const payload = verifyToken(token);
    expect(payload?.sub).toBe('alice');
    expect(payload?.role).toBe('admin');
  });

  it('returns null when an RS256 token is signed with the wrong private key', () => {
    const alt = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const token = jwt.sign({ sub: 'eve', role: 'admin' }, alt.privateKey, { algorithm: 'RS256', expiresIn: 60 });
    expect(verifyToken(token)).toBeNull();
  });

  it('returns null for an expired RS256 token', () => {
    const token = jwt.sign({ sub: 'alice', role: 'admin' }, privateKey, { algorithm: 'RS256', expiresIn: -1 });
    expect(verifyToken(token)).toBeNull();
  });

  it('returns null for an RS256 token with an invalid role claim', () => {
    const token = jwt.sign({ sub: 'eve', role: 'superuser' }, privateKey, { algorithm: 'RS256', expiresIn: 60 });
    expect(verifyToken(token)).toBeNull();
  });

  it('validates the iss claim when RBAC_OIDC_ISSUER is configured', () => {
    process.env.RBAC_OIDC_ISSUER = 'https://idp.example.com';
    const good = jwt.sign(
      { sub: 'alice', role: 'admin' },
      privateKey,
      { algorithm: 'RS256', expiresIn: 60, issuer: 'https://idp.example.com' },
    );
    expect(verifyToken(good)?.sub).toBe('alice');
    const bad = jwt.sign(
      { sub: 'alice', role: 'admin' },
      privateKey,
      { algorithm: 'RS256', expiresIn: 60, issuer: 'https://evil.example.com' },
    );
    expect(verifyToken(bad)).toBeNull();
    delete process.env.RBAC_OIDC_ISSUER;
  });

  it('validates the aud claim when RBAC_OIDC_AUDIENCE is configured', () => {
    process.env.RBAC_OIDC_AUDIENCE = 'bifrost-gateway';
    const good = jwt.sign(
      { sub: 'alice', role: 'admin' },
      privateKey,
      { algorithm: 'RS256', expiresIn: 60, audience: 'bifrost-gateway' },
    );
    expect(verifyToken(good)?.sub).toBe('alice');
    const bad = jwt.sign(
      { sub: 'alice', role: 'admin' },
      privateKey,
      { algorithm: 'RS256', expiresIn: 60, audience: 'other-service' },
    );
    expect(verifyToken(bad)).toBeNull();
    delete process.env.RBAC_OIDC_AUDIENCE;
  });

  it('issueToken RS256 round-trips through verifyToken', () => {
    const token = issueToken({ sub: 'bob', role: 'operator', alg: 'RS256', privateKey });
    const payload = verifyToken(token);
    expect(payload?.sub).toBe('bob');
    expect(payload?.role).toBe('operator');
  });
});

describe('requireRole middleware (RS256)', () => {
  let privateKey: string;

  beforeAll(() => {
    const pair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    privateKey = pair.privateKey;
    process.env.RBAC_JWT_ALGORITHM = 'RS256';
    process.env.RBAC_PUBLIC_KEY = pair.publicKey;
    setRbacPublicKey(pair.publicKey);
  });

  afterAll(() => {
    delete process.env.RBAC_JWT_ALGORITHM;
    delete process.env.RBAC_PUBLIC_KEY;
    setRbacPublicKey(null);
  });

  function mockReqRes(authHeader?: string) {
    const headers: Record<string, string> = {};
    if (authHeader) headers['authorization'] = authHeader;
    const req = { header: (k: string) => headers[k.toLowerCase()] } as unknown as Request;
    const res = {
      statusCode: 200,
      body: undefined,
      status(this: Response, n: number) {
        (this as unknown as { statusCode: number }).statusCode = n;
        return this;
      },
      json(this: Response, body: unknown) {
        (this as unknown as { body: unknown }).body = body;
        return this;
      },
    } as unknown as Response;
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
      return nextCalled;
    };
    return { req, res, next, wasNext: () => nextCalled };
  }

  it('passes a valid admin RS256 token through on an operator route', () => {
    const token = jwt.sign({ sub: 'dave', role: 'admin' }, privateKey, { algorithm: 'RS256', expiresIn: 60 });
    const mw = requireRole('operator');
    const { req, res, next } = mockReqRes(`Bearer ${token}`);
    mw(req, res, next);
    expect(next()).toBe(true);
  });

  it('403s an insufficient viewer RS256 token on an operator route', () => {
    const token = jwt.sign({ sub: 'carol', role: 'viewer' }, privateKey, { algorithm: 'RS256', expiresIn: 60 });
    const mw = requireRole('operator');
    const { req, res, next } = mockReqRes(`Bearer ${token}`);
    mw(req, res, next);
    expect(res.statusCode).toBe(403);
    expect((res as { body?: { error: string } }).body?.error).toBe('FORBIDDEN');
  });

  it('500s RBAC_MISCONFIGURED when RS256 active but RBAC_PUBLIC_KEY empty', () => {
    const saved = process.env.RBAC_PUBLIC_KEY;
    delete process.env.RBAC_PUBLIC_KEY;
    setRbacPublicKey(null);
    try {
      const mw = requireRole('operator');
      const { req, res, next } = mockReqRes('Bearer not-checked-here.yet');
      mw(req, res, next);
      expect(res.statusCode).toBe(500);
      expect((res as { body?: { error: string } }).body?.error).toBe('RBAC_MISCONFIGURED');
    } finally {
      if (saved !== undefined) process.env.RBAC_PUBLIC_KEY = saved;
      // @ts-expect-error @types/node 20.10.x overload union lags Node 22 runtime; 'rsa' is a valid KeyType at runtime
      const pair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
      });
      setRbacPublicKey(pair.publicKey);
    }
  });
});
