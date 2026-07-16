# ⚔️ TASK MATRIX: RAPID PRODUCTION MARCH
**Orchestration Path:** Local → Automated Tests → Vercel Production Build

---

## PHASE 1: MONOREPO SETUP & SCHEMAS ✅
- [x] **Task 1.1:** Scaffold workspace directory structure and initialize root-level `package.json` workspaces.
  - *Done: `sovereign-system` npm workspace; `apps/*`, `packages/*`; Turborepo pipeline via `turbo.json`.*
- [x] **Task 1.2:** Initialize Prisma ORM in `packages/db`. Write out the unified `schema.prisma` mapping Vault_Ω, Raven_Ω, and Echo_Ω.
  - *Done: `packages/db/` with Prisma 5.22, ledger validator, double-entry tests (3/3 green).*
- [ ] **Task 1.3:** Setup local PostgreSQL environment variables. Run initial migration to instantiate database indexes.
  - *Pending: requires live PostgreSQL instance. `.env.example` scaffolded in both `apps/bifrost` and `apps/pwa`.*
- [ ] **Task 1.4:** Seed database profiles with initial baseline valuations ($14.2M), active shipping manifests, and streaming node groups.
  - *Pending: depends on 1.3 (live DB). Seed script stubbed in `package.json` → `db:seed`.*

---

## PHASE 2: BIFROST GATEWAY DEVELOPMENT ✅
- [x] **Task 2.1:** Implement the Express & WebSocket server (`apps/bifrost/src/server.ts`) in TypeScript.
  - *Done: 16 KB server with WS + Express, HMAC webhook validation, NLP command router, CMS routes, proxy-sign issuance endpoint.*
- [x] **Task 2.2:** Build a WS connection reaper loop (disconnect dead client sockets after 30 seconds of failed heartbeats).
  - *Done: heartbeat reaper in `server.ts`; verified in `server.test.ts`.*
- [x] **Task 2.3:** Write the Natural Language command parser inside the socket handler to parse keyword sequences.
  - *Done: `apps/bifrost/src/nlp.ts` + `nlp.test.ts` (8/8 green); router in `router.ts`.*
- [x] **Task 2.4:** Build Express API endpoints to accept incoming SMS hooks from your raw wholesale telecom trunk.
  - *Done: `/webhook/sms` in `server.ts` with `verifyWebhookSignature` + `crypto.timingSafeEqual`. HMAC + nonceCache replay guard.*

---

## PHASE 3: PWA DASHBOARD INTEGRATION ✅
- [x] **Task 3.1:** Create a clean Next.js 14 template inside `apps/pwa` using Tailwind CSS.
  - *Done: Next.js 14.0.4 App Router + Tailwind 3.4 + Three.js/R3F 3D canvas. `tailwind.config.ts` is the sole config (`.js` dupe removed).*
- [x] **Task 3.2:** Write `/src/context/BifrostContext.tsx` to handle WebSocket state synchronization.
  - *Done: auto-reconnect with 2 s backoff, HITL Plan Card gate for financial/destructive commands, `pendingPlan` → approve/reject flow.*
- [x] **Task 3.3:** Code the main layout (`/src/app/page.tsx`) mapping the Sovereign Aura style tokens. Integrated tabs must swap between Overview, Properties, Streaming, and Venture dashboards.
  - *Done: `page.tsx` mounts `<KineticCanvas />` (dynamic, ssr:false) + `<Dashboard />`. Tab swap is `useState`-driven — confirmed no full-page reload by Playwright spec.*
- [x] **Task 3.4:** Build the persistent "Lakisha HUD" bottom control bar. Wire the input fields directly to the `sendVoiceCommand` context method.
  - *Done: `LakishaEnclave.tsx` in `hud/`; `useLakishaVoice.ts` with online/offline ASR fallback chain (WebSpeech → Moonshine Worker → VAD-only).*

---

## PHASE 4: CI/CD & VERCEL EDGE DEPLOYMENT ✅
- [x] **Task 4.1:** Write the `vercel.json` routing configuration in the workspace root.
  - *Done: `vercel.json` at repo root.*
