/**
 * Sovereign production-baseline fixture schemas.
 *
 * Loaded by `seed-baseline.ts` and validated at the gate before any row reaches
 * the Prisma runtime. Per AGENTS.md Rule 6 + the project task DAG (5.2-B),
 * every dollar / contact / streaming handle in the live DB ledger must be
 * sourced and approved by the sovereign — never auto-generated.
 *
 * Validation contract (each invariant throws or refines):
 *   - Each Transaction line is one-sided: a debit-line carries `debit: amount,
 *     credit: 0`, a credit-line carries `debit: 0, credit: amount`. This
 *     matches the existing `packages/db/src/seed.ts` one-sided-line pattern
 *     and the production `Transaction` Prisma model (debit Float + credit Float).
 *   - Each JournalEntry has ≥ 2 lines, with at least one debit-side AND at
 *     least one credit-side line (defense against the "self-balancing single
 *     line" footgun).
 *   - Σ-debit across all lines === Σ-credit across all lines per
 *     `LE_01_UNBALANCED`, with ±$0.005 floating-point tolerance.
 *   - Σ-debit across ALL journal entries === `valuationTotalUSD` ± $0.50.
 *   - Every approvalRef matches the fixture-level `sovereignApprovalRef` —
 *     one sovereign sign-off must cover the whole fixture.
 *   - No `TODO_REPLACE_ME` sentinel survives anywhere in the deserialized
 *     tree (defense-in-depth in case validation slips a field).
 *
 * `deriveFixtureId()` makes the seed idempotent without a schema change: it
 * produces a stable UUID-shaped string from (sovereignApprovalRef,
 * idempotencyKey) so re-running the seed hits `prisma.upsert({ where: { id }})`
 * cleanly instead of accumulating duplicate rows.
 */

import { createHash } from 'node:crypto';
import { z } from 'zod';

// Sentinel that flags unfinished fixture fields. Anything below is considered
// "not yet sovereign-approved" and is rejected at the gate.
export const SENTINEL = 'TODO_REPLACE_ME';

// Tolerance for floating-point shaping of currency math.
const LINE_BALANCE_EPSILON = 0.005;
const FIXTURE_TOTAL_EPSILON = 0.5;

// Reusable: any user-authored string field must be non-empty and free of
// sentinel leakage.
const safeString = (field: string) =>
  z
    .string()
    .min(1)
    .refine((s) => !s.includes(SENTINEL), {
      message: `${field}: ${SENTINEL} sentinel present — fill in sovereign-supplied value.`,
    });

// One-sided ledger line. Mirrors the production `Transaction` row shape:
// a debit-line carries `amount` on the debit side (credit = 0); a credit-line
// carries `amount` on the credit side (debit = 0). The schema discriminator
// forces this — there is no way for the same line to be both debit AND credit.
const DebitLineSpec = z.object({
  side: z.literal('debit'),
  account: safeString('account'),
  amount: z.number().positive().finite(),
  memo: safeString('memo'),
  idempotencyKey: safeString('idempotencyKey'),
});

const CreditLineSpec = z.object({
  side: z.literal('credit'),
  account: safeString('account'),
  amount: z.number().positive().finite(),
  memo: safeString('memo'),
  idempotencyKey: safeString('idempotencyKey'),
});

const TransactionLineSpec = z.discriminatedUnion('side', [DebitLineSpec, CreditLineSpec]);

const JournalEntrySpec = z
  .object({
    memo: safeString('memo'),
    sourceDocument: safeString('sourceDocument'),
    approvalRef: safeString('approvalRef'),
    idempotencyKey: safeString('idempotencyKey'),
    lines: z.array(TransactionLineSpec).min(2),
  })
  .superRefine((j, ctx) => {
    let totalD = 0;
    let totalC = 0;
    for (const l of j.lines) {
      if (l.side === 'debit') totalD += l.amount;
      else totalC += l.amount;
    }
    if (Math.abs(totalD - totalC) >= LINE_BALANCE_EPSILON) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `LE_01_UNBALANCED: JournalEntry "${j.memo}" Σ-debit $${totalD.toFixed(2)} ≠ Σ-credit $${totalC.toFixed(2)} (tolerance ±$${LINE_BALANCE_EPSILON}).`,
      });
    }
    const hasDebit = j.lines.some((l) => l.side === 'debit');
    const hasCredit = j.lines.some((l) => l.side === 'credit');
    if (!hasDebit || !hasCredit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `LE_01_UNBALANCED: JournalEntry "${j.memo}" must contain at least one debit-side AND one credit-side line (got ${j.lines.length} line${j.lines.length === 1 ? '' : 's'}; debit-side=${hasDebit ? 'yes' : 'no'}, credit-side=${hasCredit ? 'yes' : 'no'}).`,
      });
    }
  });

