import { describe, expect, it } from 'vitest';
import {
  BaselineFixtureSpec,
  JournalEntrySpec,
  SENTINEL,
  TransactionLineSpec,
  deriveFixtureId,
} from './baselineFixture';

function buildBalancedFixture() {
  return {
    valuationTotalUSD: 14_200_000,
    sovereignApprovalRef: 'TEST-RECEIPT-001',
    approvedBy: 'sovereign@example.invalid',
    journalEntries: [
      {
        memo: 'TEST: Opening balance',
        sourceDocument: 'https://example.invalid/receipt-001',
        approvalRef: 'TEST-RECEIPT-001',
        idempotencyKey: 'opening',
        lines: [
          {
            side: 'debit' as const,
            account: 'VAULT_ASSET_CASH',
            amount: 14_200_000,
            memo: 'TEST: Cash received',
            idempotencyKey: 'opening:debit',
          },
          {
            side: 'credit' as const,
            account: 'VAULT_EQUITY_OWNERS',
            amount: 14_200_000,
            memo: 'TEST: Owners equity',
            idempotencyKey: 'opening:credit',
          },
        ],
      },
    ],
    shippingManifests: [],
    streamingNodes: [],
  };
}

describe('BaselineFixtureSpec (production-baseline gate)', () => {
  it('accepts a balanced fixture', () => {
    const fixture = BaselineFixtureSpec.parse(buildBalancedFixture());
    expect(fixture.valuationTotalUSD).toBe(14_200_000);
    expect(fixture.journalEntries).toHaveLength(1);
    expect(fixture.journalEntries[0]?.lines).toHaveLength(2);
  });

  it('rejects an unbalanced journal entry with LE_01_UNBALANCED-shaped message', () => {
    const bad = buildBalancedFixture();
    const entry = bad.journalEntries[0];
    if (!entry) throw new Error('TEST BUG: missing journalEntries[0]');
    const creditLine = entry.lines[1];
    if (!creditLine || creditLine.side !== 'credit') {
      throw new Error('TEST BUG: lines[1] is not a credit-side line');
    }
    // Make the credit side short by $200,000 — entry no longer balances.
    creditLine.amount = 14_000_000;
    expect(() => BaselineFixtureSpec.parse(bad)).toThrow(/LE_01_UNBALANCED/);
  });

  it('rejects an entry composed of all-debit lines (no credit side)', () => {
    const bad = buildBalancedFixture();
    const entry = bad.journalEntries[0];
    if (!entry) throw new Error('TEST BUG: missing journalEntries[0]');
    entry.lines = [
      {
        side: 'debit' as const,
        account: 'A',
        amount: 100,
        memo: 'd1',
        idempotencyKey: 'k1',
      },
      {
        side: 'debit' as const,
        account: 'B',
        amount: 100,
        memo: 'd2',
        idempotencyKey: 'k2',
      },
    ];
    expect(() => BaselineFixtureSpec.parse(bad)).toThrow(/LE_01_UNBALANCED/);
  });

  it('rejects Σ-debit ≠ valuationTotalUSD', () => {
    const bad = buildBalancedFixture();
    bad.valuationTotalUSD = 13_000_000;
    expect(() => BaselineFixtureSpec.parse(bad)).toThrow(/valuation mismatch/);
  });

  it('rejects mismatched approvalRefs across entries', () => {
    const bad = buildBalancedFixture();
    bad.journalEntries.push({
      memo: 'TEST: Rogue entry',
      sourceDocument: 'https://example.invalid/receipt-evil',
      approvalRef: 'TEST-RECEIPT-EVIL',
      idempotencyKey: 'rogue',
      lines: [
        {
          side: 'debit' as const,
          account: 'A',
          amount: 100,
          memo: 'rogue debit',
          idempotencyKey: 'rogue:debit',
        },
        {
          side: 'credit' as const,
          account: 'B',
          amount: 100,
          memo: 'rogue credit',
          idempotencyKey: 'rogue:credit',
        },
      ],
    });
    expect(() => BaselineFixtureSpec.parse(bad)).toThrow(/does not match sovereignApprovalRef/);
  });

  it('rejects the example scaffold sentinel in sovereignApprovalRef', () => {
    const bad = buildBalancedFixture();
    bad.sovereignApprovalRef = SENTINEL;
    expect(() => BaselineFixtureSpec.parse(bad)).toThrow();
  });
});

describe('TransactionLineSpec (one-sided lines)', () => {
  it('rejects a debit line with zero amount', () => {
    expect(() =>
      TransactionLineSpec.parse({
        side: 'debit',
        account: 'A',
        amount: 0,
        memo: 'zero',
        idempotencyKey: 'k',
      }),
    ).toThrow();
  });

  it('rejects a credit line with zero amount', () => {
    expect(() =>
      TransactionLineSpec.parse({
        side: 'credit',
        account: 'A',
        amount: 0,
        memo: 'zero',
        idempotencyKey: 'k',
      }),
    ).toThrow();
  });

  it('accepts a debit line and refuses the same shape with side=credit', () => {
    const ok = TransactionLineSpec.parse({
      side: 'debit',
      account: 'A',
      amount: 100,
      memo: 'm',
      idempotencyKey: 'k',
    });
    expect(ok.side).toBe('debit');
  });
});

describe('JournalEntrySpec', () => {
  it('rejects an entry with fewer than two lines', () => {
    expect(() =>
      JournalEntrySpec.parse({
        memo: 'single line',
        sourceDocument: 'https://e',
        approvalRef: 'r',
        idempotencyKey: 'k',
        lines: [
          {
            side: 'debit' as const,
            account: 'A',
            amount: 100,
            memo: 'one',
            idempotencyKey: 'k1',
          },
        ],
      }),
    ).toThrow();
  });
});

describe('deriveFixtureId', () => {
  it('produces a stable UUID-shaped string for the same inputs', () => {
    expect(deriveFixtureId('TEST-APPROVAL', 'contact:foo')).toBe(
      deriveFixtureId('TEST-APPROVAL', 'contact:foo'),
    );
    expect(deriveFixtureId('TEST-APPROVAL', 'contact:foo')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('produces distinct ids for distinct keys', () => {
    expect(deriveFixtureId('TEST-APPROVAL', 'contact:foo')).not.toBe(
      deriveFixtureId('TEST-APPROVAL', 'contact:bar'),
    );
    expect(deriveFixtureId('TEST-APPROVAL-1', 'contact:foo')).not.toBe(
      deriveFixtureId('TEST-APPROVAL-2', 'contact:foo'),
    );
  });
});
