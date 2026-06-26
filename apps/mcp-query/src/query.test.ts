import { describe, expect, it, vi } from 'vitest';
import { answerQuery, localAnswer } from './query';

const fixedNow = () => new Date('2026-06-26T12:00:00');

describe('localAnswer (fast deterministic responder)', () => {
  it('evaluates arithmetic', () => {
    expect(localAnswer('what is 2 + 2')).toBe('2 + 2 is 4.');
    expect(localAnswer('12 * 3')).toBe('12 * 3 is 36.');
  });

  it('answers time and date with an injected clock', () => {
    expect(localAnswer('what time is it', fixedNow)).toMatch(/it is /i);
    expect(localAnswer('what is the date today', fixedNow)).toMatch(/today is friday/i);
  });

  it('greets', () => {
    expect(localAnswer('hello there')).toMatch(/greetings, sovereign/i);
  });

  it('falls back for unhandled queries', () => {
    expect(localAnswer('explain quantum chromodynamics')).toMatch(/sovereign mesh/i);
  });
});

describe('answerQuery', () => {
  it('uses the local responder when no Ollama model is configured', async () => {
    expect(await answerQuery('5 + 5')).toBe('5 + 5 is 10.');
  });

  it('uses Ollama when configured', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ response: '  The capital is Paris.  ' }),
    })) as unknown as typeof fetch;
    const out = await answerQuery('capital of France', { ollamaModel: 'llama3', fetchImpl });
    expect(out).toBe('The capital is Paris.');
  });

  it('falls back to local when Ollama fails', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('connection refused');
    }) as unknown as typeof fetch;
    const out = await answerQuery('7 x 6', { ollamaModel: 'llama3', fetchImpl });
    expect(out).toBe('7 × 6 is 42.');
  });
});
