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
