import { prisma } from './index';

/**
 * Seeds PLACEHOLDER demo data only.
 * Do NOT commit real financials or PII here. All values below are obvious
 * placeholders and must be replaced before any production use.
 */
async function main() {
  console.log('Seeding placeholder data...');

  // Vault_Ω — one balanced journal entry (placeholder valuation, not real).
  await prisma.journalEntry.create({
    data: {
      memo: 'PLACEHOLDER opening balance (demo only)',
      lines: {
        create: [
          { debit: 1000, credit: 0 },
          { debit: 0, credit: 1000 },
        ],
      },
    },
  });

  // Raven_Ω — demo contact, tag, and email sequence.
  await prisma.contact.create({
    data: {
      email: 'demo.contact@example.com',
      name: 'Demo Contact',
      tags: { create: [{ label: 'demo' }] },
    },
  });
  await prisma.emailSequence.create({
    data: {
      name: 'Demo Welcome Sequence',
      steps: {
        create: [
          { order: 1, subject: 'Welcome', body: 'Placeholder body.', delayHours: 0 },
          { order: 2, subject: 'Follow up', body: 'Placeholder body.', delayHours: 24 },
        ],
      },
    },
  });

  // Echo_Ω — demo message thread.
  await prisma.messageThread.create({
    data: {
      channel: 'sms',
      handle: '+10000000000',
      messages: { create: [{ direction: 'inbound', body: 'Placeholder inbound message.' }] },
    },
  });

  console.log('Seed complete (placeholders).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
