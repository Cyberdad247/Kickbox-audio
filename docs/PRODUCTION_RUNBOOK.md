# Production Runbook — Kickbox-audio

> **Scope**: Operational playbook for the Cyberdad247/Kickbox-audio
> monorepo deployed to Vercel + Tailscale. Audience: on-call operators,
> SRE, security responders, and fork-maintainers.
>
> **Companion docs**: [`docs/SLO_BUDGETS.md`](./SLO_BUDGETS.md) (what to
> alert on), [`docs/THREAT_MODEL.md`](./THREAT_MODEL.md) (what to harden),
> [`SECURITY.md`](../SECURITY.md) (vuln disclosure), [`CHANGELOG.md`](../CHANGELOG.md).

---

## 1. Topology at a glance

| Surface         | Runtime         | Entrypoint                        | Hosting       | Auth                                            |
| --------------- | --------------- | --------------------------------- | ------------- | ----------------------------------------------- |
| **`apps/pwa`**  | Next.js 14 App  | `https://<vercel-domain>`         | Vercel        | Vercel edge headers + bifrost JWT forwarded     |
| **`apps/bifrost`** | Node 22 Express + WS | `wss://<tailscale>:3017`     | Tailscale node (pm2 + worker_threads) | HMAC + RBAC HS256 JWT                          |
| **`apps/mcp-query`** | Node 22 HTTP(S)   | `https://<tailscale>:7800`        | Tailscale node (pm2) | mTLS (client cert) OR Tailscale-only            |
| **`packages/db`** | Prisma / Postgres | `postgresql://<managed>`          | Managed PG    | DB role password + `connection_limit=5`         |

Trust boundary in one line: **Vercel (public) ↔ Tailscale (private mesh)
↔ Managed PG (private subnet)**. Bifrost is the only ingress inside
the mesh (its WS gateway serves both clients on the mesh and PWA on
Vercel via the Tailscale FQDN); mcp-query has no public ingress — Tailscale
mesh clients only.

> _Deployment model note — v1.3.0: Bifrost uses **`worker_threads`** for
> the MicrocubicMatrix (per `apps/bifrost/src/server.ts`); "Zero Docker"
> is a deliberate design choice to keep the gateway a single Node 22
> process supervised by pm2 / systemd on the Tailscale node._
> _A containerized deployment is a v1.4.0 candidate (see threat-model
> §6 residual risks)._

---

## 2. Required environment variables by surface

Consolidated from [`.env.example`](../.env.example). Empty values disable
the feature; defaults are dev-safe.

### `apps/bifrost` (gateway)

| Var                              | Purpose                                                  | Required in prod |
| -------------------------------- | -------------------------------------------------------- | ---------------- |
| `WEBHOOK_SECRET`                 | HMAC envelope key for `/api/bifrost/*`                   | **YES — Doppler** |
| `ACTION_SECRET`                  | HMAC envelope key for issuance                           | **YES — Doppler** |
| `DOPPLER_TOKEN`                  | Service token for vault reads                            | **YES in prod** |
| `DOPPLER_PROJECT`                | `kickbox-audio`                                          | YES              |
| `DOPPLER_CONFIG`                 | `prd`                                                    | YES              |
| `RBAC_ENABLED`                   | `true` (set `false` to bypass in dev/CI)                 | YES (`true`)     |
| `SENTRY_DSN`                     | Bifrost Sentry project DSN                               | strong-recommended |
| `OTEL_EXPORTER_OTLP_ENDPOINT`    | Honeycomb/Datadog OTLP gRPC endpoint                     | strong-recommended |
| `OTEL_SERVICE_NAME`              | `kickbox-bifrost`                                        | YES when OTel on |
| `LOG_LEVEL`                      | `info` prod / `debug` dev                                | YES              |
| `ISSUE_RATE_LIMIT_MAX`           | Bolt on issuance flood (`30` baseline)                   | YES              |
| `HITL_RATE_LIMIT_MAX`            | Bolt on HITL flood (`60` baseline)                       | YES              |

### `apps/pwa` (Next.js on Vercel)

