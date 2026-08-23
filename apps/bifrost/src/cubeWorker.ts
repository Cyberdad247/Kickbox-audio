import { parentPort, workerData } from 'node:worker_threads';
import { prisma } from '@sovereign/db';
import type { CubeResult, CubeTask } from './microcubic';

// Runs inside an isolated microcube (worker_threads). Performs the command's
// DB side effects, posts the result back to the matrix, then disconnects.
async function run(): Promise<void> {
  const task = workerData as CubeTask;
  const cmd = task.command;

  try {
    if (cmd.action === 'add_transaction') {
      // Balanced journal entry (debit/credit) — enforced by ledgerValidator.
      await prisma.journalEntry.create({
        data: {
          memo: `Command: add transaction ${cmd.amount}`,
          lines: {
            create: [
              { debit: cmd.amount, credit: 0 },
              { debit: 0, credit: cmd.amount },
            ],
          },
        },
      });
    } else if (cmd.action === 'remind') {
      await prisma.echoLog.create({ data: { message: `Reminder set for ${cmd.who}` } });
    } else if (cmd.action === 'order') {
      await prisma.echoLog.create({ data: { message: `Order placed: ${cmd.item}` } });
    } else {
      await prisma.echoLog.create({ data: { message: `Unrecognized command: ${cmd.raw}` } });
    }

    const result: CubeResult = { taskId: task.id, command: cmd, persisted: true };
    parentPort?.postMessage(result);
  } finally {
    await prisma.$disconnect();
  }
}

run().catch((err) => {
  // Re-throw so the Worker emits 'error' and the matrix rejects/handles it.
  throw err;
});
