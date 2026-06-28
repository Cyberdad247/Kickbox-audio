/**
 * v1.2.0 T3.2: Sentry initialization — imported early in server.ts so
 * Sentry.init() runs before the route handlers are defined.
 *
 * Uses CommonJS require() (not ES import) wrapped in try/catch so this
 * file is safe to import even if @sentry/node is not installed.
 */
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Sentry = require('@sentry/node') as {
    init: (opts: Record<string, unknown>) => void;
  };
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      release: process.env.npm_package_version ?? '0.0.0',
    });
  }
} catch {
  // Sentry SDK not installed; error tracking disabled.
}
