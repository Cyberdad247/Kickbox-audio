// mcp-query · mTLS termination for the Tailscale MCP guard.
//
// v1.2.0 T3.5: if MTLS_ENABLED=true, wraps the HTTP request handler in
// an HTTPS server with the server cert + key from MTLS_SERVER_CERT_PATH
// + MTLS_SERVER_KEY_PATH. Optionally requires client cert auth
// (MTLS_REQUIRE_CLIENT_CERT=true) by adding `requestCert: true` to the
// TLS options and rejecting connections that don't present a cert
// signed by MTLS_CA_CERT_PATH.
//
// If MTLS_ENABLED is unset or false, this module is a no-op and the
// caller falls back to a plain HTTP server (transport-level encryption
// is provided by the Tailscale mesh).

import https from 'node:https';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';

export interface TlsConfig {
  enabled: boolean;
  caPath?: string;
  serverCertPath?: string;
  serverKeyPath?: string;
  requireClientCert: boolean;
}

export function loadTlsConfig(): TlsConfig {
  return {
    enabled: process.env.MTLS_ENABLED === 'true',
    caPath: process.env.MTLS_CA_CERT_PATH,
    serverCertPath: process.env.MTLS_SERVER_CERT_PATH,
    serverKeyPath: process.env.MTLS_SERVER_KEY_PATH,
    requireClientCert: process.env.MTLS_REQUIRE_CLIENT_CERT === 'true',
  };
}

export function tlsConfigIsValid(cfg: TlsConfig): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!cfg.serverCertPath || !existsSync(cfg.serverCertPath)) missing.push('MTLS_SERVER_CERT_PATH');
  if (!cfg.serverKeyPath || !existsSync(cfg.serverKeyPath)) missing.push('MTLS_SERVER_KEY_PATH');
  if (cfg.requireClientCert && (!cfg.caPath || !existsSync(cfg.caPath))) missing.push('MTLS_CA_CERT_PATH');
  return { ok: missing.length === 0, missing };
}

/**
 * Create an HTTPS or HTTP server wrapping the given request handler.
 * Returns the server and the listener protocol ('https' | 'http') for
 * logging.
 */
export function createSecureServer(
  handler: http.RequestListener,
  cfg: TlsConfig = loadTlsConfig(),
): { server: https.Server | http.Server; protocol: 'https' | 'http' } {
  if (!cfg.enabled) {
    return { server: http.createServer(handler), protocol: 'http' };
  }
  const validity = tlsConfigIsValid(cfg);
  if (!validity.ok) {
    throw new Error(`mTLS enabled but certs missing: ${validity.missing.join(', ')}`);
  }
  const tlsOpts: https.ServerOptions = {
    cert: readFileSync(cfg.serverCertPath!),
    key: readFileSync(cfg.serverKeyPath!),
  };
  if (cfg.requireClientCert) {
    tlsOpts.ca = readFileSync(cfg.caPath!);
    tlsOpts.requestCert = true;
    tlsOpts.rejectUnauthorized = true;
  }
  return { server: https.createServer(tlsOpts, handler), protocol: 'https' };
}