| Var                              | Purpose                                                  | Required in prod |
| -------------------------------- | -------------------------------------------------------- | ---------------- |
| `NEXT_PUBLIC_APP_URL`            | Public site URL                                          | YES              |
| `NEXT_PUBLIC_BIFROST_WS_URL`     | `wss://<tailscale>:3017`                                 | YES              |
| `NEXT_PUBLIC_SENTRY_DSN`         | Browser Sentry DSN                                       | strong-recommended |
| `SENTRY_DSN`                     | Server Sentry DSN (for API routes)                       | recommended      |
| `SENTRY_TRACES_SAMPLE_RATE`      | `0.1` baseline (tune down for cost)                      | YES              |
| `BUNDLE_SIZE_BUDGET_BYTES`       | `153600` (= 150 KB), enforces v1.0 Green Computing CLI   | YES              |

### `apps/mcp-query` (Tailscale MCP guard)

| Var                              | Purpose                                                  | Required in prod |
| -------------------------------- | -------------------------------------------------------- | ---------------- |
| `MTLS_ENABLED`                   | `true` to wrap handler in HTTPS; falls back to Tailscale-only | YES (`true`)  |
| `MTLS_CA_CERT_PATH`              | `./certs/ca.pem` — generated by `scripts/ops/generate-mtls-certs.sh` | YES when MTLS on |
| `MTLS_SERVER_CERT_PATH`          | `./certs/server.pem`                                     | YES when MTLS on |
| `MTLS_SERVER_KEY_PATH`           | `./certs/server-key.pem` (chmod 600)                     | YES when MTLS on |
| `MTLS_REQUIRE_CLIENT_CERT`       | `true` to enforce client cert auth                       | YES (`true`)     |
| `OLLAMA_URL`                     | Local Ollama host for embeddings                         | YES              |
| `OLLAMA_MODEL`                   | Model tag (e.g. `nomic-embed-text`)                      | YES              |
| `QUERY_TIMEOUT_MS`               | `800` baseline                                            | YES              |

---

## 3. First-time deploy (cold start)

### 3.1 Generate the mTLS cert bundle (one-time, ~10 min)

Bifrost ↔ mcp-query mTLS is rooted in a self-signed CA created locally.
Re-generate only when certs expire (rotation = 90 days, see §6.3) OR
when a cert is compromised (rotation = immediately).

```bash
# From audit-kickbox-audio/
bash scripts/ops/generate-mtls-certs.sh
ls -la certs/             # ca.pem, server.pem, server-key.pem
chmod 600 certs/server-key.pem
```

### 3.2 Bootstrap the Doppler vault

Doppler is the source of truth for prod secrets — env vars on Vercel /
Tailscale are *fallbacks only* for emergency rollback.

```text
1. Sign in to https://dashboard.doppler.com/workplace/kickbox-audio
2. Create project: kickbox-audio
3. Create configs: prd, stg, dev
4. In prd, set secrets:
     WEBHOOK_SECRET   → openssl rand -hex 32
     ACTION_SECRET    → openssl rand -hex 32
5. Mint a service token (read-only is sufficient):
     Scope: project=kickbox-audio, config=prd
     Copy the token (dp.st.*) — it will not be shown again
6. Inject DOPPLER_TOKEN into:
     • Vercel project env (Production + Preview)
     • Tailscale node env (bifrost, mcp-query)
```

### 3.3 Deploy the PWA (Vercel)

Vercel auto-deploys on push to `main`. To deploy manually:

```bash
cd apps/pwa
vercel --prod --yes
# or via the Vercel UI: Deployments → Promote to Production
```

Vercel auto-deploys with **zero downgrade paths**, so the first
production deploy is also the highest-risk. Verify:

- Build green (Next.js + sentry config + bundle-size CI gate)
- `/api/health` returns 200 at the production URL
- Lighthouse run on the prod URL: LCP < 2.5s, CLS < 0.1

### 3.4 Deploy Bifrost + mcp-query (Tailscale nodes)

```bash
# From a Tailscale-authenticated SSH session on each node
ssh bifrost.prod.tailnode
cd /opt/audit-kickbox-audio
git pull --rebase origin main
cd apps/bifrost && npm ci --omit=dev --legacy-peer-deps
cd ../mcp-query && npm ci --omit=dev --legacy-peer-deps

# Restart via your process manager (pm2 / systemd / k8s)
pm2 restart bifrost
pm2 restart mcp-query
```

