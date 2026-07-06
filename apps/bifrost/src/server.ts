import { randomUUID } from 'node:crypto';
import http from 'node:http';
import express, { type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { WebSocket, WebSocketServer } from 'ws';
import { z } from 'zod';
import { renderCmsTemplate } from './cms';
import { issueProxySignedAction, issueSignedAction } from './issuance';
import { MicrocubicMatrix } from './microcubic';
import { type RouteOutcome, route } from './router';
import { SignatureError, requireBifrostProxySignature, verifyActionSignature, verifyWebhookSignature } from './security';
import { dispatchToLocalMta } from './smtpRelay';
import { applyCommand, setRouteTelemetry, snapshot } from './state';

// WebSocket carrying the heartbeat flag used by the reaper loop below.
interface LiveSocket extends WebSocket {
  isAlive?: boolean;
}

// Capture the raw body so the webhook route can verify its HMAC signature.
interface RawBodyRequest extends Request {
  rawBody?: string;
}

const PORT = Number(process.env.PORT) || 3001;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';

// Cap inbound frame size (16 KB) — commands are tiny; reject oversized payloads
// at the protocol layer to avoid unbounded JSON.parse work.
const MAX_WS_PAYLOAD = 16 * 1024;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: MAX_WS_PAYLOAD });

// Microcubic Matrix — each command runs in an isolated worker_threads microcube
// (Zero Docker). Cubes own DB side effects; this thread owns state + broadcast.
const matrix = new MicrocubicMatrix();
matrix.on('cube_collapsed', (event) => {
  if (event.success) {
    console.log(`cube ${event.taskId} collapsed → ${event.result.command.action}`);
  } else {
    console.error(`cube ${event.taskId} failed:`, event.error);
  }
});

app.use(
  express.json({
    limit: '64kb',
    verify: (req, _res, buf) => {
      (req as RawBodyRequest).rawBody = buf.toString('utf8');
    },
  }),
);

// ── Health check (graceful deploys / load balancers) ──
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', clients: wss.clients.size });
});

// ── Broadcast helper: push unified state to every open client ──
function broadcastState(): void {
  const msg = JSON.stringify({ type: 'STATE_UPDATE', payload: snapshot() });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// vMAX //ROUTE + //REZERO — remote MCP endpoint must be a Tailscale URL.
const REMOTE_MCP_URL = process.env.REMOTE_MCP_URL;
const ROUTE_BUDGET_MS = Number(process.env.ROUTE_BUDGET_MS) || 900;

// Route an utterance: classify lane (local-first / Tailscale remote-MCP bypass
// with REZERO), apply in-memory state, persist local side effects, broadcast.
async function handleUtterance(raw: string): Promise<RouteOutcome> {
  const outcome = await route(raw, { remoteMcpUrl: REMOTE_MCP_URL, budgetMs: ROUTE_BUDGET_MS });
  applyCommand(outcome.command);

  // Only known local actions get DB persistence via a microcube.
  if (outcome.lane === 'LOCAL_TOOLS' && outcome.command.action !== 'unknown') {
    try {
      await matrix.executeCube({ id: randomUUID(), command: outcome.command });
    } catch (error) {
      console.error('microcube execution failed:', error);
    }
  }

  setRouteTelemetry({
    response: outcome.response,
    lane: outcome.lane,
    latencyMs: outcome.latencyMs,
    rezeroed: outcome.rezeroed,
  });
  console.log(
    `route ${outcome.lane}${outcome.rezeroed ? ` (//REZERO: ${outcome.reason})` : ''} ` +
      `${outcome.latencyMs}ms -> ${outcome.command.action}`,
  );
  broadcastState();
  return outcome;
}

// ── Task 2.4 — SMS/webhook ingress (Telnyx/Bandwidth), HMAC-signed + rate-limited ──
const webhookLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true });

// ── KBA Cartridge: HMAC issuance + HITL dispatch ──
const issueLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

const hitlLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const cmsLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

// Distinct budget from issueLimiter (KBA) — proxy-sign is hit at ~2 trips per
// user click (render + draft + publish, cache-collapsed), and concurrent PWA
// users across tabs would otherwise starve the issue budget.
const proxySignLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const CmsTemplateRenderSchema = z.object({
  template_id: z.enum(['tpl_followup_01', 'tpl_welcome_01']),
  contact_context: z
    .object({
      contact_email: z.string().email().optional(),
      contact_name: z.string().min(1).max(120).optional(),
      intent: z.string().min(1).max(400).optional(),
    })
    .default({}),
});

const CmsDraftSchema = z.object({
  contact: z.object({
    email: z.string().email(),
    name: z.string().min(1).max(120).optional(),
  }),
  html: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(['approved', 'pending_approval']).default('pending_approval'),
  subject: z.string().min(1).max(240),
  template_id: z.enum(['tpl_followup_01', 'tpl_welcome_01']),
  text: z.string().min(1),
});

