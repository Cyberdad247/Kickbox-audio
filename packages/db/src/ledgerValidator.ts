import { Prisma } from '@prisma/client';

export const ledgerValidator: Prisma.Middleware = async (params, next) => {
  if (params.model === 'Transaction' && params.action === 'createMany') {
    const transactions = params.args.data as Prisma.TransactionCreateManyInput[];
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
  return next(params);
};
