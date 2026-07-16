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

## Dry-run substrate (verbatim from a prior `SOVEREIGN_BASELINE_DRY_RUN=1` run)

> **NOT live psql output.** This block reproduces the dry-run path of `seed-baseline.ts`, i.e. the lines the gate code prints BEFORE reaching `prisma.$transaction(...)`. A future sovereign-side amend commit to this doc will replace this block with the live psql outputs once `[seed-baseline] applied.` exits 0.

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
| **`<THIS_COMMIT>`** | Cyberdad247 `<Cyberdad247@gmail.com>` | `docs(receipts)` | **5.2-B commit #3: this post-apply snapshot doc (pre-apply draft)** |
| `<FUTURE>` | Cyberdad247 `<Cyberdad247@gmail.com>` | (amend) | Live psql evidence swap — see [Future amend hook](#future-amend-hook-live-psql-evidence) below |

Every author listed above is the local git identity (`git config user.email = Cyberdad247@gmail.com`), which matches the `@Cyberdad247` substring on the default `*` line of `.github/CODEOWNERS` and also matches the `@cyberdad247` domain shortcut path of `seed-baseline.ts`'s `isSovereignSigner()`. So every CODEOWNERS criterion (e.g. `git log -1 --format='%ae' <SHA>` returns a CODEOWNERS maintainer) passes for these commits.

## Future amend hook (live psql evidence)

When the sovereign-side live apply fires on a Docker-enabled host (or alt runtime; see `docs/task.md` PHASE 5 § 5.1), the four psql queries — plus the Raven_Ω / Echo_Ω reveals — plus the `[seed-baseline] applied.` terminal line — will be pasted back here. A future amend commit to this doc will replace the **"Dry-run substrate"** section above with a **"Live psql evidence"** section containing:

- Four psql outputs (`SELECT count(*) FROM "JournalEntry";`, `SELECT count(*) FROM "Transaction";`, `SELECT SUM(debit), SUM(credit) FROM "Transaction";`, `SELECT memo FROM "JournalEntry" ORDER BY id DESC LIMIT 1;`) — note that modern libpq rejects URL query params like `schema=public`, so the flags-form is used per `docs/task.md` PHASE 5 § 5.1 step 4.
- Raven_Ω reveals (`SELECT count(*) FROM "Contact";`, `"EmailSequence";`, `"SequenceStep";` — plus the rows' contents: the carrier's name + email, the EmailSequence's name, and the 2 step subjects + bodies).
- Echo_Ω reveals (`SELECT count(*) FROM "MessageThread";`, `"Message";` + the `handle` and the system Message's `body` text).
- The `[seed-baseline] applied.` terminal line verbatim.
- The git SHA + author of the LIVE-APPLY-triggering commit, IF the sovereign-side apply produces one (apply doesn't leak a git commit by itself; the linking anchor would be the originating branch + HEAD).

The amend commit will be authored with a TITLE pattern similar to `chore(receipts): amend post-apply snapshot doc with live psql evidence`. After amend, this header's "STATUS: PRE-APPLY DRAFT" line collapses to "STATUS: POST-APPLY EVIDENCE," and the `[Future amend hook]` slot above is replaced with the live psql evidence section.

## Rule 6 non-fabrication disclosure

Per AGENTS.md Rule 6, this doc + the underlying chain commits are held to the following non-fabrication posture:

- Every receipt snapshot line, fixture snapshot line, and `deriveFixtureId` ID in this doc is verifiable today via `git show HEAD:…` or `npx tsx packages/db/src/seed-baseline.ts` in dry-run mode.
- The **"Dry-run substrate"** section reproduces what `seed-baseline.ts` WOULD have written — printed before any `prisma.$transaction`. NO psql output is fabricated.
- Every chain-map commit may be re-verified via `git show <SHA>`; every `git log -1 --format='%ae' <SHA>` resolves to a `.github/CODEOWNERS` maintainer email (per `docs/task.md` PHASE 5 § 5.2-B "complete when" criterion 5).
- The Sovereign sign-off (Cyberdad247@gmail.com) on the receipt is unaffected by broadenings — see the body of commit `0ea19d93…` for the disclosure on the SCOPE BROADENING under the original `signedAt`.
- The 5.2-B "complete when" criteria from `docs/task.md` PHASE 5 § 5.2-B are NOT yet fully satisfied: the live-apply gate (`[seed-baseline] applied.` exit 0, `_prisma_migrations` row present, the four psql counts/sums matching) is sovereign-side. This doc closes the JSON-side authoring pass; the live-apply side remains a sovereign op.

## Cross-references

- Receipt: `docs/receipts/2026-07-vault-transfer-rec-01.json` (broadened at commit `0ea19d93…`)
- Fixture: `packages/db/fixtures/baseline.2026-07-vault-transfer.json` (extended at commit `5fe0b77c…`)
- Gate code: `packages/db/src/seed-baseline.ts` (ReceiptSchema + sovereign signer check + Zod parse)
- Schemas: `packages/db/src/baselineFixture.ts` (`BaselineFixtureSpec`, `deriveFixtureId`)
- Status table: `docs/task.md` PHASE 5 Status Table (5.2 row updated at commit `ab9e24be…`)
- Governance: `AGENTS.md` Rule 5 + Rule 6 (this doc is hand-edited per Rule 5; non-fabricated per Rule 6)
