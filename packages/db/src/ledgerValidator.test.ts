import { describe, expect, it, vi } from 'vitest';
import { ledgerValidator } from './ledgerValidator';

// Build a minimal Prisma middleware params object for the validator under test.
const params = (action: string, data: unknown, model = 'Transaction') =>
  ({ model, action, args: { data } }) as any;

describe('ledgerValidator (Vault_Ω double-entry)', () => {
  it('rejects an unbalanced createMany batch with LE_01_UNBALANCED', async () => {
    const next = vi.fn();
    await expect(
      ledgerValidator(
        params('createMany', [
          { debit: 100, credit: 0 },
          { debit: 0, credit: 50 },
        ]),
        next,
      ),
    ).rejects.toThrow('LE_01_UNBALANCED');
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a balanced createMany batch', async () => {
    const next = vi.fn().mockResolvedValue('ok');
    await expect(
      ledgerValidator(
        params('createMany', [
          { debit: 100, credit: 0 },
          { debit: 0, credit: 100 },
        ]),
        next,
      ),
    ).resolves.toBe('ok');
    expect(next).toHaveBeenCalledOnce();
  });

  it('passes through non-Transaction models untouched', async () => {
    const next = vi.fn().mockResolvedValue('ok');
    await expect(
      ledgerValidator(params('create', { message: 'x' }, 'EchoLog'), next),
    ).resolves.toBe('ok');
    expect(next).toHaveBeenCalledOnce();
  });
});
