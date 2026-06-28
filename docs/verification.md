# 🛡️ VERIFICATION: THE IRON GATE TEST PROTOCOLS

## 1. COMPUTATIONAL SUSTAINABILITY AUDITS
To remain within the strict boundaries of local edge computing and reduce carbon and server costs, every build must pass these local verification limits:

- **Memory Leak Sweep:** Simulate 100 concurrent mock clients spawning and disconnecting from the Bifrost WebSocket server. The Node.js server memory footprint (Resident Set Size) must remain below **256MB** [2].
- **Edge Cold-Start Verification:** Run production builds for `apps/pwa`. The unzipped JavaScript bundle size for any active route must stay below **150KB** to guarantee cold starts of less than **120ms** on Vercel Edge.
- **Database Connection Conservation:** Verify that the connection limit parameter in the Prisma DB string is set to `connection_limit=5` to prevent CPU throttling on resource-constrained servers.

## 2. AUTOMATED FUNCTIONAL TESTS (Jest & Playwright)
Run the following test execution scripts inside the CI/CD pipeline on every commit:

### A. Double-Entry Balance Check (`npm run test:vault`)
- **Test:** Attempt to write an unbalanced debit/credit log into the ledger.
- **Assertion:** The Prisma database middleware must reject the operation and throw a `LE_01_UNBALANCED` validation error.

### B. Live WebSocket Synchronization (`npm run test:bifrost`)
- **Test:** Connect a mock WS client to `apps/bifrost`.
- **Assertion:** The server must instantly transmit a payload of type `STATE_UPDATE` containing valid JSON representations of the unified business metrics.

### C. UI Thread & View Swap (`npm run test:e2e`)
- **Test:** Execute Playwright to load the page and click the "Properties" tab.
- **Assertion:** The DOM must update to render the tenant cards and maintenance items without issuing a full page refresh.
- **Status:** ✅ WIRED — Playwright harness in place. Config at `apps/pwa/playwright.config.ts` (builds + serves on port 3100); spec at `apps/pwa/e2e/tab-swap.spec.ts`; run via `npm run test:e2e --workspace=pwa`. The spec stamps a `window.__noReload` sentinel, clicks the "Properties" nav button, asserts the "Obsidian Tower · Unit 12" tenant card renders, and verifies the sentinel + URL are unchanged — proving the `useState`-driven swap in `Dashboard.tsx` does not trigger a full page refresh.

### D. Voice Action Execution (`npm run test:voice`)
- **Test:** Emit a JSON payload resembling `{ type: "VOICE_COMMAND", payload: "add transaction 15000" }` via a test client.
- **Assertion:** Verify that the global portfolio valuation state changes from `$14.2M` to `$14,215,000` inside the next broadcast frame.
