import pino from 'pino';

/**
 * Structured logger for the Bifrost gateway.
 *
 * Uses Pino for structured JSON logging. Log level is controlled
 * via the `LOG_LEVEL` env var (trace|debug|info|warn|error|fatal);
 * default is `info`. In production, set `LOG_LEVEL=info` or
 * `LOG_LEVEL=warn`. In development, `LOG_LEVEL=debug` is helpful.
 *
 * All log lines are emitted as JSON to stdout. Aggregators (Vercel
 * log drain, Datadog, etc.) can parse the structured fields.
 *
 * Migration from `console.log`:
 *   - `console.log('server started')` → `logger.info('server started')`
 *   - `console.error('failed', err)` → `logger.error({ err }, 'failed')`
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: {
    service: 'bifrost',
    version: process.env.npm_package_version ?? '0.1.0',
    env: process.env.NODE_ENV ?? 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export type Logger = typeof logger;
