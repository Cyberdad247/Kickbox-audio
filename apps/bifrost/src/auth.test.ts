import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { verifyToken, issueToken, requireRole, type Role } from './auth';

const SECRET = 'test-secret-for-rbac-vitest-32bytes';
const OTHER_SECRET = 'different-secret-for-rbac-vitest-32b';

beforeAll(() => {
  process.env.WEBHOOK_SECRET = SECRET;
  process.env.RBAC_ENABLED = 'true';
});

describe('verifyToken', () => {
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

describe('issueToken', () => {
  it('mints a token that round-trips through verifyToken', () => {
    const token = issueToken({ sub: 'bob', role: 'operator', secret: SECRET });
    const payload = verifyToken(token, SECRET);
    expect(payload?.sub).toBe('bob');
    expect(payload?.role).toBe('operator');
  });
});

describe('requireRole middleware', () => {
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
