/**
 * v1.2.0 T3.3: Bifrost OpenTelemetry tracing.
 *
 * Conditionally initializes the @opentelemetry/sdk-node with auto-
 * instrumentation for http, express, and ws. Exports spans via
 * OTLP/HTTP to OTEL_EXPORTER_OTLP_ENDPOINT.
 *
 * If OTEL_EXPORTER_OTLP_ENDPOINT is empty, this is a no-op. The
 * OTel SDK is loaded lazily so the package is optional at typecheck.
 *
 * Usage in server.ts (FIRST line, before any other imports):
 *   import { initTelemetry } from './telemetry';
 *   await initTelemetry();
 *
 * IMPORTANT: initTelemetry() must be called and awaited BEFORE any
 * other modules are imported. The OTel SDK monkey-patches http,
 * express, and ws at require time, so instrumented modules imported
 * after initTelemetry() will be patched correctly.
 */

let initialized = false;

export async function initTelemetry(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    return;
  }
  try {
    const sdkMod = await import(/* @vite-ignore */ '@opentelemetry/sdk-node').catch(() => null);
    if (!sdkMod) {
      return;
    }
    const { NodeSDK } = sdkMod as { NodeSDK: new (opts: unknown) => { start(): void; shutdown(): Promise<void> } };
    const instrumentations: unknown[] = [];
    const autoMod = await import(/* @vite-ignore */ '@opentelemetry/auto-instrumentations-node').catch(() => null);
    if (autoMod) {
      const m = autoMod as { getNodeAutoInstrumentations: (opts: unknown) => unknown };
      instrumentations.push(m.getNodeAutoInstrumentations({ '@opentelemetry/instrumentation-fs': { enabled: false } }));
    }
    const sdk = new NodeSDK({
      serviceName: process.env.OTEL_SERVICE_NAME ?? 'kickbox-bifrost',
      traceExporter: undefined, // OTel SDK reads OTEL_EXPORTER_OTLP_ENDPOINT from env
      instrumentations,
    });
    sdk.start();
  } catch {
    initialized = false;
  }
}

export async function shutdownTelemetry(): Promise<void> {
  if (!initialized) return;
  try {
    const sdkMod = await import(/* @vite-ignore */ '@opentelemetry/sdk-node').catch(() => null);
    if (!sdkMod) return;
    const { NodeSDK } = sdkMod as { NodeSDK: new (opts: unknown) => { shutdown(): Promise<void> } };
    await new NodeSDK({}).shutdown();
  } catch {
    // ignore
  }
}

export function isTelemetryEnabled(): boolean {
  return Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
}
