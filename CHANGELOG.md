# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.5] - 2026-06-28

The v1.4.5 per-run observability closure. Closes the v1.4.5
follow-up from the v1.4.4 ship ("the burst-test cron catches a
regression, but a per-run history is needed to detect SLOW drift
in the rate-limit's accuracy over weeks/months"). The burst-test
workflow now appends a row to a markdown log on every successful
run; the log is human-readable + greppable for trend analysis.

### Added

- **`docs/VERIFICATION_LOG.md`** (NEW) - the per-run table. 8 columns:
  date, commit, tests passed, 429 count, fallback warnings, HMAC
  errors, Sentry 503s, runner-min. First row is a placeholder; the
  first successful `burst-test` run populates it. The file has a
  schema section documenting each column's source (GitHub Actions
  output names + Vercel log grep patterns) so the next maintainer
  can extend it.

- **`.github/workflows/burst-log.yml`** (NEW) - the log-appender
  workflow. `on: workflow_dispatch` only (not schedule, not push).
  Triggered by the `burst-test` workflow's post-step via
  `gh workflow run burst-log.yml -f tests_passed=... -f runner_min=...
  -f trigger_sha=...`. Steps: (1) compute date + commit_short from
  the trigger inputs, (2) install `vercel@latest` CLI (skipped if
  VERCEL_TOKEN is unset), (3) scan the last 1h of prod logs for the
  3 failure signatures (`Upstash unreachable`, `RATE_LIMIT_HMAC`,
  `TELEMETRY_UNAVAILABLE`) - mark TBD if VERCEL_TOKEN is unset,
  (4) append the row to `docs/VERIFICATION_LOG.md` via the GitHub
  API (`gh api PUT` with `contents: write` permission, 2-step
  fetch-current + PUT-updated pattern). 3-min timeout, ubuntu-latest,
  `contents: write` permission, concurrency group = workflow name
  (serializes 2 racing log-appends).

- **`.github/workflows/burst-test.yml`** - added 2 post-steps to
  the v1.4.4 workflow (both on `if: success()`):
    1. **Extract test summary** - parses the "N passed (Xs)" line
       from the Playwright `--reporter=list` output (via `tee` to
       `/tmp/playwright-test-output.log`).
    2. **Trigger burst-log appender** - calls
       `gh workflow run burst-log.yml` with the 3 inputs
       (tests_passed, runner_min, trigger_sha). The `runner_min`
       is computed as `((github.run_duration_ms + 59999) / 60000)`
       to round up. `continue-on-error: true` so a log-append
       failure doesn't fail the test (the test already passed;
       the log is a side effect).

- **`.github/CODEOWNERS`** - added
  `/.github/workflows/burst-log.yml @Cyberdad247 @sovereign/kba-authority`
  and `/docs/VERIFICATION_LOG.md @Cyberdad247 @sovereign/kba-authority`
  for symmetry with the existing kba-smoke.yml + burst-test.yml
  entries.

- **`docs/PRODUCTION_RUNBOOK.md` section 6.8** - new "Per-run
  observability (v1.4.5)" sub-bullet: the VERIFICATION_LOG.md
  file path, the burst-log.yml workflow, the 8 columns, the
  VERCEL_TOKEN handoff (free Vercel account token at
  vercel.com/account/tokens), and a worked example of a row
  (showing what a healthy row looks like: all 0s, 1 runner-min,
  3 × 429).

### Migration notes

- **No breaking change.** The burst-test workflow's test contract
  is unchanged; the 2 new post-steps are `if: success()` and the
  burst-log trigger is `continue-on-error: true`. A log-append
  failure cannot fail the test.
- **Operator action required (one-time per repo):**
  1. Add `VERCEL_TOKEN` to repo secrets (Settings -> Secrets and
     variables -> Actions). Mint at
     https://vercel.com/account/tokens (free Vercel account, scope
     = the `pwa` project). Without this token, the 3 Vercel-logs
     columns are `TBD`; everything else still works.
  2. (Optional) Run the burst-test workflow once via
     `workflow_dispatch` to populate the first row. The next
     03:00 UTC nightly cron will do the same.
  3. (Optional) Run `gh workflow run burst-test.yml` manually
     after the above to verify the chained trigger fires.
- **Drift detection pattern**: `gh api repos/.../contents/docs/VERIFICATION_LOG.md`
  + a simple awk/perl filter can be wrapped in a weekly cron to
  alert on `fallback_warnings > 0` (Upstash degradation) or
  `Sentry_503s > 0` (Sentry drift). The CHANGELOG section above
  has the column sources.
- **Cost**: 3 min of ubuntu-latest per successful burst-test run
  (the burst-log workflow is short-lived; the burst-test itself
  is ~2 min). With the nightly cron, that's ~9 runner-min/day =
  ~270 runner-min/month (public repo: free; private repo: 13.5%
  of the 2000-min/mo free tier).

## [1.4.4] - 2026-06-28

