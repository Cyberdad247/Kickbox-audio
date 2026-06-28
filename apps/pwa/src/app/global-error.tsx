'use client';

/**
 * v1.3.0 Tier 3.2: Next.js root-level error boundary.
 *
 * Replaces the root layout when triggered; own <html> + <body> are
 * required because the parent layout is gone. Captures to Sentry with
 * the replay ID so operators can correlate the crash with the session
 * replay for post-mortem.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    const replayId = (Sentry as any).getReplayId?.() ?? null;
    Sentry.captureException(error, {
      level: 'fatal',
      tags: { boundary: 'global-error' },
      extra: {
        digest: error.digest ?? null,
        replayId,
      },
    });
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, sans-serif',
          color: '#e6e6f0',
          background: '#050507',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div role="alert" style={{ maxWidth: '32rem', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.5rem' }}>Critical error</h1>
          <p style={{ fontSize: '0.875rem', color: '#9a9aa8', margin: '0 0 1rem' }}>
            The app shell failed to render. Refresh to recover.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              background: '#7c5cff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>
      </body>
    </html>
  );
}