const CmsPublishSchema = z.object({
  approval: z.object({
    approved_by: z.string().min(1).max(120),
    confirmed: z.literal(true),
  }),
  draft_id: z.string().min(1),
  html: z.string().min(1),
  subject: z.string().min(1).max(240),
  text: z.string().min(1),
  to: z.object({
    email: z.string().email(),
    name: z.string().min(1).max(120).optional(),
  }),
});

const IssueBodySchema = z.object({
  actionId: z
    .string()
    .min(8, 'actionId too short')
    .max(64, 'actionId too long')
    .regex(
      /^KBA_(SYNC|AUDIT|REROUTE|REZERO|HEAL|NANO|SCAN|FORGE)_[A-Z0-9]{2,16}$/,
      'actionId must match KBA_<DOMAIN>_<UPPER_ALNUM>',
    ),
});

app.post('/api/bifrost/issue', issueLimiter, async (req, res) => {
  const parsed = IssueBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.issues });
  }
  const { actionId } = parsed.data;
  try {
    const signed = issueSignedAction(actionId, WEBHOOK_SECRET);
    res.status(200).json(signed);
  } catch (err) {
    console.error('[Bifrost/issue] issuance failed:', err);
    res.status(500).json({ error: 'ISSUANCE_FAILED' });
  }
});

app.post('/api/bifrost/hitl', hitlLimiter, async (req, res) => {
  const actionId = req.header('x-webhook-action');
  const signature = req.header('x-webhook-signature');
  const expiresAtRaw = req.header('x-webhook-expires-at');
  const timestampRaw = req.header('x-webhook-timestamp');

  if (!actionId || !signature || !expiresAtRaw || !timestampRaw) {
    return res.status(400).json({ error: 'MISSING_HEADER' });
  }
  const timestamp = Number(timestampRaw);
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(timestamp) || !Number.isFinite(expiresAt)) {
    return res.status(400).json({ error: 'MALFORMED_HEADER' });
  }

  try {
    verifyActionSignature({ actionId, timestamp, signature, expiresAt, secret: WEBHOOK_SECRET });
  } catch (err) {
    if (err instanceof SignatureError) {
      return res.status(401).json({ error: err.code, message: err.message });
    }
    return res.status(401).json({ error: 'UNKNOWN_SIG_ERROR' });
  }

  // Wire HITL to the Bifrost router. The verified signature authorizes the
  // action; we treat `kba ${actionId}` as a parseable utterance and feed it
  // through the existing `route()` so KBA actions flow through the same
  // //ROUTE + //REZERO governance as /webhook/sms. The router.ts NLP classifier
  // will land known KBA verbs on LOCAL_TOOLS and unknown verbs on REMOTE_MCP
  // bypass (Tailscale-guarded by the caller setup at process boot).
  const utterance = `kba ${actionId}`;
  const outcome = await route(utterance, {
    remoteMcpUrl: REMOTE_MCP_URL,
    budgetMs: ROUTE_BUDGET_MS,
  });
  applyCommand(outcome.command);
  setRouteTelemetry({
    response: outcome.response,
    lane: outcome.lane,
    latencyMs: outcome.latencyMs,
    rezeroed: outcome.rezeroed,
  });
  broadcastState();
  console.log(
    `[Bifrost/hitl] routed action=${actionId} lane=${outcome.lane} ` +
      `latency=${outcome.latencyMs}ms rezeroed=${outcome.rezeroed}`,
  );
  res.status(200).json({
    status: outcome.command.action === 'unknown' ? 'NO_LOCAL_HANDLER' : 'LOCKED_AND_ROUTED',
    actionId,
    timestamp,
    lane: outcome.lane,
    rezeroed: outcome.rezeroed,
  });
});

async function getPrisma() {
  const mod = await import('@sovereign/db');
  return mod.prisma;
}

app.post('/api/cms/template/render', cmsLimiter, requireBifrostProxySignature(), async (req, res) => {
  const parsed = CmsTemplateRenderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.issues });
  }

  try {
    const rendered = renderCmsTemplate(parsed.data.template_id, parsed.data.contact_context);
    res.status(200).json(rendered);
  } catch (error) {
    console.error('[CMS/render] failed:', error);
    res.status(500).json({ error: 'RENDER_FAILED' });
  }
});

