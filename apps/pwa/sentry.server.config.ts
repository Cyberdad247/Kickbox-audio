// Sentry server-side init for the PWA (Next.js server components +
// API routes). v1.2.0 T3.2. Uses static import of @sentry/nextjs (hard
// dep). The init is conditional on SENTRY_DSN — if unset, Sentry is a
// no-op.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  });
}
