import { Prisma } from '@prisma/client';

/**
 * Pure validation helper — unit-testable without a Prisma context.
 * Splits Responsibility: Extension glue lives in `ledgerValidator` below;
 * invariant logic lives here so the test layer doesn't need to mock the
 * Prisma runtime.
 */
// biome-ignore lint/suspicious/noExplicitAny: Prisma 5.x Client Extensions type the query callback's args as opaque generic JsArgs that structurally has no properties in common with { data?: any }. See CHANGELOG v1.0.0 "CI fail-loop closed (7th iteration)" entry for the full rationale.
export function validateTransactionBatchBalance(args: any) {
  if (args.data) {
    const transactions = (Array.isArray(args.data) ? args.data : [args.data]) as Prisma.TransactionCreateManyInput[];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const transaction of transactions) {
      totalDebit += transaction.debit || 0;
      totalCredit += transaction.credit || 0;
    }

    if (totalDebit !== totalCredit) {
      throw new Error('LE_01_UNBALANCED: Transaction batch is unbalanced.');
    }
  }
}

// Prisma 5.x Client Extension: intercepts `transaction.createMany`.
// Structural isolation: any other model or operation is unaffected by design
// because the query slot is scoped to `transaction.createMany` only.
export const ledgerValidator = Prisma.defineExtension({
  name: 'ledgerValidator',
  query: {
    transaction: {
      async createMany({ args, query }) {
        validateTransactionBatchBalance(args);
        return query(args);
      },
    },
  },
});
