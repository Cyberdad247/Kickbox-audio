import { describe, expect, it } from 'vitest';
import { buildBifrostHttpUrl, resolveBifrostHttpBaseUrl } from './bifrostHttp';

describe('resolveBifrostHttpBaseUrl', () => {
  it('defaults to local Bifrost when no env is set', () => {
    expect(resolveBifrostHttpBaseUrl({})).toBe('http://127.0.0.1:3001');
  });

  it('prefers explicit BIFROST_HTTP_URL when present', () => {
    expect(resolveBifrostHttpBaseUrl({ BIFROST_HTTP_URL: 'https://bifrost.example.com/' })).toBe(
      'https://bifrost.example.com',
    );
  });

  it('derives https from a wss websocket URL', () => {
    expect(
      resolveBifrostHttpBaseUrl({
        NEXT_PUBLIC_BIFROST_URL: 'wss://kickbox-bifrost.example.com/socket',
      }),
    ).toBe('https://kickbox-bifrost.example.com');
  });

  it('derives http from a ws websocket URL', () => {
    expect(
      buildBifrostHttpUrl('/api/bifrost/issue', {
        NEXT_PUBLIC_BIFROST_URL: 'ws://127.0.0.1:3001',
      }),
    ).toBe('http://127.0.0.1:3001/api/bifrost/issue');
  });
});
