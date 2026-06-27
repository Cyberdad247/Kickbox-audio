import { Prisma } from '@prisma/client';

export const ledgerValidator = Prisma.defineExtension({
  name: 'ledgerValidator',
  query: {
    transaction: {
      async createMany({ args, query }) {
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
        return query(args);
      },
    },
  },
});
