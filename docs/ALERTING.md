# Alerting — Real-time prod observability (v1.4.6)

> **Scope**: Real-time prod detection of the rateLimit helper's
> Upstash-unreachable fallback. Catches the same failure mode as the
> v1.4.2 CI probe, but in real-time prod (within seconds-to-minutes
> instead of nightly).
>
> **The failure mode**: when Upstash Redis is unreachable, the
> rateLimit helper logs `[rateLimit] Upstash unreachable, falling
> back to in-memory:` and serves from a per-Vercel-instance
> `Map<ip, number[]>` instead. The rate-limit ceiling (60 req / IP /
> 60s) is no longer shared across edge regions. Attackers behind a
> single NAT can effectively bypass the rate-limit by spreading
> requests across regions. This is the v1.4.0 failure mode we're
> defending against.
>
> **Closes**: THREAT_MODEL §4 A2 observability gap (the rate-limit
> is wired, but a fallback to in-memory is silent without an alert).

## 2-Layer architecture

```
                 +-----------------------------+
                 | Upstash unreachable         |
                 | console.warn in rateLimit.ts|
                 +-------------+---------------+
                               |
              +----------------+----------------+
              |                                 |
              v                                 v
  +-----------------------+         +---------------------------+
  | Layer 1: Sentry       |         | Layer 2: Vercel log-drain |
  | (real-time, primary)  |         | (real-time, secondary)    |
  |                       |         |                           |
  | captureException on   |         | `vercel integration add   |
  | the same warn line,   |         | log-drains` -> provider   |
  | tagged alert.upstash_ |         | (Datadog/Honeycomb/       |
  | degraded=true, level= |         | Axiom/Better Stack)       |
  | 'warning'.            |         |                           |
  |                       |         | Provider log monitor on   |
  | Operator handoff:     |         | substring `Upstash        |
  | sentry.io -> create   |         | unreachable`              |
  | alert rule on the     |         |                           |
  | tag. ~5 min setup.    |         | Operator handoff: ~15 min |
  |                       |         | setup.                    |
  +-----------+-----------+         +-------------+-------------+
              |                                   |
              v                                   v
  +-----------------------+         +---------------------------+
  | Sentry Alert          |         | Provider alert            |
  | (email/Slack/PagerDuty|         | (per-provider)            |
  |  notification target) |         |                           |
  +-----------------------+         +---------------------------+
```

Both layers fire on the same failure mode, so you only need ONE
wired. The 2-layer design is defense-in-depth: if Sentry is
unconfigured (e.g., the v1.3.0 Sentry handoff was skipped), the
log-drain still catches the failure. Conversely, if no log-drain
provider is set up, the Sentry alert still catches it.

## Layer 1: Sentry alert (PRIMARY, real-time, ~5 min setup)

**How it works**: the v1.4.6 code change in
`apps/pwa/src/lib/rateLimit.ts` adds a `Sentry.captureException`
call right after the `console.warn` (lazy import + try/catch so it
no-ops when Sentry is unconfigured). The captured exception has
`level: 'warning'` and
`tags: { 'alert.upstash_degraded': 'true', 'rate_limit.backend':
'memory' }`. A Sentry alert rule fires on the tag.

**Prerequisites**:
- Sentry DSN must be wired on the PWA (env: `SENTRY_DSN` for
  server, `NEXT_PUBLIC_SENTRY_DSN` for client). See
  PRODUCTION_RUNBOOK §10 for the Sentry provisioning drill.
- The v1.4.6 code change is already shipped (commit
  `$(git rev-parse HEAD)` on `main`). The Sentry captureException
  fires automatically once Sentry is configured.

**Operator handoff (5 min)**:
1. Open `sentry.io` -> kickbox-audio project -> Alerts -> Create
   Alert -> "Issues" alert type.
2. Set the filter: `tags[alert.upstash_degraded]: true` AND
   `level: warning`.
3. Set the action interval: 5 minutes (matches the user's
   requirement).
4. Set the notification target: email + Slack
   (`#ops-alerts` channel webhook, if the project has one).
5. Save. The alert is live immediately; no deploy needed.

**Cost**: 0 (Sentry free tier is 5K errors/month; this alert
fires at most a few times per day on real degradation, well within
the free tier).

**What the alert email/Slack message looks like**:
```
[Upstash degraded] Rate-limit fallback in prod
Error: Upstash 503 Service Unavailable
  at checkRateLimit (apps/pwa/src/lib/rateLimit.ts:213)
  ...
Tags: alert.upstash_degraded=true, rate_limit.backend=memory
```

## Layer 2: Vercel log-drain (SECONDARY, real-time, ~15 min setup)

**How it works**: a Vercel log-drain streams every prod log line to
an external provider (Datadog, Honeycomb, Axiom, Better Stack,
etc.). The provider's log-monitor feature alerts on a substring
match within a time window. The user-requested substring is
`[rateLimit] Upstash unreachable, falling back to in-memory`; the
user-requested window is 5 minutes.

**Prerequisites**:
- A log-drain provider account. Datadog is the most common (free
  tier: 5GB log ingest/month, ~1 month of prod logs for this
  project). Honeycomb has a similar free tier for log-based alerts.
- Vercel CLI auth (`vercel login`).

**Operator handoff (15 min)**:
1. Pick a provider. Recommended: **Datadog** (best Vercel
   integration, generous free tier, well-documented alert rules).
2. Mint a Datadog API key (Datadog -> Organization Settings ->
   API Keys -> New Key, type = "Logs").
3. On the workstation, run:
   ```bash
   vercel integration add log-drains
   # Pick "Datadog" from the integration list
   # Enter the Datadog API key when prompted
   # Confirm the integration is active
   ```
