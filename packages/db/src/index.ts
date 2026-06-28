import { PrismaClient, Prisma } from '@prisma/client';
import { ledgerValidator } from './ledgerValidator';

// Reuse a single client across hot-reloads in dev to avoid connection exhaustion.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const basePrisma = globalForPrisma.prisma ?? new PrismaClient();

// Enforce double-entry balance (throws LE_01_UNBALANCED) on Transaction batch writes.
export const prisma = basePrisma.$extends(ledgerValidator);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

export { ledgerValidator };
export * from '@prisma/client';
