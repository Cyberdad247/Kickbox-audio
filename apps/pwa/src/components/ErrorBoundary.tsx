'use client';

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Camelot-OS Uncaught Runtime Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    try {
      localStorage.removeItem('camelot_active_workspace_tab');
    } catch {}
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#05050A] p-6 text-white select-none">
          {/* Ambient Glow */}
          <div className="pointer-events-none absolute h-96 w-96 rounded-full bg-[#9D4EDD]/10 blur-[120px]" />

          <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FF5555]/40 bg-[#FF5555]/10 text-3xl shadow-[0_0_30px_rgba(255,85,85,0.3)]">
              🛡️
            </div>

            <h1 className="font-display text-xl font-bold uppercase tracking-[0.2em] text-[#FFD700]">
              Camelot Sovereign Guard
            </h1>

            <p className="mt-2 font-mono text-xs text-white/70">
              The neural runtime encountered an interruption during interface synthesis.
            </p>

            {this.state.error && (
              <div className="mt-4 max-h-36 w-full overflow-auto rounded-lg border border-white/10 bg-black/60 p-3 text-left font-mono text-[11px] text-red-300">
                <p className="font-bold">{this.state.error.toString()}</p>
                {this.state.errorInfo?.componentStack && (
                  <pre className="mt-1 text-[9px] text-white/40 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack.slice(0, 300)}
                  </pre>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-2 rounded-xl border border-[#00F0FF]/80 bg-[#00F0FF]/20 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:bg-[#00F0FF]/30 transition-all cursor-pointer"
              >
                <span>🔄</span>
                <span>Reload Enclave</span>
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-white/60 hover:border-white/40 hover:text-white transition-all cursor-pointer"
              >
                <span>Reset Storage</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
