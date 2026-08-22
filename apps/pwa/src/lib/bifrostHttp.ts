const DEFAULT_BIFROST_HTTP_URL = 'http://127.0.0.1:3001';

type BifrostEnv = {
  BIFROST_HTTP_URL?: string;
  NEXT_PUBLIC_BIFROST_URL?: string;
};

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function resolveBifrostHttpBaseUrl(env: BifrostEnv = process.env as BifrostEnv): string {
  const explicit = env.BIFROST_HTTP_URL?.trim();
  if (explicit) {
    return trimTrailingSlash(new URL(explicit).toString());
  }

  const wsUrl = env.NEXT_PUBLIC_BIFROST_URL?.trim();
  if (!wsUrl) return DEFAULT_BIFROST_HTTP_URL;

  const url = new URL(wsUrl);
  if (url.protocol === 'ws:') url.protocol = 'http:';
  else if (url.protocol === 'wss:') url.protocol = 'https:';
  else if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported Bifrost protocol: ${url.protocol}`);
  }

  url.pathname = '';
  url.search = '';
  url.hash = '';
  return trimTrailingSlash(url.toString());
}

export function buildBifrostHttpUrl(
  pathname: string,
  env: BifrostEnv = process.env as BifrostEnv,
): string {
  const baseUrl = resolveBifrostHttpBaseUrl(env);
  return new URL(pathname, `${baseUrl}/`).toString();
}
