'use client';

/**
 * v1.3.0 Tier 3.2: Next.js page-level error boundary.
 *
 * Catches render-time errors in the matching segment, captures them to
 * Sentry with the current session-replay ID so the replay is correlated
 * with the exception, and renders a friendly fallback.
 */

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    // getReplayId is optional in @sentry/nextjs — feature-detect via
    // optional chaining rather than a hard export (avoids breaking
    // typecheck when the SDK surface narrows on SDK upgrade).
    const replayId = (Sentry as any).getReplayId?.() ?? null;
    Sentry.captureException(error, {
      extra: {
        digest: error.digest ?? null,
        replayId,
      },
    });
  }, [error]);

  return (
    <div
      role="alert"
      style={{
        padding: '2rem',
        fontFamily: 'var(--font-inter, system-ui)',
        maxWidth: '40rem',
        margin: '4rem auto',
        color: 'var(--ink-primary, #e6e6f0)',
        background: 'var(--surface-1, #0b0b10)',
        border: '1px solid var(--surface-2, #1c1c25)',
        borderRadius: '12px',
      }}
    >
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>Something broke.</h2>
      <p
        style={{
          margin: '0 0 1rem',
          fontSize: '0.875rem',
          color: 'var(--ink-secondary, #9a9aa8)',
        }}
      >
        The error was reported automatically. You can retry.
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: '0.5rem 1rem',
          background: 'var(--accent, #7c5cff)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  );
}
