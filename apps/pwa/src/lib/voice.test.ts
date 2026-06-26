import { describe, expect, it } from 'vitest';
import type { SovereignState } from '../context/BifrostContext';
import { speakableResponse } from './voice';

const state = (over: Partial<SovereignState>): SovereignState => ({
  portfolioValuation: 14_215_000,
  transactionsCount: 1,
  lastCommand: null,
  lastResponse: null,
  lastLane: null,
  lastLatencyMs: null,
  lastRezeroed: false,
  updatedAt: new Date(0).toISOString(),
  ...over,
});

describe('speakableResponse (//IGNITE — pure response signal)', () => {
  it('confirms a transaction with the new valuation', () => {
    const line = speakableResponse(state({ lastCommand: 'add_transaction' }));
    expect(line).toContain('$14,215,000');
    expect(line).toMatch(/transaction logged/i);
  });

  it('confirms a reminder', () => {
    expect(speakableResponse(state({ lastCommand: 'remind' }))).toMatch(/reminder set/i);
  });

  it('confirms an order', () => {
    expect(speakableResponse(state({ lastCommand: 'order' }))).toMatch(/order placed/i);
  });

  it('reports an unrecognized command', () => {
    expect(speakableResponse(state({ lastCommand: 'unknown' }))).toMatch(/not recognized/i);
  });

  it('falls back to an acknowledgement for null/unknown actions', () => {
    expect(speakableResponse(state({ lastCommand: null }))).toMatch(/acknowledged/i);
  });
});