### 3.5 Smoke checks after every deploy

The `kba-smoke.yml` CI workflow exercises the HMAC handshake end-to-end
on every push. For *manual* prod verification, additionally run:

```bash
# 1. Bifrost health (must return 200 even during boot — see v1.2.0 fix)
curl -fsSL https://<tailscale>:3017/health

# 2. PWA health (different endpoint — Vercel edge)
curl -fsSL https://<vercel-domain>/api/health

# 3. PWA → Bifrost wiring (RBAC HS256 JWT round-trip)
node scripts/ops/live-anya-probe.mjs

# 4. axe-core a11y on the prod URL (Playwright)
cd apps/pwa && npm run test:e2e -- --project=chromium
```

---

## 4. Routine deploy (post-v1.0.0)

After the cold start, every change ships via PR → CI → merge to `main`
→ Vercel auto-deploy + Tailscale `git pull --rebase`.

```text
1. PR opened against `main` → kba-smoke.yml runs against the PR head
2. Reviewer approves → merge via squash
3. Vercel:
     • PWA: auto-build + auto-promote in ~2 minutes
     • Bundle-size CI gate runs in parallel (fails the merge if any
       route exceeds BUNDLE_SIZE_BUDGET_BYTES)
4. Tailscale nodes:
     • SSH to each node, `git pull --rebase origin main`, pm2 restart
     • Verify /health + /api/health both return 200
5. Open Sentry to confirm no errors jumped after the deploy
6. Update CHANGELOG with the version + SOVEREIGNTY_LEDGER with the cycle
```

**No force-pushes to `main`.** If a rollback is needed, see §5.

---

## 5. Rollback

### 5.1 Vercel (instant)

Vercel keeps every prior production deployment. Rollback is a single
click in the Vercel dashboard:

```text
Deployments → click the last-known-good deployment →
  • "Promote to Production" for an instant rollback
  • OR "Re-deploy" with the same env for a fresh build of an old SHA
```

Vercel rollback does **not** revert the git tree on `main`. The
"Promote to Production" path leaves a dangling commit. Always follow
up with a revert PR:

```bash
git revert <bad-sha>
git push origin HEAD:main   # opens a revert PR; CI runs again
```

### 5.2 Tailscale nodes (Bifrost + mcp-query)

```bash
ssh bifrost.prod.tailnode
cd /opt/audit-kickbox-audio
# Pin to the last-known-good SHA (NOT main)
git fetch origin <last-good-sha>
git checkout <last-good-sha>
pm2 restart bifrost
```

### 5.3 Database (last resort, only if a migration was applied)

Prisma migrations are **forward-only**. Do NOT downgrade the DB schema.
Instead:

1. Roll the app to a SHA that matches the current DB schema.
2. Forward-fix the bad migration in a follow-up PR:
   `npx prisma migrate resolve --rolled-back <migration-name>`
3. Re-apply the corrected migration in a new PR.

### 5.4 Secrets (rotate, don't roll back)

Rolling back a secret rotation would expose the old credential longer
than necessary. If a rotation goes wrong, **revert to a working**
credential and re-attempt the rotation with a smaller scope. See §6.

---

## 6. Secret rotation

### 6.1 HMAC envelope (`WEBHOOK_SECRET`, `ACTION_SECRET`)

Frequency: **every 90 days** (or immediately on suspected compromise).

```text
1. Doppler dashboard → kickbox-audio/prd → Generate new value:
     openssl rand -hex 32
2. Save as `WEBHOOK_SECRET_NEXT` (so the old value stays live)
3. Update the app code that imports it (no — the seed comes from Doppler
   at boot via getSecret(); no code change required)
4. pm2 restart bifrost → app picks up the new secret via Doppler cache
   refresh (5 min TTL inside  the 5 min CACHE_TTL_MS window). To force
   immediately: deploy a `clearSecretCache()` call + restart.
5. Once the new secret is verified live, delete `WEBHOOK_SECRET_NEXT`
6. Log the rotation in CAMELOT_OS/SOVEREIGNTY_LEDGER.md with the SHA
7. Verify /api/bifrost/issue + /api/bifrost/hitl accept the new secret
```

