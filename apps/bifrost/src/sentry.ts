/**
 * v1.2.0 T3.2: Bifrost Sentry integration.
 *
 * Conditionally initializes @sentry/node if SENTRY_DSN is set in the
 * environment. If the DSN is empty, this module is a no-op (returns
 * a stub that satisfies the same API surface used by ErrorBoundary
 * hooks in the PWA + Bifrost route handlers).
 *
 * The actual Sentry SDK is loaded lazily via dynamic import so that
 * the module is not a hard dependency for local dev / CI.
 *
 * Usage in server.ts (early, before Express app is created):
 *   import { initSentry } from './sentry';
 *   await initSentry();
 *
 * Usage in route handlers (to capture an error):
 *   import { captureException } from './sentry';
 *   captureException(new Error('something broke'), { route: '/api/bifrost/issue' });
 */

interface SentryLike {
  captureException(err: unknown, context?: Record<string, unknown>): void;
  captureMessage(msg: string, context?: Record<string, unknown>): void;
  setContext(key: string, value: Record<string, unknown>): void;
}

const noopSentry: SentryLike = {
  captureException: () => {},
  captureMessage: () => {},
  setContext: () => {},
};

let activeSentry: SentryLike = noopSentry;
let initialized = false;

export async function initSentry(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // Sentry disabled (no DSN). No-op.
    return;
  }
  try {
    // Dynamic import so the package is optional at typecheck.
    const mod = await import(/* @vite-ignore */ '@sentry/node').catch(() => null);
    if (!mod) {
      // Sentry SDK not installed; install with:
      //   npm install @sentry/node --workspace=apps/bifrost --legacy-peer-deps
      return;
    }
    const Sentry = mod as {
      init: (opts: Record<string, unknown>) => void;
      captureException: (err: unknown) => void;
      captureMessage: (msg: string) => void;
      setContext: (key: string, value: unknown) => void;
    };
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      release: process.env.npm_package_version ?? '0.0.0',
    });
    activeSentry = {
      captureException: (err, context) => {
        Sentry.captureException(err);
        if (context) Sentry.setContext('handler', context);
      },
      captureMessage: (msg, context) => {
        Sentry.captureMessage(msg);
        if (context) Sentry.setContext('handler', context);
      },
      setContext: (key, value) => Sentry.setContext(key, value),
    };
  } catch (err) {
    // Re-init on next call.
    initialized = false;
    // eslint-disable-next-line no-console
    console.error('[sentry] init failed:', (err as Error).message);
  }
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  activeSentry.captureException(err, context);
}

export function captureMessage(msg: string, context?: Record<string, unknown>): void {
  activeSentry.captureMessage(msg, context);
}

export function isSentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}
