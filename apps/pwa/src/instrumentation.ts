// Next.js instrumentation hook (runs once on server boot).
// v1.2.0 T3.3: registers the OTel SDK for browser tracing.
// Uses require() with try/catch so this file is safe to load even if
// @vercel/otel is not installed.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    if (!endpoint) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { registerOTel } = require('@vercel/otel') as { registerOTel: (serviceName: string) => void };
      registerOTel('kickbox-pwa');
    } catch {
      // OTel SDK not installed; tracing disabled.
    }
  }
}
