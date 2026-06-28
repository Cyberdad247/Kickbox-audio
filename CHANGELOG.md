# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-06-28

The v1.2.0 Tier 3 production-readiness release. 6 items: bundle-size budget
enforcement, Sentry error tracking, OpenTelemetry tracing, secrets vault
integration, mTLS for the Tailscale MCP guard, and RBAC for the Bifrost
`/api/bifrost/*` routes. All 6 items are implemented with env-var
placeholders for external service credentials (Sentry DSN, OTel endpoint,
Doppler token, mTLS cert paths) so the project can be deployed to staging
without configuration. Production cutover requires setting the env vars in
the deployment manifest.

### Added — Tier 3 production-readiness (6 items)

- **T3.1: Bundle-size budget enforcement** — `scripts/ops/bundle-size.mjs`
  walks `apps/pwa/.next/static/chunks/pages/*.js` after `next build`,
  measures each route's first-load JS total, and fails CI if any route
  exceeds `BUNDLE_SIZE_BUDGET_BYTES` (default 153600 = 150KB, matching the
  v1.0.0 Green Computing ceiling). The `bundle-size` turbo task is
  reintroduced in `turbo.json` (removed in v1.1.0 post-review; now
  implemented). Run with `npx turbo run bundle-size` after a build.
- **T3.2: Sentry integration** — `apps/bifrost/src/sentry.ts` initializes
  `@sentry/node` (no-op if `SENTRY_DSN` is unset). `apps/pwa/sentry.client.config.ts`
  + `sentry.server.config.ts` initialize `@sentry/nextjs` (no-op if
  `NEXT_PUBLIC_SENTRY_DSN` is unset). `ErrorBoundary.componentDidCatch` in
  `apps/pwa/src/components/ErrorBoundary.tsx` now calls
  `Sentry.captureException(error, { extra: { componentStack } })`. New
  env vars: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ENVIRONMENT`,
  `SENTRY_TRACES_SAMPLE_RATE`.
- **T3.3: OpenTelemetry tracing** — `apps/bifrost/src/telemetry.ts`
  initializes `@opentelemetry/sdk-node` with auto-instrumentation for http,
  express, and ws (no-op if `OTEL_EXPORTER_OTLP_ENDPOINT` is unset).
  `apps/pwa/src/instrumentation.ts` registers the `@vercel/otel` browser
  SDK for fetch + WebSocket tracing. `initTelemetry()` must be called
  FIRST in `apps/bifrost/src/server.ts` so the SDK can monkey-patch
  instrumented modules at require time. New env vars:
  `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES`.
- **T3.4: Secrets vault integration** — `apps/bifrost/src/secrets.ts`
  reads secrets from Doppler (https://doppler.com) if `DOPPLER_TOKEN` is
  set, otherwise falls back to `process.env`. Secrets are cached for 5 min
  to support vault rotation. `server.ts` calls `loadBifrostSecrets()` on
  boot to load `WEBHOOK_SECRET` + `ACTION_SECRET`. New env vars:
  `DOPPLER_TOKEN`, `DOPPLER_PROJECT`, `DOPPLER_CONFIG`,
  `WEBHOOK_SECRET_VAULT_KEY`, `ACTION_SECRET_VAULT_KEY`.
- **T3.5: mTLS for Tailscale MCP guard** — `apps/mcp-query/src/mtls.ts`
  wraps the HTTP request handler in HTTPS if `MTLS_ENABLED=true`. Client
  cert verification is enforced if `MTLS_REQUIRE_CLIENT_CERT=true`.
  `scripts/ops/generate-mtls-certs.sh` generates a self-signed CA +
  server cert + client cert via openssl (output in `./certs/`). New env
  vars: `MTLS_ENABLED`, `MTLS_CA_CERT_PATH`, `MTLS_SERVER_CERT_PATH`,
  `MTLS_SERVER_KEY_PATH`, `MTLS_REQUIRE_CLIENT_CERT`.
- **T3.6: RBAC for Bifrost `/api/bifrost/*` routes** —
  `apps/bifrost/src/auth.ts` defines 3 roles (admin, operator, viewer) and
  a `requireRole(minRole)` Express middleware. JWTs are HS256-signed with
  `WEBHOOK_SECRET` (reuse existing secret for v1.2.0; v1.3.0 migrates to
  RS256 with OIDC + vault-stored keys). Routes are protected as follows:
  `POST /api/bifrost/issue` requires operator, `POST /api/bifrost/hitl`
  requires operator, `POST /webhook/sms` is exempt (HMAC body signature
  is the auth), `GET /health` is exempt (liveness probe). Set
  `RBAC_ENABLED=false` to disable RBAC in dev/CI. New env vars:
  `RBAC_ENABLED`, `RBAC_JWT_ALGORITHM`, `RBAC_ADMIN_ROLES`,
  `RBAC_OPERATOR_ROLES`, `RBAC_VIEWER_ROLES`.

### Added — Tests (v1.2.0)

- **`apps/bifrost/src/auth.test.ts`** — 9 vitest cases for the RBAC
  middleware covering: valid token, invalid signature, expired token,
  invalid role claim, empty token, round-trip via issueToken, RBAC
  disabled, missing Bearer header, insufficient role, sufficient role.

### Dependencies (optional, loaded lazily)

The Tier 3 modules are written so the heavy SDKs are optional. If
the env var is unset, the module is a no-op and the SDK is never
imported. Install the optional SDKs as needed:

- `@sentry/node` (apps/bifrost) for T3.2 Bifrost Sentry
- `@sentry/nextjs` (apps/pwa) for T3.2 PWA Sentry
- `@opentelemetry/sdk-node` + `@opentelemetry/auto-instrumentations-node`
  (apps/bifrost) for T3.3 Bifrost OTel
- `@vercel/otel` (apps/pwa) for T3.3 PWA browser OTel
- `jsonwebtoken` + `@types/jsonwebtoken` (apps/bifrost) for T3.6 JWT

Install with:
```
npm install @sentry/node @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node jsonwebtoken --workspace=apps/bifrost --legacy-peer-deps
npm install @sentry/nextjs @vercel/otel --workspace=apps/pwa --legacy-peer-deps
npm install --save-dev @types/jsonwebtoken --workspace=apps/bifrost --legacy-peer-deps
```

### Migration notes

- **RBAC breaking change**: `POST /api/bifrost/issue` and
  `POST /api/bifrost/hitl` now require `Authorization: Bearer <jwt>` with
  a valid HS256 token (role must be `operator` or `admin`). The PWA
  receives the JWT from `/api/bifrost/issue` and re-presents it on
  `/api/bifrost/hitl`. Local dev / CI can set `RBAC_ENABLED=false` to
  bypass. The `kba-smoke.yml` workflow must mint a JWT before invoking
  the HMAC handshake (added in a follow-on PR).
- **mTLS breaking change**: if `MTLS_ENABLED=true`, the mcp-query
  server requires HTTPS. Bifrost → MCP calls must use the `https://`
  scheme and present the client cert.
- **Sentry / OTel / Doppler / Vault**: opt-in via env var. No breaking
  changes for deployments that don't set the env var.

## [1.1.1] - 2026-06-28

The v1.1.1 hardening release. 2 items addressing code-reviewer findings
from the v1.1.0 work. Branch: `feat/production-readiness-v1.1.0` (continuation).

### Added

- **Pino redact paths extended** — `apps/bifrost/src/logger.ts` redact
  config now covers 16 paths (was 10). Added `*.key`, `*.apiKey`,
  `*.bearer`, `*.privateKey`, `*.credential`, `*.hmac` to catch the
  common secret-bearing field names that the v1.1.0 wildcards missed.

### Changed

- **axe-smoke test determinism** — `apps/pwa/e2e/axe-smoke.spec.ts` no
  longer uses `waitForLoadState('networkidle')` (flaky on PWA surfaces
  with persistent WebSocket connections like the Bifrost WS). Replaced
  with `waitForSelector('[data-testid="app-ready"]', { timeout: 10_000 })`.
  The `data-testid="app-ready"` attribute is on the `<body>` element in
  `apps/pwa/src/app/layout.tsx` and is present as soon as the React
  tree has mounted.

## [1.1.0] - 2026-06-28

The v1.1.0 production-readiness hardening release. 18 items across Tier 1
(release-blocking production gaps) + Tier 2 (defense-in-depth improvements)
on branch `feat/production-readiness-v1.1.0` (not yet merged to main). Closes
the pre-existing gaps in licensing, security disclosure, container build hygiene,
env-var documentation, liveness/readiness probes, structured logging, error
boundaries, automated accessibility checks, security headers, and dependency
audit gating.

### Added — Repository Hygiene (Tier 1.1–1.5)

- **`.nvmrc`** — pins Node 22 LTS for local dev consistency (matches `kba-smoke.yml`
  and the `engines` field in `package.json`).
- **`LICENSE`** — MIT license, copyright 2026 Cyberdad247. Closes the GitHub
  "no license detected" warning.
- **`SECURITY.md`** — vulnerability disclosure policy + supported versions table
  + security posture summary (HMAC envelopes, rate limiting, secrets handling).
- **`.dockerignore`** — excludes `node_modules`, `.next`, `dist`, `.env*`, `.git`,
  `.turbo`, `.vercel`, `coverage`, `e2e` from container builds. Reduces image
  size + prevents secret leakage.
- **`.env.example`** — full env-var template documenting `DATABASE_URL`,
  `WEBHOOK_SECRET`, `ACTION_SECRET`, `PORT`, `HOST`, `ACTION_ID`, `REMOTE_MCP_URL`,
  `ROUTE_BUDGET_MS`, `LOG_LEVEL`, `ISSUE_RATE_LIMIT_MAX`,
  `ISSUE_RATE_LIMIT_WINDOW_MS`, `HITL_RATE_LIMIT_MAX`, `HITL_RATE_LIMIT_WINDOW_MS`,
  `NEXT_PUBLIC_SITE_URL`, and the `ENABLE_*` feature flags.

### Added — Observability (Tier 1.6–1.8)

- **`apps/pwa/src/app/api/health/route.ts`** — Next.js App Router `GET /api/health`
  endpoint. Returns 200 OK with `{ status, service, timestamp, uptime, version }`.
  Caching disabled (`Cache-Control: no-store, no-cache, must-revalidate`).
  Intentionally does NOT check the database (PWA surface, not gateway) — the
  Bifrost gateway has its own `/health` endpoint with client count.
- **`apps/bifrost/src/logger.ts`** — Pino structured logger. JSON output to
  stdout. Level via `LOG_LEVEL` env var (default `info`). Base fields include
  `service: 'bifrost'`, `version`, `env`. ISO timestamps. Migration path from
  `console.*` documented inline (`console.log('x')` → `logger.info('x')`,
  `console.error('y', err)` → `logger.error({ err }, 'y')`).
- **`apps/pwa/src/components/ErrorBoundary.tsx`** — class component wrapping
  the PWA subtree. Uses `getDerivedStateFromError` + `componentDidCatch` (the
  React team has stated error boundaries cannot be implemented as functional
  components as of React 18). Fallback UI uses Tailwind semantic tokens
  (obsidian/foreground/muted/font-display) added to `tailwind.config.ts`.
  Optional `onError` prop for future Sentry integration (v1.2.0 candidate).

### Added — Accessibility (Tier 1.9)

- **`apps/pwa/e2e/axe-smoke.spec.ts`** — axe-core + Playwright a11y smoke test.
  Scans the home page for WCAG 2.0/2.1 A + AA violations. Fails on any violation.
  Run via `npm run test:e2e --workspace=@sovereign/pwa`.

### Changed — Security Headers (Tier 1.10)

- **`vercel.json`** — added 6 production security headers applied to all routes:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (replaces the missing `frame-ancestors` in CSP)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(self), geolocation=(), interest-cohort=()`
    (note: `microphone=(self)` allows the Bifrost voice flow)
  - `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ... frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
    (`unsafe-eval` is required for Next.js production builds; can be tightened in v1.2.0)

### Changed — Quality Gates (Tier 1.11–1.13)

- **`biome.json`** — `noExplicitAny` raised from `off` to `warn`. Per AGENTS.md
  Rule 2, `as any` / `: any` should be avoided; `warn` (not `error`) allows
  narrow escapes (e.g., the Prisma 5.x `JsArgs` opaque generic in
  `ledgerValidator.ts`) with a `// biome-ignore` justification.
- **`.github/workflows/ci.yml`** — Node 20 → 22 LTS (closes the version drift
  between `ci.yml` and `kba-smoke.yml`); added `npm audit --omit=dev --audit-level=high`
  step that fails CI on production-bundle vulnerabilities. Dev-only advisories
  (Biome, Turbo, Vitest) are ignored to avoid noise from tooling the project
  does not control.
- **`vitest.config.ts`** — added v8 coverage config (provider + reporter list
  + includes + excludes). Reports emitted on every `npm run test` (text + HTML
  + LCOV for CI ingestion). Thresholds NOT enforced yet — deferred to v1.1.1
  after baseline coverage is measured.

### Changed — Build Pipeline (Tier 1.14)

- **`turbo.json`** — added `bundle-size` task placeholder (depends on `^build`,
  outputs `bundle-report.json`). The implementation (size budget enforcement)
  is a v1.2.0 candidate; the task scaffolding is in place so the pipeline
  config doesn't churn when the budget logic lands.

### Changed — Bifrost Rate Limiter Externalization (Tier 2.17)

- **`apps/bifrost/src/server.ts`** — 3 rate limiters (`issueLimiter`, `hitlLimiter`,
  `webhookLimiter`) now read `ISSUE_RATE_LIMIT_MAX`, `ISSUE_RATE_LIMIT_WINDOW_MS`,
  `HITL_RATE_LIMIT_MAX`, `HITL_RATE_LIMIT_WINDOW_MS` env vars with safe defaults
  matching the prior hardcoded values (30/min for issue, 60/min for HITL/webhook,
  60s windows). Replaced 9 `console.log`/`console.error` calls with structured
  `logger.info`/`logger.error` calls preserving the call-site context as
  structured fields (e.g., `{ err, taskId, action }`).

### Changed — PWA Error Boundary (Tier 2.18)

- **`apps/pwa/src/app/layout.tsx`** — wrapped the app in `<ErrorBoundary>` around
  `<KoARealmProvider>`. Unexpected render errors in the subtree now surface a
  fallback UI (heading + message + reload button) instead of crashing the whole PWA.

### Changed — Tailwind Config (Tier 2.15)

- **`apps/pwa/tailwind.config.ts`** — added 5 semantic tokens used by the
  ErrorBoundary fallback UI: `obsidian: #050507` (matches `themeColor` in
  `layout.tsx`), `foreground: #FFFFFF`, `background: #000000`, `muted.DEFAULT:
  #1A1A1F`, `muted.foreground: #A0A0A0`, and `fontFamily.display: [var(--font-source-serif), ...]`.

### Changed — DB Type Safety (Tier 2.16)

- **`packages/db/src/ledgerValidator.ts`** — moved the `// biome-ignore
  lint/suspicious/noExplicitAny` comment to be directly above the function
  declaration (was on a continuation line, treated as unused suppression).
  Rationale unchanged: Prisma 5.x Client Extensions type the query callback's
  `args` as opaque generic `JsArgs` that structurally has no properties in
  common with `{ data?: any }`. See the "CI fail-loop closed (7th iteration)"
  Fixed section in v1.0.0 for the full root-cause analysis.

### Dependencies

- **Added** `pino@^10.3.1` to `apps/bifrost` (production dep for the structured logger)
- **Added** `@vitest/coverage-v8` at root (dev dep for v8 coverage provider)
- **Added** `@axe-core/playwright` at root (dev dep for the a11y smoke test)

### Migration notes

- If your local checkout has the old hardcoded rate limit values in
  `apps/bifrost/src/server.ts`, pull this branch — the env-var defaults
  match the prior behavior, so no action is required.
- The new `/api/health` route requires no env var to be set (returns 200 always).
- The `biome-ignore` on `validateTransactionBatchBalance` in `packages/db` is
  the only `any` suppression in the codebase; do not remove it without
  reading the v1.0.0 "CI fail-loop closed" Fixed section.
- v1.0.0 migration notes (the `scripts/ci/` → `scripts/ops/` rename + the
  `npm run db:generate` step) still apply.

## [1.0.0] - 2026-06-28

The v1.0.0 architecture baseline. Closes a 7-iteration CI fail-loop on the
`feat/kba-cartridge-v1000` branch (see `CAMELOT_OS/SOVEREIGNTY_LEDGER.md` for
the full iteration log) and reorgs the repo into a cleaner layout.

### Changed

- **Governance file moves** — `blueprint.md`, `design.md`, `task.md`,
  `verification.md` moved from repo root into `docs/`. References in
  `AGENTS.md` (Top-level laws, Project Roster SIR_CODEX row, Repository
  Layout code block) and `docs/security/PRODUCTION_CHECKLIST.md` updated to
  match the new paths.
- **`scripts/ci/` → `scripts/ops/` rename** — the 8 files inside are
  operational / laptop scripts (`apply-branch-protection.sh`,
  `check-helio-dry.sh`, `fixture-hitl.mjs`, `live-anya-probe.mjs`,
  `protect-branch.json`, `secrets-audit.mjs`, `start-bifrost.sh`,
  `stop-bifrost.sh`), NOT GitHub Actions YAML. Moving them to
  `.github/workflows/` would have corrupted GitHub Actions (which tries
  to parse them as workflow YAML and fails). The rename clarifies intent.
- **`kba-smoke.yml` typecheck step unified** — changed from
  `npm --prefix apps/bifrost run typecheck && npm --prefix apps/pwa run typecheck`
  to `npx turbo run typecheck`. Removes the mixed `--prefix` / `--workspace`
  smell that caused the 6-iteration fail-loop on commit `c1461e9`.
- **`kba-smoke.yml` path updates** — 4 `scripts/ci/*` references updated
  to `scripts/ops/*` to match the renamed directory.

### Added

- **`kba-smoke.yml` Prisma generate step** — explicit
  `npm run db:generate` step inserted before `Build @sovereign/db workspace`.
  Closes the postinstall CWD bug that was generating an empty Prisma client
  on fresh `npm ci` (the @prisma/client postinstall runs from the monorepo
  root where no `schema.prisma` exists; the new step sets CWD=packages/db
  via `--workspace` and finds the schema correctly).

### Fixed

_Iteration numbers below refer to the `CAMELOT_OS/SOVEREIGNTY_LEDGER.md` iteration log; they are not chronological semver._

- **CI fail-loop closed** (7th iteration) — the `@sovereign/db` build step
  (`tsc`) was failing on `Prisma.Middleware` / structural-typing errors due
  to two drift axes:
  1. `@prisma/client` postinstall runs from the monorepo root where no
     `schema.prisma` exists → empty generated client →
     `Prisma.TransactionCreateManyInput` undefined → **TS2694**.
  2. Prisma 5.x Client Extensions type the query callback's `args` as
     opaque generic `JsArgs` that structurally has no properties in common
     with `{ data?: any }` → **TS2559**.
  Fix: explicit `npm run db:generate` step in `kba-smoke.yml`; widened
  `validateTransactionBatchBalance` signature from `args: { data?: any }`
  to `args: any` in `packages/db/src/ledgerValidator.ts`.
- **Prisma 5.x Client Extensions migration** (iteration 6) —
  `ledgerValidator` migrated from `Prisma.Middleware` / `prisma.$use()` to
  `Prisma.defineExtension` + a pure `validateTransactionBatchBalance(args)`
  helper. The pure helper makes the LE_01_UNBALANCED invariant unit-testable
  without mocking the Prisma runtime.
- **CI build step `--prefix` → `--workspace=@sovereign/db`** (iteration 2) —
  closes the CWD-ambiguity bug on npm 10.x/11.x (`--prefix` does not change
  the script's CWD, so the inner `tsc` walked up from the monorepo root
  looking for a tsconfig, found none, and emitted no `.d.ts`).

### Removed

- 6 stale/duplicate files at repo root: `deploy.yml.bak` (CI backup),
  `colony_report.md` (transient runic output), `tasks.md` (duplicate of
  `task.md`), `validation.md` (duplicate of `verification.md`), root
  `memory.md` (scaffold; canonical copy is at
  `apps/pwa/public/memory.md`), `.npmrc` (legacy pnpm config; root
  `package.json` pins `packageManager: npm@11.11.0` and Corepack handles it).
- Empty `docs/architecture/` placeholder (YAGNI per code-reviewer; will be
  recreated on first spec if needed).

### Migration notes

- If your local checkout has the old `scripts/ci/` path in any branch,
  rename it to `scripts/ops/` or update the callers.
- The kba-smoke.yml `secrets-audit` step still calls
  `node scripts/ops/secrets-audit.mjs` (was `scripts/ci/`).
- The new `npx turbo run typecheck` step requires `@sovereign/db` to be
  built first (Turbo's `typecheck` task depends on `^build`; the
  `Build @sovereign/db workspace` step satisfies it). No code change
  required for downstream consumers.

## [0.1.0] - 2026-06-20

### Added

- Initial monorepo scaffold: `apps/{pwa, bifrost, mcp-query}`,
  `packages/{db, benchmark}`, `core/`. Root `package.json` with
  `workspaces: ["apps/*", "packages/*"]`, `packageManager: npm@11.11.0`.
- **Bifrost gateway** (`apps/bifrost`) — Express + WebSocket server with
  HMAC envelope, rate limiting (`issueLimiter` 30/min, `hitlLimiter`
  60/min), freshness assertion (past 60s / future 30s, 1s grace), and the
  `/api/bifrost/hitl` endpoint.
- **Lakisha voice HUD** (`apps/pwa`) — tap-to-connect autoplay-gate,
  VAD/stt pipeline, form modal, telemetry. Mounted via `LakishaHUD.tsx`.
- **KineticCanvas 3D background** — WebGL particle/weather backdrop
  rendered at `-z-10` so it sits behind the dashboard.
- **BifrostContext** — WebRTC connection state + audio bridge, mounted at
  root in `app/layout.tsx`.- **Prisma schema** (`packages/db/schema.prisma`) — 7 models across three product surfaces: Vault_Ω (double-entry accounting: `JournalEntry`,
  `Transaction` with debit/credit/journal FK), Raven_Ω (email campaigns:
  `Contact`, `Tag`, `EmailSequence`, `SequenceStep`), Echo_Ω (comms
  gateway: `EchoLog` and related tables).
- **KBA smoke CI workflow** (`.github/workflows/kba-smoke.yml`) — exercises
  the `/api/bifrost/hitl` HMAC handshake end-to-end on every push to
  `feat/**` and on every PR targeting a `feat/**` branch. Also gates the
  read-only `HELIO_PATCH.json` dry-run.
- **Vitest harness** — 4 test files in `apps/bifrost/src/` (`security`,
  `issuance`, `nlp`, `state`) covering 35 cases, plus 3 cases in
  `packages/db/src/ledgerValidator.test.ts` (added in the v1.0.0 cycle).
- **AGENTS.md** (project-local constitution) with 6 learned rules covering
  UX, TypeScript, Tailwind, hook hygiene, governance, and the Runic-
  Authority Defense (which records that pasted pseudo-dispatch tokens do
  not authorize file writes or state mutations).
- **HELIO_PATCH.json** — auto-generated perf-conformance audit artifact
  (re-generated by `scripts/regen-helio-patch.mjs`; never hand-edited).
- **Turbo, Biome, Vitest** dev toolchain. TypeScript strict mode. Next.js
  14 App Router with Tailwind for the PWA surface.

### Security

- HMAC envelope (`apps/bifrost/src/security.ts verifyActionSignature`)
  symmetric with `apps/bifrost/src/issuance.ts issueSignedAction`.
- Per-environment `WEBHOOK_SECRET` / `ACTION_SECRET` injected by the
  workflow; never in any tracked `.env`.
- 256MB memory ceiling on the Bifrost dev server (100 concurrent mock
  clients), 150KB JS bundle ceiling per PWA route, `connection_limit=5`
  on the Prisma DB string.
