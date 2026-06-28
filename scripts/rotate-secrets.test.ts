import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  applyToDoppler,
  loadYamlLite,
  resolveValue,
} from './rotate-secrets';

// Top-level import guarantees the helpers are bound at module-eval time
// (the prior dynamic-import + vi.resetModules pattern defeated esbuild/Vite's
// live-bind surface under vitest ESM, surfacing as
// `applyToDoppler is not a function`).

// Shared mock — but the global stub lives inside the applyToDoppler
// describe so a top-level afterEach cannot unstub it before the
// fetch-needing tests run. (Global vi.stubGlobal + global unstubAllGlobals
// caused tests #7–#9 to hit real api.doppler.com — see review B/D.)
const mockFetch = vi.fn();

// =====================================================================
// 1) loadYamlLite — pure parser, no fs/network, easy cases.
// =====================================================================
describe('loadYamlLite (Tier 3.1 YAML manifest parser)', () => {
  it('parses a multi-entry manifest with value_cmd + value + note', () => {
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

  it('rejects a manifest with no rotations', () => {
    expect(() => loadYamlLite('# empty\n')).toThrow(/no rotation entries/);
  });

  it('rejects an entry missing a required field (project|config|name)', () => {
    const yaml = 'rotations:\n  - project: kickbox-audio\n    config: prd\n';
    expect(() => loadYamlLite(yaml)).toThrow(/required field/);
  });

  it('rejects an entry missing both value and value_cmd', () => {
    const yaml = 'rotations:\n  - project: kickbox-audio\n    config: prd\n    name: x\n';
    expect(() => loadYamlLite(yaml)).toThrow(/value or value_cmd/);
  });
});

// =====================================================================
// 2) resolveValue — sub-shells `value_cmd` via spawnSync; pure logic.
// =====================================================================
describe('resolveValue (Tier 3.1 value source resolution)', () => {
  it('returns the literal value when entry.value is set', () => {
    expect(resolveValue({ project: 'p', config: 'c', name: 'n', value: 'literal' })).toEqual({
      value: 'literal',
      source: 'literal',
    });
  });

  it('sub-shells the value_cmd and trims stdout', () => {
    expect(
      resolveValue({ project: 'p', config: 'c', name: 'n', value_cmd: 'printf stdout-here' }),
    ).toEqual({ value: 'stdout-here', source: 'cmd' });
  });
});

// =====================================================================
// 3) applyToDoppler — hits the Doppler REST API; needs fetch mock +
//    DOPPLER_TOKEN env. Scoped in its own describe so the env stub is
//    only present for the tests that actually need it.
// =====================================================================
describe('applyToDoppler (Tier 3.1 Doppler REST write)', () => {
  beforeEach(() => {
    // Both the stub + reset live in this block so the prior block's
    // (non-existent) afterEach can't unstub before we need fetch.
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
    vi.stubGlobal('fetch', mockFetch);
    process.env.DOPPLER_TOKEN = 'dp.test.token';
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.DOPPLER_TOKEN;
    // Pin argv so any accidental `require.main === module` activation in a
    // future refactor doesn't process.exit(2) before assertions run.
    process.argv = ['node', 'tsx', 'scripts/rotate-secrets.ts', '--from', '/dev/null'];
  });

  it('POSTs to Doppler with the expected URL, method, Bearer auth, and body shape', async () => {
    await applyToDoppler(
      { project: 'kickbox-audio', config: 'prd', name: 'bifrost/webhook-secret' },
      'newvalue-hex',
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain('api.doppler.com/v3/configs/config/secrets');
    expect(String(url)).toContain('project=kickbox-audio');
    expect(String(url)).toContain('config=prd');
    expect((init as RequestInit).method).toBe('POST');
    expect(((init as RequestInit).headers as Record<string, string>).Authorization).toBe(
      'Bearer dp.test.token',
    );
    const body = JSON.parse(((init as RequestInit).body as string) ?? '{}');
    expect(body.name).toBe('bifrost/webhook-secret');
    expect(body.value).toBe('newvalue-hex');
    expect(body.visibility).toBe('protected');
  });

  it('throws on a non-2xx response from Doppler', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401, text: async () => 'unauthorized' });
    await expect(
      applyToDoppler({ project: 'p', config: 'c', name: 'n' }, 'v'),
    ).rejects.toThrow(/401/);
  });

  it('throws on a 5xx response from Doppler', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, text: async () => 'internal-error' });
    await expect(
      applyToDoppler({ project: 'p', config: 'c', name: 'n' }, 'v'),
    ).rejects.toThrow(/500/);
  });

  it('URL-encodes special chars in project and config (slash, ampersand, space)', async () => {
    await applyToDoppler(
      { project: 'kick box/audio&test', config: 'prd/it', name: 'n' },
      'v',
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(String(url)).toContain('https://api.doppler.com/v3/configs/config/secrets?');
    expect(String(url)).toContain('project=kick%20box%2Faudio%26test');
    expect(String(url)).toContain('config=prd%2Fit');
    // The path segment before `?` must remain slash-delimited (not encoded)
    // — only the query-string values are encoded.
    expect(String(url)).not.toContain('/v3%2F');
  });

  it('throws when DOPPLER_TOKEN env is missing', async () => {
    delete process.env.DOPPLER_TOKEN;
    await expect(
      applyToDoppler({ project: 'p', config: 'c', name: 'n' }, 'v'),
    ).rejects.toThrow(/DOPPLER_TOKEN/);
  });
});
