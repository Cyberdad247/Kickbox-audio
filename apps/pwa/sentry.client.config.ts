// Sentry browser-side init for the PWA.
// v1.2.0 T3.2: uses static import of @sentry/nextjs (hard dep). The init
// is conditional on NEXT_PUBLIC_SENTRY_DSN — if unset, Sentry is a no-op.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
        // v1.3.0 Tier 3.2: explicit CSS-selector masking so any element
        // with class `pii-mask`, any password input, or any credit-card
        // input is masked BEFORE replays are serialized. This adds
        // immediate compliance over the global maskAllText blanket and
        // is a v1.3.0 hard cut. Form-aware JS traversal (auto-detect
        // autocomplete=cc-* on dynamic forms) is a v1.4.0 candidate
        // (see THREAT_MODEL §3 v1.4 row deferred).
        mask: [
          '.pii-mask',
          'input[type="password"]',
          'input[autocomplete="cc-number"]',
          'input[autocomplete="cc-csc"]',
          'input[autocomplete="cc-exp"]',
        ],
      }),
    ],
  });
}
