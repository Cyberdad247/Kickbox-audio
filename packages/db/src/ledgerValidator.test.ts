import { describe, expect, it } from 'vitest';
import { validateTransactionBatchBalance } from './ledgerValidator';

describe('ledgerValidator pure helper (Vault_Ω double-entry)', () => {
  it('rejects an unbalanced createMany batch with LE_01_UNBALANCED', () => {
    expect(() =>
      validateTransactionBatchBalance({
        data: [
          { debit: 100, credit: 0 },
          { debit: 0, credit: 50 },
        ],
      }),
    ).toThrow('LE_01_UNBALANCED');
  });

  it('allows a balanced createMany batch', () => {
    expect(() =>
      validateTransactionBatchBalance({
        data: [
          { debit: 100, credit: 0 },
          { debit: 0, credit: 100 },
        ],
      }),
    ).not.toThrow();
  });

  it('allows missing or empty data (non-Transaction passthrough equivalent)', () => {
    // Cast needed: the tightened signature requires { data: ... }, but the runtime
    // guard inside validateTransactionBatchBalance handles missing data gracefully.
    // biome-ignore lint/suspicious/noExplicitAny: intentional passthrough probe
    expect(() => validateTransactionBatchBalance({} as any)).not.toThrow();
  });
});