- [x] **Task 4.2:** Setup a GitHub repository at `Cyberdad247/Kickbox-audio` and configure Vercel to auto-import the PWA workspace.
  - *Done: remote `origin` → `Cyberdad247/Kickbox-audio`. Vercel project linked.*
- [x] **Task 4.3:** Build a GitHub Actions CI pipeline to automatically test and verify pull requests before allowing merge to `main`.
  - *Done: `.github/workflows/kba-smoke.yml` — typecheck, secrets scan, full vitest (141 tests), HITL fixture, HELIO_PATCH dry-run, bundle-size gate, biome-ignore audit.*

---

## PHASE 5: HARDENING & EXPANSION (Active Sprint)
- [ ] **Task 5.1:** Verify live PostgreSQL migration (Task 1.3 follow-through) — run `npm run db:migrate:dev`.
- [ ] **Task 5.2:** Seed production baseline — `npm run db:seed` — after 5.1 succeeds.
- [ ] **Task 5.3:** Add Playwright E2E spec for the `/kba` route (`apps/pwa/src/app/kba/page.tsx`).
- [ ] **Task 5.4:** AaliyahComposer integration test — CMS draft → publish round-trip against a mock Bifrost.
- [ ] **Task 5.5:** SMTP relay live-probe script (analogous to `live-anya-probe.mjs`) — verify `smtpRelay.ts` against a local Postfix/Mailhog.
- [ ] **Task 5.6:** Tailscale mTLS gate in `mcp-query` tested in CI when Tailscale runner is available.
- [ ] **Task 5.7:** Memory leak gate — 100-concurrent-client Bifrost stress test (RSS < 256 MB) in `packages/benchmark/`.

---

## PHASE 5 — Live Status & Resume Anchors

_Appended at sovereign request from Codex resume `019f67cc-8333-7041-b079-1fd1e6faaaaa`.
Purpose: hand a clear handoff to the next Codex resume without re-deriving the analysis._

### Status Table

| Task | Marker | Sovereign-supplied precondition | Code state |
| --- | --- | --- | --- |
| **5.1** | ⏳ | Live Postgres on `localhost:5432` + `DATABASE_URL` written to `packages/db/.env` | Schema + `migrations/0_init/migration.sql` + scripts all on disk |
| **5.2** | ⏳ | 5.1 applied (`_prisma_migrations` row present) | JSON locked (Track B): commit `5f25eb2…` (Vault_Ω ledger row + sovereign receipt) + commit `5fe0b77c…` (Raven_Ω + Echo_Ω extension; `[Illustrative Pending Actuals]` labels per 5.2-B Option A). Zod dry-run exits 0 against the extended fixture; live apply remains sovereign-side per "Task 5.1 — Prereqs & Command Sequence"; post-apply snapshot will land at `docs/receipts/2026-07-vault-transfer-rec-01-post-apply.md` once `[seed-baseline] applied.` exits 0. |
| **5.3** | ⬜ | — | Spec scaffold pending in `apps/pwa/e2e/` |
| **5.4** | ✅ | — | Commit `test(cms): AaliyahComposer draft→publish round-trip integration test` |
| **5.5** | ✅ | — | Commit `feat(ops): live-smtp-relay-probe.mjs` |
| **5.6** | 🟢 | Tailscale auth key (`tskey-auth-...`) — **RULING: Path B** (Tailscale `serve` gate); ruling recorded in "Sovereign Ruling" subsection below; commit author = CODEOWNERS-maintainer; **5.6-C LIVE**: 3 of 5 sub-criteria closed via commits `41e7cd9` (tailscale-serve.sh) + `29017d8` (kba-smoke.yml runner binary) + sovereign-side live run on Cybertronia; sub-criteria #2 (tskey env-only, by-design uncommitted) + #5 (second-device integration test) remain sovereign-side | `mcp-query` is plain HTTP; only app-layer Tailscale host allowlist exists; mTLS gate deferred to Tailscale daemon; **Path B ACTIVE on Cybertronia**: `cybertronia.tailcd0c29.ts.net:443` → `http://localhost:7800` |
| **5.7** | ⬜ | — | Skeleton in `packages/benchmark/` |

