# SLO Budgets — Kickbox-audio

> **Scope**: Service Level Objectives (SLOs), Service Level Indicators
> (SLIs), error-budget policy, and burn-rate alerts for the v1.3.0
> production surface. Companion to [`docs/PRODUCTION_RUNBOOK.md`](./PRODUCTION_RUNBOOK.md)
> (operators) and [`docs/THREAT_MODEL.md`](./THREAT_MODEL.md) (security).
>
> **In one sentence**: *"The Bifrost gateway and PWA together return a
> successful response within 900 ms p95 for 99.9% of user-perceived
> requests over a rolling 30-day window."*

---

## 1. Methodology

- **SLI**: a ratio of good events to total events (or latency threshold).
- **SLO**: a target value for that ratio over a window.
- **Error budget**: `(1 − SLO) × window_volume`. Burning it = paging.
- **Burn rate**: budget consumed / window elapsed. Burn rate ≥ 2× means
  we are on track to exhaust budget early → page.

Windows are **rolling 30 days** unless stated. Multi-window SLOs (Google
SRE workbook) provide both short-window (low-noise) and long-window
(early-warning) burns simultaneously.

---

## 2. User-visible SLIs

| SLI                                | Measurement                                                                                | Source                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Availability**                   | `count(status < 500) / count(total)` per route × 30 d                                       | Vercel Analytics + Sentry                          |
| **Latency**                        | p95 of `response.end - request.start` per route × 30 d                                      | OpenTelemetry (Bifrost) + Vercel Analytics (PWA)    |
| **Freshness**                      | `count(abs(now − issuedAt) ≤ 30 s) / count(total_sigs)` × 30 d                              | Sentry transaction `webhook.freshness_passed` flag  |
| **WebSocket stability**            | `count(zombies_terminated) / count(peak_clients)` per 24 h                                  | Pino log → reaper report                            |

---

## 3. SLOs (v1.3.0 targets)

### 3.1 Service-level SLOs

| SLO ID    | Service      | Object                          | Target          | Window   |
| --------- | ------------ | ------------------------------- | --------------- | -------- |
| **SLO-1** | Bifrost       | `/health` availability          | **99.95%**      | 30 d     |
| **SLO-2** | Bifrost       | `/api/bifrost/issue` success    | **99.9%**       | 30 d     |
| **SLO-3** | Bifrost       | `/api/bifrost/hitl` success     | **99.9%**       | 30 d     |
| **SLO-4** | Bifrost       | `/webhook/sms` HMAC-validate    | **99.5%**       | 30 d     |
| **SLO-5** | Bifrost       | WS `/ws` steady-state clients   | **99%** clients >= 1 over 30 d | 30 d |
| **SLO-6** | PWA           | Home page LCP                   | **< 2.5 s** p75 | 30 d     |
| **SLO-7** | PWA           | `/api/health` availability      | **99.9%**       | 30 d     |
| **SLO-8** | PWA           | Bundle size per route           | **<= 150 KB**   | per build|
| **SLO-9** | mcp-query     | mTLS handshake success          | **99.9%**       | 30 d     |
| **SLO-10**| All           | JS bundle has 0 high-vuln advisories | **0 findings** | per `npm audit` |

### 3.2 Latency budgets (p75 → p95 targets)

| Route                            | p75 (ms) | p95 (ms) | p99 (ms) | Driver                                       |
| -------------------------------- | -------- | -------- | -------- | -------------------------------------------- |
| `GET /api/health` (PWA)           | 50       | 120      | 300      | Vercel edge cache + Next.js cold start       |
| `GET /api/bifrost/health`         | 10       | 30       | 80       | Pure in-process counter                       |
| `POST /api/bifrost/issue`         | 60       | 200      | 500      | HMAC compute (HS256) + DB read              |
| `POST /api/bifrost/hitl`          | 150      | **900**  | 1500     | `ROUTE_BUDGET_MS` ceiling (`apps/bifrost/src/server.ts`) |
| `POST /webhook/sms`               | 200      | 700      | 1200     | HMAC verify + route + microcube spawn        |
| PWA Home LCP                     | —        | 2500     | —        | WebGL KineticCanvas + LakishaHUD hydration   |

The **900 ms `ROUTE_BUDGET_MS`** on `/api/bifrost/hitl` is the system
budget; p95 SLO is set 1:1 with this knob. If p95 exceeds 900 ms for a
rolling 7-day window, the runbook calls for re-tuning or scaling.

---

## 4. Error budget policy

Error budget for a single 30-day window:

| SLO    | Target | Error budget (per 30 d, 100K req) | What we keep when burned |
| ------ | ------ | ------------------------------------------ | ------------------------ |
| 99.95% | = 0.05% | 50 errors                                  | 1 day's worth of capacity |
| 99.9%  | = 0.1%  | 100 errors                                 | 1.5 days' capacity        |
| 99.5%  | = 0.5%  | 500 errors                                 | 7.5 days' capacity        |