const ShippingManifestSpec = z.object({
  idempotencyKey: safeString('idempotencyKey'),
  carrier: safeString('carrier'),
  origin: safeString('origin'),
  destination: safeString('destination'),
  cargoDescription: safeString('cargoDescription'),
  estimatedValue: z.number().positive().finite(),
  contactEmail: z.string().email(),
  notificationSequenceIdempotencyKey: safeString('notificationSequenceIdempotencyKey'),
  sourceDocument: safeString('sourceDocument'),
  approvalRef: safeString('approvalRef'),
  active: z.boolean().default(true),
});

const StreamingNodeSpec = z.object({
  idempotencyKey: safeString('idempotencyKey'),
  nodeGroupId: safeString('nodeGroupId'),
  purpose: safeString('purpose'),
  expectedDailyVolume: z.number().nonnegative().int(),
  sourceDocument: safeString('sourceDocument'),
  approvalRef: safeString('approvalRef'),
});

const BaselineFixtureSpec = z
  .object({
    valuationTotalUSD: z.number().positive().finite(),
    sovereignApprovalRef: safeString('sovereignApprovalRef'),
    approvedBy: z.string().email(),
    journalEntries: z.array(JournalEntrySpec).default([]),
    shippingManifests: z.array(ShippingManifestSpec).default([]),
    streamingNodes: z.array(StreamingNodeSpec).default([]),
  })
  .superRefine((b, ctx) => {
    // 1) Σ-debit across all journal entries must equal the declared valuation.
    let totalD = 0;
    for (const j of b.journalEntries) {
      for (const l of j.lines) {
        if (l.side === 'debit') totalD += l.amount;
      }
    }
    if (Math.abs(totalD - b.valuationTotalUSD) >= FIXTURE_TOTAL_EPSILON) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `valuation mismatch: Σ-debit across journal entries $${totalD.toFixed(2)} ≠ declared valuationTotalUSD $${b.valuationTotalUSD.toFixed(2)} (tolerance ±$${FIXTURE_TOTAL_EPSILON}).`,
      });
    }
    // 2) Single sovereign sign-off — every entry/manifest/node must carry the
    //    same approvalRef as the fixture-level sovereignApprovalRef.
    const ref = b.sovereignApprovalRef;
    const allRefs = [
      ...b.journalEntries.map((j) => ({ ref: j.approvalRef, kind: 'JournalEntry', label: j.memo })),
      ...b.shippingManifests.map((m) => ({
        ref: m.approvalRef,
        kind: 'ShippingManifest',
        label: m.idempotencyKey,
      })),
      ...b.streamingNodes.map((n) => ({
        ref: n.approvalRef,
        kind: 'StreamingNode',
        label: n.idempotencyKey,
      })),
    ];
    for (const r of allRefs) {
      if (r.ref !== ref) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sovereignApprovalRef'],
          message: `${r.kind} "${r.label}" approvalRef "${r.ref}" does not match sovereignApprovalRef "${ref}". Submit a single sovereign sign-off covering the whole fixture.`,
        });
      }
    }
    // 3) Defense-in-depth sentinel scan across the deserialized tree.
    if (JSON.stringify(b).includes(SENTINEL)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${SENTINEL} sentinel survived deserialization — a sovereign-supplied field is still a placeholder.`,
      });
    }
  });

export type BaselineFixture = z.infer<typeof BaselineFixtureSpec>;
export type JournalEntry = z.infer<typeof JournalEntrySpec>;
export type ShippingManifest = z.infer<typeof ShippingManifestSpec>;
export type StreamingNode = z.infer<typeof StreamingNodeSpec>;
export type TransactionLine = z.infer<typeof TransactionLineSpec>;

export {
  BaselineFixtureSpec,
  JournalEntrySpec,
  ShippingManifestSpec,
  StreamingNodeSpec,
  TransactionLineSpec,
};

/**
 * Derive a deterministic UUID-shaped string from a sovereign approval ref +
 * a canonical idempotency key. The same inputs always yield the same id.
 * This is what makes the seed idempotent without adding columns to the
 * Prisma schema: `prisma.upsert({ where: { id } })` becomes safe to call
 * repeatedly as long as the (sovereignApprovalRef, idempotencyKey) tuple
 * remains stable for an applied row.
 *
 * Format: 8-4-4-4-12 lowercase hex, matching RFC 4122 layout.
 */
export function deriveFixtureId(sovereignApprovalRef: string, idempotencyKey: string): string {
  const hash = createHash('sha256')
    .update(`${sovereignApprovalRef}::${idempotencyKey}`)
    .digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}