The v1.4.4 scheduled burst regression. Closes the standing v1.4.2
follow-up ("wire the burst test into a scheduled job so the
rate-limit is regression-tested on every prod-like deploy"). Nightly
GitHub Actions cron at 03:00 UTC + manual `workflow_dispatch` for
ad-hoc preview runs. All additive - no production code touched.

### Added

- **`.github/workflows/burst-test.yml`** (NEW) - nightly cron + manual
  trigger. Runs `npm run test:e2e:burst --workspace=apps/pwa` against
  the live prod URL with the `E2E_BASE_URL` + `E2E_ADMIN_TOKEN` repo
  secrets. 5-min timeout; `ubuntu-latest`; Node 22 (matches `ci.yml`
  + `kba-smoke.yml` + the `engines` field in `package.json`). Steps:
  checkout -> setup-node (with npm cache) -> `npm ci --no-audit
  --no-fund` -> `npx playwright install --with-deps chromium` -> run
  burst with `--reporter=list,html` -> on failure, upload the
  Playwright HTML report as a 7-day artifact so the operator can see
  the 61 response statuses + the unique IP + the failure timeline
  without re-running. Concurrency group is the workflow name with
  `cancel-in-progress: false` (don't kill a slow run on overlap).
  Permissions scoped to `contents: read` (matches `kba-smoke.yml`
  posture). The test self-skips if either env var is unset (no false
  negatives on a misconfigured repo; same `test.skip` gate the spec
  itself uses).

- **`.github/CODEOWNERS`** - added `/.github/workflows/burst-test.yml
  @Cyberdad247 @sovereign/kba-authority` for symmetry with the
  existing `kba-smoke.yml` ownership entry. The default `*` ownership
  already covered it; the explicit entry is for reviewer-routing
  parity.

- **`docs/PRODUCTION_RUNBOOK.md` section 6.8** - new "Scheduled
  burst regression (v1.4.4)" sub-bullet: the workflow file path, the
  03:00 UTC cron schedule, the two required repo secrets
  (`E2E_BASE_URL` + `E2E_ADMIN_TOKEN`), how to manually trigger via
  `workflow_dispatch` (with optional `base_url` input for preview
  runs), the failure-mode playbook (download the HTML report
  artifact, inspect the 61 response statuses, the Upstash-fallback
  probe error if applicable), and the rollout steps (add secrets ->
  push workflow -> first manual run -> schedule auto-fires).

### Migration notes

- **No breaking change.** The workflow only runs the test command
  that already exists in v1.4.1; the test itself self-skips without
  the env vars, the workflow does the same.
- **Operator action required (one-time per repo):**
  1. Open `github.com/Cyberdad247/Kickbox-audio/settings/secrets/actions`
  2. Add `E2E_BASE_URL` (e.g. `https://pwa-eight-gamma.vercel.app`)
  3. Add `E2E_ADMIN_TOKEN` (paste the value from
     `doppler secrets get --project kickbox-audio --config prd
     bifrost/admin-token --plain`)
  4. Push the v1.4.4 commit (the workflow file is dormant until
     secrets are set + schedule is triggered).
  5. Manual first run: Actions tab -> "Burst regression (v1.4.4)"
     -> Run workflow -> leave inputs blank (uses secrets). Confirm
     2/2 tests pass.
  6. The nightly cron auto-fires from the next 03:00 UTC.
- **Failure handling**: GitHub emails the maintainers on failure
  (per the repo's notification settings). The Playwright HTML report
  is attached as a 7-day artifact - download, expand, open
  `index.html` in a browser, inspect the 61 response statuses and
  the test timeline. If the failure is the v1.4.2 "Upstash NOT
  wired" probe, see PRODUCTION_RUNBOOK section 6.8 for the
  provisioning drill.
- **Cost**: ~2 min of ubuntu-latest runner minutes per day = 60
  runner-minutes/month (well within the free tier for public repos;
  private repos should bump to weekly to stay under the 2000-min/mo
  free tier).

## [1.4.3] - 2026-06-28

The v1.4.3 unlinkable IP hashing hardening. Closes the v1.4.0
code-reviewer B ⚠️ minor (plain `sha256(ip)` was rainbow-table-trivial
for the IPv4 space — anyone with the hash could brute-force the raw
IP in microseconds because the IPv4 space is only ~2^32). v1.4.3
switches to `HMAC-SHA256(ip, RATE_LIMIT_HMAC_SECRET)` so the hash is
unlinkable without the secret (same posture as the IdP private key in
§RBAC RS256).

### Changed

- **`apps/pwa/src/lib/rateLimit.ts`** — replaced
  `createHash('sha256').update(ip).digest('hex')` with
  `createHmac('sha256', secret).update(ip).digest('hex')` where the
  secret is read from `process.env.RATE_LIMIT_HMAC_SECRET` (cached
  on first call via a module-level `cachedHmacSecret` + `hmacSecretProbed`
  tri-state to avoid re-reading the env var on every request). Added a
  `getHmacSecret()` helper that throws a clear error (names the env
  var, the Doppler vault key, the Vercel scope, the provisioning drill
  reference, and the `openssl rand -hex 32` generation command) if the
  secret is unset. Fail-closed by design: the helper does NOT fall
  back to plain sha256 (loses unlinkability) or to a hardcoded dev
  secret (brute-forceable from the source). The 1-line top docstring
  was rewritten to document the v1.4.3 semantics + the fail-closed
  rationale.

- **`apps/pwa/src/lib/rateLimit.test.ts`** — added a new in-memory
  test: `throws if RATE_LIMIT_HMAC_SECRET is unset (fail-closed,
  v1.4.3)`. Asserts both `__test.getHmacSecret()` throws
  (`/RATE_LIMIT_HMAC_SECRET/`) AND `checkRateLimit(ip)` rejects
  (caller-facing behavior). The in-memory `beforeEach` now sets
  `RATE_LIMIT_HMAC_SECRET = 'test-hmac-secret-do-not-use-in-prod-...'`
  so the other 9 in-memory cases work unchanged. The hash-shape
  assertion (`/^[a-f0-9]{64}$/`) still holds because HMAC-SHA256 hex
  is also 64 chars; the determinism test still holds because HMAC
  with the same key is deterministic.

- **`apps/pwa/src/lib/rateLimit.test.ts`** — top docstring updated
  to mention the v1.4.3 HMAC change + the new "throws if unset" test.

- **`.env.example`** — new "Rate-limit HMAC secret (v1.4.3, unlinkable
  IP hashing)" block documenting `RATE_LIMIT_HMAC_SECRET`, the
  Doppler vault key (`pwa/rate-limit-hmac-secret`), the generation
  command (`openssl rand -hex 32`), the fail-closed behavior, and
  the rotation cadence (180 days, or on suspected compromise — note
  that rotation invalidates all existing rate-limit counters since
  the HMAC output IS the Redis key).

- **`docs/THREAT_MODEL.md` §4 A2** — DoS row mitigation cell updated
  from "IP is `sha256`-hashed before storage" to "IP is
  `HMAC-SHA256`-hashed with a vault-stored key
  (`RATE_LIMIT_HMAC_SECRET`) before storage — unlinkable, not just
  string-scrubbed (v1.4.3)".

- **`docs/THREAT_MODEL.md` §5 item 7** — added a `v1.4.3 (DONE,
  2026-06-28)` sub-bullet to the existing v1.4.0 row documenting
  the HMAC switch, the fail-closed behavior, the new env var, the
  new test, and the closed code-reviewer B ⚠️ minor.

- **`docs/PRODUCTION_RUNBOOK.md` §6.8** — new "HMAC secret (v1.4.3,
  unlinkable IP hashing)" sub-bullet with the full provisioning drill
  (generate + Doppler + Vercel + verify), the rotation cadence (180
  days), the rotation impact note (invalidates all existing
  rate-limit counters), and the tier-1 secret posture (same as the
  RS256 private key in §6.2).

### Migration notes

- **Breaking change for deployments that haven't set
  `RATE_LIMIT_HMAC_SECRET` yet.** The route's `checkRateLimit(ip)` call
  will THROW if the env var is unset, and the route returns 500 (no
  graceful degradation). This is deliberate — the v1.4.0 code-reviewer
  flagged plain sha256 as insufficient, and the only safe upgrade path
  is to require the HMAC key in all environments. The error message
  names the env var + Doppler vault key + provisioning drill so the
  fix is a 5-minute copy-paste.

- **Operator action required (one-time per env):** generate the
  secret with `openssl rand -hex 32`, set it in Doppler (vault key
  `pwa/rate-limit-hmac-secret`, prd config), and mirror to Vercel
  (Production + Preview). See `PRODUCTION_RUNBOOK §6.8` for the
  full drill.

- **What about existing rate-limit state?** The HMAC output IS the
  Redis key. Changing the secret changes every key, so all existing
  counters become orphaned (Upstash naturally expires them via TTL
  on the rate-limit library's sliding-window cleanup). In practice,
  this is a non-issue for a low-traffic admin-gated endpoint (the
  burst test's RFC 5737 IPs are already random per run, so a secret
  rotation is indistinguishable from natural expiration). If you
  rotate mid-burst, the new IP's window starts fresh — same as
  before.

## [1.4.2] - 2026-06-28

The v1.4.2 fail-fast probe. Closes the v1.4.1 code-reviewer F ⚠️ minor
(the Upstash-wired precondition was documented in the test file's
PRECONDITIONS block but not enforced at the code level — a misconfigured
deployment would surface as a confusing `expected 60 pass, got 61`
failure instead of a clear "Upstash NOT wired" error).

### Added

- **`apps/pwa/e2e/rate-limit-burst.spec.ts`** — added a `test.beforeAll`
  hook that sends 61 requests from a fresh RFC 5737 TEST-NET-1 IP and
  asserts the 61st returns `429`. If the 61st is `200` or `503`, the
  in-memory fallback is active (Upstash not wired) and the entire v1.4.0
  lift is bypassed — the hook throws a clear error naming the
  misconfig, the deployment URL, the probe IP, and the observed
  status sequence, then the 2 main tests are marked as failed (they
  don't run). The probe uses a DIFFERENT unique IP from the 2 main
  tests so they don't collide in the Upstash sliding window. Hook
  also references `PRODUCTION_RUNBOOK §6.8` and the test file's
  PRECONDITIONS block in the error message. The 35-line file docstring
  was updated to mention the probe + how it differs from the documented
  (but previously unenforced) precondition.

### Migration notes

- **No breaking change.** No production code touched. The probe is
  purely additive — it runs in `test.beforeAll` (a Playwright lifecycle
  hook) and only fires when the test itself runs (i.e. when
  `E2E_BASE_URL` + `E2E_ADMIN_TOKEN` are set; otherwise the entire
  describe is skipped as before).
- **What the probe catches**: a deployment where `UPSTASH_REDIS_REST_URL`
  / `UPSTASH_REDIS_REST_TOKEN` are unset (or invalid). The route falls
  back to the in-memory `Map<ip, number[]>` sliding window, which is
  per-Vercel-instance — the 61 requests can split across instances and
  the rate-limit never fires, so the 2 main tests would observe
  `61 × 200` instead of `60 pass + 1 × 429`. The probe fails fast with
  a clear error before the main tests run.
- **What the probe does NOT catch**: Vercel X-Forwarded-For REPLACE
  behavior (if Vercel ever changes from APPEND to REPLACE, the unique-IP
  trick fails silently and the test uses the CI runner's real IP — the
  rate-limit would still fire but tests would be flaky on rapid re-runs).
  This is documented in the file docstring and is a known-acceptable
  risk for v1.4.2.

## [1.4.1] - 2026-06-28

The v1.4.1 e2e regression test for the v1.4.0 rate-limit lift. Closes
the standing follow-up from the v1.4.0 code-review (R: the v1.4.0
contract — 60 req / IP / 60 s + 429 + Retry-After — was only covered by
in-process vitest cases; the in-process helper does not exercise the
real Vercel edge + Upstash integration). The e2e test fires 61 requests
at the live prod URL and asserts the contract end-to-end.

### Added

- **`apps/pwa/e2e/rate-limit-burst.spec.ts`** (NEW) — 2 Playwright
  e2e cases: (1) `61-request burst returns 60 pass + 1 × 429` (asserts
  exactly 60 calls return 200/503 and exactly 1 returns 429), (2)
  `429 response carries a numeric Retry-After header (1..60) and a
  structured body` (asserts `Retry-After` parses to an integer in
  `[1, 60]`, and the JSON body has `{ error: 'RATE_LIMIT_EXCEEDED',
  retryAfterSec, scope: 'minute' }`). The test injects a unique
  `X-Forwarded-For` per run from RFC 5737 TEST-NET-1 (`192.0.2.0/24`)
  so successive CI runs from the same egress IP don't collide in the
  Upstash sliding window. The test **self-skips** if `E2E_BASE_URL` or
  `E2E_ADMIN_TOKEN` is unset (dev + PR CI without Doppler secrets are
  no-ops rather than failures).

- **`apps/pwa/playwright.burst.config.ts`** (NEW) — separate
  Playwright config for the burst test. Extends the base config but
  **omits the `webServer`** (no local `next start` on port 3100) and
  **omits the `next build` prerequisite** — the burst test hits a
  remote URL, so spinning up a local build would be wasted. Run via
  `npx playwright test --config=playwright.burst.config.ts`.

- **`apps/pwa/package.json`** — added `test:e2e:burst` script
  (`playwright test --config=playwright.burst.config.ts`).

### Migration notes

- **No breaking change.** No production code touched. The test is
  gated on `E2E_BASE_URL` + `E2E_ADMIN_TOKEN`; absent env vars
  produce a `test.skip(...)` with a clear message.
- **To run on prod** (one-time per CI environment):
  ```bash
  E2E_BASE_URL=https://pwa-eight-gamma.vercel.app \
  E2E_ADMIN_TOKEN=$(doppler secrets get --project kickbox-audio \
    --config prd bifrost/admin-token --plain) \
  npm run test:e2e:burst --workspace=apps/pwa
  ```
  Or via GitHub Actions: add `E2E_BASE_URL` + `E2E_ADMIN_TOKEN` to
  the repo secrets and wire the command into a scheduled job or
  `workflow_dispatch` (the existing `kba-smoke.yml` is feat-branch
  only; the burst test is a prod-environment test, not a PR gate).

## [1.4.0] - 2026-06-28

The v1.4.0 multi-region rate-limit lift. Closes the v1.4.0 ticket
flagged in `THREAT_MODEL` §4 A2 + §5 item 7: the in-memory `Map<ip, number[]>`
rate-limit introduced in v1.3.1 was per-Vercel-instance only (an attacker
behind a single NAT could send 60 req/min × N regions). v1.4.0 lifts
the rate-limit to Upstash Redis so the ceiling is shared across all
edge regions. All additive — no breaking change for existing
deployments; in-memory fallback preserved for dev/CI when Upstash
env vars are unset.

### Added

- **`apps/pwa/src/lib/rateLimit.ts`** (NEW) — extracted rate-limit
  helper. Backed by `@upstash/ratelimit` + `@upstash/redis`. Chain:
  `Ratelimit.slidingWindow(60, "60 s")` AND
  `Ratelimit.fixedWindow(1000, "24 h")` — both must pass. Identifier
  is `sha256(ip)` (no raw PII stored in the third-party DB). Fail-open
  fallback to the in-memory sliding-window logic when `UPSTASH_*` env
  vars are unset OR the Upstash call throws; surfaces a `console.warn`
  so the operator can see the degradation in Vercel logs. The result
  includes a `backend: 'upstash' | 'memory'` discriminator for
  observability. Module-level `cachedEnabled` flag suppresses
  re-probe noise on the no-Upstash path.

- **`apps/pwa/src/lib/rateLimit.test.ts`** (NEW) — 9 vitest cases
  covering: in-memory sliding window (60/IP/60s, blocks 61st with
  `scope: 'minute'`); per-IP isolation; sliding window release
  (advances 61s of fake time, the next call passes); daily hard-circuit
  (1000/IP/24h, blocks 1001st with `scope: 'day'`); IP hashing
  (raw IP never appears in the storage key, hex-64 shape); IP hashing
  determinism (same input → same hash, different input → different
  hash); Upstash backend success (`backend: 'upstash'`, `ok: true`);
  Upstash backend 429-shape (`retryAfterSec` derived from `reset`);
  Upstash backend throw → fallback to in-memory (`backend: 'memory'`,
  `console.warn` fires with the error message). Uses `vi.doMock` to
  isolate the mocked Redis client from real network egress.

- **`apps/pwa/src/app/api/diagnostics/replay-coverage/route.ts`** —
  refactored to import the new helper. Removed the inline
  `RATE_LIMIT_MAX_REQS` / `RATE_LIMIT_WINDOW_MS` / `rateLimitLog` /
  `checkRateLimit` definitions (now in the helper). 429 response gains
  an additive `scope: 'minute' | 'day' | null` field so the operator
  can tell whether they hit the sliding window vs the daily circuit
  (existing `error` + `retryAfterSec` fields unchanged).

- **`apps/pwa/package.json`** — added `@upstash/ratelimit@^2.0.8` and
  `@upstash/redis@^1.38.0` (HTTP-based REST clients; edge-compatible
  in either runtime).

- **`.env.example`** — added an `Upstash Redis (v1.4.0, multi-region
  rate-limit)` block documenting `UPSTASH_REDIS_REST_URL` +
  `UPSTASH_REDIS_REST_TOKEN`, the free-tier 10K commands/day limit,
  the fail-open fallback, and the Doppler vault key naming.

- **`docs/PRODUCTION_RUNBOOK.md` §6.8** (NEW) — full Upstash
  provisioning drill: console sign-in → database creation → Doppler
  `secrets set` → Vercel env mirror → 61-request burst verification →
  degradation log signature. Includes the cost-guardrail explanation
  and the operator-offboard token-rotation procedure.

- **`docs/PRODUCTION_RUNBOOK.md` §10** — updated the rate-limit
  contract sub-bullet from v1.3.1 (60/IP/60s, in-memory) to v1.4.0
  (60/IP/60s + 1000/IP/24h, Upstash-backed, sha256 IP, fail-open
  fallback, §6.8 provisioning reference).

- **`docs/THREAT_MODEL.md` §4 A2** — updated the DoS row's mitigation
  cell from in-memory to Upstash-Redis-backed, with the daily
  hard-circuit, sha256 hashing, fail-open fallback, and multi-region
  accuracy noted.

- **`docs/THREAT_MODEL.md` §5 item 7** — added a `v1.4.0 (DONE,
  2026-06-28)` sub-bullet to the existing v1.3.1 row documenting
  the lift: extracted helper location, 60/60s + 1000/24h chain,
  sha256 IP, in-memory fallback, 9 vitest cases.

### Migration notes

- **No breaking change.** Existing v1.3.1 deployments continue to
  work — the in-memory path is preserved as the Upstash-unconfigured
  fallback. The 429 response gains an additive `scope` field; the
  `error` + `retryAfterSec` fields are unchanged.
- **Operator action required (one-time, per env).** Provision an
  Upstash Redis database (free tier) and set `UPSTASH_REDIS_REST_URL`
  + `UPSTASH_REDIS_REST_TOKEN` in Doppler + Vercel. Without these,
  the route continues to work via the in-memory fallback (single-
  instance; rate-limit accuracy is per-Vercel-region only).
  See `PRODUCTION_RUNBOOK §6.8` for the full drill.
- **Cost guardrail.** The 1000 req / IP / 24 h daily hard-circuit
  keeps a single runaway scrape loop from exhausting the Upstash
  free tier (10K commands/day). To bump it, edit
  `DAILY_HARD_CIRCUIT_MAX` in `apps/pwa/src/lib/rateLimit.ts`.

## [1.3.0] - 2026-06-28

The v1.3.0 Tier 4 documentation release. 3 governance-grade docs
codifying the production posture built up across v1.1.0 / v1.1.1 /
v1.2.0. No code or runtime changes — only operator-facing artifacts.

### Added — Tier 4 production-readiness docs (3 items)

- **`docs/PRODUCTION_RUNBOOK.md`** — operators' playbook covering
  topology (3 services + DB + edge), env-var matrix per surface,
  cold-start deploy (mTLS cert generation, Doppler vault bootstrap,
  Vercel + Tailscale deploy, smoke checks), routine deploy workflow,
  rollback (Vercel instant rollback, Tailscale git-pin, DB
  forward-fix), secret rotation (HMAC / JWT / mTLS / DB password on
  90-day / 180-day cadences), incident triage (SEV-1–4 ladder +
  first-responder checklist + common failure modes), observability
  dashboards, backup + DR, and a top-12 common operational commands
  one-liner. Sets the on-call join-the-doc baseline.
- **`docs/THREAT_MODEL.md`** — STRIDE-style threat model covering 9
  assets (Bifrost, PWA, mcp-query, Doppler vault, Managed PG,
  Sentry/OTel observability, mTLS cert bundle, Vercel edge, CI
  runners) with explicit trust-boundary diagram, severity-tagged
  mitigations, residual risk table, and a prioritized mitigation
  backlog (6 items; 2 target v1.3.0, 2 target v1.4.0). Quarterly
  review cadence defined.
- **`docs/SLO_BUDGETS.md`** — 10 user-facing SLOs (SLO-1 through
  SLO-10) + latency budgets per route (p75/p95/p99 + driver tag) +
  multi-window error-budget policy (Google SRE workbook style) +
  burn-rate alerts (fast / slow / budgeted-out / latency breach) +
  per-route SLAs (PWA / Bifrost / mcp-query) + alert wiring recipes
  (Sentry + OTel Honeycomb/Datadog + Vercel Analytics) + monthly +
  quarterly review cadence.

### Changed

- **`AGENTS.md`** — Repository Layout code block expanded to list
  the 3 new docs with v1.3.0-versioned notes.

### Migration notes

- No runtime changes. Operators should read `PRODUCTION_RUNBOOK.md`
  before their first on-call shift. Security reviewers should treat
  `THREAT_MODEL.md` as the canonical source when reviewing new
  trust-boundary introductions. SRE / dashboard owners should
  implement the burn-rate alerts in §6 of `SLO_BUDGETS.md`.

### Added — Tier 4.1 RBAC hardening — RS256 partial (verification-side, 2026-06-28)

The verification-side cut of THREAT_MODEL §5 row 1. Bifrost is now ready
to consume RS256 JWTs from an external OIDC IdP; end-to-end OIDC dance
(IdP-side issuance + PWA inbound flow) deferred to v1.4.0.

- **`apps/bifrost/src/auth.ts`** — algorithm-driven `verifyToken`
  (HS256 default, RS256 opt-in via `RBAC_JWT_ALGORITHM`). RS256
  verification uses a vault-loaded PEM public key. Strict env check
  prevents the classic alg-confusion downgrade (never auto-detect
  from JWT `alg` header). Optional OIDC claim validation
  (`RBAC_OIDC_ISSUER`, `RBAC_OIDC_AUDIENCE`). New module-level
  setter `setRbacPublicKey(pem)` lets the boot resolver wire the
  vault-loaded key without making the verifier async.

- **`apps/bifrost/src/secrets.ts`** — `loadRbacPublicKey()` with
  Doppler vault (`bifrost/rbac-public-key-pem`) + env fallback
  (`RBAC_PUBLIC_KEY`). 5-min cache TTL, sibling to `loadBifrostSecrets`.

- **`apps/bifrost/src/server.ts`** — RS256 boot resolver propagates
  the public-key PEM through `setRbacPublicKey()` and mirrors it to
  `process.env.RBAC_PUBLIC_KEY`. `ensureSecretsLoaded` 503-gates on
  the RS256 key in addition to HMAC secrets when RS256 is configured.

- **`apps/bifrost/src/auth.test.ts`** — 9 new vitest cases for the
  RS256 path (ephemeral RSA keypair generated in `beforeAll` via
  `crypto.generateKeyPairSync('rsa')`): valid RS256 signature, wrong
  private key, expired, invalid role, OIDC `iss` validation, OIDC
  `aud` validation, RS256 issueToken round-trip, `requireRole` pass
  through (admin on operator route), `requireRole` 403 (viewer on
  operator route), `RBAC_MISCONFIGURED` when RS256 active + key empty.
  The 11 existing HS256 cases stay green (no behavior change).

- **`.env.example`** — RBAC JWT algorithm block + RS256 public-key
  generation procedure (openssl) + OIDC claim validation block +
  vault-key naming convention + rotation cadence.

- **`docs/PRODUCTION_RUNBOOK.md` §6.2** — full RS256 RBAC signing
  section: openssl keypair generation, Doppler storage of public
  key, IdP private-key handling (treat as tier-1), alg-confusion
  guard for the cutover, 90-day rotation procedure (single-key
  mode; multi-key `kid` rotation deferred to v1.4.0), and an
  explicit "what's not shipped" note for the end-to-end OIDC flow.

- **`docs/THREAT_MODEL.md`** — §5 row 1 status note
  (verification-side DONE 2026-06-28); new §6 residual risk row
  for stolen IdP private key (M, mitigated by tier-1 storage +
  90-day rotation + strict env check).

### Migration notes

- **No breaking change for existing deployments.** HS256 remains the
  default. The PWA and any internal clients continue to work
  unchanged. To opt into RS256, set `RBAC_JWT_ALGORITHM=RS256` in
  the Bifrost Tailscale-node env and store the public key in
  Doppler (`bifrost/rbac-public-key-pem`). The HMAC envelope on
  `/api/bifrost/*` (KBA cartridge issuance, used by `apps/bifrost/src/issuance.ts`)
  is unchanged—it reuses `WEBHOOK_SECRET` regardless of which JWT
  algorithm is active.
- **Alg-confusion guard.** Bifrost strictly trusts `RBAC_JWT_ALGORITHM`
  and never auto-detects from the JWT header. When flipping to
  RS256, do the IdP cutover AND the Bifrost env flip in the same
  maintenance window; in-flight HS256 tokens will be rejected until
  the IdP re-issues them as RS256.
- **End-to-end OIDC dance deferred to v1.4.0.** The current cut is
  the *verification* side: Bifrost will accept RS256 JWTs as soon
  as the IdP starts issuing them. The PWA inbound OIDC flow
  (acquire_token + refresh, error display, telemetry) lands in
  a follow-on release.

### Added — Tier 4.2 CSP per-request nonce + remove unsafe-eval (2026-06-28)

Closes the M-severity item in THREAT_MODEL section 5 row 2 for the
PWA (A2). Drops 'unsafe-eval' from script-src in prod (XSS blast-radius
reduction), adds 'nonce-{NONCE}' + 'strict-dynamic' so verifiably-tagged
scripts can load transitively, and tightens the per-source-list (X-Frame
'DENY' is subsumed by frame-ancestors 'none' in CSP).

- **`apps/pwa/src/middleware.ts`** — new Edge-runtime middleware
  (per the canonical Vercel pattern). Generates a fresh base64-encoded
  nonce per request, sets the `Content-Security-Policy` response header
  + mirrors onto the request header so Next.js can extract the nonce
  and stamp it onto hydration scripts. Dev keeps `'unsafe-eval'`
  (webpack/HMR); prod drops it. Exports `buildCspHeader(nonce, isDev)`
  for vitest unit testing (no edge runtime needed for that surface).
  Matcher excludes `_next/static`, `_next/image`, `favicon.ico`,
  `icon.svg`, `manifest.webmanifest`, and `api/health` (Vercel marks
  the deploy unhealthy if `/api/health` is gated).
- **`apps/pwa/src/app/layout.tsx`** — added `export const dynamic =
  'force-dynamic'` so the per-request nonce reach the cached HTML body
  on every request (without force-dynamic, Vercel Edge returns the
  cached HTML with the old nonce and the browser blocks the CSP).
- **`vercel.json`** — tightened the static CSP header (defense-in-depth
  fallback only; middleware wins at runtime): `'unsafe-eval'` removed
  from script-src, Sentry telemetry endpoints added to connect-src,
  `object-src 'none'` + `base-uri 'self'` + `form-action 'self'` +
  `frame-ancestors 'none'` + `upgrade-insecure-requests` added. The
  static header still has `'unsafe-inline'` on style-src (next/font
  + Tailwind inject inline styles; tightening to nonce-only is v1.4.0
  work).
- **`apps/pwa/src/middleware.test.ts`** — 9 vitest cases for
  `buildCspHeader`: nonce, strict-dynamic, dev-only unsafe-eval,
  prod no unsafe-eval, Sentry connect-src, frame-ancestors none,
  style-src unsafe-inline compat, object-src/base-uri/form-action
  closure, default-src self + upgrade-insecure-requests.
- **`docs/THREAT_MODEL.md`** — section 5 row 2 status note (DONE
  2026-06-28); A2 STRIDE T ampering row tightened to reference the
  middleware path + nonce + strict-dynamic flow explicitly.

### Migration notes

- **No breaking change for existing deployments.** The middleware adds
  per-request Content-Security-Policy headers; everything that worked
  before (React hydration, Sentry SDK init, Three.js client bundle)
  continues to work because they are nonced via the `x-nonce` request
  header that Next.js 14 inspects. Style-src keeps `'unsafe-inline'`
  until v1.4.0 when we audit every component for inline-style attrs.
- **Edge runtime required.** middleware.ts is implicitly Edge runtime
  (Vercel default). No `export const runtime` needed; setting it
  explicitly to `'edge'` is allowed but redundant.
- **NOT shipped in this commit**: nonce-only style-src (v1.4.0); per-
  route CSP overrides (unnecessary while the source list is uniform);
  report-only CSP shadow (runbooks can enable `Content-Security-Policy-
  Report-Only` for a week if a regression is suspected).

### Added — Tier 4.3 client-cert revocation workflow (2026-06-28)

Closes the M-severity item in THREAT_MODEL section 5 row 3
(client-cert revocation is currently a manual process — the
§6.3 procedure says "rebuild CA + reissue", which is a 30-min
operational burden). Bifrost now owns an in-memory revocation
registry that rejects JWTs bound to a revoked client cert.

- **`apps/bifrost/src/certRevocation.ts`** — new module exposing
  `revokeCert(args)`, `reissueCert(args)`, `isRevoked(args)`,
  `loadRevocationSeed()`, `listRevocations()`. Identity is keyed
  on `clientCertSerial` (normalized `lowercase` + colons stripped),
  `clientCertSubject` (CN), OR `rbacSubject` (JWT `sub` claim).
  Idempotent — second revoke returns the original `revokedAt`.
  Auto-purges entries >30 d on read. Audit log via the existing
  Pino `logger.warn` path (no new logger config).
- **`apps/bifrost/src/certRevocation.test.ts`** — 15 vitest cases
  covering revoke (6), reissue (2), isRevoked+30-day-purge (3),
  env-seed parsing (3: 2-entry / at=epoch / load-or-0), and a
  cross-marker-keying safety check (1).
- **`apps/bifrost/src/server.ts`** — three admin endpoints added:
  `POST /api/bifrost/admin/cert/revoke`,
  `POST /api/bifrost/admin/cert/reissue`,
  `GET /api/bifrost/admin/cert/revocations`. Auth is `ADMIN_TOKEN`
  via Bearer header; `adminAuth()` middleware returns 503 if the
  token is unconfigured (so dev environments don't accidentally
  expose the endpoints).
- **`apps/bifrost/src/auth.ts`** — `requireRole` middleware now
  rejects JWTs whose `sub` claim is in the revocation list BEFORE
  the role-hierarchy check (`CERT_REVOKED` 403). A stolen RBAC
  JWT cannot outlive its mTLS client.
- **`.env.example`** — new `ADMIN_TOKEN` env var block + new
  `CERT_REVOKED_LIST` env-var block (cold-boot seed format).
- **`docs/PRODUCTION_RUNBOOK.md` §6.5** — full client-cert
  revocation drill: revoke call → Caddy rebuild → reissue call →
  smoke check. Includes the canonical Caddy config diff.
- **`docs/THREAT_MODEL.md`** — §5 row 3 status note (DONE),
  §6 residual-risk row updated (stolen-client-cert window:
  from 90 d → revoked in seconds).

### Migration notes

- **No breaking change for existing deployments.** The hot store
  is empty on first boot. Operators load a cold-boot seed via
  `CERT_REVOKED_LIST` if needed; otherwise revocations start
  fresh. To wire the hot store from a CSV/JSON dump, deploy a
  one-shot script that parses the dump and POSTs each row to
  `/api/bifrost/admin/cert/revoke` with the operator's
  `ADMIN_TOKEN` Bearer.
- **Caddy mTLS enforcement remains the canonical path.** This
  module cannot block the TLS handshake (which terminates in front
  of Bifrost); it curtails the JWT-borne damage of a stolen
  cert and gives the operator a Tailscale-edge ACL rebuild
  checklist (§6.5 step 2).

### Added — Tier 3.1 Vault Ops (Doppler rotation script + cache invalidation, 2026-06-28)

Closes the v1.2.0 T3.4 follow-on: the vault wrapper exists, but
operators had to nudge Bifrost via deploy or wait 5 min for the
cache TTL to drain. Tier 3.1 adds the rotation script + an
instant cache-invalidation hand-off.

- **`scripts/rotate-secrets.ts`** — Node-runnable (tsx) script.
  Reads `rotations.yaml`, resolves each entry's value (literal
  or sub-shell `value_cmd`), POSTs to Doppler's REST API
  (`POST /v3/configs/config/secrets`). Dry-run by default; --apply
  flips writes on. Streams JSON to stdout for CI piping. Exit 0
  on every-success, 1 on any failure, 2 on bad CLI usage. Zero
  new dependencies — uses native `fetch` + `node:child_process`.
- **`scripts/rotate-secrets.test.ts`** — 5 vitest cases covering
  YAML parse, value-resolve, apply-to-Doppler (mocked), double-
  rejection on missing fields, non-200 error path.
- **`scripts/rotations.example.yaml`** — example manifest with
  HMAC + RBAC rotation cadence (90 d each) and notes for the
  operator. Comments mark safe defaults.
- **`apps/bifrost/src/server.ts`** — SIGUSR1 handler added:
  `pm2 sendSignal SIGUSR1 bifrost` (or `kill -USR1 <pid>`) clears
  the secret cache AND re-loads the revocation seed from env. Zero
  HTTP requests served during the hand-off; no WS drops.
- **`package.json`** — `vault:rotate` and `vault:rotate:apply`
  scripts at the root.
- **`.github/workflows/vault-rotate.yml`** — `workflow_dispatch`
  manual Action: pick rotations YAML + dry-run/apply mode,
  requires `DOPPLER_TOKEN` repo secret. No schedule trigger
  (rotations are operator-supervised).
- **`docs/PRODUCTION_RUNBOOK.md` §6.6`** — full rotation drill:
  dry-run → review → apply → SIGUSR1 → smoke check.
- **`docs/THREAT_MODEL.md`** — §4 A4 (Secrets vault) row updated
  to reference the rotation script; §5 new row 1b (Vault rotation
  automation) marked DONE.

### Migration notes

- **Opt-in.** The script is in the repo but no GitHub Action fires
  on its own. Operators trigger from the Actions UI (manual)
  OR from the Bifrost Tailscale node directly.
- **Cache window shrinks from 5 min to instant** post-rotation.
  Without SIGUSR1, the existing 5-min TTL still applies (graceful
  fallback).
- **The Doppler CLI (`doppler secrets set`) is a viable alternative
  on workstations where it's installed.** The script is preferred
  in CI because it requires only `DOPPLER_TOKEN` env var + curl-level
  auth (no CLI install).

### Added — Tier 3.2 Sentry session replay wiring (2026-06-28)

Tier 3.2 v1.2.0 added the Sentry SDK init + a basic error capture
path. Tier 3.2 v1.3.0 closes the operative gap: boundary +
telemetry + PII selectors + report-bug UI.

- **`apps/pwa/src/app/error.tsx`** — new page-level Next.js
  error boundary; calls `Sentry.captureException()` with the
  current session `replayId` so the replay is correlated with
  the exception. Renders a friendly sans-serif fallback with
  Retry.
- **`apps/pwa/src/app/global-error.tsx`** — new root-level
  Next.js error boundary (replaces root layout when triggered);
  same Sentry capture path with `level: 'fatal'` and a
  `boundary: 'global-error'` tag.
- **`apps/pwa/src/components/ErrorBoundary.tsx`** — class component
  for client-side subtree catch. Captures `componentStack` +
  `replayId` for any wrapped component. The v1.2.0 stub is
  preserved with the Sentry capture path now wired.
- **`apps/pwa/src/app/api/diagnostics/replay-coverage/route.ts`** —
  internal endpoint that proxies Sentry's `replay-stats/`
  sub-endpoint so the operator can curl the PWA itself
  (`Authorization: Bearer ${ADMIN_TOKEN}`) and see live
  `sessionCount`, `errorCaptureRate`, `p75ReplayBytes`. Returns
  503 if `SENTRY_AUTH_TOKEN` is unset.
- **`apps/pwa/src/lib/secrets.ts`** — minimal `getSecret()` helper
  for the PWA server-runtime (mirrors the Bifrost interface; 60-s
  cache; no SDK dependency).
- **`apps/pwa/src/components/ReportBugButton.tsx`** — dynamically-
  imported button that calls `Sentry.showReportDialog` (keeps
  the Sentry SDK out of first paint).
- **`apps/pwa/sentry.client.config.ts`** — added explicit `mask`
  array to `Sentry.replayIntegration` covering `.pii-mask`,
  `input[type="password"]`, and `input[autocomplete="cc-number"]`
  (immediate compliance over the blanket `maskAllText`).
- **`.env.example`** — new `SENTRY_AUTH_TOKEN` block + `SENTRY_ORG`
  + `SENTRY_PROJECT` env vars.
- **`docs/PRODUCTION_RUNBOOK.md` §10** — Sentry Replay verification
  drill: trigger a synthetic error → confirm replay → curl the
  replay-coverage endpoint → confirm dashboard ingest.

### Migration notes

- **No breaking change.** Replays were already enabled in v1.2.0
  T3.2; this commit only wires capture + correlation + reporting
  UI + explicit PII selectors.
- **Replay IDs only surface when a replay is ACTIVE.** If the
  user never triggered a session (replaysSessionSampleRate=0.1),
  the replayId is `null` in the captured exception. This is
  expected; the Sentry UI shows "no replay attached" and operates
  as before.
- **NOT shipped in this commit** (deferred to v1.4.0 per the
  design memo): form-aware JS masking (auto-detect `autocomplete`
  on dynamic forms), server-side replay linkage across Next.js
  API routes, full Sentry dashboard with replay drill-down.

## [1.3.1] - 2026-06-28

The v1.3.1 follow-up patch. 3 surgical follow-ups to v1.3.0 that close
standing items from prior code-reviews: `scripts/rotate-secrets.test.ts`
coverage gaps, `/api/diagnostics/replay-coverage` rate-limit gap, and
Sentry mirror for `certRevocation` events. All additive — no breaking
changes, no operator config required.

### Added

- **`scripts/rotate-secrets.test.ts`** — 2 new vitest cases in the
  `applyToDoppler` describe: (a) 5xx error path (status 500 throws),
  (b) URL-encoding of project/config special chars (space→%20,
  /→%2F, &→%26). Test count is now **4 `loadYamlLite` + 2 `resolveValue`
  + 5 `applyToDoppler` = 11** (was 9).

- **`apps/pwa/src/app/api/diagnostics/replay-coverage/route.ts`** —
  in-memory rate limit (60 req / IP / 60 s). Sliding-window TTL prune
  before push, 429 response with `Retry-After: N` header. Wired
  AFTER `ADMIN_TOKEN` auth (so unauth callers don't pollute the
  rate-limit state). In-memory is single-instance; for multi-region
  accuracy lift to Vercel Edge KV (v1.4.0 ticket).

- **`apps/bifrost/src/certRevocation.ts`** — `captureMessage` mirror
  of the existing Pino audit log. `revokeCert` now emits a
  `cert_revocation` message; `reissueCert` now emits a
  `cert_reissuance` message. Falls through to `noopSentry` when
  `SENTRY_DSN` is unset. The Pino audit trail is preserved
  (`captureMessage` is in addition to, not instead of, the logger
  call — both fire on every revocation event).

- **`scripts/rotate-secrets.ts` + `scripts/rotate-secrets.test.ts`** —
  helper exports (`loadYamlLite` / `resolveValue` / `applyToDoppler`)
  + test-file restructure: removed dynamic-import + `vi.resetModules`
  pattern, switched to top-level static imports; scoped
  `vi.stubGlobal('fetch', mockFetch)` to the `applyToDoppler` describe's
  `beforeEach` only (so the prior describe's `afterEach` cannot unstub
  before the fetch-needing tests run). Closes the cross-block leakage
  that previously let `applyToDoppler` tests hit real `api.doppler.com`.

### Migration notes

- **No breaking change.** All changes are additive. Existing v1.3.0
  deployments continue to work without config changes.
- **Rate-limit response:** 429 with `Retry-After: N` (seconds). The
  `Retry-After` is calculated from the oldest timestamp in the current
  60 s window. Operators should observe this if their scrape loop
  accidentally exceeds 60 reqs per minute.- **Sentry events surface when `SENTRY_DSN` is configured.** If you don't
  have a Sentry DSN wired, `captureMessage` is a no-op and the Pino audit
  log remains the source of truth.

### Doc updates — 2026-06-28 (post-ship, governance)

Governance-doc follow-up to v1.3.1. Closes the standing F ⚠️ minor from
the v1.3.0 code-review (replay-coverage rate-limit gap noted in
`THREAT_MODEL` review round 1, item F).

- **`docs/THREAT_MODEL.md`** — added DoS row to §4 A2 STRIDE table for
  `/api/diagnostics/replay-coverage` (in-memory sliding-window limiter,
  M-severity, low residual). Added §5 backlog entry (item 7, A2) marked
  **v1.3.1 (DONE, 2026-06-28)** to record the rate-limit closure.
- **`docs/PRODUCTION_RUNBOOK.md` §10** — appended the rate-limit
  contract to the Sentry Replay verification drill: `60 req / IP / 60 s`,
  `429 + Retry-After: N` on exceedance, single-instance note + v1.4.0
  Edge-KV lift ticket.

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