**Burn-rate alerts (multi-window)** — Google SRE workbook style:

| Alert              | Short window  | Long window   | Severity | Action                                                    |
| ------------------ | ------------- | ------------- | -------- | --------------------------------------------------------- |
| **Fast burn**      | 2% budget in 1 h  | 5% in 6 h  | SEV-2    | Page on-call. Open incident channel.                      |
| **Slow burn**      | —             | 10% in 3 d   | SEV-3    | Ticket + daily standup update.                            |
| **Budgeted out**   | —             | 100% in 30 d | SEV-1    | **Freeze non-critical deploys** until next 30-d window opens.   |
| **Latency breach** | p95 ≥ 1.5× SLO for 1 h | p95 ≥ 1.5× SLO for 3 d | SEV-3 | Re-tune `ROUTE_BUDGET_MS`, scale up, or report capacity need. |

---

## 5. Per-route SLAs (PWA + Bifrost)

### 5.1 PWA

| Route                  | SLA (p95) | Error budget hint        |
| ---------------------- | --------- | ------------------------ |
| `GET /`                | 2.5 s LCP | Lighthouse + Vercel RUM   |
| `GET /api/health`      | 120 ms    | Vercel route analyzer     |
| `GET /api/weather`     | 700 ms    | OWM dep                   |
| Bundle `launch` JS     | <= 150 KB | CI bundle-size gate       |

### 5.2 Bifrost

| Route                          | SLA (p95) | Error budget hint        |
| ------------------------------ | --------- | ------------------------ |
| `GET /health`                  | 30 ms     | `clients` WS counter      |
| `POST /api/bifrost/issue`      | 200 ms    | HMAC + DB write           |
| `POST /api/bifrost/hitl`       | 900 ms    | router + microcube        |
| `POST /webhook/sms`            | 700 ms    | external (Telnyx/Bandwidth)|
| WebSocket round-trip `/ws`     | 200 ms    | microcube spawn         |

### 5.3 mcp-query

| Route                  | SLA (p95) | Error budget hint                |
| ---------------------- | --------- | -------------------------------- |
| `POST /mcp` (mTLS)     | 800 ms    | `QUERY_TIMEOUT_MS` ceiling       |
| mTLS handshake         | 150 ms    | openssl verify + cert chain      |

---

## 6. Burn-rate alert wiring (Sentry + OTel)

The SLO + budget framework above is the *definition*. The actual alert
wiring lives in the observability stack.

### 6.1 Sentry alerts (errors)

```
Project: kickbox-audio
Alert:    "Bifrost /issue error rate"
Trigger:  Error count > 5 in 5 min OR error rate > 1% of /issue traffic
Route:    /api/bifrost/issue
Notify:   #oncall-kickbox (Slack)

Alert:    "Bifrost /hitl error rate"
Trigger:  Error count > 5 in 5 min
Route:    /api/bifrost/hitl
Notify:   #oncall-kickbox
```

### 6.2 OTel-based alerts (latency)

Use Honeycomb / Datadog burn-rate queries:

```text
# Honeycomb QUERY (templatized, run every minute)
{
  "time_range": "30d",
  "calculations": [
    {"op": "P95", "column": "duration_ms"}
  ],
  "filters": [
    {"column": "service.name",        "op": "=", "value": "kickbox-bifrost"},
    {"column": "http.target",          "op": "=", "value": "/api/bifrost/hitl"}
  ]
}

# Threshold: P95 > 1350 ms (= 1.5 × ROUTE_BUDGET_MS ceiling)
```

### 6.3 Vercel Analytics (PWA LCP)

```
Web Vitals:    LCP, FID, CLS
SLO breach:    LCP p75 > 2500 ms over the last 7 d
Notify:        #oncall-kickbox
```

---

## 7. Reporting

- **Weekly**: dashboard refresh in `lisa-dev-dashboard/` (or a dedicated
  SRE notebook). Top 3 issues by fingerprint, top 3 routes by p95,
  budgeted-out status.
- **Monthly**: review SLOs against 30-day rolling window. Adjust targets
  if the budget is wildly over- or under-consumed (this is the only
  legitimate reason to change a target — see SRE workbook §3).
- **Quarterly**: walk `docs/THREAT_MODEL.md` §7 cadence, link SLO
  deviations to threat-model residuals where relevant.

---

## 8. Compliance log

| Date       | Event                                                            |
| ---------- | ---------------------------------------------------------------- |
| 2026-06-28 | v1.3.0 baseline (this document)                                  |
| TBD        | First monthly SLO review                                         |
| TBD        | First quarterly threat-model cross-walk                         |
| TBD        | First annual DR drill (see [`docs/PRODUCTION_RUNBOOK.md §9`](./PRODUCTION_RUNBOOK.md)) |

---

## 9. Change log

| Date       | Change                                                                |
| ---------- | --------------------------------------------------------------------- |
| 2026-06-28 | v1.3.0 baseline (this document)                                       |
