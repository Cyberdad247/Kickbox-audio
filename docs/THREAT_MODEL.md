# Threat Model — Kickbox-audio

> **Scope**: STRIDE-style threat model for the v1.3.0 production
> surface. Covers the Bifrost gateway, the PWA, the Tailscale MCP
> guard, the secrets vault, and the observability stack. Audiences:
> security reviewers, fork maintainers, future contributors.
>
> **Companion docs**: [`SECURITY.md`](../SECURITY.md) (vuln disclosure
> + posture summary), [`docs/PRODUCTION_RUNBOOK.md`](./PRODUCTION_RUNBOOK.md)
> (operational view), [`docs/SLO_BUDGETS.md`](./SLO_BUDGETS.md) (what
> is monitored).

---

## 1. Methodology

STRIDE = **S**poofing, **T**ampering, **R**epudiation, **I**nformation
disclosure, **D**enial of service, **E**levation of privilege.

For each asset, we list: identity, trust boundary, threats (STRIDE),
current mitigation, residual risk, owner. Severity follows CVSS 3.1
qualitative scale: **C**ritical / **H**igh / **M**edium / **L**ow /
**I**nfo.

This threat model is **point-in-time** (v1.3.0). Update on every
public-facing surface change (new route, new trust boundary, new
external integration) and review quarterly.

---

## 2. Asset inventory

| ID  | Asset                              | Surface                            | Owner         |
| --- | ---------------------------------- | ---------------------------------- | ------------- |
| A1  | **Bifrost gateway**                 | `apps/bifrost` (Express + WS)      | SIR_CODEX     |
| A2  | **PWA**                            | `apps/pwa` (Next.js 14 App Router) | SIR_CODEX     |
| A3  | **Tailscale MCP guard**             | `apps/mcp-query` (HTTP/S)          | SIR_SENTINEL  |
| A4  | **Secrets vault (Doppler)**         | Doppler ↔ Bifrost/PWA/curl-inject  | SIR_SENTINEL  |
| A5  | **PostgreSQL (managed)**            | `packages/db` Prisma client        | SIR_CODEX     |
| A6  | **Observability stack** (Sentry, OTel) | Pia-fwd: client SDK + managed collector | MERLIN_OMEGA |
| A7  | **mTLS cert bundle**                | `certs/{ca,server,client}.pem`     | SIR_SENTINEL  |
| A8  | **Vercel build / edge**             | Vercel-managed                     | SIR_CODEX     |
| A9  | **CI runners**                      | GitHub Actions (kba-smoke.yml)     | MERLIN_OMEGA  |

---

## 3. Trust boundaries

```
┌──────────────────────────────────────────────────────────────────┐
│                      VERCEL EDGE (PUBLIC)                       │
│  ┌────────────────────────────────────┐                         │
│  │  PWA (Next.js)  -- HTTPS only --  │  A2                    │
│  └──────────────┬─────────────────────┘                         │
│                 │ wss://<tailscale>:3017 (JWT Bearer)           │
└─────────────────┼──────────────────────────────────────────────┘
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                       TAILSCALE MESH (PRIVATE)                  │
│  ┌────────────────────────────────────┐                         │
│  │  Bifrost gateway  -- HMAC + RBAC - │  A1                    │
│  │  apps/bifrost                       │                        │
│  └──────────────┬─────────────────────┘                         │
│                 │ mTLS (client cert)                            │
│                 ▼                                               │
│  ┌────────────────────────────────────┐                         │
│  │  MCP guard   -- HTTPS + mTLS ------│  A3                    │
│  │  apps/mcp-query                     │                        │
│  └──────────────┬─────────────────────┘                         │
└─────────────────┼──────────────────────────────────────────────┘
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                    MANAGED INFRA (PRIVATE)                      │
│  ┌────────────────────────────────────┐                         │
│  │  PostgreSQL    -- TLS + role pw ---│  A5                    │
│  └────────────────────────────────────┘                         │
└──────────────────────────────────────────────────────────────────┘

A4 (Doppler)  →  reaches into every surface via out-of-band HTTPS
A6 (Sentry/OTel) ←  receives telemetry from every surface (HTTPS out)
A7 (mTLS)      ←  A1 + A3 read at boot
A8 (Vercel)    →  hosts A2 (full control of A8; A2 is a tenant)
A9 (CI)        →  exercises A1 + A3 via kba-smoke.yml + bundle-size
```

