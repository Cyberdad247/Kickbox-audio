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
