// HYBRID_VOICE_ASSISTANT_vMAX · KINETIC_THROUGHPUT telemetry
// Budget thresholds from the execution directives:
//   TTFA (time-to-first-audio)      < 500ms
//   complex query total latency     < 1.0s

export const TTFA_BUDGET_MS = 500;
export const QUERY_BUDGET_MS = 1000;

export type BudgetStatus = 'ok' | 'warn' | 'breach';

/**
 * Classify a latency against its budget: ok (<=80%), warn (<=100%),
 * breach (over budget). Null/absent measurements read as ok (no data).
 */
export function budgetStatus(ms: number | null | undefined, budget: number): BudgetStatus {
  if (ms == null) return 'ok';
  if (ms <= budget * 0.8) return 'ok';
  if (ms <= budget) return 'warn';
  return 'breach';
}

export function formatMs(ms: number | null | undefined): string {
  if (ms == null) return '—';
  return `${Math.round(ms)}ms`;
}