Downtime: **zero** if you keep both secrets live for the overlap
window and gate kba-smoke.yml on "new-secret" before deleting the old.

### 6.2 RBAC JWT signing

**v1.2.0 (HS256, legacy default):** reuses `WEBHOOK_SECRET` as the
symmetric signing/verification key. To rotate, follow §6.1 (publish
`WEBHOOK_SECRET_NEXT` then promote).

**v1.3.0 Tier 4.1 (RS256 — verification-side shipped):** the Bifrost
gateway can verify RS256 JWTs signed by an external OIDC IdP with
public-key cryptography. Bifrost never holds the private key; it is
a Resource Server, not an IdP. Operators flip on the new mode per
the procedure below.

```text
# --- one-time keypair generation (run on a secure workstation) ---
openssl genpkey -algorithm RSA -out /tmp/rbac-private.pem \
  -pkeyopt rsa_keygen_bits:2048
openssl rsa -in /tmp/rbac-private.pem -pubout -out /tmp/rbac-public.pem
chmod 600 /tmp/rbac-private.pem

# --- store the PUBLIC key in Doppler ---
# Doppler dashboard → kickbox-audio/prd → set:
#   bifrost/rbac-public-key-pem  ← contents of /tmp/rbac-public.pem
# (Multi-line PEM strings are first-class in Doppler; no escaping.)

# --- store the PRIVATE key in the IdP (NOT in Doppler / Vercel) ---
# Set the private key in your IdP's signing-key config (Auth0, Clerk,
# Cognito, etc.). The IdP signs RBAC JWTs with this key when issuing
# tokens for the PWA + any internal client.
# Treat /tmp/rbac-private.pem as a tier-1 secret. Delete after import
# into the IdP, and from any local backups. Rotation = §6.2 next.

# --- cutover ---
# 1. RBAC_JWT_ALGORITHM=RS256  (env on bifrost Tailscale node)
# 2. (optional) RBAC_OIDC_ISSUER + RBAC_OIDC_AUDIENCE if your IdP
#    sets iss + aud claims; both must be set together
# 3. pm2 restart bifrost  → ensureSecretsLoaded BLOCKS the new
#    RS256 path until loadRbacPublicKey resolves (5–30 s typically).
#    /health remains 200 during this window.
# 4. Verify a token minted by the IdP is accepted:
#      curl -H "Authorization: Bearer <jwt>" \
#           https://<tailscale>:3017/api/bifrost/state
#    Expected: 200 with the live state payload.
# 5. Verify a forged signature is rejected:
#      curl -H "Authorization: Bearer $(jwt-sign-rs256-with-wrong-key)" \
#           https://<tailscale>:3017/api/bifrost/state
#    Expected: 401 INVALID_TOKEN.
```

**Alg-confusion guard:** the default `RBAC_JWT_ALGORITHM=HS256`
verification path requires a strict env match. Switching to `RS256`
will silently BREAK any in-flight HS256 tokens until the IdP
re-issues them as RS256. Always do the IdP cutover AND the Bifrost
env flip in the same maintenance window.

