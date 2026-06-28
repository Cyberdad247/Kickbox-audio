# Alerting — Real-time prod observability (v1.4.6 + v1.5.0)

> **Scope**: Real-time prod detection of two failure modes in the
> `rateLimit` helper (`apps/pwa/src/lib/rateLimit.ts`):
>
> 1. **Upstash-unreachable fallback (v1.4.6)** — when Upstash Redis
>    is unreachable, the helper falls back to per-Vercel-instance
>    in-memory state. The 60 req / IP / 60 s ceiling is no longer
>    shared across edge regions; attackers behind a single NAT can
>    spread requests across regions and bypass the limit. Catches the
>    same failure mode as the v1.4.2 CI probe, but in real-time prod
>    (within seconds-to-minutes instead of nightly).
>
> 2. **Per-IP daily hard-circuit breach (v1.5.0)** — when an IP hits
>    the 1000 req / 24 h ceiling (a deliberate cost guardrail for the
>    Upstash free tier of 10K commands/day), the helper returns 429
>    with `scope: 'day'`. Previously the 429 was silent — no real-time
>    operator signal. v1.5.0 fires a Sentry event so the operator can
>    decide whether to bump `DAILY_HARD_CIRCUIT_MAX` (legitimate
>    client) or block (misbehaving scraper / attacker).
>
> **Closes**:
> - THREAT_MODEL §4 A2.1 — Upstash fallback observability gap
>   (v1.4.6 closure; real-time detection was missing)
> - THREAT_MODEL §4 A2.2 — Daily hard-circuit invisibility gap
>   (v1.5.0 closure; the cost guardrail was silent)

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

**How it works**: the v1.4.6 + v1.5.0 code changes in
`apps/pwa/src/lib/rateLimit.ts` add `Sentry.captureException`
calls (lazy import + try/catch so they no-op when Sentry is
unconfigured). The v1.4.6 + v1.5.0 calls are SEPARATE events
with DIFFERENT tags — operators wire 2 Sentry alert rules (or 1
rule matching either tag).

| Event                  | Tag(s)                                                                  | When fires                                                                              | Level    |
| ---------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| `alert.upstash_degraded` (v1.4.6) | `alert.upstash_degraded: 'true'`, `rate_limit.backend: 'memory'`   | Upstash call throws (degradation — fail-open to in-memory). Real production issue.     | warning  |
| `rate_limit.daily_circuit_breached` (v1.5.0) | `rate_limit.daily_circuit_breached: 'true'`, `rate_limit.backend: 'upstash' \| 'memory'` | An IP hits 1000 req / 24 h (cost guardrail, working as designed). Operational signal. | warning  |

**Prerequisites**:
- Sentry DSN must be wired on the PWA (env: `SENTRY_DSN` for
  server, `NEXT_PUBLIC_SENTRY_DSN` for client). See
  PRODUCTION_RUNBOOK §10 for the Sentry provisioning drill.
- The v1.4.6 + v1.5.0 code changes are already shipped. The
  Sentry captureException calls fire automatically once Sentry
  is configured.

**Operator handoff (5 min, wire both alert rules)**:

**Rule 1 — Upstash degraded (v1.4.6, real production issue)**:
1. Open `sentry.io` -> kickbox-audio project -> Alerts -> Create
   Alert -> "Issues" alert type.
2. Set the filter: `tags[alert.upstash_degraded]: true` AND
   `level: warning`.
3. Set the action interval: 5 minutes (matches the user's
   requirement).
4. Set the notification target: email + Slack
   (`#ops-alerts` channel webhook, if the project has one).
5. Save. The alert is live immediately; no deploy needed.

**Rule 2 — Daily hard-circuit breach (v1.5.0, operational signal)**:
1. Open `sentry.io` -> kickbox-audio project -> Alerts -> Create
   Alert -> "Issues" alert type.
2. Set the filter: `tags[rate_limit.daily_circuit_breached]: true`
   AND `level: warning`.
3. Set the action interval: 30 minutes (longer than Rule 1's
   5 minutes — daily-breach is working as designed, so we want
   fewer pages; the operator reviews during business hours).
4. Set the notification target: email only (no Slack page — the
   issue may be a legitimate client at the ceiling, not an
   incident). Add a separate Slack channel like
   `#rate-limit-ops` for low-priority batching.
5. Save.

