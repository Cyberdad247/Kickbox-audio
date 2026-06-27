#!/usr/bin/env node
// scripts/ci/fixture-hitl.mjs
//
// Mints an HMAC-signed KBA bundle and POSTs it to /api/bifrost/hitl, then
// asserts the handshake. Exits non-zero on any failure. Designed for the
// `KBA Smoke` GitHub Actions workflow (.github/workflows/kba-smoke.yml)
// but is also runnable locally:
//
//   ACTION_SECRET=... PORT=3017 node scripts/ci/fixture-hitl.mjs
//
// Env:
//   ACTION_SECRET  Required. Shared secret matched by Bifrost WEBHOOK_SECRET.
//   HOST           Default http://localhost.
//   PORT           Default 3017.
//   ACTION_ID      Default KBA_SYNC_001. Must match
//                  /^KBA_(SYNC|AUDIT|REROUTE|REZERO|HEAL|NANO|SCAN|FORGE)_[A-Z0-9]{2,16}$/.

import crypto from 'node:crypto';

const SECRET = process.env.ACTION_SECRET;
const HOST = process.env.HOST ?? 'http://localhost';
const PORT = process.env.PORT ?? '3017';
const actionId = process.env.ACTION_ID ?? 'KBA_SYNC_001';

if (!SECRET) {
  console.error('[fixture-hitl] ACTION_SECRET env required');
  process.exit(2);
}

const timestamp = Date.now();
const expiresAt = timestamp + 5 * 60_000;
const payload = `${actionId}:${timestamp}`;
const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

const url = `${HOST}:${PORT}/api/bifrost/hitl`;
let res;
try {
  res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-webhook-action': actionId,
      'x-webhook-signature': signature,
      'x-webhook-timestamp': String(timestamp),
      'x-webhook-expires-at': String(expiresAt),
    },
    body: '{}',
  });
} catch (err) {
  console.error(`[fixture-hitl] network error: ${err.message}`);
  process.exit(1);
}

const body = await res.json().catch(() => null);
const ok =
  res.status === 200 &&
  body !== null &&
  body.actionId === actionId &&
  (body.status === 'NO_LOCAL_HANDLER' || body.status === 'LOCKED_AND_ROUTED');

if (!ok) {
  console.error(
    `[fixture-hitl] FAIL action=${actionId} status=${res.status} body=${JSON.stringify(body)}`,
  );
  process.exit(1);
}
console.log(
  `[fixture-hitl] PASS action=${actionId} status=${res.status} body=${JSON.stringify(body)}`,
);
