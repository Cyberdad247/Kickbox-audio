# ⚔️ TASK MATRIX: RAPID PRODUCTION MARCH
**Orchestration Path:** Local Local -> Automated Tests -> Vercel Production Build

## PHASE 1: MONOREPO SETUP & SCHEMAS
- [ ] **Task 1.1:** Scaffold workspace directory structure and initialize root-level `package.json` workspaces [H1].
- [ ] **Task 1.2:** Initialize Prisma ORM in `packages/db`. Write out the unified `schema.prisma` mapping Vault_Ω, Raven_Ω, and Echo_Ω.
- [ ] **Task 1.3:** Setup local PostgreSQL environment variables. Run initial migration to instantiate database indexes.
- [ ] **Task 1.4:** Seed database profiles with initial baseline valuations ($14.2M), active shipping manifests, and streaming node groups.

## PHASE 2: BIFROST GATEWAY DEVELOPMENT
- [ ] **Task 2.1:** Implement the Express & WebSocket server (`apps/bifrost/src/server.ts`) in TypeScript.
- [ ] **Task 2.2:** Build a WS connection reaper loop (disconnect dead client sockets after 30 seconds of failed heartbeats).
- [ ] **Task 2.3:** Write the Natural Language command parser inside the socket handler to parse keyword sequences (e.g. `add transaction`, `remind Andre`, `order espresso`).
- [ ] **Task 2.4:** Build Express API endpoints to accept incoming SMS hooks from your raw wholesale telecom trunk (e.g. Telnyx or Bandwidth) [H2].

## PHASE 3: PWA DASHBOARD INTEGRATION
- [ ] **Task 3.1:** Create a clean Next.js 14 template inside `apps/pwa` using Tailwind CSS.
- [ ] **Task 3.2:** Write `/src/context/BifrostContext.tsx` to handle WebSocket state synchronization.
- [ ] **Task 3.3:** Code the main layout (`/src/app/page.tsx`) mapping the Sovereign Aura style tokens. Integrated tabs must swap between Overview, Properties, Streaming, and Venture dashboards.
- [ ] **Task 3.4:** Build the persistent "Lakisha HUD" bottom control bar. Wire the input fields directly to the `sendVoiceCommand` context method.

## PHASE 4: CI/CD & VERCEL EDGE DEPLOYMENT
- [ ] **Task 4.1:** Write the `vercel.json` routing configuration in the workspace root [H3].
- [ ] **Task 4.2:** Setup a GitHub repository at `Cyberdad247/Kickbox-audio` and configure Vercel to auto-import the PWA workspace.
- [ ] **Task 4.3:** Build a GitHub Actions CI pipeline (`.github/workflows/deploy.yml`) to automatically test and verify pull requests before allowing merge to `main`.
