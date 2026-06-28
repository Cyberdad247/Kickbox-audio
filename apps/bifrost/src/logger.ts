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
  // 2026-06-28 production-readiness (post-review): redact secret-bearing
  // fields from log output. Without this, any code path that logs
  // `req.body`, an `*.secret` derived value, an HMAC `signature`, or a
  // webhook header would emit the secret verbatim. Paths use Pino's
  // bracket notation for nested fields. See the v1.1.0 production-readiness
  // PR review (2026-06-28) for the full code-reviewer finding.
  // v1.1.1: extended with common secret-bearing key names (key, apiKey,
  // bearer, privateKey, credential, hmac) per the code-reviewer's
  // defense-in-depth recommendation. The wildcards `*.password` and
  // `*.secret` don't catch `*.privateKey` etc., so explicit paths are
  // required.
  redact: {
    paths: [
      '*.password',
      '*.secret',
      '*.token',
      '*.signature',
      '*.rawBody',
      '*.key',
      '*.apiKey',
      '*.bearer',
      '*.privateKey',
      '*.credential',
      '*.hmac',
      'req.headers.authorization',
      'req.headers["x-webhook-signature"]',
      'req.headers["x-webhook-action"]',
      'req.headers["x-webhook-timestamp"]',
      'req.headers["x-webhook-expires-at"]',
    ],
    censor: '[REDACTED]',
  },
});

export type Logger = typeof logger;
