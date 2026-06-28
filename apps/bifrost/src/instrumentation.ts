/**
 * v1.2.0 T3.3: OpenTelemetry instrumentation — MUST be the first import
 * in server.ts so the OTel SDK can monkey-patch http/express/ws BEFORE
 * those modules are loaded by subsequent imports.
 *
 * Uses CommonJS require() (not ES import) because require() is synchronous
 * and respects the order of execution. ES module imports are hoisted, so
 * `import` statements would all run before this file's init code, defeating
 * the purpose.
 *
 * The try/catch wraps the require() so the file is safe to import even if
 * the OTel SDK is not installed (optional dependency).
 *
 * Defense-in-depth: even though this file is normally loaded once per
 * process, the `registered` flag guards the SIGTERM/SIGINT handler
 * registration so vitest setup + dev-server boot (or any future hot-
 * reload) cannot double-register. Without the guard, the second handler
 * would double-flush the SDK on shutdown and stall the process on the
 * second signal — the code-reviewer flagged this in the v1.2.0 final
 * pass.
 */
let sdk: { start(): void; shutdown(): Promise<void> } | null = null;
let registered = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NodeSDK } = require('@opentelemetry/sdk-node') as typeof import('@opentelemetry/sdk-node');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node') as typeof import('@opentelemetry/auto-instrumentations-node');
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (endpoint) {
    sdk = new NodeSDK({
      serviceName: process.env.OTEL_SERVICE_NAME ?? 'kickbox-bifrost',
      instrumentations: [
        getNodeAutoInstrumentations({
          // fs is too noisy for our use case
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    });
    sdk.start();
    // Graceful shutdown: flush spans before process exits.
    // Guarded by `registered` so a reload (vitest worker + dev boot,
    // or HMR) cannot double-register and double-flush the SDK on
    // shutdown — the code-reviewer flagged this in v1.2.0 final pass.
    const shutdown = (): void => {
      sdk?.shutdown().catch(() => {
        // ignore
      });
    };
    if (!registered) {
      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
      registered = true;
    }
  }
} catch {
  // OTel SDK not installed; tracing disabled (env var is ignored).
}
