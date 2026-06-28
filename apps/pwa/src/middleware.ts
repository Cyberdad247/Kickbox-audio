/**
 * v1.3.0 Tier 4.2: Per-request Content-Security-Policy nonce middleware.
 *
 * Replaces the static CSP in vercel.json (which still ships as a defense-
 * in-depth baseline, but the middleware wins at the response level).
 *
 * Why per-request nonce instead of static `'unsafe-inline'`:
 *   - Closes the XSS → arbitrary-script-execution path (this is the main
 *     blast-radius reduction of dropping `'unsafe-eval'`).
 *   - `'strict-dynamic'` lets a nonced script transitively load further
 *     scripts without needing hash-pinning (which would need to be
 *     regenerated after every build).
 *   - Dev keeps `'unsafe-eval'` because webpack/HMR needs it; prod must
 *     NOT include it. The split is gated on NODE_ENV which Next.js sets
 *     correctly for both `next dev` and `next build`/`next start`.
 *
 * How Next.js 14 picks up the nonce:
 *   - Next.js reads the `Content-Security-Policy` request header, parses
 *     out `'nonce-{value}'` from `script-src`, and stamps it onto every
 *     inline `<script>` it would normally emit (hydration bootstrap,
 *     __NEXT_DATA__, dev-only diagnostics). See
 *     `packages/next/src/server/app-render/get-script-nonce-from-header.tsx`
 *     in the Next.js source.
 *   - We set the CSP on BOTH the request header (so Next.js can extract)
 *     and the response header (so the browser enforces it). The x-nonce
 *     request header is provided as a convenience for hand-written
 *     `<Script>` tags in app components that want to opt in directly.
 *
 * Coexistence with vercel.json:
 *   - `vercel.json` keeps a tightened static baseline (script-src drops
 *     `'unsafe-eval'`, no `'unsafe-inline'` on script-src). The
 *     middleware's per-request response header supersedes it at runtime;
 *     the static header serves as a fallback if the middleware import
 *     path errors out.
 *
 * Matcher: runs on user-facing pages only.
 *   - skips `/_next/static/*` (hashed webpack chunks, internal)
 *   - skips `/_next/image` (image optimizer, internal)
 *   - skips `/favicon.ico`, `/icon.svg`, `/manifest.webmanifest` (assets)
 *   - skips `/api/health` (the liveness probe — Vercel marks the deploy
 *     unhealthy if middleware blocks /api/health)
 *   - runs on EVERYTHING else (pages, /api/* except /api/health)
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Build the CSP string for a single request. Per-source-list rationale:
 *   - default-src 'self': everything must come from us or fail
 *   - script-src 'self' + 'nonce-{NONCE}' + 'strict-dynamic':
 *       nonced scripts (the nonce is fresh per request) can pull more
 *       scripts without unsafe-inline. Dev adds 'unsafe-eval' for HMR.
 *   - style-src 'self' 'unsafe-inline': next/font + tailwind inject
 *       inline <style> tags; tightening to nonce-only is v1.4.0 work.
 *   - img-src 'self' data: blob: covers Sentry replay in-memory
 *       screenshots + Vite-style asset URLs.
 *   - font-src 'self' data: covers next/font URL-rev'd woff2.
 *   - connect-src 'self' wss://*.wss: keeps the Bifrost WS open across
 *       any Tailscale FQDN; Sentry telemetry endpoint added.
 *   - media-src 'self' blob: covers WebRTC + Sentry replay attachments.
 *   - object-src 'none' / base-uri 'self' / form-action 'self':
 *       closes plugin-based XSS + base-tag hijacking + form-action
 *       exfil vectors.
 *   - frame-ancestors 'none' replaced X-Frame-Options: DENY in CSP
 *       (overlaps, but CSP frame-ancestors is the modern equivalent).
 *   - upgrade-insecure-requests forces HTTPS for any http:// asset.
 */
export function buildCspHeader(nonce: string, isDev: boolean): string {
  const scriptSrcEval = isDev ? " 'unsafe-eval'" : '';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${scriptSrcEval}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' wss: https://*.sentry.io https://*.ingest.sentry.io",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function middleware(request: NextRequest): NextResponse {
  // crypto.randomUUID is available in the Edge runtime (V8 with Web
  // Crypto polyfills); no extra imports needed.
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV === 'development';
  const csp = buildCspHeader(nonce, isDev);

  // Set on REQUEST headers so Next.js can extract the nonce and stamp
  // it onto the inline scripts it would normally emit. Critical for
  // supporting hydration without `'unsafe-inline'` on script-src.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set on RESPONSE headers so the browser enforces the per-request CSP.
  // The browser sees the most restrictive union of response CSPs.
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('x-nonce', nonce);

  return response;
}

export const config = {
  // Run on every page route except internal Next.js paths and the
  // liveness/chrome endpoints. /api/* (other than /api/health) runs
  // through middleware so API responses inherit the CSP; JSON bodies
  // don't need script/style/connect-src but the per-request header
  // doesn't cost anything and prevents accidental XSS in a future
  // API that returns HTML.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|api/health).*)',
  ],
};
