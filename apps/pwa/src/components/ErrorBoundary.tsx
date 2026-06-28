'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React error boundary for the PWA surface.
 *
 * Catches render-time errors in the subtree and renders a fallback
 * UI instead of crashing the whole app. Use sparingly — most errors
 * should be handled at the source. This is the last line of
 * defense for unexpected exceptions.
 *
 * Per AGENTS.md Rule 4 (hook hygiene), ErrorBoundary uses class
 * component semantics intentionally — the React team has stated
 * that error boundaries cannot be implemented as functional
 * components (no equivalent hook exists for `getDerivedStateFromError`
 * or `componentDidCatch` as of React 18).
 *
 * Usage in `apps/pwa/src/app/layout.tsx`:
 *   <ErrorBoundary>
 *     <BifrostProvider>...</BifrostProvider>
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    /**
     * Log to console for now; future: ship to Sentry when
     * SENTRY_DSN env var is set (v1.2.0 candidate).
     */
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught render error', error, errorInfo);
    // v1.2.0 T3.2: ship the caught render error to Sentry with the
    // React component stack as context. No-op if Sentry is not configured
    // (NEXT_PUBLIC_SENTRY_DSN unset).
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    this.props.onError?.(error, errorInfo);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-obsidian p-8 text-foreground">
          <h1 className="mb-4 font-display text-2xl text-executive">
            Something went wrong
          </h1>
          <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
            The page failed to render. Reload to retry, or check the browser
            console for details.
          </p>
          {this.state.error && (
            <pre className="max-w-2xl overflow-auto rounded bg-muted p-4 text-xs">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="mt-6 rounded border border-foreground px-4 py-2 text-sm hover:bg-foreground hover:text-background"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
