import { Prisma, PrismaClient } from '@prisma/client';
import { ledgerValidator } from './ledgerValidator';

// Reuse a single client across hot-reloads in dev to avoid connection exhaustion.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let basePrisma: any;
if (!process.env.DATABASE_URL) {
  console.warn('[AI Studio] Database not connected (No DATABASE_URL) — using mock');
  const noOp = { 
    findMany: async () => [], 
    findFirst: async () => null,
    findUnique: async () => null, 
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {}, 
    delete: async () => ({}),
    count: async () => 0,
    $disconnect: async () => {},
    $transaction: async (arg: any) => {
      if (typeof arg === 'function') return arg(basePrisma);
      return [];
    }
  };
  basePrisma = new Proxy({}, { 
    get: (_, prop) => {
      if (prop === '$extends') return () => basePrisma;
      if (prop in noOp) return (noOp as any)[prop];
      return new Proxy({}, { 
        get: (_, subProp) => {
          if (subProp in noOp) return (noOp as any)[subProp];
          return noOp.findMany;
        } 
      });
    } 
  });
} else {
  try {
    basePrisma = globalForPrisma.prisma ?? new PrismaClient();
  } catch (err) {
    console.warn('[AI Studio] Database not connected (Init failed) — using mock');
    const noOp = { 
      findMany: async () => [], 
      findFirst: async () => null,
      findUnique: async () => null, 
      create: async (d: any) => d?.data ?? {},
      update: async (d: any) => d?.data ?? {}, 
      delete: async () => ({}),
      count: async () => 0,
      $disconnect: async () => {},
      $transaction: async (arg: any) => {
        if (typeof arg === 'function') return arg(basePrisma);
        return [];
      }
    };
    basePrisma = new Proxy({}, { 
      get: (_, prop) => {
        if (prop === '$extends') return () => basePrisma;
        if (prop in noOp) return (noOp as any)[prop];
        return new Proxy({}, { 
          get: (_, subProp) => {
            if (subProp in noOp) return (noOp as any)[subProp];
            return noOp.findMany;
          } 
        });
      } 
    });
  }
}

// Enforce double-entry balance (throws LE_01_UNBALANCED) on Transaction batch writes.
export const prisma = basePrisma.$extends ? basePrisma.$extends(ledgerValidator) : basePrisma;

if (process.env.NODE_ENV !== 'production' && process.env.DATABASE_URL) {
  globalForPrisma.prisma = basePrisma;
}

export { ledgerValidator };
export * from '@prisma/client';
