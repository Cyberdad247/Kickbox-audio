import type { Command } from './nlp';

// Unified, in-memory business metrics broadcast to the PWA as STATE_UPDATE.
export interface SovereignState {
  portfolioValuation: number;
  transactionsCount: number;
  lastCommand: string | null;
  updatedAt: string;
}

// Placeholder baseline ($14.2M) — demo only, NOT real financial data.
export const BASELINE_VALUATION = 14_200_000;

export const state: SovereignState = {
  portfolioValuation: BASELINE_VALUATION,
  transactionsCount: 0,
  lastCommand: null,
  updatedAt: new Date().toISOString(),
};

/**
 * Apply a parsed command to the in-memory state (pure w.r.t. the DB).
 * Returns the mutated state so callers can broadcast it.
 */
export function applyCommand(cmd: Command, s: SovereignState = state): SovereignState {
  if (cmd.action === 'add_transaction') {
    s.portfolioValuation += cmd.amount;
    s.transactionsCount += 1;
  }
  s.lastCommand = cmd.action;
  s.updatedAt = new Date().toISOString();
  return s;
}

export function snapshot(s: SovereignState = state): SovereignState {
  return { ...s };
}
