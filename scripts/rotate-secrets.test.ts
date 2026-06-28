import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  applyToDoppler,
  loadYamlLite,
  resolveValue,
} from './rotate-secrets';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
  vi.stubGlobal('fetch', mockFetch);
  process.env.DOPPLER_TOKEN = 'dp.test.token';
  // Pin argv so any accidental main() invocation doesn't process.exit(2)
  // before the test assertions can run (defense-in-depth against the
  // require.main === module guard being mis-detected in some runners).
  process.argv = ['node', 'tsx', 'scripts/rotate-secrets.ts', '--from', '/dev/null'];
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.DOPPLER_TOKEN;
});

describe('rotate-secrets script helpers (Tier 3.1 Doppler rotation)', () => {
  it('loadYamlLite: parses a multi-entry manifest', () => {
    const yaml = [
      '# rotations.yaml',
      'rotations:',
      '  - project: kickbox-audio',
      '    config: prd',
      '    name: bifrost/webhook-secret',
      '    value_cmd: echo newvalue-hex',
      '    note: 90-day rotation',
      '  - project: kickbox-audio',
      '    config: prd',
      '    name: bifrost/action-secret',
      '    value: literal-test-value',
    ].join('\n');
    const { rotations } = loadYamlLite(yaml);
    expect(rotations).toHaveLength(2);
    expect(rotations[0].name).toBe('bifrost/webhook-secret');
    expect(rotations[0].value_cmd).toBe('echo newvalue-hex');
    expect(rotations[0].project).toBe('kickbox-audio');
    expect(rotations[0].config).toBe('prd');
    expect(rotations[0].note).toBe('90-day rotation');
    expect(rotations[1].name).toBe('bifrost/action-secret');
    expect(rotations[1].value).toBe('literal-test-value');
  });

  it('loadYamlLite: rejects a manifest with no rotations', () => {
    expect(() => loadYamlLite('# empty\n')).toThrow(/no rotation entries/);
  });

  it('loadYamlLite: rejects an entry missing required field', () => {
    const yaml = 'rotations:\n  - project: kickbox-audio\n    config: prd\n';
    expect(() => loadYamlLite(yaml)).toThrow(/required field/);
  });

  it('loadYamlLite: rejects an entry missing both value and value_cmd', () => {
    const yaml = 'rotations:\n  - project: kickbox-audio\n    config: prd\n    name: x\n';
    expect(() => loadYamlLite(yaml)).toThrow(/value or value_cmd/);
  });

  it('resolveValue: returns literal value when entry.value is set', () => {
    expect(resolveValue({ project: 'p', config: 'c', name: 'n', value: 'literal' })).toEqual({
      value: 'literal',
      source: 'literal',
    });
  });

  it('resolveValue: sub-shells the value_cmd and trims stdout', () => {
    expect(
      resolveValue({ project: 'p', config: 'c', name: 'n', value_cmd: 'printf stdout-here' }),
    ).toEqual({ value: 'stdout-here', source: 'cmd' });
  });

  it('applyToDoppler: POSTs to Doppler with the expected shape + Bearer auth', async () => {
    await applyToDoppler(
      { project: 'kickbox-audio', config: 'prd', name: 'bifrost/webhook-secret' },
      'newvalue-hex',
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toContain('project=kickbox-audio');
    expect(url).toContain('config=prd');
    expect(url).toContain('api.doppler.com/v3/configs/config/secrets');
    expect((init as RequestInit).method).toBe('POST');
    expect(((init as RequestInit).headers as Record<string, string>).Authorization).toBe(
      'Bearer dp.test.token',
    );
    const body = JSON.parse(((init as RequestInit).body as string) ?? '{}');
    expect(body.name).toBe('bifrost/webhook-secret');
    expect(body.value).toBe('newvalue-hex');
    expect(body.visibility).toBe('protected');
  });

  it('applyToDoppler: throws on non-200', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' });
    await expect(
      applyToDoppler({ project: 'p', config: 'c', name: 'n' }, 'v'),
    ).rejects.toThrow(/401/);
  });
});
