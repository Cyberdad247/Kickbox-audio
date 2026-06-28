# Verification Log — Burst regression (v1.4.4 + v1.4.5)

> **Per-run observability** for the v1.4.4 nightly GitHub Actions cron
> that runs the v1.4.1 burst e2e test against the live prod URL
> (`pwa-eight-gamma.vercel.app`).
>
> The **burst-log workflow** (`.github/workflows/burst-log.yml`,
> v1.4.5) appends one row per successful `burst-test` run. It is
> triggered by the `burst-test` workflow's post-step via
> `gh workflow run burst-log.yml`. Failed `burst-test` runs do NOT
> append a row here (they show up in the GitHub Actions UI + the
> maintainer email instead).
>
> The first successful run will populate the placeholder row below.

## Schema

| Column             | Source                                                                                  | Example                  |
| ------------------ | --------------------------------------------------------------------------------------- | ------------------------ |
| date               | `${{ steps.row.outputs.date }}` (`date -u +%Y-%m-%dT%H:%M:%SZ` in burst-log)            | `2026-06-28T03:00:12Z`   |
| commit             | `${{ steps.row.outputs.commit }}` (first 7 chars of `${{ inputs.trigger_sha }}`)        | `fc4adce`                |
| tests passed       | `${{ inputs.tests_passed }}` (parsed from the Playwright `--reporter=list` output)      | `2 passed (47s)`         |
| 429 count          | `3` (deterministic: 1 probe + 1 main test 1 + 1 main test 2 = 3 × 1 per burst)          | `3`                      |
| fallback warnings  | `${{ steps.logscan.outputs.fallback_warnings }}` (Vercel logs, `Upstash unreachable`)   | `0` or `TBD` if no token |
| HMAC errors        | `${{ steps.logscan.outputs.hmac_errors }}` (Vercel logs, `RATE_LIMIT_HMAC`)             | `0` or `TBD` if no token |
| Sentry 503s        | `${{ steps.logscan.outputs.sentry_503s }}` (Vercel logs, `TELEMETRY_UNAVAILABLE`)       | `0` or `TBD` if no token |
| runner-min         | `${{ inputs.runner_min }}` (rounded up from `${{ github.run_duration_ms }}`)            | `1`                      |

**TBD**: the 3 Vercel-logs columns are `TBD` until the operator adds
`VERCEL_TOKEN` to the repo secrets (one-time, Settings → Secrets and
variables → Actions). Until then, the burst-test workflow still
passes (it doesn't depend on the log scan), but the per-run
observability rows are partially blank. See PRODUCTION_RUNBOOK §6.8
for the operator handoff.

## Rows

| date | commit | tests passed | 429 count | fallback warnings | HMAC errors | Sentry 503s | runner-min |
| ---- | ------ | ------------ | --------- | ----------------- | ----------- | ----------- | ---------- |
| _first successful run will appear here_ | | | | | | | |

## Drift detection (v1.5.1)

The **burst-drift-check workflow**
(`.github/workflows/burst-drift-check.yml`) runs **weekly on Mondays
at 09:00 UTC** (6 h after the Monday 03:00 UTC nightly burst-test, so
the chained `burst-log` append has time to settle) and reads
`docs/VERIFICATION_LOG.md` via the GitHub API. It scans the last 7
days of rows and opens a GitHub issue titled `Burst regression drift
detected` (labeled `drift-detected`) if **any** row in the window
breaches **any** of the 3 thresholds:

| Column             | Threshold | Drift category      | Why it matters (real-time Sentry does NOT cover)                       |
| ------------------ | --------- | ------------------- | --------------------------------------------------------------------- |
| `fallback_warnings`| `> 0`     | Upstash degradation | Catches weeks of intermittent degradations; the v1.4.6 Sentry alert fires per-request, this catches the long-tail pattern |
| `Sentry_503s`      | `> 0`     | Sentry drift        | Catches weeks of intermittent Sentry outages; rare per-request, easier to spot as a slow trend |
| `runner-min`       | `> 5`     | Slow-build regression | Catches CI runner drift (e.g. shared runners getting busier); orthogonal to the rate-limit's prod health |

**All-TBD handling:** if every row in the 7-day window is `TBD` (the
operator has not yet added `VERCEL_TOKEN` to the repo secrets), the
workflow opens a separate issue labeled `drift-unverifiable`
(orthogonal to `drift-detected`) titled `Burst regression unverifiable:
VERCEL_TOKEN missing`. This is intentional — a week of all-`TBD`
rows indicates the Vercel-logs scan is broken (the token was rotated,
expired, or never set), and the operator needs to know. Without this
check, a dropped `VERCEL_TOKEN` would fail silently for weeks.

**Issue lifecycle:** the workflow uses the `gh issue list --label
drift-detected --state open --json number` lookup (idempotency via
label, NOT title — operators can rename the issue without breaking
the workflow). If an open `drift-detected` issue already exists, the
workflow **updates the issue body** with the latest offending rows
instead of opening a new one. The issue auto-closes when the next
weekly run finds zero breaches (the workflow adds a `resolved-by:
<a-run-url>` comment then closes with `gh issue close --reason
completed`).

**Idempotency:** the `concurrency: group: burst-drift-check`
group serializes overlapping runs (e.g. a manually-triggered run
mid-week does not race the Monday 09:00 UTC scheduled run).

**Permissions:** `contents: read` (read the file) + `issues: write`
(open / update / close issues). No `pull-requests: write` (we do not
auto-open PRs). Runs on `ubuntu-latest` with a 3-min timeout (the
file is small; the dominant cost is the API roundtrip).

**Manual trigger (override thresholds):** `Actions tab -> "Burst
regression drift check (v1.5.1)" -> Run workflow -> enter the
`lookback_days` input (default 7) + optional `fail_open` to open
the issue even on a single breach (default requires ≥1 breach per
threshold category). Useful for end-of-cycle audits or post-incident
backfills.

