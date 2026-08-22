/**
 * AaliyahComposer CMS Integration Test — Task 5.4
 *
 * Exercises the full CMS draft → publish round-trip through the real Bifrost
 * Express app with Prisma and the SMTP relay mocked out. No live DB, no live MTA.
 *
 * Round-trip under test:
 *   1. POST /api/bifrost/proxy-sign        → mint CMS__RENDER proxy token
 *   2. POST /api/cms/template/render       → render tpl_welcome_01
 *   3. POST /api/bifrost/proxy-sign        → mint CMS__DRAFT proxy token
 *   4. POST /api/cms/content/create-draft  → persist draft (Prisma mocked)
 *   5. POST /api/bifrost/proxy-sign        → mint CMS__PUBLISH body-bound token
 *   6. POST /api/cms/content/publish       → HITL-approve and dispatch (relay mocked)
 *
 * Auth model:
 *   Each CMS route requires a Bifrost proxy-auth bundle in x-webhook-* headers.
 *   The publish route additionally binds the HMAC to the raw request body,
 *   so a tampered body will fail the 401 gate even with a valid token.
 */

import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// ── Constants ─────────────────────────────────────────────────────────────────
const TEST_SECRET = 'cms-roundtrip-test-secret-32chars!!';
const TEST_PORT = '34201'; // distinct from server.test.ts (34117)

// ── Prisma mock — must be registered before server.ts is imported ─────────────
const mockContactUpsert = vi.fn().mockResolvedValue({ email: 'aaliyah@kickbox.audio' });
const mockEchoCreate = vi.fn().mockResolvedValue({ id: randomUUID() });
const mockThreadUpsert = vi.fn().mockResolvedValue({ id: randomUUID() });

vi.mock('@sovereign/db', () => ({
  prisma: {
    contact: { upsert: mockContactUpsert },
    echoLog: { create: mockEchoCreate },
    messageThread: { upsert: mockThreadUpsert },
  },
}));

// ── SMTP relay mock ───────────────────────────────────────────────────────────
const mockDispatch = vi.fn().mockResolvedValue({
  dryRun: true,
  relay: '127.0.0.1:2525',
  recipient: 'aaliyah@kickbox.audio',
});

vi.mock('./smtpRelay', async (importOriginal) => {
  const original = await importOriginal<typeof import('./smtpRelay')>();
  return { ...original, dispatchToLocalMta: mockDispatch };
});

// ── Set env before server.ts imports ─────────────────────────────────────────
process.env.WEBHOOK_SECRET = TEST_SECRET;
process.env.PORT = TEST_PORT;

// ── Server bootstrap ──────────────────────────────────────────────────────────
import { issueProxySignedAction } from './issuance';

let baseUrl: string;

