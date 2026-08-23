# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
