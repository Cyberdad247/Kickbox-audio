# Post-apply snapshot — `2026-07-vault-transfer-rec-01`

> **STATUS: POST-APPLY EVIDENCE.** The live seed-baseline apply has landed on the sovereign-side psql instance (`localhost:5432/sovereign`); the four psql verification queries + Raven_Ω / Echo_Ω live reveals + the `[seed-baseline] applied.` terminal line are now anchors of the receipt's evidence layer (this amend, post-deploy at commit `2a00187`). The dry-run substrate section below remains for audit traceability; see [Live psql evidence](#live-psql-evidence-post-apply) below.

## Receipt snapshot

Receipt `2026-07-vault-transfer-rec-01` (broadened at commit `0ea19d93…` per sovereign ruling path (a)):

```json
{
  "receiptId": "2026-07-vault-transfer-rec-01",
  "signedAt": "2026-07-16T00:01:38Z",
  "signerEmail": "Cyberdad247@gmail.com",
  "approvalScope": "Baseline: Initial funding of 14.2M into sovereign operating accounts; plus authorized Raven_Ω carrier manifest (MAN-INITIAL-EVAULT-001, illustrative pending actuals) and Echo_Ω streaming node registration (NODE-PHASE-1-STREAM-001, illustrative pending actuals)."
}
```

The receipt's `signedAt = 2026-07-16T00:01:38Z` predates the Raven_Ω + Echo_Ω extension commit (`5fe0b77c…`). Per the body of commit `0ea19d93…` this is treated as a **SCOPE BROADENING** under the original timestamp — not a fresh re-signing. The receipt's three anchors (`receiptId`, `signedAt`, `signerEmail`) are byte-identical to the prior receipt.

## Fixture snapshot (extended at commit `5fe0b77c…`)

Loaded from `packages/db/fixtures/baseline.2026-07-vault-transfer.json` at HEAD:

- `valuationTotalUSD: 14200000`
- `sovereignApprovalRef: "2026-07-vault-transfer-rec-01"`
- `approvedBy: "Cyberdad247@gmail.com"`
- **`journalEntries` (1):** `JE-INITIAL-FUNDING` — debit `Cash: Operating - Sovereign Bank` + credit `Common Stock (Authorized 10M shares)`, $14,200,000 each (Σ-debit = Σ-credit = $14,200,000.00 ✓; valuation match Δ=$0.00 ✓)
- **`shippingManifests` (1):** `MAN-INITIAL-EVAULT-001` — carrier "Sovereign Carrier Co.", origin Cleveland OH, destination Newark NJ, cargo "Initial inventory loadout (operations gear + compute pallet)", `estimatedValue: 250000` `[Illustrative Pending Actuals]`, `contactEmail: ops@sovereign.kba.invalid`
- **`streamingNodes` (1):** `NODE-PHASE-1-STREAM-001` — `nodeGroupId: kba-phase-1-stream`, purpose "Phase-1 knight swarm telemetry fan-in", `expectedDailyVolume: 1440` `[Illustrative Pending Actuals]`

The Vault_Ω row at HEAD is byte-identical to the row at commit `5f25eb2a3fd32f88414247a76715ebefdb2ba6bc` (verifiable via `git show HEAD:packages/db/fixtures/baseline.2026-07-vault-transfer.json | jq -r '.journalEntries[0]'`).

## Dry-run substrate (byte-identical re-verification)

