# Post-apply snapshot — `2026-07-vault-transfer-rec-01`

> **STATUS: PRE-APPLY DRAFT.** This document was committed BEFORE the live seed-baseline apply. It captures the **dry-run substrate** as doc-level evidence (what `seed-baseline.ts` WOULD upsert against Postgres when fired in non-dry-run mode). The four psql verification queries + Raven_Ω / Echo_Ω live reveals + the `[seed-baseline] applied.` terminal line do NOT exist yet — they will land in a sovereign-side amend commit after the live apply runs. See [Future amend hook](#future-amend-hook-live-psql-evidence) below.

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
| `<FUTURE>` | Cyberdad247 `<Cyberdad247@gmail.com>` | (amend) | Live psql evidence swap — see [Future amend hook](#future-amend-hook-live-psql-evidence) below |
| `f0f9a2a…` | Cyberdad247 `<Cyberdad247@gmail.com>` | `docs(receipts)` | Round-tripped-Production-Deploy evidence layer — the deploy-trigger commit is `f0f9a2a` (this amend's own SHA will be a fresh commit `AFTER f0f9a2a` and will appear in its own future chain-map row once the next kba-smoke GREEN run completes): Vercel prod deploy at commit `f0f9a2a` pinned to alias `https://kickbox-audio.vercel.app` (URL fingerprint `https://kickbox-audio-7ox3k3aio-invisionedmarketing.vercel.app`, state `Ready`, build completed in 41s, author `cyberdad247`); the deploy was triggered by `npx vercel deploy --prod --team invisionedmarketing --yes` against local HEAD (`f0f9a2a`) at the time of the deploy-call. **Expected `gitSource.sha=f0f9a2a`** — Vercel auto-resolves gitSource.sha from the linked branch's remote HEAD (`origin/feat/knight-console`), which `git rev-parse` returned as `f0f9a2a` at deploy-trigger time (verified `0 ahead / 0 behind`). Confirmable once the `<FUTURE-dpl>` row's inspect block lands; not derived from any fabricated precision. The `dpl_<HASH>` terminal fingerprint + the full `npx vercel inspect <dpl_id>` block remain in the `<FUTURE-dpl>` row below; see [dpl-id recovery gap](#dpl-id-recovery-gap-vercel-cli-v5620-agent-side-limitation) addendum. |
| `<FUTURE-dpl>` | Cyberdad247 `<Cyberdad247@gmail.com>` | (inspect) | Sovereign-side verbatim capture of `npx vercel inspect <dpl_id> --json` fields (`id` / `name` / `url` / `createdAt` / `target` / `gitSource` / `alias` — all deterministic once dpl_id is recovered). The agent CLI v56.2.0 surface returns `npx vercel ls --prod --limit=10` rows without a `dpl_<HASH>` column (omitted in v56+), rejects `vercel ls --json` (unknown flag), and returns empty JSON for `vercel inspect <URL>` — see [dpl-id recovery gap](#dpl-id-recovery-gap-vercel-cli-v5620-agent-side-limitation) addendum for the four CLI paths the agent tried. Sovereign-side recovery is one of (a) dashboard scrape at `https://vercel.com/invisionedmarketing/kickbox-audio` → most-recent deploy → URL-encoded dpl_id, (b) `vercel login` + re-deploy to surface dpl_id in fresh stdout, or (c) REST API with `Authorization: Bearer <VERCEL_TOKEN>`. |

Every author listed above is the local git identity (`git config user.email = Cyberdad247@gmail.com`), which matches the `@Cyberdad247` substring on the default `*` line of `.github/CODEOWNERS` and also matches the `@cyberdad247` domain shortcut path of `seed-baseline.ts`'s `isSovereignSigner()`. So every CODEOWNERS criterion (e.g. `git log -1 --format='%ae' <SHA>` returns a CODEOWNERS maintainer) passes for these commits.

## Future amend hook (live psql evidence)

When the sovereign-side live apply fires on a Docker-enabled host (or alt runtime; see `docs/task.md` PHASE 5 § 5.1), the four psql queries — plus the Raven_Ω / Echo_Ω reveals — plus the `[seed-baseline] applied.` terminal line — will be pasted back here. A future amend commit to this doc will replace the **"Dry-run substrate"** section above with a **"Live psql evidence"** section containing:

- Four psql outputs (`SELECT count(*) FROM "JournalEntry";`, `SELECT count(*) FROM "Transaction";`, `SELECT SUM(debit), SUM(credit) FROM "Transaction";`, `SELECT memo FROM "JournalEntry" ORDER BY id DESC LIMIT 1;`) — note that modern libpq rejects URL query params like `schema=public`, so the flags-form is used per `docs/task.md` PHASE 5 § 5.1 step 4.
- Raven_Ω reveals (`SELECT count(*) FROM "Contact";`, `"EmailSequence";`, `"SequenceStep";` — plus the rows' contents: the carrier's name + email, the EmailSequence's name, and the 2 step subjects + bodies).
- Echo_Ω reveals (`SELECT count(*) FROM "MessageThread";`, `"Message";` + the `handle` and the system Message's `body` text).
- The `[seed-baseline] applied.` terminal line verbatim.
- The git SHA + author of the LIVE-APPLY-triggering commit, IF the sovereign-side apply produces one (apply doesn't leak a git commit by itself; the linking anchor would be the originating branch + HEAD).

The amend commit will be authored with a TITLE pattern similar to `chore(receipts): amend post-apply snapshot doc with live psql evidence`. After amend, this header's "STATUS: PRE-APPLY DRAFT" line collapses to "STATUS: POST-APPLY EVIDENCE," and the `[Future amend hook]` slot above is replaced with the live psql evidence section.

## dpl-id recovery gap (Vercel CLI v56.2.0 agent-side limitation)

Unlike the prior `e34ec5c3` row (where the user paste-back-supplied `dpl_EEp6g5z8smQ4DUqBSjv4UCU3FLMg` arrived complete with the URL `vercel https://vercel.com/invisionedmarketing/kickbox-audio/EEp6g5z8smQ4DUqBSjv4UCU3FLMg`), the `f0f9a2a` deploy above was triggered agent-side via `npx vercel deploy --prod --team invisionedmarketing --yes` and the `dpl_<HASH>` token does not surface in Vercel CLI v56.2.0's non-interactive deploy stdout. Recovery paths the agent attempted and their outcomes:

- `npx vercel ls --prod --limit=10` — table format omits the `dpl_<HASH>` column in v56+ (only URL fingerprint, state, age, author visible).
- `npx vercel ls --prod --json` — rejected by v56.2.0 (`unknown flag`).
- `npx vercel inspect <URL>` (against both `kickbox-audio-7ox3k3aio-invisionedmarketing.vercel.app` and `kickbox-audio.vercel.app`) — empty JSON.
- `npx vercel alias ls --limit=10` — listed project aliases but no alias→dpl_id pairing.

Per AGENTS.md Rule 6 this amend refuses to fabricate a `dpl_<HASH>` or `gitSource.sha=<HASH>` field that the agent cannot reproduce from CLI output. The `dpl_<HASH>` row above (`<FUTURE-dpl>`) is uncovered; sovereign-side recovery is one of:

1. **Dashboard scrape.** Open `https://vercel.com/invisionedmarketing/kickbox-audio` and copy the most-recent deploy's `dpl_<HASH>` from the URL (the Vercel dashboard URL format encodes dpl_id in the path).
2. **Inspect by URL after auth refresh.** Re-run `npx vercel deploy --prod --team invisionedmarketing --yes` once (creates a SECOND fingerprint; `dpl_id` may now surface in fresh stdout); then `npx vercel inspect <new_dpl_id> --json`. Side-effect: a real production re-deploy is issued.
3. **REST API.** `Authorization: Bearer <VERCEL_TOKEN>` minted sovereign-side at `vercel.com/account/tokens`; then `curl https://api.vercel.com/v1/deployments?limit=1&teamId=invisionedmarketing` resolves `dpl_<HASH>` deterministically.

Once the dpl_id is pasted back into `<FUTURE-dpl>` and a follow-up amend commit lands, this section becomes obsolete and the inspect JSON fields (`gitSource.sha`, `createdAt`, `target`, `alias[]`, `state`, `name`, `url`) populate the chain-map row.

## Rule 6 non-fabrication disclosure

Per AGENTS.md Rule 6, this doc + the underlying chain commits are held to the following non-fabrication posture:

- Every receipt snapshot line, fixture snapshot line, and `deriveFixtureId` ID in this doc is verifiable today via `git show HEAD:…` or `npx tsx packages/db/src/seed-baseline.ts` in dry-run mode.
- The **"Dry-run substrate"** section reproduces what `seed-baseline.ts` WOULD have written — printed before any `prisma.$transaction`. NO psql output is fabricated.
- Every chain-map commit may be re-verified via `git show <SHA>`; every `git log -1 --format='%ae' <SHA>` resolves to a `.github/CODEOWNERS` maintainer email (per `docs/task.md` PHASE 5 § 5.2-B "complete when" criterion 5).
- The Sovereign sign-off (Cyberdad247@gmail.com) on the receipt is unaffected by broadenings — see the body of commit `0ea19d93…` for the disclosure on the SCOPE BROADENING under the original `signedAt`.
- The 5.2-B "complete when" criteria from `docs/task.md` PHASE 5 § 5.2-B are NOT yet fully satisfied: the live-apply gate (`[seed-baseline] applied.` exit 0, `_prisma_migrations` row present, the four psql counts/sums matching) is sovereign-side. This doc closes the JSON-side authoring pass; the live-apply side remains a sovereign op.

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
