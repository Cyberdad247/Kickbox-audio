# Production-Grade Enterprise Promotion Checklist
## Branch: `feat/kba-cartridge-v1000`  •  Repo: `Cyberdad247/Kickbox-audio`

This checklist inherits from `AGENTS.md` (root) and `audit-kickbox-audio/AGENTS.md`
(sub-repo). Promote the KBA Cartridge branch through these gates in order:
**Pre-Deploy → Deploy → Post-Deploy → HITL & Authority → Reproducibility →
Observability → Incident Response → Cross-cutting**.

---

## Pre-Deploy (must pass all)

- [x] `npm --prefix apps/bifrost run typecheck` — clean
- [x] `npm --prefix apps/pwa run typecheck` — clean
- [x] `vitest run` 4 files — **35/35** (security 19 + issuance 4 + nlp 8 + state 4)
- [x] `HELIO_DRY_RUN=1 node scripts/regen-helio-patch.mjs` — design=PASS security=PASS performance=PASS, **no file mutation** (`git diff --stat HELIO_PATCH.json` empty)
- [x] PR #21 OPEN, head `4060612`, **not** draft
- [x] `.github/CODEOWNERS` — pins KBA surface to `@Cyberdad247` + `@sovereign/kba-authority`
- [x] `.github/workflows/kba-smoke.yml` — exercises HMAC handshake end-to-end on every push to `feat/**`
- [x] **Secrets hygiene** — `node scripts/ops/secrets-audit.mjs` returns RC=0, zero hits in tracked source
- [ ] **`scripts/ops/apply-branch-protection.sh feat/kba-cartridge-v1000`** applied — requires `hitl-handshake` CI check + 1 CODEOWNERS approval + linear history + no force-push
- [ ] **KBA Smoke workflow green** — currently 3 recent runs all `conclusion: failure` (RUN 28297865280, 28298083572, 28298084341). Run is the gate. Diagnose + fix in the next sprint (see Followups).

## Deploy

- [ ] Promote gate: Vercel Preview shows SUCCESS for the head SHA (✅ today)
- [ ] Provision secrets via `camelot keys set` (NOT in any tracked `.env`)
- [ ] Bifrost binds `0.0.0.0:3017`; helmet headers set upstream (CDN / load balancer)
- [ ] `apps/pwa` production build (`next build` → `.next/`) deployed to CDN
- [ ] Database (`@sovereign/db` workspace) migrated via `prisma migrate deploy`- [ ] WebSocket load balancer configured for long-lived `?upgrade=ws` connections
- [ ] Vercel Preview URL captured at PR open time becomes the production smoke target. Re-run `node scripts/ops/fixture-hitl.mjs HOST=$VercelHost PORT=443` post-deploy to confirm `/api/bifrost/hitl` handshake under TLS.
- [ ] `apps/bifrost/package.json` exact-version pin (no `^`/`~`) on @prisma/client, express, express-rate-limit, ws, zod — reproducible build, no surprise minor updates.

## Post-Deploy
- [ ] **T+0** Externally reachable `/health` returns `200 { status: "ok", clients: N }`
- [ ] **T+10m** WS state stream joins; one `KBA_SYNC_001` verb exercised end-to-end
- [ ] **T+15m** Vercel Preview URL smoke: `curl -sf $URL/health` returns 200; same URL `/api/bifrost/hitl` issues PASS for KBA_SYNC_001 with the canonical HMAC envelope.
- [ ] **T+30m** DefenseGrid observation invokes `KBA_AUDIT_VLT_002`; state.ts `kbaActionsByDomain.audit` increments
- [ ] **T+24h** No `SignatureError` in bifrost logs; rate-limit triggers ≤ SLO; no 5xx > 0.1%

## HITL & Authority

- [x] HMAC envelope (`apps/bifrost/src/security.ts verifyActionSignature`) symmetric with `apps/bifrost/src/issuance.ts issueSignedAction`
- [x] `/api/bifrost/issue` rate-limited to **30/min** (`issueLimiter`)
- [x] `/api/bifrost/hitl` rate-limited to **60/min** (`hitlLimiter`)
- [x] Freshness: past 60 s default; future 30 s default; 1 s hard-expiry grace (`assertFresh({ timestamp, expiresAt }, opts)`)
- [x] CODEOWNERS review required by branch protection (once applied)
- [ ] Support mutation gate token per `docs/blueprint.md` — BifrostSpeak / XSForge must prove token before router mutation
- [ ] Knight hot-swap verified per `AGENTS.md` runic commands (`//EXECUTE_BUILD`, `//TDD_AUDIT`, `//REZERO_CODE`)

