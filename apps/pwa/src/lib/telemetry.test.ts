import { describe, expect, it } from 'vitest';
import { QUERY_BUDGET_MS, TTFA_BUDGET_MS, budgetStatus, formatMs } from './telemetry';

describe('budgetStatus (KINETIC_THROUGHPUT gating)', () => {
  it('reads no-data as ok', () => {
    expect(budgetStatus(null, TTFA_BUDGET_MS)).toBe('ok');
    expect(budgetStatus(undefined, TTFA_BUDGET_MS)).toBe('ok');
  });

  it('TTFA: ok <=400ms, warn 401-500ms, breach >500ms', () => {
    expect(budgetStatus(320, TTFA_BUDGET_MS)).toBe('ok');
    expect(budgetStatus(400, TTFA_BUDGET_MS)).toBe('ok');
    expect(budgetStatus(450, TTFA_BUDGET_MS)).toBe('warn');
    expect(budgetStatus(500, TTFA_BUDGET_MS)).toBe('warn');
    expect(budgetStatus(620, TTFA_BUDGET_MS)).toBe('breach');
  });

  it('query: breach over the 1s mandate', () => {
    expect(budgetStatus(700, QUERY_BUDGET_MS)).toBe('ok');
    expect(budgetStatus(950, QUERY_BUDGET_MS)).toBe('warn');
    expect(budgetStatus(1400, QUERY_BUDGET_MS)).toBe('breach');
  });
});

describe('formatMs', () => {
  it('rounds and suffixes ms', () => {
    expect(formatMs(319.7)).toBe('320ms');
    expect(formatMs(null)).toBe('—');
  });
});
