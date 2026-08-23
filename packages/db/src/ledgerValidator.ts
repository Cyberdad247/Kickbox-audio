import { Prisma } from '@prisma/client';

export interface TransactionLineInput {
  debit?: number;
  credit?: number;
  [key: string]: unknown;
}

// Pure validation helper — unit-testable without a Prisma context.
// Splits Responsibility: Extension glue lives in `ledgerValidator` below;
// invariant logic lives here so the test layer doesn't need to mock the
// Prisma runtime.
export function validateTransactionBatchBalance(args: {
  data?: TransactionLineInput | TransactionLineInput[] | unknown;
}) {
  if (args && typeof args === 'object' && 'data' in args && args.data) {
    const transactions = (
      Array.isArray(args.data) ? args.data : [args.data]
    ) as TransactionLineInput[];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const transaction of transactions) {
      totalDebit += Number(transaction.debit) || 0;
      totalCredit += Number(transaction.credit) || 0;
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
        validateTransactionBatchBalance(args as unknown as { data?: TransactionLineInput[] });
        return query(args);
      },
    },
  },
});
