# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :white_check_mark: |
| 0.1.x   | :x:                |

## Reporting a Vulnerability

**Please do not file public issues for security vulnerabilities.**

Email security concerns to: **security@cyberdad247.dev** (or open a
private GitHub Security Advisory at
https://github.com/Cyberdad247/Kickbox-audio/security/advisories/new).

We will acknowledge receipt within 48 hours and aim to provide a fix or
mitigation within 7 days for critical issues, 30 days for high-severity.

## Security Posture

- **Authentication**: HMAC envelope on Bifrost gateway endpoints
  (`/api/bifrost/*`) via `WEBHOOK_SECRET` / `ACTION_SECRET`; verified
  symmetrically in `apps/bifrost/src/security.ts` and
  `apps/bifrost/src/issuance.ts`.
- **Rate limiting**: Per-route limiters (`ISSUE_RATE_LIMIT_MAX` 30/min,
  `HITL_RATE_LIMIT_MAX` 60/min) on the Bifrost gateway; externalized
  to env vars in v1.1.0.
- **Freshness assertion**: 60s past / 30s future / 1s grace on all
  signed actions.
- **Database**: PostgreSQL via Prisma; `connection_limit=5` on the
  Prisma connection string.
- **Headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy configured at the Vercel edge
  via `vercel.json` (v1.1.0).
- **Dependencies**: `npm audit --omit=dev` enforced in CI (v1.1.0).
- **Source review**: Branch protection on `main`; required checks
  before merge (lint + typecheck + test + build).

## Secrets

**Never commit secrets to git.** Use environment variables (see
`.env.example` for the full list) and inject via Vercel project
settings or your local `.env.local` (gitignored).

If a secret is accidentally committed, **rotate it immediately** and
use `git filter-repo` to purge the history. Contact the maintainers
if you need help.