app.post('/api/cms/content/create-draft', cmsLimiter, requireBifrostProxySignature(), async (req, res) => {
  const parsed = CmsDraftSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.issues });
  }

  const draftId = randomUUID();
  const { contact, html, metadata, status, subject, template_id, text } = parsed.data;

  try {
    const prisma = await getPrisma();
    await prisma.contact.upsert({
      where: { email: contact.email },
      update: { name: contact.name },
      create: { email: contact.email, name: contact.name },
    });
    await prisma.echoLog.create({
      data: {
        message: JSON.stringify({
          contact,
          draftId,
          html,
          metadata,
          stage: 'cms_draft',
          status,
          subject,
          template_id,
          text,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    res.status(200).json({
      contact,
      draft_id: draftId,
      metadata,
      status,
      subject,
      template_id,
    });
  } catch (error) {
    console.error('[CMS/create-draft] failed:', error);
    res.status(500).json({ error: 'DRAFT_CREATE_FAILED' });
  }
});

app.post('/api/cms/content/publish', cmsLimiter, requireBifrostProxySignature({ bindBody: true }), async (req, res) => {
  const parsed = CmsPublishSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.issues });
  }

  const { approval, draft_id, html, subject, text, to } = parsed.data;
  try {
    const dispatch = await dispatchToLocalMta({
      bodyHtml: html,
      bodyText: text,
      subject,
      toAddress: to.email,
    });

    const prisma = await getPrisma();
    await prisma.messageThread.upsert({
      where: { channel_handle: { channel: 'email', handle: to.email } },
      update: {
        messages: {
          create: {
            body: text,
            direction: 'outbound',
          },
        },
      },
      create: {
        channel: 'email',
        handle: to.email,
        messages: {
          create: [
            {
              body: text,
              direction: 'outbound',
            },
          ],
        },
      },
    });
    await prisma.echoLog.create({
      data: {
        message: JSON.stringify({
          approvedBy: approval.approved_by,
          draftId: draft_id,
          relay: dispatch.relay,
          stage: 'cms_publish',
          subject,
          timestamp: new Date().toISOString(),
          to,
          transport: dispatch.dryRun ? 'dry-run' : 'smtp',
        }),
      },
    });

    res.status(200).json({
      approved_by: approval.approved_by,
      draft_id,
      relay: dispatch.relay,
      recipient: dispatch.recipient,
      transport: dispatch.dryRun ? 'dry-run' : 'smtp',
    });
  } catch (error) {
    console.error('[CMS/publish] failed:', error);
    res.status(500).json({ error: 'PUBLISH_FAILED' });
  }
});

// ── PWA proxy HMAC mint endpoint — issues a 10-min signed bundle the PWA
// attaches as x-webhook-* headers on every /api/cms/* call. Open-and-rate-
// limited (mirrors /api/bifrost/issue) — closure is enforced by the network
// boundary (Tailscale / private deployment) and by the verify-side signature
// check on /api/cms/*. See `requireBifrostProxySignature({ bindBody })`.
const ProxySignBodySchema = z.object({
  actionId: z.string().regex(
    /^CMS__(RENDER|DRAFT|PUBLISH)__[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'actionId must match CMS__<VERB>__<uuid>',
  ),
  rawBody: z.string().optional(),
});

app.post('/api/bifrost/proxy-sign', proxySignLimiter, async (req, res) => {
  const parsed = ProxySignBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.issues });
  }
  try {
    const signed =
      parsed.data.rawBody !== undefined
        ? issueProxySignedAction(parsed.data.actionId, WEBHOOK_SECRET, {
            rawBody: parsed.data.rawBody,
          })
        : issueProxySignedAction(parsed.data.actionId, WEBHOOK_SECRET);
    res.status(200).json(signed);
  } catch (err) {
    console.error('[Bifrost/proxy-sign] issuance failed:', err);
    res.status(500).json({ error: 'ISSUANCE_FAILED' });
  }
});

app.post('/webhook/sms', webhookLimiter, async (req: RawBodyRequest, res) => {
  const signature = req.header('x-webhook-signature');
  if (!verifyWebhookSignature(req.rawBody ?? '', signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const { message } = req.body ?? {};
  if (typeof message !== 'string' || message.length === 0) {
    return res.status(400).send('Message is required');
  }

  const outcome = await handleUtterance(message);
  res.status(200).json({
    status: 'received',
    lane: outcome.lane,
    command: outcome.command.action,
    rezeroed: outcome.rezeroed,
  });
});

// ── WebSocket: command intake + heartbeat ──
wss.on('connection', (ws: LiveSocket) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Send the current unified state immediately on connect.
  ws.send(JSON.stringify({ type: 'STATE_UPDATE', payload: snapshot() }));

  ws.on('message', async (data) => {
    let raw: string;
    try {
      const parsed = JSON.parse(data.toString());
      raw = typeof parsed?.payload === 'string' ? parsed.payload : data.toString();
    } catch {
      raw = data.toString();
    }
    await handleUtterance(raw);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// ── Task 2.2 — reaper: drop sockets that miss heartbeats ──
const interval = setInterval(() => {
  for (const client of wss.clients) {
    const ws = client as LiveSocket;
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000);

wss.on('close', () => clearInterval(interval));

server.listen(PORT, () => {
  console.log(`Bifrost gateway listening on port ${PORT}`);
});

// ── Graceful shutdown: drain sockets, close server ──
function shutdown(signal: string): void {
  console.log(`${signal} received — shutting down...`);
  clearInterval(interval);
  for (const client of wss.clients) client.terminate();
  wss.close();
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, server, wss };
