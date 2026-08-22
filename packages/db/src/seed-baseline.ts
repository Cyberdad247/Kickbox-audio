/**
 * Production-baseline seed for `@sovereign/db`.
 *
 * Loads a sovereign-supplied fixture (JSON), validates double-entry balance
 * with Zod at the fixture gate, then upserts Vault_Ω / Raven_Ω / Echo_Ω
 * rows idempotently using deterministic UUIDs derived from the sovereign's
 * approval ref + each canonical idempotency key.
 *
 * ========================================================================
 *  Hard gates (the seed cannot run without each, see AGENTS.md Rule 6):
 * ========================================================================
 *
 *   1. SOVEREIGN_BASELINE_APPROVED env matches a receipt file at
 *      `docs/receipts/<id>.json` whose `signerEmail` is in the sovereign
 *      set: a `.github/CODEOWNERS` maintainer or a team email suffixed
 *      by `@cyberdad247` (alias for the maintainer login).
 *   2. The fixture parses cleanly through `BaselineFixtureSpec` (see
 *      `./baselineFixture.ts`) — every journal entry balances,
 *      Σ-debit across entries equals `valuationTotalUSD`, every approvalRef
 *      matches `sovereignApprovalRef`, no `TODO_REPLACE_ME` sentinel survived.
 *   3. Fixture `sovereignApprovalRef` and `approvedBy` agree with the
 *      receipt file's `receiptId` and `signerEmail`.
 *
 * ========================================================================
 *  Soft gates:
 * ========================================================================
 *
 *   - SOVEREIGN_BASELINE_DRY_RUN=1 → prints the planned writes without
 *     committing any rows. Use this for "what would this fixture do" review.
 *   - SOVEREIGN_BASELINE_FIXTURE=<path> → override fixture location; default
 *     `packages/db/fixtures/baseline.example.json` (intentionally inert —
 *     the seed refuses to run on the example fixture because it carries
 *     `TODO_REPLACE_ME` sentinels and zero valuation).
 *
 * ========================================================================
 *  NEVER auto-generate financial figures. Every dollar in this seed must
 *  be sourced from a sovereign-approved receipt.
 * ========================================================================
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { type BaselineFixture, BaselineFixtureSpec, deriveFixtureId } from './baselineFixture';
import { prisma } from './index';

const APPROVED_ENV = 'SOVEREIGN_BASELINE_APPROVED';
const DRY_RUN_ENV = 'SOVEREIGN_BASELINE_DRY_RUN';
const FIXTURE_ENV = 'SOVEREIGN_BASELINE_FIXTURE';

// Anchor on this file's location so paths are stable regardless of cwd.
// `seed-baseline.ts` lives at `packages/db/src/`, so (CommonJS __dirname
// is auto-available because `tsconfig.json` sets `module: commonjs`):
const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const RECEIPT_DIR = resolve(REPO_ROOT, 'docs/receipts');
const CODEOWNERS_PATH = resolve(REPO_ROOT, '.github/CODEOWNERS');
const DEFAULT_FIXTURE_PATH = resolve(__dirname, '..', 'fixtures', 'baseline.example.json');

// Codeowners lists `@Cyberdad247` and `@sovereign/kba-authority`. We accept
// any receipt signerEmail whose local-part matches a maintainer login, or
// whose domain is `@cyberdad247` (operator alias for the GitHub login).
function isSovereignSigner(email: string): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (lower.endsWith('@cyberdad247')) return true;
  if (!existsSync(CODEOWNERS_PATH)) return false;
  const lines = readFileSync(CODEOWNERS_PATH, 'utf8').split('\n');
  const local = lower.split('@')[0];
  return lines.some(
    (line) =>
      (line.startsWith('*') || line.startsWith('/')) && line.toLowerCase().includes(`@${local}`),
  );
}

const ReceiptSchema = z.object({
  receiptId: z.string().min(1),
  signedAt: z.string().min(1),
  signerEmail: z.string().min(1),
  approvalScope: z.string().min(1),
});

function fatal(code: number, ...messages: string[]): never {
  console.error(`[seed-baseline] FATAL exit=${code}`);
  for (const m of messages) console.error(`  ${m}`);
  process.exit(code);
}

function loadReceipt(receiptId: string): z.infer<typeof ReceiptSchema> {
  const path = resolve(RECEIPT_DIR, `${receiptId}.json`);
  if (!existsSync(path)) {
    fatal(
      2,
      `Missing signed receipt at ${path}.`,
      'The sovereign must commit a docs/receipts/<id>.json documenting the financial sign-off.',
      'See docs/security/PRODUCTION_CHECKLIST.md HITL & Authority.',
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    fatal(2, `Receipt ${path} is not valid JSON: ${(err as Error).message}`);
  }
  const result = ReceiptSchema.safeParse(parsed);
  if (!result.success) {
    fatal(
      3,
      `Receipt ${path} failed schema check:`,
      ...result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    );
  }
  if (result.data.receiptId !== receiptId) {
    fatal(
      3,
      `Receipt id mismatch: env=${receiptId} but ${path} declares receiptId=${result.data.receiptId}.`,
    );
  }
  return result.data;
}

async function main(): Promise<void> {
  const approved = process.env[APPROVED_ENV];
  if (!approved) {
    fatal(
      2,
      `${APPROVED_ENV} env var is not set. Sovereign sign-off is required.`,
      'Quickstart:',
      '  1. Copy packages/db/fixtures/baseline.example.json to <run-name>.json',
      '  2. Fill every field with sovereign-approved values; no TODO_REPLACE_ME may survive.',
      '  3. Commit docs/receipts/<receipt-id>.json with signerEmail in CODEOWNERS mainters.',
      '  4. Run: SOVEREIGN_BASELINE_APPROVED=<receipt-id> npm run db:seed:baseline',
      '  Optional: SOVEREIGN_BASELINE_DRY_RUN=1 to print planned writes without committing.',
    );
  }

  const receipt = loadReceipt(approved);
  if (!isSovereignSigner(receipt.signerEmail)) {
    fatal(
      4,
      `Receipt signerEmail "${receipt.signerEmail}" is not in the sovereign set.`,
      'Either the receipt is misfiled or the sovereign list has drifted.',
      `Update docs/receipts/${approved}.json or ${CODEOWNERS_PATH} before re-running.`,
    );
  }

  const fixturePath = resolve(process.env[FIXTURE_ENV] ?? DEFAULT_FIXTURE_PATH);
  if (!existsSync(fixturePath)) {
    fatal(
      5,
      `Fixture not found at ${fixturePath}.`,
      `Set ${FIXTURE_ENV}=<path> or copy baseline.example.json to a real path.`,
    );
  }
  const raw = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const parsed = BaselineFixtureSpec.safeParse(raw);
  if (!parsed.success) {
    fatal(
      6,
      `Fixture ${fixturePath} failed validation:`,
      ...parsed.error.issues.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`),
    );
  }
  const fixture: BaselineFixture = parsed.data;

  if (fixture.sovereignApprovalRef !== approved) {
    fatal(
      7,
      `Fixture sovereignApprovalRef "${fixture.sovereignApprovalRef}" does not match ${APPROVED_ENV}=${approved}.`,
      'Receipt and fixture must report the same approval id.',
    );
  }
  if (fixture.approvedBy.toLowerCase() !== receipt.signerEmail.toLowerCase()) {
    fatal(
      7,
      `Fixture approvedBy "${fixture.approvedBy}" does not match receipt signerEmail "${receipt.signerEmail}".`,
    );
  }

  const dryRun = process.env[DRY_RUN_ENV] === '1';
  const tag = dryRun ? '[DRY-RUN]' : '[APPLY]';
  const totalDebit = fixture.journalEntries.reduce(
    (acc, j) => acc + j.lines.reduce((a, l) => a + (l.side === 'debit' ? l.amount : 0), 0),
    0,
  );
  console.log(`${tag} receipt=${approved} signer=${receipt.signerEmail} fixture=${fixturePath}`);
  console.log(
    `${tag} valuationTotalUSD=${fixture.valuationTotalUSD.toFixed(2)} (computedΣ-debit=${totalDebit.toFixed(2)})`,
  );
  console.log(
    `${tag} journalEntries=${fixture.journalEntries.length} shippingManifests=${fixture.shippingManifests.length} streamingNodes=${fixture.streamingNodes.length}`,
  );

  if (dryRun) {
    for (const j of fixture.journalEntries) {
      const entryId = deriveFixtureId(approved, j.idempotencyKey);
      console.log(
        `  would upsert JournalEntry id=${entryId} memo="${j.memo}" lines=${j.lines.length}`,
      );
    }
    for (const m of fixture.shippingManifests) {
      const contactId = deriveFixtureId(approved, `contact:${m.idempotencyKey}`);
      const seqId = deriveFixtureId(approved, `seq:${m.idempotencyKey}`);
      console.log(
        `  would upsert Contact id=${contactId} carrier=${m.carrier} email=${m.contactEmail}`,
      );
      console.log(
        `  would upsert EmailSequence id=${seqId} (manifest ${m.idempotencyKey}) steps=2`,
      );
    }
    for (const n of fixture.streamingNodes) {
      const threadId = deriveFixtureId(approved, n.idempotencyKey);
      console.log(
        `  would upsert MessageThread id=${threadId} handle=${n.nodeGroupId} channel=node`,
      );
      console.log(`  would create Message (direction=system) for threadId=${threadId}`);
    }
    console.log(`${tag} no DB writes occurred.`);
    return;
  }

  // Apply: transactional, so a single failed line rolls back everything.
  await prisma.$transaction(async (tx) => {
    // Vault_Ω — journal entries + double-entry lines.
    // We use `transaction.createMany` (not nested-write `lines.create`) so
    // the `ledgerValidator` Prisma extension fires as defense-in-depth,
    // matching the live-write boundary that produces unbalanced batches in
    // production traffic.
    for (const j of fixture.journalEntries) {
      const entryId = deriveFixtureId(approved, j.idempotencyKey);
      await tx.transaction.deleteMany({ where: { journalId: entryId } });
      await tx.journalEntry.upsert({
        where: { id: entryId },
        update: { memo: j.memo },
        create: { id: entryId, memo: j.memo },
      });
      await tx.transaction.createMany({
        data: j.lines.map((l) => ({
          debit: l.side === 'debit' ? l.amount : 0,
          credit: l.side === 'credit' ? l.amount : 0,
          journalId: entryId,
        })),
      });
    }
    // Raven_Ω — carrier contact + shipment-notification email sequence.
    for (const m of fixture.shippingManifests) {
      const contactId = deriveFixtureId(approved, `contact:${m.idempotencyKey}`);
      await tx.contact.upsert({
        where: { id: contactId },
        update: { name: m.carrier, email: m.contactEmail },
        create: { id: contactId, name: m.carrier, email: m.contactEmail },
      });
      const seqId = deriveFixtureId(approved, `seq:${m.idempotencyKey}`);
      await tx.sequenceStep.deleteMany({ where: { sequenceId: seqId } });
      await tx.emailSequence.upsert({
        where: { id: seqId },
        update: { name: `Shipping Manifest ${m.idempotencyKey}` },
        create: {
          id: seqId,
          name: `Shipping Manifest ${m.idempotencyKey}`,
          steps: {
            create: [
              {
                order: 1,
                subject: `[${m.idempotencyKey}] Dispatch confirmed`,
                body: `Origin: ${m.origin}\nDestination: ${m.destination}\nCargo: ${m.cargoDescription}\nEstimated value: $${m.estimatedValue.toFixed(2)}\n\nTemplate body supplied by seed — replace with sovereign-approved body before first dispatch.`,
              },
              {
                order: 2,
                subject: `[${m.idempotencyKey}] Delivery confirmation pending`,
                body: 'Placeholder body supplied by seed; replace before first dispatch.',
              },
            ],
          },
        },
      });
    }
    // Echo_Ω — streaming-node channel + initial telemetry message.
    for (const n of fixture.streamingNodes) {
      const threadId = deriveFixtureId(approved, n.idempotencyKey);
      await tx.message.deleteMany({ where: { threadId } });
      await tx.messageThread.upsert({
        where: { id: threadId },
        update: { channel: 'node', handle: n.nodeGroupId },
        create: { id: threadId, channel: 'node', handle: n.nodeGroupId },
      });
      await tx.message.create({
        data: {
          threadId,
          direction: 'system',
          body: `Streaming node group "${n.nodeGroupId}" registered for ${n.purpose} (expectedDailyVolume=${n.expectedDailyVolume}).`,
        },
      });
    }
  });

  console.log('[seed-baseline] applied.');
  console.log(`  receipt=${approved}`);
  console.log(`  fixture=${fixturePath}`);
  console.log(`  valuationTotalUSD=${fixture.valuationTotalUSD.toFixed(2)}`);
}

main()
  .catch((err) => {
    console.error('[seed-baseline] UNHANDLED');
    console.error(err);
    process.exit(99);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