## Reproducibility

- [x] `package-lock.json` present at repo root + per app
- [x] `.env.example` placeholders only (`apps/bifrost/.env.example`, `apps/pwa/.env.example`, `packages/db/.env.example`)
- [x] Deterministic vitest (35 cases, 636 ms, 0 flakes on Windows + Linux)
- [x] Smoke fixture — `scripts/ops/fixture-hitl.mjs` exercises all 8 KBA verbs
- [x] Regen gate — `scripts/regen-helio-patch.mjs` (writes gated via `HELIO_DRY_RUN=1`)
- [ ] `npm ci` succeeds from cold clone — verified in CI

## Observability

- [ ] `/health` endpoint — returns `{ status: "ok", clients: N }` (`apps/bifrost/src/server.ts`)
- [ ] WS broadcast on state mutation (state.ts → `broadcastState()` → `wss` clients)
- [ ] Prometheus scrape endpoint — parent OS has `/observability/prometheus.yml`; bifrost export is on TODO
- [ ] Alert: error rate spike > 5% over 5 min (`/observability/alert_rules.yml`)
- [ ] Cluster health check: `/cluster_health_check.sh`
- [ ] Colony report: regenerate on push; gate on Risk Score < 30 for promotion
- [ ] Dashboards: `/dashboards/phase_h_live_dashboard.py`, `/dashboards/phase_h_learning_dashboard.py`

## Incident Response

- [ ] **Kill-switch**: `pkill -f tsx.*server.ts` clean-shuts Bifrost; WS clients see `CLOSE 1001`
- [ ] **Rollback**: `git revert <merge_sha> --no-edit` on `feat/pwa-lakisha-audit-applied`; force-push admin-gated
- [ ] **HITL receipts**: every accepted `hitl action` logs `{ actionId, timestamp, signature, status }` to stdout + ledger
- [ ] **Comms channel**: TODO — wire `on-call ping` to MeshCord
- [ ] **Bifrost integration**: per `BIFROST_INTEGRATION_GUIDE.md` (Sindr, Star, Lakeisha)
- [ ] **Voice-avatar recovery**: `live-anya-probe.mjs` reports avatar reachable; `python -m http.server` in `02_FORGE/PORTAL_CORE/Anya_Dashboard/dist` restarted if down

## Cross-Cutting

- [ ] **Knights**: Sir_Codex, Sir_Lakeisha, Sir_Sindr, Sir_Helio all observable in `agents/knights/`
- [ ] **Vox / Anya_Dashboard**: static server reachable; utterance loop DEFERRED to smoke environment
- [ ] **Northstar**: `ACT.md` Phase 1 + Phase 2 signoffs reflected in PR #21 evidence
- [ ] **Universal Bootstrap Adapter**: `UNIVERSAL_BOOTSTRAP_UKG_NANO.md` + `.agent/` backplane active on fresh clone
- [ ] **Bifrost bootstrap**: `boot_results.json` shows `TitanOmega` (tier=alpha_omega mode=production) with Omega-Graph ≥ 4 nodes + Omega-Vault ≥ 3 embeddings + MCP_ADAPTER registry ≥ 2 adapters

## Deferred / Not on this Checklist

- [ ] Penetration test report on HMAC envelope (separate audit cycle)
- [ ] Load test on `/api/bifrost/hitl` ≥ 60 req/min sustained (separate cycle)
- [ ] Multi-region failover for Bifrost (single-host production for now)
- [ ] OpenTelemetry / tracing migration (observes via stdout today)
- [ ] MeshCord on-call integration (P1 backlog)

## Promotion Sign-off

When ALL boxes above are checked, run:

```bash
gh pr view 21 --json state,headRefName,url       # confirm OPEN, head 4060612
node scripts/ops/secrets-audit.mjs                  # expect RC=0
ls scripts/ops/protect-branch.json                  # existence OK
scripts/ops/apply-branch-protection.sh feat/kba-cartridge-v1000   # POST successful
```

Capture this verification as a `## Promotion Receipt` section in the
release notes for the merged `feat/pwa-lakisha-audit-applied` PR.
