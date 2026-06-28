import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from './logger';
import { isRevoked as isCertRevoked } from './certRevocation';

/**
 * v1.3.0 Tier 4.1: RBAC middleware for Bifrost /api/bifrost/* routes.
 *
 * Three roles, hierarchical: viewer < operator < admin.
 *
 * v1.2.0:  HS256 JWT signed with WEBHOOK_SECRET (single shared secret).
 * v1.3.0+: Adds RS256 asymmetric verification with vault-stored keys.
 *          Algorithm selector: `RBAC_JWT_ALGORITHM` (HS256 | RS256).
 *          HS256 remains default for backward compat; RS256 is opt-in.
 *          PLAN: deprecate HS256 in v1.5.x.
 *
 * Auth flow:
 *   1. Client sends `Authorization: Bearer <jwt>` header
 *   2. Middleware verifies the JWT (signature, expiration, optional iss/aud)
 *   3. Middleware checks the `role` claim against the route's required role
 *   4. If valid, attaches `req.user = { id, role }` and calls next()
 *   5. If invalid: 401 (no auth) or 403 (wrong role) or 500 (key not loaded)
 *
 * SECURITY (RS256): strictly trust RBAC_JWT_ALGORITHM. NEVER auto-detect
 * from the JWT header (`alg`) — that is the classic alg-confusion
 * downgrade (an attacker could sign HS256 with the public key). The
 * configured algorithm is the only algorithm we'll accept.
 *
 * Key storage:
 *   - HS256: WEBHOOK_SECRET (env or Doppler vault bifrost/webhook-secret)
 *   - RS256: RBAC_PUBLIC_KEY (env or Doppler vault bifrost/rbac-public-key-pem)
 *            PEM SPKI format. Private key never touches Bifrost — Bifrost
 *            is a Resource Server, not an IdP. Issuance lives in an
 *            external OIDC IdP (Auth0, Clerk, Cognito, etc.).
 *
 * Key rotation (RS256):
 *   1. Generate new keypair out-of-band per PRODUCTION_RUNBOOK §6.2:
 *        openssl genpkey -algorithm RSA -out new-private.pem \
 *          -pkeyopt rsa_keygen_bits:2048
 *        openssl rsa -in new-private.pem -pubout -out new-public.pem
 *   2. Add OLD + NEW public keys to Doppler. Bifrost eventually supports
 *      a kid-based multi-key verifier; current implementation uses ONE
 *      active public key (rotate by repointing the vault value).
 *   3. Switch the IdP to sign with NEW private key.
 *   4. Once no requests sign with OLD, delete the OLD public key entry.
 *
 * TOKEN CLAIMS (unchanged from v1.2.0):
 *   { sub: string, role: 'admin'|'operator'|'viewer', iat, exp }
 * Optional OIDC claims (validated only when env-configured):
 *   iss: matches RBAC_OIDC_ISSUER
 *   aud: matches RBAC_OIDC_AUDIENCE
 */

export type Role = 'admin' | 'operator' | 'viewer';
export type AuthAlgorithm = 'HS256' | 'RS256';

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
  iss?: string;
  aud?: string | string[];
}

/**
 * Module-level public-key override, set by server.ts at boot after
 * loadRbacPublicKey() resolves. Tests bypass this and write process.env
 * directly OR call setRbacPublicKey() in their beforeAll. Production
 * production reads from this override first, env second.
 */
let _publicKeyOverride: string | null = null;
export function setRbacPublicKey(pem: string | null): void {
  _publicKeyOverride = pem;
}

function isRole(s: unknown): s is Role {
  return s === 'admin' || s === 'operator' || s === 'viewer';
}

/**
 * Return the active RBAC algorithm. Strict env check prevents
 * alg-confusion downgrades.
 */
function activeAlgorithm(): AuthAlgorithm {
  return process.env.RBAC_JWT_ALGORITHM === 'RS256' ? 'RS256' : 'HS256';
}

/**
 * Resolve the verification key for the active algorithm. Returns null
 * if the active key is missing or empty (caller should 500).
 *
 * Resolution order:
 *   HS256: process.env.WEBHOOK_SECRET (env-only — vault-resolved by server boot)
 *   RS256: module-level _publicKeyOverride → process.env.RBAC_PUBLIC_KEY
 */
function activeKey(alg: AuthAlgorithm): string | null {
  if (alg === 'HS256') {
    const v = process.env.WEBHOOK_SECRET ?? '';
    return v || null;
  }
  const v = _publicKeyOverride ?? process.env.RBAC_PUBLIC_KEY ?? '';
  return v || null;
}

/**
 * Verify a JWT. Backward-compatible signature: if `secret` is provided,
 * uses HS256-explicit (legacy/test path). If omitted, uses
 * env-driven algorithm (production).
 *
 * Returns null on any verification failure (invalid signature, expired,
 * malformed, role-missing, alg-mismatch, iss-mismatch, aud-mismatch).
 * Errors are logged at debug level to avoid leaking details to attackers.
 */
