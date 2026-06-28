'use client';

/**
 * v1.3.0 Tier 3.2: report-bug button toggles Sentry.showReportDialog.
 *
 * Dynamically imports @sentry/nextjs so the Sentry browser bundle is
 * NOT eagerly pulled into the first paint (keeps LCP under the
 * BUNDLE_SIZE_BUDGET_BYTES envelope).
 */

import { lazy, Suspense, useState } from 'react';

const LazyDialog = lazy(() =>
  import('@sentry/nextjs').then((Sentry) => ({
    default: () => null,
  })),
);

export function ReportBugButton(): JSX.Element {
  const [open, setOpen] = useState(false);

  async function handleClick(): Promise<void> {
    setOpen(true);
    try {
      const Sentry = await import('@sentry/nextjs');
      const eventId = Sentry.captureMessage('User-submitted bug report', 'info');
      if (typeof Sentry.showReportDialog === 'function') {
        Sentry.showReportDialog({ eventId });
      }
    } catch {
      // Sentry not loaded; ignore so the UX never breaks.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Report a bug"
        style={{
          padding: '0.5rem 1rem',
          background: 'transparent',
          color: 'var(--ink-secondary, #9a9aa8)',
          border: '1px solid var(--surface-2, #1c1c25)',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.875rem',
        }}
      >
        Report bug
      </button>
      {open && (
        <Suspense fallback={null}>
          <LazyDialog />
        </Suspense>
      )}
    </>
  );
}
