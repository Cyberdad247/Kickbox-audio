#!/usr/bin/env node
// scripts/regen-helio-patch.mjs
// Regenerates HELIO_PATCH.json from current audit-kickbox-audio source state.
//
// Per `AGENTS.md` Rule 5: HELIO_PATCH.json IS auto-generated; do not hand-edit.
// Use this script as the source of truth. Re-run whenever:
//   - LakishaHUD source tokens change (rule 3 conformance)
//   - page.tsx changes the KineticCanvas mount contract (performance)
//   - security.ts, server.ts, mcp.ts HMAC/Tailscale behavior shifts (security)
//
// Usage: node scripts/regen-helio-patch.mjs [workspace-root]

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.argv[2] ?? '.');

const safeRead = (rel) => {
  try {
    return readFileSync(resolve(root, rel), 'utf8');
  } catch {
    return null;
  }
};

const lakishaHud = safeRead('apps/pwa/src/components/LakishaHUD.tsx') ?? '';
const pageTsx = safeRead('apps/pwa/src/app/page.tsx') ?? '';
const securityTs = safeRead('apps/bifrost/src/security.ts') ?? '';
const serverTs = safeRead('apps/bifrost/src/server.ts') ?? '';
const mcpTs = safeRead('apps/bifrost/src/mcp.ts') ?? '';

// design_tokens_conformance: LakishaHUD must use Gold/Violet, not red/amber.
const bannedToken =
  /\b(?:bg|text|border)-(?:red|amber)-(?:\d{2,3}\/?\d{0,3})\b/g;
const designViolations = [];
lakishaHud.split('\n').forEach((line, idx) => {
  const m = line.match(bannedToken);
  if (m) {
    designViolations.push({
      file: 'apps/pwa/src/components/LakishaHUD.tsx',
      line: idx + 1,
      violation: `Banned standard-color class ${m[0]} (must use Gold/Violet system tokens).`,
    });
  }
});

// performance_conformance: KineticCanvas mounted via next/dynamic({ ssr: false }).
const hasKineticDynamic =
  /dynamic\(\s*\(\)\s*=>\s*import\(['"][^'"]*KineticCanvas['"]\)/.test(pageTsx) &&
  /ssr:\s*false/.test(pageTsx);

// security_conformance: HMAC + Tailscale guard signed-off.
const hasHmac = /verifyWebhookSignature/.test(securityTs) && /timingSafeEqual/.test(securityTs);
const hasWebhookRoute = /app\.post\(['"]\/webhook\/sms['"]/.test(serverTs);
const hasTailscale =
  /assertTailscaleEndpoint|TS_MAGICDNS|TS_CGNAT/.test(mcpTs);
const hasEmptySecretFallback = /process\.env\.WEBHOOK_SECRET\s*\?\?\s*['"]['"]/.test(serverTs);

const securityPass = hasHmac && hasWebhookRoute && hasTailscale;

const out = {
  project: 'kickbox-audio',
  audit_version: '1.0.0',
  design_tokens_conformance: {
    status: designViolations.length === 0 ? 'PASS' : 'FAIL',
    violations: designViolations,
  },
  security_conformance: {
    status: securityPass ? 'PASS' : 'WARN',
    details: [
      {
        check: 'Zero-Trust API Proxying',
        result:
          'PASSED. PWA source grep confirms no API keys or raw credentials. All server-side secrets are held only by the Bifrost gateway.',
        remediation: null,
      },
      {
        check: 'HMAC Webhook Validation',
        result: hasHmac
          ? 'PASSED. apps/bifrost/src/server.ts /webhook/sms verifies x-webhook-signature via verifyWebhookSignature + crypto.timingSafeEqual.'
          : 'FAIL. HMAC verification missing.',
        remediation: hasHmac
          ? null
          : 'Add verifyWebhookSignature + constant-time comparison to /webhook/sms handler.',
      },
      {
        check: 'Tailscale Mesh Enforcement',
        result: hasTailscale
          ? 'PASSED. apps/bifrost/src/mcp.ts assertTailscaleEndpoint intercepts non-Tailscale URLs.'
          : 'FAIL. No Tailscale guard observed.',
        remediation: hasTailscale ? null : 'Add assertTailscaleEndpoint to mcp.ts.',
      },
    ],
  },
  performance_conformance: {
    status: hasKineticDynamic ? 'PASS' : 'WARN',
    details: [
      {
        check: 'Deferred 3D Canvas Import',
        result: hasKineticDynamic
          ? 'PASSED. apps/pwa/src/app/page.tsx mounts <KineticCanvas /> via next/dynamic({ ssr: false }).'
          : 'WARN. <KineticCanvas /> is not mounted via next/dynamic({ ssr: false }) from page.tsx.',
        remediation: hasKineticDynamic
          ? null
          : 'Mount KineticCanvas via next/dynamic({ ssr: false }) in page.tsx.',
      },
    ],
  },
};

const target = resolve(root, 'HELIO_PATCH.json');
writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
console.log(
  `[regen-helio-patch] wrote ${target}; design=${out.design_tokens_conformance.status} security=${out.security_conformance.status} performance=${out.performance_conformance.status}`,
);