export function verifyToken(token: string, secret?: string): JwtPayload | null {
  if (!token) return null;

  let alg: AuthAlgorithm;
  let key: string | null;

  if (secret !== undefined) {
    // Legacy/explicit path. Ignore env config to keep backward compat
    // (existing vitest cases pass `secret` explicitly).
    alg = 'HS256';
    key = secret || null;
  } else {
    // Production path: env-driven algorithm + key resolution.
    alg = activeAlgorithm();
    key = activeKey(alg);
  }

  if (!key) return null;

  try {
    const verifyOptions: jwt.VerifyOptions = {
      algorithms: [alg],
    };
    if (alg === 'RS256') {
      const iss = process.env.RBAC_OIDC_ISSUER;
      const aud = process.env.RBAC_OIDC_AUDIENCE;
      if (iss) verifyOptions.issuer = iss;
      if (aud) verifyOptions.audience = aud;
    }
    const decoded = jwt.verify(token, key, verifyOptions);
    if (typeof decoded === 'string') return null;
    const payload = decoded as JwtPayload;
    if (!isRole(payload.role)) {
      logger.debug({ sub: payload.sub }, '[auth] JWT has invalid role claim');
      return null;
    }
    return payload;
  } catch (err) {
    logger.debug({ err: (err as Error).message, alg }, '[auth] JWT verification failed');
    return null;
  }
}

/**
 * Mint a JWT — used by tests, dev tools, e2e smoke, and (in rare cases)
 * internal Bifrost self-issuance. PRODUCTION RS256 issuance lives in the
 * external IdP; Bifrost is a Resource Server and does not normally mint
 * RS256 JWTs.
 *
 * Algorithm-aware. Pass:
 *   - alg: 'HS256' + secret (legacy/dev path)
 *   - alg: 'RS256' + privateKey (dev/test path; production issues via IdP)
 * Optional kid/issuer/audience for OIDC-compliant tokens.
 */
export function issueToken(args: {
  sub: string;
  role: Role;
  alg?: AuthAlgorithm;
  secret?: string;
  privateKey?: string;
  kid?: string;
  issuer?: string;
  audience?: string | string[];
  ttlSeconds?: number;
}): string {
  const alg = args.alg ?? activeAlgorithm();
  const ttl = args.ttlSeconds ?? 300; // 5 min default, matches issuance.ts TTL_MS
  const payload = { sub: args.sub, role: args.role };
  const signOptions: jwt.SignOptions = {
    algorithm: alg,
    expiresIn: ttl,
  };
  if (args.kid) signOptions.keyid = args.kid;
  if (args.issuer) signOptions.issuer = args.issuer;
  if (args.audience) signOptions.audience = args.audience;

  if (alg === 'HS256') {
    const secret = args.secret ?? process.env.WEBHOOK_SECRET ?? '';
    return jwt.sign(payload, secret, signOptions);
  }
  // RS256
  if (!args.privateKey) {
    throw new Error('issueToken RS256 requires a privateKey PEM');
  }
  return jwt.sign(payload, args.privateKey, signOptions);
}

/**
 * Express middleware factory. Use:
 *   app.post('/api/bifrost/issue', requireRole('operator'), handler)
 *   app.post('/api/bifrost/hitl',  requireRole('operator'), handler)
 *   app.get( '/api/bifrost/state', requireRole('viewer'),   handler)
 *
 * Reads process.env directly for backward-compat with existing tests;
 * the boot resolver in server.ts can ALSO write the public-key PEM to
 * process.env.RBAC_PUBLIC_KEY once it loads.
 */
export function requireRole(minRole: Role): RequestHandler {
  const minLevel = ROLE_HIERARCHY[minRole];
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (process.env.RBAC_ENABLED === 'false') {
      // RBAC disabled (dev / CI). Pass through.
      return next();
    }
    const alg = activeAlgorithm();
    const key = activeKey(alg);
    if (!key) {
      logger.error(
        { alg, envKey: alg === 'HS256' ? 'WEBHOOK_SECRET' : 'RBAC_PUBLIC_KEY' },
        '[auth] RBAC enabled but verification key is empty; rejecting request',
      );
      res.status(500).json({ error: 'RBAC_MISCONFIGURED' });
      return;
    }
    const auth = req.header('authorization') ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(auth);
    if (!match) {
      res.status(401).json({ error: 'MISSING_BEARER' });
      return;
    }
    const payload = verifyToken(match[1]);
    if (!payload) {
      res.status(401).json({ error: 'INVALID_TOKEN' });
      return;
    }
    // v1.3.0 Tier 4.3: reject JWTs bound to a revoked client cert so a
    // stolen RBAC token cannot outlive its mTLS client.
    if (isCertRevoked({ rbacSubject: payload.sub })) {
      logger.warn({ sub: payload.sub, alg }, '[auth] JWT subject is in cert revocation list');
      res.status(403).json({ error: 'CERT_REVOKED' });
      return;
    }
    const userLevel = ROLE_HIERARCHY[payload.role];
    if (userLevel < minLevel) {
      logger.warn(
        { sub: payload.sub, role: payload.role, required: minRole, alg },
        '[auth] insufficient role',
      );
      res.status(403).json({ error: 'FORBIDDEN', required: minRole, actual: payload.role });
      return;
    }
    req.user = { id: payload.sub, role: payload.role };
    next();
  };
}