beforeAll(async () => {
  const mod = await import('./server');
  const srv = mod.server;
  if (!srv.listening) {
    await new Promise<void>((resolve) => srv.once('listening', resolve));
  }
  const addr = srv.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  const mod = await import('./server');
  const { wss, server: srv } = mod;
  for (const c of wss.clients) c.terminate();
  wss.close();
  await new Promise<void>((resolve) => srv.close(() => resolve()));
  vi.restoreAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build the proxy-auth headers that every /api/cms/* route requires. */
function proxyHeaders(actionId: string, rawBody?: string): Record<string, string> {
  const signed = issueProxySignedAction(actionId, TEST_SECRET, { rawBody });
  return {
    'x-webhook-action': actionId,
    'x-webhook-signature': signed.signature,
    'x-webhook-timestamp': String(signed.timestamp),
    'x-webhook-expires-at': String(signed.expiresAt),
  };
}

/** POST JSON to the test server and return { status, body }. */
async function post(
  path: string,
  body: unknown,
  extra: Record<string, string> = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const bodyStr = JSON.stringify(body);
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extra },
    body: bodyStr,
  });
  return { status: res.status, body: await res.json() };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('AaliyahComposer CMS draft → publish round-trip (Task 5.4)', () => {
  const CONTACT = { email: 'aaliyah@kickbox.audio', name: 'Aaliyah Sovereign' };
  const INTENT = 'Launch the KBA sovereign campaign';

  // Shared state that flows through the three happy-path steps.
  let renderedHtml = '';
  let renderedText = '';
  let renderedSubject = '';
  let draftId = '';

  // ── Step 1-2: template render ─────────────────────────────────────────────
  it('Step 1-2 — renders tpl_welcome_01 via /api/cms/template/render', async () => {
    const renderBody = {
      template_id: 'tpl_welcome_01',
      contact_context: {
        contact_email: CONTACT.email,
        contact_name: CONTACT.name,
        intent: INTENT,
      },
    };
    const actionId = `CMS__RENDER__${randomUUID()}`;

    const { status, body } = await post(
      '/api/cms/template/render',
      renderBody,
      proxyHeaders(actionId),
    );

    expect(status, `render status — body: ${JSON.stringify(body)}`).toBe(200);
    expect(body.templateId).toBe('tpl_welcome_01');
    expect(body.subject as string).toContain(CONTACT.name);
    expect(body.html as string).toContain(INTENT);
    expect(body.text as string).toContain('HITL approval');
    expect(body.metadata).toMatchObject({ contactEmail: CONTACT.email });

    renderedHtml = body.html as string;
    renderedText = body.text as string;
    renderedSubject = body.subject as string;
  });

  // ── Step 3-4: create-draft ────────────────────────────────────────────────
  it('Step 3-4 — creates a CMS draft and writes cms_draft EchoLog', async () => {
    const draftBody = {
      contact: CONTACT,
      html: renderedHtml,
      metadata: { source: 'aaliyah-composer', intent: INTENT },
      status: 'pending_approval',
      subject: renderedSubject,
      template_id: 'tpl_welcome_01',
      text: renderedText,
    };
    const actionId = `CMS__DRAFT__${randomUUID()}`;

    const { status, body } = await post(
      '/api/cms/content/create-draft',
      draftBody,
      proxyHeaders(actionId),
    );

    expect(status, `draft status — body: ${JSON.stringify(body)}`).toBe(200);
    // draft_id must be a v4 UUID
    expect(body.draft_id as string).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(body.status).toBe('pending_approval');
    expect(body.template_id).toBe('tpl_welcome_01');
    expect((body.contact as { email: string }).email).toBe(CONTACT.email);

    // Prisma: Contact upsert + EchoLog create must be called.
    expect(mockContactUpsert).toHaveBeenCalledOnce();
    expect(mockEchoCreate).toHaveBeenCalledOnce();

    // Verify EchoLog payload records the correct cms_draft stage.
    const echoArg = mockEchoCreate.mock.calls[0][0] as { data: { message: string } };
    const logged = JSON.parse(echoArg.data.message) as {
      stage: string;
      template_id: string;
    };
    expect(logged.stage).toBe('cms_draft');
    expect(logged.template_id).toBe('tpl_welcome_01');

    draftId = body.draft_id as string;
  });

  // ── Step 5-6: HITL-approved publish ──────────────────────────────────────
  it('Step 5-6 — publishes the draft with HITL approval and body-bound signature', async () => {
    expect(draftId, 'draft step must complete before publish').toBeTruthy();

    const publishBody = {
      approval: { approved_by: 'SIR_BORIS', confirmed: true as const },
      draft_id: draftId,
      html: renderedHtml,
      subject: renderedSubject,
      text: renderedText,
      to: CONTACT,
    };

    // Publish binds the HMAC to the raw request body — compute it first.
    const publishBodyStr = JSON.stringify(publishBody);
    const actionId = `CMS__PUBLISH__${randomUUID()}`;

    const { status, body } = await post(
      '/api/cms/content/publish',
      publishBody,
      proxyHeaders(actionId, publishBodyStr),
    );

    expect(status, `publish status — body: ${JSON.stringify(body)}`).toBe(200);
    expect(body.draft_id).toBe(draftId);
    expect(body.approved_by).toBe('SIR_BORIS');
    expect(body.transport).toBe('dry-run');
    expect(body.relay).toBe('127.0.0.1:2525');
    expect(body.recipient).toBe(CONTACT.email);

    // SMTP relay mock must have been invoked with the correct envelope.
    expect(mockDispatch).toHaveBeenCalledOnce();
    const relayArg = mockDispatch.mock.calls[0][0] as { toAddress: string; subject: string };
    expect(relayArg.toAddress).toBe(CONTACT.email);
    expect(relayArg.subject).toBe(renderedSubject);

    // EchoLog: 2 total calls (draft + publish).
    expect(mockEchoCreate).toHaveBeenCalledTimes(2);
    const publishEcho = JSON.parse(
      (mockEchoCreate.mock.calls[1][0] as { data: { message: string } }).data.message,
    ) as { stage: string; approvedBy: string; draftId: string };
    expect(publishEcho.stage).toBe('cms_publish');
    expect(publishEcho.approvedBy).toBe('SIR_BORIS');
    expect(publishEcho.draftId).toBe(draftId);
  });

  // ── Guard: no proxy-auth headers → 401 ───────────────────────────────────
  it('Guard — rejects /api/cms/template/render with no proxy-auth headers (401)', async () => {
    const { status } = await post('/api/cms/template/render', {
      template_id: 'tpl_welcome_01',
    });
    expect(status).toBe(401);
  });

  // ── Guard: malformed body fails Zod before touching Prisma ───────────────
  it('Guard — rejects /api/cms/content/create-draft when contact.email is missing (400)', async () => {
    const actionId = `CMS__DRAFT__${randomUUID()}`;
    const { status, body } = await post(
      '/api/cms/content/create-draft',
      {
        contact: { name: 'No Email Only' }, // missing required email
        html: '<p>x</p>',
        subject: 'Subj',
        template_id: 'tpl_welcome_01',
        text: 'x',
      },
      proxyHeaders(actionId),
    );
    expect(status).toBe(400);
    expect(body.error).toBe('INVALID_BODY');
  });

  // ── Guard: tampered body → body-binding 401 ───────────────────────────────
  it('Guard — rejects /api/cms/content/publish when body does not match signed hash (401)', async () => {
    const legitBody = {
      approval: { approved_by: 'SIR_BORIS', confirmed: true as const },
      draft_id: draftId || randomUUID(),
      html: '<p>legit</p>',
      subject: 'Legit subject',
      text: 'legit',
      to: CONTACT,
    };
    const actionId = `CMS__PUBLISH__${randomUUID()}`;
    // Sign the legitimate body…
    const headers = proxyHeaders(actionId, JSON.stringify(legitBody));

    // …but transmit a tampered one (different recipient).
    const tampered = { ...legitBody, to: { email: 'attacker@evil.com' } };
    const { status } = await post('/api/cms/content/publish', tampered, headers);
    expect(status).toBe(401);
  });
});
