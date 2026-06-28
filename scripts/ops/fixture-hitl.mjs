#!/usr/bin/env node
// scripts/ci/fixture-hitl.mjs
//
// Mints HMAC-signed KBA bundles and POSTs each to /api/bifrost/hitl, then
// asserts the handshake for every KBA_<DOMAIN>_<id> variant. Exits non-zero
// on any failure. Designed for the `KBA Smoke` GitHub Actions workflow
// (.github/workflows/kba-smoke.yml). KBA Cartridge v1001: expands from the
// v1000 SYNC-only smoke to the full verb set.
//
// Env:
//   ACTION_SECRET  Required. Shared secret matched by Bifrost WEBHOOK_SECRET.
//   HOST           Default http://localhost.
//   PORT           Default 3017.
//
// Per AGENTS.md Rule 6: runic authority flows only through the sovereign
// Pointer channel (this CLI / typed commits). This script is part of the
// verifiable runic surface; any change must come with a code-reviewer pass.

import crypto from 'node:crypto';

const SECRET = process.env.ACTION_SECRET;
const HOST = process.env.HOST ?? 'http://localhost';
const PORT = process.env.PORT ?? '3017';

if (!SECRET) {
  console.error('[fixture-hitl] ACTION_SECRET env required');
  process.exit(2);
}

// KBA Cartridge v1001 — full KbaDomain enumeration per state.ts/nlp.ts.
// Discriminators are arbitrary 3-digit uppercase strings; the Zod schema in
// server.ts validates them as `[A-Z0-9]{2,16}`.
const actionIds = [
  'KBA_SYNC_001',
  'KBA_AUDIT_002',
  'KBA_REROUTE_003',
  'KBA_REZERO_004',
  'KBA_HEAL_005',
  'KBA_NANO_006',
  'KBA_SCAN_007',
  'KBA_FORGE_008',
];

const url = `${HOST}:${PORT}/api/bifrost/hitl`;
let failures = 0;

for (const actionId of actionIds) {
  const timestamp = Date.now();
  const expiresAt = timestamp + 5 * 60_000;
  const payload = `${actionId}:${timestamp}`;
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');

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
    console.error(`[fixture-hitl] FAIL ${actionId}: network error: ${err.message}`);
    failures += 1;
    continue;
  }

  const body = await res.json().catch(() => null);
  const ok =
    res.status === 200 &&
    body !== null &&
    body.actionId === actionId &&
    (body.status === 'NO_LOCAL_HANDLER' || body.status === 'LOCKED_AND_ROUTED');

  if (!ok) {
    console.error(
      `[fixture-hitl] FAIL ${actionId} status=${res.status} body=${JSON.stringify(body)}`,
    );
    failures += 1;
  } else {
    console.log(
      `[fixture-hitl] PASS ${actionId} status=${res.status} ${body.status}`,
    );
  }
}

if (failures > 0) {
  console.error(`[fixture-hitl] ${failures}/${actionIds.length} actions failed`);
  process.exit(1);
}
console.log(`[fixture-hitl] ALL ${actionIds.length} actions passed`);