**Cost**: 0 (Sentry free tier is 5K errors/month; the combined
alert volume from both rules is well within the free tier —
expected ≤ 10 events/day on a healthy prod, ≤ 100 events/day
during a real incident or burst scrape).

**What the alert email/Slack message looks like (Rule 1)**:
```
[Upstash degraded] Rate-limit fallback in prod
Error: Upstash 503 Service Unavailable
  at checkRateLimit (apps/pwa/src/lib/rateLimit.ts:213)
  ...
Tags: alert.upstash_degraded=true, rate_limit.backend=memory
```

**What the alert email/Slack message looks like (Rule 2)**:
```
[Daily hard-circuit breached (1000 req / IP / 24 h); retryAfter=4200s]
Error: Daily hard-circuit breached (1000 req / IP / 24 h); retryAfter=4200s
  at checkRateLimit (apps/pwa/src/lib/rateLimit.ts:296)
  ...
Tags: rate_limit.daily_circuit_breached=true, rate_limit.backend=upstash
```

**Filtering by backend in Rule 2** (optional refinement): if
you want to separate alerts for the Upstash path (normal) from
the in-memory path (degraded), add `tags[rate_limit.backend]:
upstash` or `tags[rate_limit.backend]: memory` to the filter.
Useful when you're investigating whether a daily breach is
related to an Upstash degradation.

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

### For Rule 1 (Upstash degraded, v1.4.6)

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

### For Rule 2 (Daily hard-circuit breach, v1.5.0)

The daily circuit firing is **working as designed** — it's the
cost guardrail, not a failure. The response is investigative,
not reactive:

1. **Acknowledge the alert** in Sentry. The issue is grouped by
   the daily-breach tag + the Error fingerprint, so multiple
   breaches from the same IP collapse into one issue with an
   event count.
2. **Identify the offending IP hash**. The Sentry event payload
   includes the stack trace but NOT the IP (we don't log PII in
   Sentry). If you need the IP, check the route's audit log
   (the route logs the `scope: 'day'` 429 responses with the
   HMAC'd IP hash, not the raw IP).
3. **Decide: legitimate or misbehaving?**
   - **Legitimate client at the ceiling** (e.g. a heavy
     integration test, an admin bulk-export tool, an end user on
     a corporate NAT sharing with many users): consider bumping
     `DAILY_HARD_CIRCUIT_MAX` in
     `apps/pwa/src/lib/rateLimit.ts` (see PRODUCTION_RUNBOOK §6.8
     "Daily hard-circuit visibility (v1.5.0)" for the procedure).
     Bump from 1000 to e.g. 5000 if the workload is genuinely
     high; redeploy.
   - **Misbehaving scraper / attacker**: the 1000/24h ceiling
     is the right number. Do NOT bump the guardrail. Instead,
     consider adding the IP hash to a Vercel edge deny-list, or
     tightening the per-minute window from 60 to 30 (forces the
     attacker to spread their requests more, which is detectable).
   - **Single misconfigured integration** (e.g. a retry loop with
     exponential backoff that's still under the 60/min ceiling
     but hits 1000/24h by accident): contact the integrator,
     suggest a lower retry rate, do NOT bump the guardrail.
4. **Track the trend**: if daily breaches are climbing week-over-
   week, the guardrail is at risk of becoming a UX problem for
   legitimate users — consider bumping. If daily breaches are
   stable at 1-2 IPs/week, the guardrail is doing its job.
5. **Document** in PRODUCTION_RUNBOOK §7 (or Sentry's incident
   tracking) if the bump was applied (so the next operator
   understands the change).

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
- **Per-`retryAfterSec` alerting** is NOT in this alert. If you
  want a different rule for "this breach will reset in 1 hour"
  vs "this breach will reset in 23 hours", parse the
  `retryAfter=N` substring from the Error message in a Sentry
  custom alert rule. Out of scope for v1.5.0.

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
  same 2-arg format. The v1.5.0 release adds 2 new tests
  (`emits Sentry.captureException on in-memory daily circuit
  breach` and `emits Sentry.captureException on Upstash daily
  circuit breach`) that mock `@sentry/nextjs` with a `vi.fn()` and
  assert the call shape (Error + level=warning + the 2 new tags).
  The in-memory beforeEach now does `vi.unmock('@sentry/nextjs')`
  for parity with the existing ratelimit/redis unmocks, so the
  per-test mock cannot leak across tests.