4. In Datadog, set up a log monitor:
   - Datadog -> Monitors -> New Monitor -> Logs
   - Query: `@http.url_path:/api/diagnostics/replay-coverage Upstash unreachable`
     (or simply `Upstash unreachable` to catch all variants)
   - Trigger: "above 0 occurrences" in a 5-minute window
   - Notify: your team (email, Slack, PagerDuty, etc.)
5. Save. The monitor is live; logs flow within ~30s of being
   written on Vercel.

**Cost**: $0.10/1K log events (Datadog). For this project, prod
logs are ~10K events/day = ~$1/day = ~$30/month for 1M events. The
log-drain includes ALL logs (not just the rateLimit warn), so the
alert is free-riding on existing log infrastructure.

**Honeycomb equivalent** (if you prefer Honeycomb over Datadog):
1. Mint a Honeycomb API key.
2. `vercel integration add log-drains` -> pick Honeycomb.
3. Honeycomb -> Queries -> New Query ->
   `WHERE message CONTAINS "Upstash unreachable"` -> Save as
   "Upstash degraded trigger".
4. Honeycomb -> Triggers -> New Trigger -> on the saved query,
   threshold: ≥1 in 5 minutes.

## Alert response procedure (what to do when the alert fires)

1. **Acknowledge the alert** in Sentry / Datadog / Honeycomb (or
   PagerDuty if it's loud). This silences repeat pages.
2. **Check the v1.4.4 nightly cron** (the burst regression test).
   The next 03:00 UTC run will fail loudly because the in-memory
   fallback doesn't share state across instances; the burst test
   will observe `61 × 200` instead of `60 pass + 1 × 429`. If the
   burst test passed recently (in the last few hours), this is a
   new incident. If the burst test has been failing for >24h, this
   is a long-standing degradation.
3. **Check the Upstash dashboard** (`console.upstash.com`):
   - Database status (green/red)
   - Request rate (if 0 commands/sec, the API key might be wrong
     or the region might be down)
   - Free tier quota (10K commands/day; if exhausted, the
     database returns 429 to all callers)
4. **Restore**: the most common fix is rotating the Upstash API
   token (the 1.0 token might be the older scoped-read-only one).
   Doppler has the `pwa/upstash-redis-rest-token` vault key; rotate
   there + mirror to Vercel.
5. **Verify recovery**: re-run the burst test
   (`gh workflow run burst-test.yml`); both tests should pass.
6. **Document the incident** in the runbook's "Incident triage"
   section (PRODUCTION_RUNBOOK §7) or in Sentry's incident
   tracking.

## Testing the alert (synthetic fallback, 5 min)

The alert is only as good as the operator's confidence in it. This
4-step playbook verifies the end-to-end path (Sentry event + log-
drain capture) on a preview deploy, the same way the v1.4.2 CI
probe verifies the in-process fallback path.

```text
1. Set UPSTASH_REDIS_REST_URL to a non-existent host on a preview
   deploy (Vercel -> Project -> Settings -> Environment Variables
   -> add UPSTASH_REDIS_REST_URL=https://nonexistent.invalid for
   the Preview environment only). Trigger a preview redeploy.

2. Hit the replay-coverage endpoint with a valid ADMIN_TOKEN:
     curl -sS -i -H "Authorization: Bearer $ADMIN_TOKEN" \
       https://<preview-url>/api/diagnostics/replay-coverage?since=24h
   Expected: 200 (the in-memory fallback returns ok=true; the
   Upstash failure is silent in the response body).

3. Check Sentry (sentry.io -> kickbox-audio -> Issues):
   - Filter by tag `alert.upstash_degraded:true`
   - Expected: 1+ error-level event with the tag set
   - Latency: <30s from the curl above

4. Check the log-drain provider (Datadog / Honeycomb):
   - Query: `Upstash unreachable`
   - Expected: 1+ log line, the monitor fires
   - Latency: <1 min from the curl above

5. (Cleanup) Revert the bogus UPSTASH_REDIS_REST_URL on the
   preview deploy; the next request returns to the real Upstash
   path.
```

If step 3 or 4 doesn't fire, the corresponding layer is broken —
walk the operator handoff for that layer (Layer 1 or Layer 2
above) and verify the alert rule / log-drain is configured.

## What's NOT covered

- **Other rateLimit failure modes** (RATE_LIMIT_HMAC missing,
  TELEMETRY_UNAVAILABLE) are NOT in this alert. They have
  different substrings + different alert rules; see
  PRODUCTION_RUNBOOK §6.8 for the per-secret handoffs.
- **Vercel-side latency / error rate** (general PWA SLO breach) is
  NOT in this alert. That's covered by the SLO_BUDGETS.md §4 burn-
  rate alerts (Sentry + OTel Honeycomb/Datadog).
- **Pre-emptive alerts** (before the fallback fires) are NOT in
  this alert. The v1.4.4 nightly cron + the v1.4.5 per-run
  observability catch the slow-drift case (e.g., Upstash free-tier
  exhaustion over weeks).

## Migration notes

- **No production code breakage**: the Sentry captureException is
  a lazy import + try/catch. If @sentry/nextjs is not installed
  (e.g., test env, dev build without Sentry) or if SENTRY_DSN is
  unset, the call silently no-ops. The existing `console.warn` is
  preserved exactly.
- **No new env vars required** for Layer 1 (Sentry is already
  wired from v1.3.0).
- **Optional new env vars for Layer 2** (Vercel log-drain): none
  directly; the Vercel integration stores the Datadog API key in
  the Vercel project's integration settings, not in env vars.
- **Test coverage**: the existing
  `falls back to in-memory when Upstash throws` test (in
  `apps/pwa/src/lib/rateLimit.test.ts`) still passes — the Sentry
  call is additive, the `console.warn` is still called with the
  same 2-arg format.