**Zero public ingress except:** Vercel (A2 + Vercel-managed A8) and the
single Bifrost WS endpoint (A1, via Tailscale FQDN). No public HTTPS
listener on A3; only Tailscale mesh clients can reach it.

---

## 4. STRIDE per asset

### A1 — Bifrost gateway (apps/bifrost)

| STRIDE   | Threat                                                                | Severity | Mitigation                                                                                            | Residual |
| -------- | --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- | -------- |
| **S**poofing | Forged HMAC envelope on `/api/bifrost/*`                            | **H**    | HS256 + WEBHOOK_SECRET (32-byte min) + `Issued-At` freshness window (±30s) + nonced `actionId`        | low      |
| **S**poofing | Forged JWT Bearer on `/api/bifrost/issue|hitl` (v1.2.0 T3.6)        | **H**    | RBAC middleware: HS256 verify + role hierarchy (`admin > operator > viewer`); `RBAC_ENABLED=false` only in dev/CI | low      |
| **S**poofing | Replayed HAR capture                                                | **M**    | `expiresAt` (5 min TTL) + `issuedAt` ±30s freshness                                                     | low      |
| **T**ampering | Modified request body on webhook (`POST /webhook/sms`)              | **H**    | HMAC envelope on entire raw body (`rawBody` captured at JSON-parser layer); call-site `verifyWebhookSignature` | low      |
| **T**ampering | Modified WS payload (`MAX_WS_PAYLOAD = 16 KB` cap)                  | **L**    | `WebSocketServer({ maxPayload: MAX_WS_PAYLOAD })` rejects oversized frames at the protocol layer     | low      |
| **R**epudiation | Operator denies sending a `hitl` action                              | **L**    | Pino structured logger captures `{ sub, role, actionId, timestamp, lane, rezeroed, latencyMs }`       | low      |
| **R**epudiation | Dev/CI bypass log                                                    | **I**    | `RBAC_ENABLED=false` is logged at WARN level by the middleware                                         | low      |
| **I**nfo disclosure | Secret leaks in structured logs                                    | **H**    | Pino redact 16 paths (v1.1.1) covering `*.secret`, `*.token`, `*.signature`, `*.bearer`, webhook headers; verified in `apps/bifrost/src/logger.ts` | low      |
| **I**nfo disclosure | WS broadcast leaks PII                                              | **M**    | `STATE_UPDATE` payload is the in-memory `snapshot()` — review `apps/bifrost/src/state.ts` for any PII fields | medium (review PII fields quarterly) |
| **D**oS | Rate-limit flood on `/api/bifrost/issue`                              | **M**    | `issueLimiter` (default 30/min via env var)                                                            | low      |
| **D**oS | Rate-limit flood on `/api/bifrost/hitl`                              | **M**    | `hitlLimiter` (default 60/min via env var)                                                             | low      |
| **D**oS | WS reaper (every 30 s pings; no pong → terminate)                      | **L**    | `setInterval` reaper in `server.ts` keeps zombie sockets from building up                              | low      |
| **E**levation | Forged `role: admin` JWT for read-only viewer                         | **H**    | `requireRole(minRole)` enforces role hierarchy; viewer is level 1, admin is level 3                      | low      |
| **E**levation | `/webhook/sms` bypasses RBAC (intentional)                            | **M**    | Its auth is HMAC signature on raw body — never bypass RBAC without re-asserting HMAC                   | medium    |

### A2 — PWA (apps/pwa)