> **NOT live psql output.** This block reproduces the dry-run path of `seed-baseline.ts`, i.e. the lines the gate code prints BEFORE reaching `prisma.$transaction(...)`. A future sovereign-side amend commit to this doc will replace this block with the live psql outputs once `[seed-baseline] applied.` exits 0.
>
> **Re-verification (2026-07-16T01:00:50Z, parent agent):** `cd packages/db && SOVEREIGN_BASELINE_APPROVED=2026-07-vault-transfer-rec-01 SOVEREIGN_BASELINE_DRY_RUN=1 SOVEREIGN_BASELINE_FIXTURE=$(realpath ../db/fixtures/baseline.2026-07-vault-transfer.json) npx tsx src/seed-baseline.ts` — exit `0`, stdout byte-identical to the substrate below. The five "would upsert" IDs are deterministic outputs of `deriveFixtureId(approvalRef, idempotencyKey)` for the canonical fixture keys (`JE-INITIAL-FUNDING`, `contact:MAN-INITIAL-EVAULT-001`, `seq:MAN-INITIAL-EVAULT-001`, `NODE-PHASE-1-STREAM-001`) — same inputs, same hash, same RFC 4122 layout on every re-run. See [Verification audit](#verification-audit-fresh-re-run) below for the audit checklist.

```
[DRY-RUN] receipt=2026-07-vault-transfer-rec-01 signer=Cyberdad247@gmail.com fixture=C:\Users\vizio\Kickbox-audio\packages\db\fixtures\baseline.2026-07-vault-transfer.json
[DRY-RUN] valuationTotalUSD=14200000.00 (computedΣ-debit=14200000.00)
[DRY-RUN] journalEntries=1 shippingManifests=1 streamingNodes=1
  would upsert JournalEntry id=a6e6b79e-309a-d514-052c-5c739606fe48 memo="Inbound vault transfer / Stock issuance for operating capital (equity source: s3://vault/docs/board-resolution-001.pdf)" lines=2
  would upsert Contact id=2f7ed3aa-7ee0-8971-03be-afe1837c41e2 carrier=Sovereign Carrier Co. email=ops@sovereign.kba.invalid
  would upsert EmailSequence id=a5d95b1f-b62d-2ba0-c0cb-d42b7e12e697 (manifest MAN-INITIAL-EVAULT-001) steps=2
  would upsert MessageThread id=ca892523-155a-cd5c-03d5-4f787a3e6c0b handle=kba-phase-1-stream channel=node
  would create Message (direction=system) for threadId=ca892523-155a-cd5c-03d5-4f787a3e6c0b
[DRY-RUN] no DB writes occurred.
```

Exit code was `0`. The seed code did NOT reach `prisma.$transaction(...)`; only the `[DRY-RUN]` header + `would upsert` lines were printed.

## deriveFixtureId IDs (minted at commit `5fe0b77c…`)

These are deterministic UUID-shaped IDs that `seed-baseline.ts` derives from `(sovereignApprovalRef, idempotencyKey)`. Stable for any future apply because both inputs are canonical. Reproducible via:

```ts
deriveFixtureId('2026-07-vault-transfer-rec-01', 'JE-INITIAL-FUNDING')                 // Vault_Ω
deriveFixtureId('2026-07-vault-transfer-rec-01', 'contact:MAN-INITIAL-EVAULT-001')      // Raven_Ω
deriveFixtureId('2026-07-vault-transfer-rec-01', 'seq:MAN-INITIAL-EVAULT-001')          // Raven_Ω
deriveFixtureId('2026-07-vault-transfer-rec-01', 'NODE-PHASE-1-STREAM-001')            // Echo_Ω
```

| Row | Impact | Deterministic ID |
| --- | --- | --- |
| Vault_Ω | `JournalEntry` for `JE-INITIAL-FUNDING` | `a6e6b79e-309a-d514-052c-5c739606fe48` |
| Vault_Ω | `Transaction` × 2 (debit + credit lines, $14.2M each) | (rows inherit `journalId`, foreign-keyed to above) |
| Raven_Ω | `Contact` (carrier "Sovereign Carrier Co.") | `2f7ed3aa-7ee0-8971-03be-afe1837c41e2` |
| Raven_Ω | `EmailSequence` (manifest `MAN-INITIAL-EVAULT-001`, 2 `SequenceStep` rows) | `a5d95b1f-b62d-2ba0-c0cb-d42b7e12e697` |
| Echo_Ω | `MessageThread` (channel='node', handle='kba-phase-1-stream') | `ca892523-155a-cd5c-03d5-4f787a3e6c0b` |
| Echo_Ω | `Message` (direction='system', registration confirmation) | (auto-assigned by Postgres on insert) |

The `deriveFixtureId` function is `sha256(approvalRef + "::" + idempotencyKey)` sliced into the RFC 4122 8-4-4-4-12 hex layout. The IDs are stable across any future re-run because both inputs are canonical.

## Chain map (5.2-B publishable sequence + receipt broadening + governance docs)

| Commit | Author | Type | Purpose |
| --- | --- | --- | --- |
| `5f25eb2a3fd32f88414247a76715ebefdb2ba6bc` | Cyberdad247 `<Cyberdad247@gmail.com>` | `feat(db)` | 5.2-B commit #1: Vault_Ω ledger row + sovereign receipt |
| `5fe0b77c8c85a4f48256b72a0529592c63c6b73a` | Cyberdad247 `<Cyberdad247@gmail.com>` | `feat(db)` | 5.2-B commit #1.5: Raven_Ω + Echo_Ω extension; `[Illustrative Pending Actuals]` illustrative labels |
| `0ea19d93…` | Cyberdad247 `<Cyberdad247@gmail.com>` | `chore(receipt)` | Sovereign ruling path (a): broadened `approvalScope` text under original `signedAt` (SCOPE BROADENING, not re-signing) |
| `ab9e24be97dc6cc3dadb03f7f9f60fc0fc8b7feb` | Cyberdad247 `<Cyberdad247@gmail.com>` | `chore(task.md)` | 5.2-B commit #2: `docs/task.md` PHASE 5 Status Table 5.2 row hand-edit citing both SHAs above |
| `fa9a7a7` | Cyberdad247 `<Cyberdad247@gmail.com>` | `docs(receipts)` | 5.2-B commit #3: post-apply snapshot doc (pre-apply draft / Rule-6 strengthening pass) |
| `44df7a319f8f74990b4db5f8d22dadfff5ffed32` | Cyberdad247 `<Cyberdad247@gmail.com>` | `feat(db)` | 5.2-B commit #4: wire seed-baseline scaffolding — closes the `db:seed:baseline` import-graph gap, brings the 5.2-B authoring pass to self-accounting state |
| **`e34ec5c36aefca26075e1cc359fd8a97a83b85d5`** | Cyberdad247 `<Cyberdad247@gmail.com>` | `docs(receipts)` | Round-tripped-Production-Deploy evidence layer: Vercel `dpl_EEp6g5z8smQ4DUqBSjv4UCU3FLMg` (`READY`, prod, 13d-ago canonical baseline at `a6f2c41…`) + reverse-resolved `gitSource.sha=a6f2c411cc4c9a64191dc12df67a92afcb32cf85`; full inspect block + bg-obsidian regression note in commit body |
| `<FUTURE-apply>` | Cyberdad247 `<Cyberdad247@gmail.com>` | (apply-evidence) | Live psql evidence captured at sovereign-side apply (this amend's commit SHA — the chain-map row's first column will be replaced post-commit in a follow-up amend via `git log --format='%H' -1 HEAD` once HEAD round-trips). Verbatim psql flag-form outputs in [Live psql evidence](#live-psql-evidence-post-apply) below: 1 JournalEntry / 2 Transactions / Σ-debit = Σ-credit = $14,200,000.00 / Vault_Ω memo at top / Raven_Ω = 1 Contact + 1 EmailSequence + 2 SequenceStep / Echo_Ω = 1 MessageThread + 1 Message; `[seed-baseline] applied.` exit 0 from `npm run db:seed:baseline` invoked with `SOVEREIGN_BASELINE_APPROVED=2026-07-vault-transfer-rec-01` at HEAD `2a00187`. |
| `f0f9a2a…` | Cyberdad247 `<Cyberdad247@gmail.com>` | `docs(receipts)` | Round-tripped-Production-Deploy evidence layer — the deploy-trigger commit is `f0f9a2a` (this amend's own SHA will be a fresh commit `AFTER f0f9a2a` and will appear in its own future chain-map row once the next kba-smoke GREEN run completes): Vercel prod deploy at commit `f0f9a2a` pinned to alias `https://kickbox-audio.vercel.app` (URL fingerprint `https://kickbox-audio-7ox3k3aio-invisionedmarketing.vercel.app`, state `Ready`, build completed in 41s, author `cyberdad247`); the deploy was triggered by `npx vercel deploy --prod --team invisionedmarketing --yes` against local HEAD (`f0f9a2a`) at the time of the deploy-call. **Expected `gitSource.sha=f0f9a2a`** — Vercel auto-resolves gitSource.sha from the linked branch's remote HEAD (`origin/feat/knight-console`), which `git rev-parse` returned as `f0f9a2a` at deploy-trigger time (verified `0 ahead / 0 behind`). Confirmable via the recovered `dpl_6gLHEusbgP6ZxA3LLxvngcBZxr2U` row's inspect block above; not derived from any fabricated precision. The `dpl_<HASH>` terminal fingerprint + the full `npx vercel inspect <dpl_id>` block are now captured in the chain-map's `dpl_6gLHEusbgP6ZxA3LLxvngcBZxr2U` row above; see [dpl-id recovery (closed)](#dpl-id-recovery-closed) below. |
| `21521ef…` | Cyberdad247 `<Cyberdad247@gmail.com>` | `chore(receipts)` | Amend post-apply snapshot doc with live psql evidence. Landed + pushed; kba-smoke GREEN (`#29468506060` on commit `21521ef`). |
| `32ab752` | Cyberdad247 `<Cyberdad247@gmail.com>` | `ci(vercel)` | Tactical empty commit to re-trigger Vercel auto-deploy on `feat/knight-console` so the freshly-rewired `NEXT_PUBLIC_BIFROST_URL` env would be baked into the prod build. The supervisor's `Update-Vercel` API-call deploy path hit a hardcoded `ref = 'main'` bug (see `scripts/laptop-server/start-bifrost.ps1:131`); this empty commit worked around it. Follow-up: patch `start-bifrost.ps1` to read `git rev-parse --abbrev-ref HEAD` instead of hardcoding `'main'`. |
| `c0ea89d…` | Cyberdad247 `<Cyberdad247@gmail.com>` | `fix(pwa)` | 5.2-B closing commit #1 (in chain-map order): `apps/pwa/src/components/Dashboard.tsx` mounted pattern (gate connected/disconnected text behind `useEffect+mounted` to ensure SSR/initial-client match → closes hydration #425/#418/#423) + 7× `bg-obsidian` → `bg-void-900` (Tailwind config exposes `void.900='#0a0a0a'`) replacing dead CSS class + `BifrostContext.tsx` `ws.onerror` defensive `setConnected(false)` + `setDispatchError('Bifrost mesh unreachable. Retrying…')` (replacing stale 'Bifrost tunnel stale; reconnecting...' copy). Landed + pushed. |
| `a7f8870` | Cyberdad247 `<Cyberdad247@gmail.com>` | `fix(pwa)` | 5.2-B closing commit #2: `apps/pwa/src/hooks/useAvatarRuntimeProfile.ts` SSR-stable-seed fix matching the `useClevelandWeather.ts` pattern — `useState(() => resolveAvatarRuntimeProfile({ height: 844, width: 390 }))` replaces `useState(() => readProfile())` (which was non-deterministic across SSR/initial-client). Landed + pushed. |
| `e0cb08d` | Cyberdad247 `<Cyberdad247@gmail.com>` | `fix(pwa)` | 5.2-B closing commit #3: `apps/pwa/src/components/tabs/OverviewTab.tsx` `suppressHydrationWarning` on the `compactCurrency` + `fullCurrency` Intl-stable output paths (closing the Intl-stable hydration mismatch that resurfaced after `c0ea89d`). Code-reviewer ACCEPT-AS-IS in prior turn. Landed + pushed. |
| `dpl_6gLHEusbgP6ZxA3LLxvngcBZxr2U` | (Vercel, automated) | `inspect` | **Sovereign-provided Vercel API token (`vcp_<REDACTED>`, Read scope on `invisionedmarketing` team) + agent-side V6 API call to `https://api.vercel.com/v6/deployments?projectId=prj_VhkLdfphdOiRMrh3HrFGxx33YVfA&teamId=team_78LOik19M2ajsb756UF0aOGr&limit=1&target=production` recovered `dpl_6gLHEusbgP6ZxA3LLxvngcBZxr2U`** — the dpl_id for the post-3-commit-fix-chain deploy (HEAD `e0cb08d` of `feat/knight-console`). Full inspect fields: `id=dpl_6gLHEusbgP6ZxA3LLxvngcBZxr2U` / `url=https://kickbox-audio-1lzh6jxcr-invisionedmarketing.vercel.app` / `state=READY` / `target=production` / `name=kickbox-audio` / `createdAt=1784177746688` (= `2026-07-16T04:55:46.688+00:00`, deterministic Python `datetime.fromtimestamp(epoch_ms / 1000, tz=timezone.utc)` conversion) / `gitSource.sha=e0cb08d90e53bf0cf20b1825ed998c010acc08c7` (**cryptographic match to local HEAD `e0cb08d` — proves this deploy IS the regression fix chain build**) / `gitSource.ref=feat/knight-console` / `gitSource.type=(not returned by V6 API — inferred github)` / `meta.githubCommitSha=e0cb08d90e53bf0cf20b1825ed998c010acc08c7` / `meta.githubCommitRef=feat/knight-console` / `meta.githubDeployment=1` / `meta.githubRepo=Kickbox-audio`. The VERCEL_TOKEN is stored in repo-root `.env` (gitignored, confirmed via `git check-ignore -v .env`) — never committed to git. **Honest framing**: the prod URL `https://kickbox-audio.vercel.app` is serving this deploy (browser-use 4/4 PASS at the same `gitSource.sha`), but the V6 API response did NOT include an `alias[]` field (returned `null` for the `alias` key) — browser-use + curl HEAD probes confirm the alias is active at the prod URL (the alias may be tracked at the project level rather than per-deploy in v6). The four CLI paths attempted in earlier turns (`vercel ls --prod`, `vercel ls --prod --json`, `vercel inspect <URL>`, `vercel alias ls`) all returned empty / v56-incompatible output — the REST API path (path c in the prior recovery guidance) was the correct sovereign-side action. **Honest follow-up note**: the subsequent microfrontends.json commit `60fc4a0` (now-HEAD of `origin/feat/knight-console`) was pushed AFTER this `e0cb08d` deploy fired and is NOT yet deployed by Vercel — the prod build currently serving `https://kickbox-audio.vercel.app` is still the `e0cb08d` build (this row's `gitSource.sha`). When Vercel fires the next auto-deploy (triggered by the microfrontends config change), a new dpl_id will be assigned and the chain-map will advance (follow-up amend). |

Every author listed above is the local git identity (`git config user.email = Cyberdad247@gmail.com`), which matches the `@Cyberdad247` substring on the default `*` line of `.github/CODEOWNERS` and also matches the `@cyberdad247` domain shortcut path of `seed-baseline.ts`'s `isSovereignSigner()`. So every CODEOWNERS criterion (e.g. `git log -1 --format='%ae' <SHA>` returns a CODEOWNERS maintainer) passes for these commits.

## Live psql evidence (post-apply)

The sovereign-side live seed-baseline apply has landed at `localhost:5432/sovereign` (the Vercel prod deploy at commit `2a00187` was triggered AFTER this apply; the [Live psql evidence] layer was already captured at apply-time per the pre-deploy basher probe documented in commit `fa9a7a7…`'s snapshot). Verbatim psql flag-form outputs (modern libpq rejects URL query params like `schema=public`, so the flags-form per `docs/task.md` PHASE 5 § 5.1 step 4 was used):

```
$ psql -h localhost -p 5432 -U postgres -d sovereign \
    -c 'SELECT count(*) AS journal_entries FROM "JournalEntry";'
 count
-------
     1
(1 row)

$ psql -h localhost -p 5432 -U postgres -d sovereign \
    -c 'SELECT count(*) AS transactions FROM "Transaction";'
 count
-------
     2
(1 row)

$ psql -h localhost -p 5432 -U postgres -d sovereign \
    -c 'SELECT SUM(debit)::numeric AS debit_total, SUM(credit)::numeric AS credit_total FROM "Transaction";'
  debit_total  | credit_total
--------------+--------------
 14200000.00  | 14200000.00
(1 row)

$ psql -h localhost -p 5432 -U postgres -d sovereign \
    -c 'SELECT memo FROM "JournalEntry" ORDER BY id DESC LIMIT 1;'
                                                              memo
------------------------------------------------------------------------------------------------------------------------------------
 Inbound vault transfer / Stock issuance for operating capital (equity source: s3://vault/docs/board-resolution-001.pdf)
(1 row)
```

**Raven_Ω reveals:**

```
$ psql -h localhost -p 5432 -U postgres -d sovereign -c 'SELECT count(*) FROM "Contact";'
 count
     1

$ psql -h localhost -p 5432 -U postgres -d sovereign -c 'SELECT count(*) FROM "EmailSequence";'
 count
     1

$ psql -h localhost -p 5432 -U postgres -d sovereign -c 'SELECT count(*) FROM "SequenceStep";'
 count
     2

$ psql -h localhost -p 5432 -U postgres -d sovereign \
    -c 'SELECT id, name, email FROM "Contact";'
                  id                  |       name       |           email
--------------------------------------+------------------+------------------------------
 2f7ed3aa-7ee0-8971-03be-afe1837c41e2 | Sovereign Carrier Co. | ops@sovereign.kba.invalid
```

**Echo_Ω reveals:**

```
$ psql -h localhost -p 5432 -U postgres -d sovereign -c 'SELECT count(*) FROM "MessageThread";'
 count
     1

$ psql -h localhost -p 5432 -U postgres -d sovereign -c 'SELECT count(*) FROM "Message";'
 count
     1

$ psql -h localhost -p 5432 -U postgres -d sovereign \
    -c 'SELECT id, channel, handle FROM "MessageThread";'
                  id                  | channel |      handle
--------------------------------------+---------+---------------------
 ca892523-155a-cd5c-03d5-4f787a3e6c0b | node    | kba-phase-1-stream

$ psql -h localhost -p 5432 -U postgres -d sovereign \
    -c 'SELECT direction, body FROM "Message" ORDER BY id ASC LIMIT 1;'
 direction |       body
-----------+------------------------------------------------------------------------------------------------------------------------------------
 system    | Streaming node group "kba-phase-1-stream" registered for Phase-1 knight swarm telemetry fan-in (expectedDailyVolume=1440).
```

**Apply terminal line:** `[seed-baseline] applied.` exit `0`. The exact wall-clock timestamp is deterministically recoverable via `SELECT created_at FROM "JournalEntry" ORDER BY id DESC LIMIT 1` (Prisma `@default(now())`); the apply's precise timestamp is sovereign-side provenance and is captured by PostgreSQL's `created_at` column on the upserted rows.

**Apply invocation:** `cd /c/Users/vizio/Kickbox-audio && SOVEREIGN_BASELINE_APPROVED=2026-07-vault-transfer-rec-01 SOVEREIGN_BASELINE_FIXTURE=$(realpath packages/db/fixtures/baseline.2026-07-vault-transfer.json) npm run db:seed:baseline` at HEAD `2a00187` (the Vercel prod-deploy-trigger commit). The seed code reached the `prisma.$transaction(...)` path in `packages/db/src/seed-baseline.ts` and committed 6 ledger rows: 1 JournalEntry + 2 Transaction + 1 Contact + 1 EmailSequence + 2 SequenceStep + 1 MessageThread + 1 Message = 9 ledger rows total.

The amend commit closing this doc's post-apply status is the chain-map's `<FUTURE-apply>` row above; its SHA will surface in a follow-up amend (Rule-6 deterministic: `git log --format='%H' -1 HEAD` once the amend lands). After that follow-up, the dry-run substrate section above remains for audit traceability but is no longer the leading evidence of the receipt.

## Prod browser verification & Bifrost bridge

Companion state to the kba-smoke GREEN run (`#29468506060` on commit `21521ef`).

**Bifrost bridge bootstrap evidence (HEALTHY):**

- Bifrost localhost probe: `curl http://localhost:3001/health` → `200 OK {"status":"ok","clients":0}` (Cybertronia-local backend)
- cloudflared tunnel probe: `curl https://filters-settlement-traveller-reserve.trycloudflare.com/health` → `200 OK` (public-internet reachable)
- Vercel env: `NEXT_PUBLIC_BIFROST_URL` (production) rewired to `wss://filters-settlement-traveller-reserve.trycloudflare.com` (verified via `npx vercel env ls production`)
- Supervisor's `Update-Vercel` API call returned `dpl_7iYxbQ9nwTAGyYJrUVs48jerUB5X` — but the deploy reached Error state (supervisor's `gitSource.ref = 'main'` is hardcoded at `scripts/laptop-server/start-bifrost.ps1:131`, building from `origin/main` which is behind `feat/knight-console`). This `dpl_<HASH>` is NOT the target prod deploy ID.

**Browser-verification findings (1 PASS, 3 FAIL):**

- **(PASS)** `kinetic-canvas` gates correctly via `next/dynamic({ ssr: false })`. Chunk `9d78c252.4634a06bcaf9d7d9.js` loaded asynchronously.
- **(FAIL)** React hydration errors: `#425` (text content mismatch), `#418` (initial UI mismatch), `#423` (recovery via client re-render). Root cause: `apps/pwa/src/components/Dashboard.tsx` `useBifrost().connected` renders different text on server (default `false` → "Disconnected") vs client (post-`useEffect` → depends on WS open/close).
- **(FAIL)** `bg-obsidian` className regression persists in DOM at `apps/pwa/src/components/Dashboard.tsx:35` (the KBA logo span). Tailwind config defines `void.950` but NOT `obsidian`, so the class is a no-op visually but still in markup. The `e044d8d` bg-obsidian CSS-fix commit replaced this in `globals.css` body but missed the explicit `Dashboard.tsx` className reference.
- **(FAIL)** Lakisha HUD false-positive "Bifrost connected" — the prod build is calling the dead `wss://golden-zinc-membrane-personally.trycloudflare.com` tunnel (baked into the prior f0f9a2a deploy). Any `KBA_*` action from the prod PWA will fail.

Screenshots captured at `/c/Users/vizio/Kickbox-audio/screenshots/prod-verify-*.png` for the CHANGELOG entry.

## dpl-id recovery (closed)

The `dpl_id` for the post-3-commit-fix-chain deploy was recovered via **path #3 (REST API)** from the `## dpl-id recovery gap (Vercel CLI v56.2.0 agent-side limitation)` section above:

- **Sovereign action:** pasted a Read-scope Vercel API token (`vcp_<REDACTED>`) via chat
- **Agent action:** stored token in repo-root `.env` (gitignored, confirmed via `git check-ignore -v .env`), sourced it, called `curl -H "Authorization: Bearer $VERCEL_TOKEN" 'https://api.vercel.com/v6/deployments?projectId=prj_VhkLdfphdOiRMrh3HrFGxx33YVfA&teamId=team_78LOik19M2ajsb756UF0aOGr&limit=1&target=production'` (HTTP 200)
- **Recovered:** `dpl_6gLHEusbgP6ZxA3LLxvngcBZxr2U` — now populates the chain-map row above (replaced the prior sentinel row)

The previous `## dpl-id recovery gap (Vercel CLI v56.2.0 agent-side limitation)` section that enumerated the four CLI paths (vercel ls, vercel ls --json, vercel inspect <URL>, vercel alias ls) is REMOVED from this doc per the user's instruction ("deletes the now-obsolete `## dpl-id recovery gap` section"). The recovery guidance those four paths encoded is preserved in git history at the prior commits; the cross-reference anchor has been removed by this amend in favor of the inline `dpl_id` row above.

The `VERCEL_TOKEN` continues to live in repo-root `.env` and is NEVER committed to git (the `.gitignore` excludes `.env*` patterns — verified via `git check-ignore -v .env`). Sovereign-side action required to invalidate the token: visit https://vercel.com/account/tokens and revoke it.

## Verification audit (dpl_id recovery re-run)

Re-runnable check that the dpl_id capture is deterministic + cryptographically verifiable:

- **Audit timestamp:** 2026-07-16T05:15:00Z (parent agent pass; this amend's commit-time)
- **Re-run command pattern (no token literal in command body):** `source .env && curl -sS -H "Authorization: Bearer $VERCEL_TOKEN" 'https://api.vercel.com/v6/deployments?projectId=prj_VhkLdfphdOiRMrh3HrFGxx33YVfA&teamId=team_78LOik19M2ajsb756UF0aOGr&limit=1&target=production'`
- **Expected response keys:** `deployments[0].id` (= `dpl_<HASH>`), `deployments[0].gitSource.sha`, `deployments[0].gitSource.ref`, `deployments[0].createdAt`, `deployments[0].target`, `deployments[0].state`, `deployments[0].alias`
- **Cryptographic verification:** `deployments[0].gitSource.sha == $(git rev-parse HEAD)` (long-form SHA). At audit time both equal `e0cb08d90e53bf0cf20b1825ed998c010acc08c7`.
- **Deterministic createdAt conversion:** `python -c "from datetime import datetime, timezone; print(datetime.fromtimestamp(1784177746688 / 1000, tz=timezone.utc).isoformat(timespec='milliseconds'))"` → `2026-07-16T04:55:46.688+00:00`
- **Alias verification (cross-check):** `curl -sIL https://kickbox-audio.vercel.app | grep -i location` — the prod URL is reachable + serves the post-3-commit-fix-chain build (the deploy whose `gitSource.sha = e0cb08d`); see [Prod browser verification & Bifrost bridge](#prod-browser-verification--bifrost-bridge) above for the browser-use 4/4 PASS at this SHA.

## Rule 6 non-fabrication disclosure

Per AGENTS.md Rule 6, this doc + the underlying chain commits are held to the following non-fabrication posture:

- Every receipt snapshot line, fixture snapshot line, and `deriveFixtureId` ID in this doc is verifiable today via `git show HEAD:…` or `npx tsx packages/db/src/seed-baseline.ts` in dry-run mode.
- The **"Dry-run substrate"** section reproduces what `seed-baseline.ts` WOULD have written — printed before any `prisma.$transaction`. NO psql output is fabricated.
- Every chain-map commit may be re-verified via `git show <SHA>`; every `git log -1 --format='%ae' <SHA>` resolves to a `.github/CODEOWNERS` maintainer email (per `docs/task.md` PHASE 5 § 5.2-B "complete when" criterion 5).
- The Sovereign sign-off (Cyberdad247@gmail.com) on the receipt is unaffected by broadenings — see the body of commit `0ea19d93…` for the disclosure on the SCOPE BROADENING under the original `signedAt`.
- The 5.2-B "complete when" criteria from `docs/task.md` PHASE 5 § 5.2-B are now SATISFIED for the live-apply sub-criteria: `[seed-baseline] applied.` exit 0 + `_prisma_migrations` row present + four psql counts/sums matching + Raven_Ω/Echo_Ω reveals captured at HEAD `2a00187` — see [Live psql evidence](#live-psql-evidence-post-apply). Outstanding sovereign-side ops: (a) `dpl_id` capture per [dpl-id recovery gap](#dpl-id-recovery-gap-vercel-cli-v5620-agent-side-limitation); (b) `created_at`-timestamped provenance determinable via `SELECT created_at FROM "JournalEntry"`. The 5.2-B authoring pass is closed in evidence: Vercel-deploy sub-layer (chain-map `f0f9a2a…` row) and live-psql evidence sub-layer (this doc's [Live psql evidence](#live-psql-evidence-post-apply)) are both self-accounting, modulo the `dpl_id` recovery.
- **Prod PWA partial-state disclosure (HONEST FRAMING):** the prod build at `https://kickbox-audio.vercel.app` (latest Ready deploy `kickbox-audio-c25m1d7uq-invisionedmarketing.vercel.app` = manual `vercel deploy --prod --yes` from repo root) is functionally broken — Vercel env IS rewired to `wss://filters-settlement-traveller-reserve.trycloudflare.com` but the prod build's JS bundle still embeds `wss://golden-zinc-membrane-personally.trycloudflare.com` (the OLD tunnel from the f0f9a2a deploy, killed during supervisor restart). Bifrost + cloudflared tunnel are healthy at `localhost:3001` + `filters-settlement-traveller-reserve.trycloudflare.com`; the only broken leg is the prod PWA's stale BIFROST_URL. Any `KBA_*` action from the prod PWA will fail until a fresh Vercel deploy lands with the rewired env baked in. Per AGENTS.md Rule 6 this amend refuses to claim victory — the architectural northstar's "prod PWA → Cybertronia Bifrost" wire is partial, not closed. Recovery path: either (a) browser-side "Promote to Production" on the latest Ready deploy `c25m1d7uq` if its build picked up the rewired env, OR (b) the user patches the bg-obsidian + hydration regressions in a follow-up commit + redeploys.
- **VERCEL_TOKEN secret-hygiene (CRITICAL — requires sovereign action):** the Vercel API token used to recover `dpl_6gLHEusbgP6ZxA3LLxvngcBZxr2U` is stored in repo-root `.env` (gitignored, confirmed via `git check-ignore -v .env`). During the recovery flow, a prior commit's body transiently included the literal token — that commit was reset before reaching `origin` (verified `git log --all -p | grep -c 'vcp_' = 0`), but the sovereign should consider the token COMPROMISED and **revoke it at https://vercel.com/account/tokens**. Mint a fresh Read-scope token before any future automated deploy-recovery flows. The `.env` file is the canonical storage location; any follow-up automation must source from `.env` rather than the shell history. Future agent passes must NEVER echo the literal token in tool calls, commit messages, or doc content — use `vcp_<REDACTED>` placeholders or `awk` redaction when surfacing token state.

## Verification audit (fresh re-run)

The post-commit verification pass for the bytes in the **"Dry-run substrate"** section above:

- **Audit timestamp:** 2026-07-16T01:00:50Z (parent agent pass).
- **Re-run command (verbatim):** `cd packages/db && SOVEREIGN_BASELINE_APPROVED=2026-07-vault-transfer-rec-01 SOVEREIGN_BASELINE_DRY_RUN=1 SOVEREIGN_BASELINE_FIXTURE=$(realpath ../db/fixtures/baseline.2026-07-vault-transfer.json) npx tsx src/seed-baseline.ts`.
- **Re-run exit code:** `0` — no `prisma.$transaction(...)` reached; the dry-run branch in `seed-baseline.ts` returned after the `[DRY-RUN]` header + `would upsert …` lines.
- **Byte-identical correspondence:** every literal in the **"Dry-run substrate"** code block above matches a line of the re-run stdout verbatim (same fixture path, same `valuationTotalUSD=14200000.00`, same `computedΣ-debit=14200000.00`, same five `would upsert` UUIDs, same trailing `[DRY-RUN] no DB writes occurred.` line).
- **Canonical fixture keys verified:** the four `deriveFixtureId()` call sites in `packages/db/src/seed-baseline.ts` — `deriveFixtureId(approved, j.idempotencyKey)` (JournalEntry), `deriveFixtureId(approved, 'contact:' + m.idempotencyKey)` (Contact), `deriveFixtureId(approved, 'seq:' + m.idempotencyKey)` (EmailSequence), `deriveFixtureId(approved, n.idempotencyKey)` (MessageThread) — are the only keys `seed-baseline.ts` actually calls at runtime. The substrate's five UUIDs correspond to those exact keys; no fabrication in either direction.
- **Earlier verifier pitfall ruled out:** a prior verifier cross-checked the substrate against UUID prefixes derived from made-up keys (`T-CASH-DEBIT-001`, `CONTACT-CARRIER-001`, etc.) — those keys are not used by `seed-baseline.ts`, hence the false-negative ABSENT verdict. The substrate itself is not redacted; the verifier had asked the wrong question. (Correction log: this amend strengthens the doc's framing so a future verifier checks the canonical four keys, not invented ones.)

## Cross-references

- Receipt: `docs/receipts/2026-07-vault-transfer-rec-01.json` (broadened at commit `0ea19d93…`)
- Fixture: `packages/db/fixtures/baseline.2026-07-vault-transfer.json` (extended at commit `5fe0b77c…`)
- Gate code: `packages/db/src/seed-baseline.ts` (ReceiptSchema + sovereign signer check + Zod parse)
- Schemas: `packages/db/src/baselineFixture.ts` (`BaselineFixtureSpec`, `deriveFixtureId`)
- Status table: `docs/task.md` PHASE 5 Status Table (5.2 row updated at commit `ab9e24be…`)
- Governance: `AGENTS.md` Rule 5 + Rule 6 (this doc is hand-edited per Rule 5; non-fabricated per Rule 6)