**Rotation cadence:** every 90 days (or on suspected compromise).
Current implementation is single-key mode — `RBAC_PUBLIC_KEY`
points at the active public key only. Rotating means swapping the
vault value. A kid-based multi-key verifier (rotate by repointing
the IdP's `kid` header without downtime) is a v1.4.0 candidate
(see THREAT_MODEL §5 row 3).

Until then, the rotation sequence is:

```text
1. Generate NEW keypair (openssl as above)
2. Add NEW public key to Doppler alongside OLD (use vault versioning)
3. Flip RBAC_PUBLIC_KEY env to NEW through pm2 restart
4. Point IdP to NEW private key; mint a fresh token; verify on Bifrost
5. Once 24 h has elapsed with zero OLD-key signatures, delete OLD
   from Doppler + revoke OLD at the IdP
```

**What's not shipped in v1.3.0 Tier 4.1:** end-to-end OIDC dance
(IdP-side issuance plus the PWA inbound OIDC flow). That's a
v1.4.0 follow-on (see THREAT_MODEL §5 row 1) — the current cut is
the **verification-side**: Bifrost is ready to consume RS256 JWTs
as soon as the IdP starts issuing them.

### 6.3 mTLS certs (CA, server, client)

Frequency: **every 90 days** (or immediately on suspected compromise).

```bash
# 1. Regenerate the bundle (the script overwrites existing certs)
bash scripts/ops/generate-mtls-certs.sh

# 2. Verify the new cert chain
openssl verify -CAfile certs/ca.pem certs/server.pem

# 3. Sync the new certs to every Tailscale node (bifrost + mcp-query):
scp certs/{ca,server}.pem \
    certs/server-key.pem \
    bifrost.prod.tailnode:/opt/audit-kickbox-audio/certs/
scp certs/ca.pem certs/client.pem certs/client-key.pem \
    mcp-query.prod.tailnode:/opt/audit-kickbox-audio/certs/

# 4. Restart:
ssh bifrost.prod.tailnode 'pm2 restart bifrost'
ssh mcp-query.prod.tailnode 'pm2 restart mcp-query'

# 5. Verify mTLS handshake end-to-end:
curl --cacert certs/ca.pem \
     --cert certs/client.pem --key certs/client-key.pem \
     https://mcp-query.prod.tailnode:7800/health
```

If the rotation breaks clients, see §5.2 for the Tailscale rollback.

### 6.4 Database password

Frequency: **on personnel change** or every 180 days.

```text
1. Managed PG dashboard → Reset DATABASE_URL password
2. Doppler's DATABASE_URL secret → paste the new URL
3. pm2 restart bifrost  → connection pool re-establishes
4. Verify: SELECT 1 from the app (or check the /health WS count > 0)
```

---

## 7. Incident triage

### 7.1 Severity ladder

| Sev      | Symmetric criterion                                            | Page in        | First action                            |
| -------- | -------------------------------------------------------------- | -------------- | --------------------------------------- |
| **SEV-1** | Total PWA OR Bifrost OR mcp-query outage, no degradation path  | immediate      | Vercel rollback (§5.1) OR Tailscale (§5.2) |
| **SEV-2** | > 50% traffic degraded, SLO breach in progress                  | 15 min         | Open Sentry + Hypothesis-driven triage  |
| **SEV-3** | Minor degradation OR single-route 5xx burst                     | 1 h business   | File ticket, fix in next PR             |
| **SEV-4** | Cosmetic / a11y / perf-budget regression                       | next sprint    | Add to backlog                          |

### 7.2 First-responder checklist

```text
□ Check Vercel status:   https://vercel-status.com
□ Check Tailscale status: https://status.tailscale.com
□ Check Sentry:          project=kickbox-audio, last 1h error count
□ Check pwa /api/health
□ Check bifrost /health (must return 200 during boot per v1.2.0 fix)
□ Check Doppler token expiry (Dashboard → Tokens)
□ Check OTEL_EXPORTER_OTLP_ENDPOINT reachability (curl it)
□ Check mcp-query Pod health (Tailscale node)
□ Check PG connection pool:  SELECT count(*) FROM pg_stat_activity;
```

### 7.3 Common failure modes (with fix)

| Symptom                                          | Likely cause                            | Fix                                              |
| ------------------------------------------------ | --------------------------------------- | ------------------------------------------------ |
| `/health` returns 503 (`STARTING_UP`)             | Doppler unreachable                     | Check `DOPPLER_TOKEN` validity; falls back to env |
| `/api/bifrost/issue` returns `RBAC_MISCONFIGURED` | `WEBHOOK_SECRET` empty                | Set via Doppler or env; restart                  |
| `/api/bifrost/hitl` returns `INVALID_TOKEN`      | Signed with stale secret                | Rotate secret (§6.1); check env parity          |
| WebSocket `ECONNRESET`                           | Bifrost down or restarting              | Vercel rollback / Tailscale restart             |
| `OTLP 503` from Sentry                          | OTel collector quota exceeded           | Lower `SENTRY_TRACES_SAMPLE_RATE` to `0.05`     |
| PWA 504 on heavy traffic                         | Vercel cold start or rate-limit         | Bump issue rate-limit OR add Vercel cron warmup |

---

## 8. Observability dashboards

| Dashboard               | URL                                                         | What to watch                         |
| ----------------------- | ----------------------------------------------------------- | ------------------------------------- |
| Bifrost /health         | `https://<tailscale>:3017/health`                           | `clients` count (active WS)           |
| PWA /api/health         | `https://<vercel-domain>/api/health`                        | `uptime_s`, `version`                 |
| Sentry (errors)         | https://sentry.io → kickbox-audio → Errors                  | Error rate, top issue fingerprints    |
| Sentry (performance)    | https://sentry.io → kickbox-audio → Performance             | LCP, FID, CLS, route p75              |
| OTel (traces)           | Honeycomb/Datadog board (project=kickbox-bifrost)           | Hot traces, slow routes, REZERO rate |
| Vercel Analytics        | https://vercel.com → kickbox-audio → Analytics              | Top routes, edge p95                 |
| Bundle-size CI          | GitHub Actions → `bundle-size` job                          | Last 10 runs' per-route size          |

Set up burn-rate alerts per [`docs/SLO_BUDGETS.md`](./SLO_BUDGETS.md) §4.

---

## 9. Backup + disaster recovery

| Asset            | Backup mechanism                                 | RPO        | RTO        |
| ---------------- | ------------------------------------------------ | ---------- | ---------- |
| Managed PG       | Daily automated snapshots + 7-day PITR          | 24 h       | < 1 h      |
| GitHub `main`    | GitHub retains every commit (no force-push rule) | commit-level | commit-level |
| Doppler secrets  | Doppler retains version history of every secret | 5 min      | 5 min      |
| mTLS CA          | Backed up to 1Password + offline USB            | manual     | < 1 h      |
| Vercel builds    | Vercel retains every deployment (rollback = pick) | commit-level | commit-level |

**DR drill cadence**: every 6 months. Drill = "delete the prod
database, restore from PITR, confirm app comes up clean." Document in
[`docs/SLO_BUDGETS.md`](./SLO_BUDGETS.md) compliance log + the
CAMELOT-OS `SOVEREIGNTY_LEDGER.md` iteration log
(`C:\Users\vizio\CAMELOT_OS\SOVEREIGNTY_LEDGER.md`, NOT inside this repo).

---

## 10. Common operational commands

```bash
# App processes
pm2 status
pm2 logs bifrost --lines 50
pm2 restart bifrost
pm2 stop bifrost

# Secrets audit (CI-runnable)
node scripts/ops/secrets-audit.mjs

# Bundle-size check (post-build)
npx turbo run bundle-size

# mTLS cert inspection
openssl x509 -in certs/server.pem -noout -subject -dates -issuer
openssl verify -CAfile certs/ca.pem certs/server.pem

# Doppler token rotation (no app restart needed; cache TTL = 5 min)
# In Doppler dashboard → Tokens → Roll Service Token

# One-line PWA axe-smoke (Playwright)
cd apps/pwa && npx playwright test e2e/axe-smoke.spec.ts

# OTel trace count check (last 1 h via Datadog API; substitute your API)
curl -G "https://api.datadoghq.com/api/v1/analytics/search" \
     -d "query=sum:trace.express.request.hits{service:kickbox-bifrost}.as_count()" \
     -H "DD-API-KEY: $DD_API_KEY" -H "DD-APP-KEY: $DD_APP_KEY"
```

---

## 11. Change log

| Date       | Change                                                                |
| ---------- | --------------------------------------------------------------------- |
| 2026-06-28 | v1.3.0 baseline (this document)                                       |

Per-change audit trail in the CAMELOT-OS `SOVEREIGNTY_LEDGER.md`
(`C:\Users\vizio\CAMELOT_OS\SOVEREIGNTY_LEDGER.md` — parent repo, NOT
inside `audit-kickbox-audio/`). After every release, add a new entry
with: SHA, version, scope, signers, manual verification steps run,
verification outcome.