| STRIDE   | Threat                                                                | Severity | Mitigation                                                                                            | Residual |
| -------- | --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- | -------- |
| **S**poofing | Forged `POST /api/*` route from a malicious client                   | **H**    | Next.js server routes co-located on Vercel + Vercel edge headers (CSP, HSTS, X-Frame-Options)         | low      |
| **S**poofing | PWA → Bifrost with a stolen JWT caught from DevTools                  | **M**    | 5 min JWT TTL (matches `issuance.ts` `TTL_MS`); refresh on each `/api/bifrost/issue` call             | medium   |
| **T**ampering | DOM injection via XSS                                                | **H**    | React 18 default-escapes; CSP `default-src 'self'` (no `unsafe-inline` script-src, see v1.1.0 migration notes for the exception) | low |
| **T**ampering | Local storage tampered with cached Bifrost state                      | **L**    | State never persisted to localStorage; ephemeral until next WS reconnect                              | low      |
| **R**epudiation | "I didn't tap that button"                                            | **L**    | Tap-driven UI gates speech I/O behind an explicit gesture (per AGENTS.md Rule S1)                     | low      |
| **I**nfo disclosure | Sentry PII capture                                                   | **M**    | `Sentry.beforeSendTransaction` strips user.id and email; ErrorBoundary extra-fields only include componentStack | low |
| **I**nfo disclosure | Bundle fingerprint leaks dependencies                                 | **I**    | Public bundle is OD-safe; no secret-bearing code shipped to the browser                                | none     |
| **D**oS | Bundle blown (asset CDN cost)                                         | **M**    | `scripts/ops/bundle-size.mjs` enforces `BUNDLE_SIZE_BUDGET_BYTES=153600` in CI                          | low      |
| **D**oS | Vercel usage spike                                                    | **M**    | Vercel hard-limit per plan; Sentry/OTel sampling caps help                                            | low      |
| **D**oS | Rate-limit flood on `/api/diagnostics/replay-coverage`               | **M**    | In-memory sliding-window limiter (60 req / IP / 60 s); 429 + `Retry-After: N` header. Wired AFTER `ADMIN_TOKEN` auth (so unauth callers don't pollute the rate-limit state). Single-instance only; for multi-region accuracy, lift to Vercel Edge KV (v1.4.0 ticket). | low |
| **E**levation | Render-side escalation (XSS → privileged token exfil)                 | **H**    | JSON-only fetches; no `<script>` injection surfaces; CSP `script-src 'self'`                          | low      |

### A3 — Tailscale MCP guard (apps/mcp-query)

| STRIDE   | Threat                                                                | Severity | Mitigation                                                                                            | Residual |
| -------- | --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- | -------- |
| **S**poofing | Unauthenticated client floods the guard                              | **H**    | mTLS with `MTLS_REQUIRE_CLIENT_CERT=true`; client cert signed by local CA (`certs/ca.pem`)           | low      |
| **S**poofing | Stolen client cert reused                                             | **M**    | Cert TTL 90 days; client cert revocation is manual (rebuild CA + reissue); roll the CA on suspected compromise | medium   |
| **T**ampering | Tailscale mesh spoof (rogue node joins the mesh)                     | **L**    | Tailscale ACLs restrict mesh members; reviewed quarterly                                              | low      |
| **R**epudiation | Operator invokes a query anonymously                                  | **L**    | Cert subject CN logs to stderr `mcp-query (<protocol>) on port <PORT>`                                | low      |
| **I**nfo disclosure | Cert keys readable on disk                                            | **H**    | `chmod 600 certs/server-key.pem` + .gitignore prevents accidental commit; rotation cadence 90 days   | low      |
| **D**oS | TCP connect flood                                                     | **M**    | mTLS handshake is expensive; add a Tailscale ACL rate-limit if abuse observed                          | low      |
| **E**levation | mTLS-disabled fallback (operator sets `MTLS_ENABLED=false`)          | **M**    | Document the disable-tradeoff in the env-var comment; warn-on-boot via the existing validity check    | low      |

### A4 — Secrets vault (Doppler)

| STRIDE   | Threat                                                                | Severity | Mitigation                                                                                            | Residual |
| -------- | --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- | -------- |
| **S**poofing | Forged Doppler API response                                           | **H**    | HTTPS + Bearer `DOPPLER_TOKEN`; the SDK throws on non-200 + logs WARN                                 | low      |
| **R**epudiation | "I never rotated the secret"                                          | **L**    | Rotation events logged to Doppler activity log + SOVEREIGNTY_LEDGER; 90-day reminder in the runbook   | low      |
| **I**nfo disclosure | Doppler token leaks in CI logs                                       | **H**    | Token is injected via `DOPPLER_TOKEN` env var; secrets-audit script greps for `dp.st.` in tracked files; kba-smoke.yml keeps Doppler token out of PRs | low |
| **I**nfo disclosure | Doppler project pwned via Doppler-side credential rotation          | **M**    | Out of project scope; surface it to security@cyberdad247.dev                                          | medium   |
| **D**oS | Doppler API outage (5 min cache TTL holds secrets)                     | **M**    | `CACHE_TTL_MS = 5 min`; falls back to env vars on Doppler failure                                     | low      |
| **E**levation | Doppler token reused for unrelated Doppler projects                  | **L**    | Token scoped to `project=kickbox-audio, config=prd` at mint time                                       | low      |

### A5 — PostgreSQL (managed)

| STRIDE   | Threat                                                                | Severity | Mitigation                                                                                            | Residual |
| -------- | --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- | -------- |
| **S**poofing | DB role sniffed from query logs                                       | **H**    | Prisma uses parameterized queries (`$queryRaw` is gated); `connection_limit=5` caps pool; credentials in Doppler | low      |
| **T**ampering | SQL injection via raw SQL                                             | **H**    | Prisma 5.x `prisma.$queryRaw` is a privilege (typed param); escape via tagged templates; lint rule `no-restricted-syntax` blocks raw SQL outside `db/prisma/` | low      |
| **R**epudiation | DB-admin actions outside the audit trail                            | **L**    | Managed PG audit log retention 7-day default; bump to 30-day for prod                                  | low      |
| **I**nfo disclosure | Backup contains unredacted PII                                        | **M**    | PII fields reviewed (none today); future introduction triggers DPIA                                    | low      |
| **D**oS | DB-pool exhaustion                                                    | **M**    | `connection_limit=5` per instance; managed PG rate-limits idle sessions                                | low      |
| **E**levation | Managed-PG UI access compromise                                       | **H**    | 2FA mandatory on managed PG console; least-privilege per-user DB roles                                | low      |

### A6 — Observability stack (Sentry + OTel)

| STRIDE   | Threat                                                                | Severity | Mitigation                                                                                            | Residual |
| -------- | --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- | -------- |
| **I**nfo disclosure | Sentry DSN leaks in browser bundle                                   | **M**    | `NEXT_PUBLIC_SENTRY_DSN` is intended-public (read-only DSN); server DSN is `SENTRY_DSN` (server-only) | low      |
| **I**nfo disclosure | Traces leak session tokens                                           | **H**    | Pino redact 16 paths + OTel attribute scrubber (request headers excluded by default; trace body content not captured) | low |
| **R**epudiation | Forged Sentry event to drown real errors                              | **M**    | Sentry rate-limit (free tier 5K events/month; team tier 50K); review top-fingerprint weekly           | low      |
| **D**oS | OTel collector quota exceeded                                          | **M**    | `OTEL_EXPORTER_OTLP_ENDPOINT` returns 503 → SDK drops traces silently; document the failure mode       | low      |

### A7 — mTLS cert bundle

| STRIDE   | Threat                                                                | Severity | Mitigation                                                                                            | Residual |
| -------- | --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- | -------- |
| **I**nfo disclosure | Certs committed to git                                              | **H**    | `certs/` in `.gitignore`; `certs/` permissions `0700`; chmod `0600` on keys                           | low      |
| **T**ampering | CA private key tampered with                                          | **H**    | CA key stored in 1Password + offline USB; never on disk in plain; rotation cadence 90 days           | low      |
| **S**poofing | Forged client cert                                                    | **H**    | Client cert signed by trusted CA; `rejectUnauthorized = true`                                        | low      |

### A8 — Vercel build / edge

| STRIDE   | Threat                                                                | Severity | Mitigation                                                                                            | Residual |
| -------- | --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- | -------- |
| **E**levation | Vercel account compromised                                            | **H**    | 2FA mandatory; GitHub SSO enforced; team member audit quarterly                                       | low      |
| **I**nfo disclosure | Vercel build artifacts leak env                                       | **H**    | Vercel never echoes env to build logs except via the explicit `VERCEL_ENV` injection; secrets-audit script greps tracked files | low |
| **D**oS | Vercel plan exhausted                                                 | **M**    | Vercel plan supports current traffic; set billing alerts                                                | low      |

### A9 — CI runners

| STRIDE   | Threat                                                                | Severity | Mitigation                                                                                            | Residual |
| -------- | --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- | -------- |
| **T**ampering | Malicious PR modifies `kba-smoke.yml` to exfiltrate env               | **H**    | PR builds run without prod secrets; secrets are only injected via GitHub Actions Secrets storefront; PRs from forks cannot access secrets | low      |
| **E**levation | CI runner pwned                                                        | **M**    | GitHub-hosted ephemeral runners; no long-lived state                                                  | low      |

---

## 5. Prioritized mitigation backlog

Items not yet implemented, sorted by severity × effort.

| # | Asset | Item                                                            | Severity | Effort | Target   |
| - | ----- | --------------------------------------------------------------- | -------- | ------ | -------- |
| 1 | A1    | Migrate RBAC JWT HS256 → RS256 w/ OIDC + vault-stored private key | H        | 2 d    | v1.4.0   |
| 1a | A1 | **v1.3.0 Tier 4.1 (verification-side DONE, 2026-06-28):** Bifrost `apps/bifrost/src/auth.ts` now verifies RS256 JWTs via vault-loaded PEM public key (algorithm-driven via `RBAC_JWT_ALGORITHM`); 9 new vitest cases cover the RS256 path (valid sig, wrong key, expired, invalid role, OIDC `iss`/`aud` validation, requireRole pass/403, RBAC_MISCONFIGURED gate). End-to-end OIDC dance (IdP-side issuance + PWA inbound OIDC flow) deferred to v1.4.0. Cutover procedure in `PRODUCTION_RUNBOOK.md §6.2`. | — | — | — | | H        | 2 d    | v1.4.0   |
| 2 | A2    | Add a CSP `script-src` nonce and remove `unsafe-eval`           | M        | 1 d    | v1.4.0   |

| 2a | A2 | **v1.3.0 Tier 4.2 (DONE, 2026-06-28):** `apps/pwa/src/middleware.ts` (NEW Edge-runtime middleware) generates a per-request base64 nonce, sets the `Content-Security-Policy` response header + mirrors onto the request header so Next.js 14 can extract the nonce and stamp it onto hydration scripts. Prod drops `unsafe-eval`; dev keeps it (webpack/HMR). `script-src` uses `nonce-{NONCE}` + `strict-dynamic` so nonced scripts transitively load more scripts. `apps/pwa/src/app/layout.tsx` adds `export const dynamic = ...force-dynamic...` so the per-request nonce reaches the cached HTML body. `vercel.json` static CSP tightened (`unsafe-eval` removed, Sentry connect-src added, `object-src none` + `base-uri self` + `form-action self` + `frame-ancestors none` + `upgrade-insecure-requests` added). Style-src keeps `unsafe-inline` (next/font + Tailwind inline styles); tightening to nonce-only is v1.4.0 work. 9 vitest cases for `buildCspHeader` (nonce, strict-dynamic, dev-only unsafe-eval, prod no unsafe-eval, Sentry connect-src, frame-ancestors none, style-src unsafe-inline, object-src/base-uri/form-action, default-src self + upgrade-insecure-requests). | — | — | — |
| 3 | A3    | **v1.3.0 Tier 4.3 (DONE, 2026-06-28):** `apps/bifrost/src/certRevocation.ts` (NEW module) owns the in-memory revocation registry — keyed on `clientCertSerial` (normalized) / `clientCertSubject` / `rbacSubject`. `POST /api/bifrost/admin/cert/revoke` + `/reissue` + `GET /revocations` (admin bearer via `ADMIN_TOKEN`). `requireRole` middleware now rejects JWTs whose `sub` is in the revocation list BEFORE the role-hierarchy check (`CERT_REVOKED` 403). Auto-purge stale entries >30 d on read; env-seed via `CERT_REVOKED_LIST`. 17 vitest cases for revoke/reissue/isRevoked/seed-parse/auto-purge. `PRODUCTION_RUNBOOK.md §6.5` drill covers the revoke call → Caddy rebuild → reissue path → smoke check sequence. **Operational note (honest):** Bifrost cannot block the TLS handshake itself (terminates in front of Bifrost at Caddy/Tailscale edge); the strategic impact is curtailing the JWT-borne damage of a stolen cert + giving the operator a Tailscale-edge ACL rebuild checklist. CRL-from-HTTP at Caddy is a v1.4.0 candidate (see §6 residual row below). | Client-cert revocation workflow (revoke + reissue)              | M        | 1 d    | v1.4.0   |
| 4 | A5    | 30-day PG audit-log retention (instead of 7-day default)         | M        | 1 h    | v1.4.0   |
| 5 | A5    | DPIA per PII field; current state: no PII fields                 | L        | 0.5 d  | v1.4.0   |
| 6 | A1    | Sweep `apps/bifrost/src/state.ts` `snapshot()` PII fields quarterly | M        | 0.5 d  | ongoing  |
| 7 | A2    | **v1.3.1 (DONE, 2026-06-28):** `apps/pwa/src/app/api/diagnostics/replay-coverage/route.ts` now rate-limits at 60 req / IP / 60 s (in-memory sliding-window; 429 + `Retry-After: N` header). Closes the standing F ⚠️ minor from the v1.3.0 code-review (replay-coverage rate-limit gap). Multi-region accuracy lift to Vercel Edge KV is a v1.4.0 ticket. | M | 0.5 d | done |

---

## 6. Residual risks (accepted)

| Risk                                                                       | Severity | Why accepted                                                                       |
| --------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| Stolen JWT from DevTools used for ≤ 5 minutes                              | M        | TTL bounds the window; refresh is automatic on each `issue` call                   |
| Stolen RS256 private key (IdP-side) → reuse window until next rotation    | M        | Private key never touches Bifrost; IdP holds it tier-1; rotation cadence 90 days; alg-confusion downgrade blocked by strict env check |
| Client cert stolen → 90-day window of misuse                              | M        | Manual revocation workflow is in backlog (#3); new TLS pin in v1.4.0 closes this   |                              | M        | TTL bounds the window; refresh is automatic on each `issue` call                   |
| Client cert stolen → 90-day window of misuse                              | M        | Manual revocation workflow is in backlog (#3); new TLS pin in v1.4.0 closes this   |
| PWA bundle fingerprint publicly visible                                     | L        | Bundle is open-source; leaking dep fingerprints via JS analysis is accepted        |
| Tailscale node compromise                                                   | M        | Out of project scope; ACLs reviewed quarterly                                      |

---

## 7. Review cadence

- **Quarterly**: walk every STRIDE row, update "Residual".
- **On surface change** (new route / new external integration): update
  §3 trust boundaries + §4 STRIDE table.
- **On incident**: add a row to §6 "Residual risks (accepted)" if the
  mitigation failed or was insufficient.

---

## 8. Change log

| Date       | Change                                                                |
| ---------- | --------------------------------------------------------------------- |
| 2026-06-28 | v1.3.0 baseline (this document)                                       |
