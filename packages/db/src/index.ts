import { PrismaClient } from '@prisma/client';
import { ledgerValidator } from './ledgerValidator';

// Reuse a single client across hot-reloads in dev to avoid connection exhaustion.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// Enforce double-entry balance (throws LE_01_UNBALANCED) on Transaction batch writes.
prisma.$use(ledgerValidator);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export { ledgerValidator };
export * from '@prisma/client';
