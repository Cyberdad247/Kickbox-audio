'use client';

/**
 * v1.3.0 Tier 3.2: React class error boundary — client-side catch.
 *
 * Use inside any subtree that wants graceful fallback for render-time
 * errors. Captures to Sentry with the current session-replay ID so the
 * exception is correlated with the user-visible replay.
 *
 * Example:
 *   <ErrorBoundary fallback={<p>Voice HUD offline.</p>}>
 *     <VoiceHud />
 *   </ErrorBoundary>
 */

import * as Sentry from '@sentry/nextjs';
import { Component, type ReactNode } from 'react';

interface Props {
  fallback?: ReactNode;
  children: ReactNode;
  componentName?: string;
}

const DEFAULT_FALLBACK: ReactNode = (
  <div role="alert" style={{ padding: '1rem', color: 'var(--ink-primary, #e6e6f0)' }}>
    <p>This component crashed. Reload the page to recover.</p>
  </div>
);

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    // Q-D (code-reviewer final): `as any` bypass — @sentry/nextjs types
    // do not surface getReplayId on the namespace import regardless of
    // which release. The runtime surface is stable across 8.x; `as any`
    // keeps the optional-chaining safety without dragging in a .d.ts shim.
    const replayId =
      (Sentry as unknown as { getReplayId?: () => string | undefined }).getReplayId?.() ??
      null;
    Sentry.captureException(error, {
      tags: { boundary: this.props.componentName ?? 'react-component' },
      extra: {
        componentStack: info.componentStack ?? null,
        replayId,
      },
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? DEFAULT_FALLBACK;
    }
    return this.props.children;
  }
}