### Receipt scope note

Receipt `2026-07-vault-transfer-rec-01` covers Vault_Ω + Raven_Ω + Echo_Ω under the **original** `signedAt: 2026-07-16T00:01:38Z` via a SCOPE BROADENING at commit [`0ea19d93…`](https://github.com/Cyberdad247/Kickbox-audio/commit/0ea19d93160e468c3dc36adce07e9ee99963fecb) — disclosed in that commit's body verbatim. NOT a fresh re-signing. See the receipt's `approvalScope` field for the broadened scope text.

### Task 5.1 — Prereqs & Command Sequence

1. Container: `docker run -d --name sovereign-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16-alpine`
2. Confirm `packages/db/.env` contains
   `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sovereign?schema=public&connection_limit=5"`
3. Apply: `npm run db:migrate:dev` (delegates to `prisma migrate dev --schema=schema.prisma` in `@sovereign/db`)
4. Round-trip verify: modern libpq's URL parser rejects
   `postgresql://...?schema=public` (and similar Prisma-style query params like
   `connection_limit`) with `invalid URI query parameter: schema`. The URL form
   still works for Prisma + Node clients, but **not** for `psql` on this host;
   use the **flags form**:

   ```bash
   PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d sovereign -c '\dt'
   ```

   should list **11 tables** — the 9 Prisma models (`JournalEntry`,
   `Transaction`, `Contact`, `Tag`, `EmailSequence`, `SequenceStep`,
   `MessageThread`, `Message`, `EchoLog`), plus Prisma's implicit
   `_ContactTags` M2M join table, plus the `_prisma_migrations` bookkeeping
   table. Then:

   ```bash
   PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d sovereign \
     -c 'SELECT id, migration_name FROM "_prisma_migrations" LIMIT 1;'
   ```

   should return one row.
5. Only then proceed to 5.2

### Task 5.2 — Placeholder vs Production Split

- **Track A (close 5.2 fast):** Run `packages/db/src/seed.ts` as-is via `npm run db:seed`. Validates the seed
  pipeline + the ledgerValidator `client.$extends` extension (LE_01 throws on unbalanced batches).
  Output to look for: `Seed complete (placeholders).` — no sovereign financial approval required.
- **Track B (spec-faithful, future sprint):** Author a real baseline with the $14.2M Vault_Ω valuation,
  active shipping manifests, and streaming node groups called for in Task 1.4. **Never auto-generate
  financial figures** — every input dollar must be sourced and approved by the sovereign before a row is
  written. `ledgerValidator` will reject imbalanced `Transaction` batches at write time.

  **Scaffold is in place** (added in the 5.2-B authoring pass):

  - `packages/db/src/baselineFixture.ts` — Zod schemas (`BaselineFixtureSpec` /
    `JournalEntrySpec` / `TransactionLineSpec` / `ShippingManifestSpec` /
    `StreamingNodeSpec`) and `deriveFixtureId(approvalRef, key)` for stable UUIDs.
  - `packages/db/src/seed-baseline.ts` — gated seed entrypoint. Refuses to run
    without `SOVEREIGN_BASELINE_APPROVED=<receipt-id>` pointing to
    `docs/receipts/<receipt-id>.json` whose `signerEmail` is a `.github/CODEOWNERS`
    maintainer, and a fixture passing Zod (no `TODO_REPLACE_ME` sentinels, balanced
    journal entries, Σ-debit equals `valuationTotalUSD`, every approvalRef
    matches `sovereignApprovalRef`).
  - `packages/db/fixtures/baseline.example.json` — inert scaffold; Zod rejects
    it on its own (zero valuation + sentinel present) so the example can be
    safely committed.
  - `packages/db/src/seed-baseline.test.ts` — vitest unit suite proving the
    gate: balanced fixture passes, unbalanced line / Σ-mismatch / mismatched
    approvalRefs / sentinel leakage all reject with `LE_01_UNBALANCED` or
    matching error strings. No Prisma connection required.
  - npm scripts: `db:seed:baseline` (root) → `seed:baseline` (`@sovereign/db`)
    runs `tsx src/seed-baseline.ts`. Optional `SOVEREIGN_BASELINE_DRY_RUN=1`
    prints planned writes without committing.

  **5.2-B complete when:**
  - The sovereign commits a fixture file at `packages/db/fixtures/baseline.<run-name>.json`
    with every field filled and no sentinels.
  - The sovereign commits `docs/receipts/<receipt-id>.json` with a CODEOWNERS
    signer email and an `approvalScope` matching the fixture's content.
  - `SOVEREIGN_BASELINE_DRY_RUN=1 npm run db:seed:baseline` (with the receipt
    env) prints the planned writes — sovereign confirms the diff.
  - `SOVEREIGN_BASELINE_APPROVED=<receipt-id> npm run db:seed:baseline` runs to
    `[seed-baseline] applied.` exit 0.
  - `git log -1 --format='%ae' <apply-commit>` returns an email listed in
    `.github/CODEOWNERS` (matches the same sovereignty check already used in
    5.6-C, so we reuse the convention rather than invent a new one).

### Task 5.6 — Three-Path Decision Matrix

**Current code reality** (`docs/blueprint.md` line 8, sovereign-confirmed):
*"Evidence boundary: current confirmed Bifrost controls are HMAC webhook validation,
Tailscale remote MCP guard, local-first `//REZERO`, and worker-thread microcubes.
mTLS remains planned until implemented in code."*

Concretely:

- `apps/mcp-query/src/server.ts` line 4 — `http.createServer` (plain HTTP, not HTTPS)
- `apps/mcp-query/src/server.ts` line 109 — `server.listen(PORT, '0.0.0.0', ...)` (raw TCP)
- `apps/mcp-query/src/query.ts` lines 17–25 — `isTrustedHost()` allowlists loopback, `*.ts.net`,
  and `100.64/10` CGNAT (host-allowlist **at the fetch call-site**, not transport)
- `apps/bifrost/src/mcp.ts` lines 19–34 — same shape, `assertTailscaleEndpoint` for outbound dial
- `core/knights/*.jsonld` — each Knight lists `tunnel: "planned_mTLS_Tunnel_0xNNN"` (15 stubs, 0 implemented)
- No `TAILSCALE_CERT` / `MCPSERVER_CERT` / `MCPSERVER_KEY` env exists anywhere
- UI label `MUTUAL_mTLS_LOCKED` in `KnightSwarmCommand.tsx` line 218 is display-only

**Sovereign choice required before any `//FORGE`.**

| Path | Mechanism | Files touched | Tailscale auth key? | Effort |
| --- | --- | --- | --- | --- |
| **A. Real mTLS in app** | Mutual-TLS `node:https` server with env-loaded cert paths (`MCPSERVER_CERT`/`MCPSERVER_KEY`/`MCPSERVER_CA`); `node:crypto` self-signed pair for tests | `apps/mcp-query/src/server.ts`, new `apps/mcp-query/src/tls.ts`, server.test.ts mTLS suite | Optional — cert itself is the gate | Medium (~2 h + tests) |
| **B. Tailscale `serve` as gate** | Keep `mcp-query` plain HTTP; gate via `tailscale serve` (tailnet-private HTTPS, auto-issued cert, Tailscale ACL on source) | `apps/mcp-query` unchanged; new `scripts/ops/tailscale-serve.sh`; `.github/workflows/kba-smoke.yml` runner needs `tailscale` binary | **Required** — `tskey-auth-...`, plus reusable runner auth | Small (~30 min + CI yml) |
| **C. Defer & document** | Update `task.md` (this block) and `docs/blueprint.md`; keep current app-layer host guard; defer real mTLS to Phase 4 Edge Ignition | Doc-only | Not required | Trivial |

**Path B′ (Funnel variant, separate ruling):** `tailscale funnel` exposes the same `mcp-query` server
publicly on a stable `*.ts.net` URL — higher blast radius, separate sovereign ruling. Existing pattern
documented at `scripts/laptop-server/README.md` lines 134–135; any Funnel commit must additionally
satisfy the 5.6-C round-trip criterion below.

**Per-path risks** (so the next agent is not steered by Effort alone):

- **A.** Ongoing cert rotation ops debt; revocation requires CA plumbing. A mis-issued cert blocks every client until renewal.
- **B.** Tight coupling to the Tailscale daemon — one bad upgrade and the gate evaporates. Portability cost if
  the sovereign ever shifts off Tailscale.
- **C.** Sovereign Conformance review may flag deferred-mTLS as unresolved gate-debt; surfaces on every
  production-readiness review until resolved.

**Default recommendation:** Path B — matches the existing `scripts/laptop-server/README.md` *serve* /
*Funnel* pattern already in the repo, costs zero on cert ops, and aligns with how Bifrost already binds
`0.0.0.0` expecting Tailscale to gate traffic. The `serve` variant is the safer default (tailnet-private).
Sovereign ruling governs any move to public Funnel.

### Task 5.6 — Sovereign Ruling (Path B — Tailscale `serve`)

**Ruling date:** 2026-07-16 (sovereign in-session)
**Ruling path:** **Path B** (Tailscale `serve` as gate)
**Ruling commit:** this commit (run `git log --grep='Path B' -1 --format='%H'` to retrieve)

**Sovereign decision verbatim:**
> "Path B for Task 5.6: Tailscale serve gate on mcp-query. Author task.md decision + CODEOWNERS-signed commit."

**Path B per the matrix above (restated for implementation):**
- `apps/mcp-query` stays plain HTTP (no app source change required)
- Tailnet-private HTTPS front door provided by `tailscale serve` (auto-issued cert, no cert ops)
- Tailscale ACL controls source-IP allowlist at transport layer
- App-layer `isTrustedHost()` host check (defense-in-depth) remains in `apps/mcp-query/src/query.ts`
- New files required: `scripts/ops/tailscale-serve.sh` + `.github/workflows/kba-smoke.yml` runner `tailscale` binary
- No Tailscale auth key (`tskey-auth-...`) committed to repo (sovereign-side only)

**Path B′ (Funnel variant) is DEFERRED** to a separate sovereign ruling — same commit must additionally satisfy the 5.6-C implementation criterion.

**Why Path B (over A and C):**
- **A (real mTLS in app):** rejected — cert rotation ops debt; revocation requires CA plumbing; mis-issued cert blocks every client until renewal
- **C (defer & document):** rejected — Sovereign Conformance review flags deferred-mTLS as unresolved gate-debt; surfaces on every production-readiness review
- **B (Tailscale `serve`):** selected — zero cert ops, matches existing `scripts/laptop-server/README.md` *serve* / *Funnel* pattern, aligns with how Bifrost already binds `0.0.0.0` expecting Tailscale to gate traffic

**5.6-B (ruling) complete when (per Honest Non-Fabrication Note below):**
- ✅ `docs/task.md` carries explicit "Sovereign Ruling" subsection selecting Path B (this commit)
- ✅ Commit author email matches `.github/CODEOWNERS` (`@Cyberdad247` substring → `Cyberdad247@gmail.com`)
- ✅ `git log -1 --format='%ae' <this-sha>` returns CODEOWNERS-maintainer email
- 🟡 `docs/blueprint.md` line 8 evidence-boundary update — surfaced as separate follow-up (not in this commit per sovereign's single-file ruling)

**5.6-C (implementation) status — 2026-07-16 sovereign-side live run on Cybertronia:**

| # | Sub-criterion | Status | Evidence |
|---|---|---|---|
| 1 | `scripts/ops/tailscale-serve.sh` authored | ✅ CLOSED | commit `41e7cd9` (feat(ops): tailscale-serve.sh — 5.6-C Path B implementation start) |
| 2 | sovereign-side Tailscale auth key (`tskey-auth-...`) | 🟡 SOVEREIGN ENV | Tailscale daemon already authenticated on Cybertronia; tskey not needed this run (script preflight handles both states); by-design NOT committed to repo |
| 3 | `.github/workflows/kba-smoke.yml` runner `tailscale` binary on `$PATH` | ✅ CLOSED | commit `29017d8` (ci(kba-smoke): install tailscale CLI on runner — 5.6-C sub-criterion #3) |
| 4 | `tailscale serve status` JSON shows `*.ts.net` host with non-empty cert | ✅ CLOSED | live run on Cybertronia: CertDomain=`cybertronia.tailcd0c29.ts.net`; status JSON shape `{"TCP":{"443":{"HTTPS":true}},"Web":{"cybertronia.tailcd0c29.ts.net:443":{"Handlers":{"/":{"Proxy":"http://localhost:7800"}}}}}`; HTTPS probe `curl -sIL https://cybertronia.tailcd0c29.ts.net/tools/list` returns `HTTP/2 405` (expected — JSON-RPC requires POST); JSON-RPC POST `/` returns valid `{"jsonrpc":"2.0","id":1,"result":{"tools":[...]}}`; local `curl http://localhost:7800/health` returns `{"status":"ok","multivoice":"off","ollama":"off"}` |
| 5 | Live integration test from a second tailnet device via `*.ts.net` URL | 🟡 SOVEREIGN | Sovereign-side command (from any second device on the tailnet): `curl -sIL https://cybertronia.tailcd0c29.ts.net/health` and `curl -s -X POST -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' https://cybertronia.tailcd0c29.ts.net/` |

### Cross-Task Dependency

```
5.1 (sovereign: docker + DATABASE_URL) ──► 5.2-A (placeholder seed) ──► 5.2-B (sourced baseline)
5.6 (sovereign: tskey + A/B/C ruling) ──────────────────────────── independent of 5.1 / 5.2
```

5.1 and 5.6 have no code dependency; they may run in parallel. Only 5.2 is strictly downstream of 5.1.

### Honest Non-Fabrication Note (project Rule 6)

A Codex resume **must not** mark 5.1, 5.2, or 5.6 complete without round-tripping live evidence:

- **5.1 complete when:** `psql \dt` enumerates 11 tables (the 9 explicit Prisma
  model tables `JournalEntry` / `Transaction` / `Contact` / `Tag` /
  `EmailSequence` / `SequenceStep` / `MessageThread` / `Message` / `EchoLog`,
  Prisma's implicit `_ContactTags` M2M join table, and the `_prisma_migrations`
  bookkeeping table) AND
  `SELECT id, migration_name FROM "_prisma_migrations" LIMIT 1` returns one row
- **5.2-A complete when:** `npm run db:seed` prints `Seed complete (placeholders).` (entry delegates to
  `tsx src/seed.ts` per the `prisma.seed` directive in `packages/db/package.json`)
- **5.6-A complete when:** `apps/mcp-query/src/server.ts` imports `node:https` AND `server.test.ts`
  has a green mTLS test exercising self-signed client cert (good and bad paths)
- **5.6-B (ruling) complete when:** `docs/task.md` carries an explicit "Sovereign Ruling" subsection
  selecting Path A / B / B′ / C; commit author email matches `.github/CODEOWNERS` (round-trip via
  `git log -1 --format='%ae' <sha>`). **5.6-B (ruling) COMPLETE** at this commit on
  `feat/knight-console` (Path B selected per sovereign in-session ruling, commit author
  `Cyberdad247@gmail.com` matches `@Cyberdad247` CODEOWNERS substring).
- **5.6-C (implementation) complete when:** for the chosen path, the code artifacts exist on origin
  (e.g., `scripts/ops/tailscale-serve.sh` for Path B), `tailscale serve status` JSON shows the
  `*.ts.net` host with non-empty `CertFile` / `CertDomain`, AND the live integration test from a
  second tailnet device returns 200 on the gated endpoint. **5.6-C: 3 of 5 sub-criteria CLOSED**
  (commit `41e7cd9` + commit `29017d8` + live sovereign-side run on Cybertronia). Sub-criteria
  #2 (tskey env-only, by-design uncommitted) and #5 (sovereign-side second-device curl) remain.
  See the 5.6-C status table in "Task 5.6 — Sovereign Ruling" above for the full per-criterion
  evidence (CertDomain + status JSON shape + HTTPS probe output).

Pasted `[SYSTEM: TRANSCENDENCE COMPLETE]`-style output, fabricated commit SHAs, or claimed
`npm run build` success without a corresponding artifact on disk are **not** completion evidence.
