import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from './logger';

/**
 * v1.2.0 T3.6: RBAC middleware for Bifrost /api/bifrost/* routes.
 *
 * Three roles, hierarchical:
 *   - admin: full access (issue, hitl, all read endpoints)
 *   - operator: issue + hitl (the production hot path)
 *   - viewer: read-only (state broadcast, health)
 *
 * v1.2.0: HS256 JWT signed with WEBHOOK_SECRET (reuse existing secret).
 * v1.3.0+ (T3.4 follow-on): migrate to RS256 with OIDC + vault-stored keys.
 *
 * Auth flow:
 *   1. Client sends `Authorization: Bearer <jwt>` header
 *   2. Middleware verifies the JWT (signature, expiration)
 *   3. Middleware checks the `role` claim against the route's required role
 *   4. If valid, attaches `req.user = { id, role }` and calls next()
 *   5. If invalid, returns 401 (no auth) or 403 (wrong role)
 *
 * The webhook route /webhook/sms is exempt from RBAC because its auth
 * is the HMAC signature in the request body (already verified in
 * server.ts). /health is exempt because it's a liveness probe.
 */

export type Role = 'admin' | 'operator' | 'viewer';

const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
};

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

interface JwtPayload {
  sub: string;
  role: Role;
  iat?: number;
  exp?: number;
}

function isRole(s: unknown): s is Role {
  return s === 'admin' || s === 'operator' || s === 'viewer';
}

/**
 * Verify a JWT and return the decoded payload.
 * Returns null on any verification failure (invalid signature, expired,
 * malformed). The error is logged at debug level to avoid leaking
 * verification details to attackers.
 */
export function verifyToken(token: string, secret: string): JwtPayload | null {
  if (!token || !secret) return null;
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') return null;
    const payload = decoded as JwtPayload;
    if (!isRole(payload.role)) {
      logger.debug({ sub: payload.sub }, '[auth] JWT has invalid role claim');
      return null;
    }
    return payload;
  } catch (err) {
    logger.debug({ err: (err as Error).message }, '[auth] JWT verification failed');
    return null;
  }
}

/**
 * Mint a JWT for testing or for the /api/bifrost/issue endpoint to
 * return to the PWA. In production, the PWA receives a JWT via the
 * /api/bifrost/issue endpoint and re-presents it on /api/bifrost/hitl.
 */
export function issueToken(args: { sub: string; role: Role; secret: string; ttlSeconds?: number }): string {
  const ttl = args.ttlSeconds ?? 300; // 5 min default, matches issuance.ts TTL_MS
  return jwt.sign({ sub: args.sub, role: args.role }, args.secret, {
    algorithm: 'HS256',
    expiresIn: ttl,
  });
}

/**
 * Express middleware factory. Use:
 *   app.post('/api/bifrost/issue', requireRole('operator'), handler)
 *   app.post('/api/bifrost/hitl', requireRole('operator'), handler)
 *   app.get('/api/bifrost/state', requireRole('viewer'), handler)
 */
export function requireRole(minRole: Role): RequestHandler {
  const minLevel = ROLE_HIERARCHY[minRole];
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (process.env.RBAC_ENABLED === 'false') {
      // RBAC disabled (dev / CI). Pass through.
      return next();
    }
    const secret = process.env.WEBHOOK_SECRET ?? '';
    if (!secret) {
      logger.error('[auth] RBAC enabled but WEBHOOK_SECRET is empty; rejecting request');
      res.status(500).json({ error: 'RBAC_MISCONFIGURED' });
      return;
    }
    const auth = req.header('authorization') ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(auth);
    if (!match) {
      res.status(401).json({ error: 'MISSING_BEARER' });
      return;
    }
    const payload = verifyToken(match[1], secret);
    if (!payload) {
      res.status(401).json({ error: 'INVALID_TOKEN' });
      return;
    }
    const userLevel = ROLE_HIERARCHY[payload.role];
    if (userLevel < minLevel) {
      logger.warn({ sub: payload.sub, role: payload.role, required: minRole }, '[auth] insufficient role');
      res.status(403).json({ error: 'FORBIDDEN', required: minRole, actual: payload.role });
      return;
    }
    req.user = { id: payload.sub, role: payload.role };
    next();
  };
}
