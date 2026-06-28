// v1.2.0 T3.3: MUST be the first import so the OTel SDK can monkey-patch
// http/express/ws BEFORE those modules are loaded by subsequent imports.
// v1.2.0 T3.2: Sentry init at module load time.
import './instrumentation';
import './sentry-init';

import { randomUUID } from 'node:crypto';
import http from 'node:http';
import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { WebSocket, WebSocketServer } from 'ws';
import { MicrocubicMatrix } from './microcubic';
import { type RouteOutcome, route } from './router';
import { z } from 'zod';
import { SignatureError, verifyActionSignature, verifyWebhookSignature } from './security';
import { applyCommand, setRouteTelemetry, snapshot } from './state';
import { issueSignedAction } from './issuance';
import { logger } from './logger';
import { requireRole } from './auth';
import { loadBifrostSecrets } from './secrets';
// initSentry is still imported (re-exported from sentry-init) for callers
// that want to capture exceptions from non-server-entry points.
import { captureException } from './sentry';

// WebSocket carrying the heartbeat flag used by the reaper loop below.
interface LiveSocket extends WebSocket {
  isAlive?: boolean;
}

// Capture the raw body so the webhook route can verify its HMAC signature.
interface RawBodyRequest extends Request {
  rawBody?: string;
}

const PORT = Number(process.env.PORT) || 3001;

// v1.2.0 T3.4: load secrets from vault with fail-fast. WEBHOOK_SECRET
// starts empty; loadBifrostSecrets() resolves before the server starts
// accepting requests (we await it before server.listen below).
// The ensureSecretsLoaded middleware returns 503 if a request somehow
// lands before secrets resolve (defense in depth).
let WEBHOOK_SECRET = '';
loadBifrostSecrets()
  .then((s) => {
    WEBHOOK_SECRET = s.webhookSecret;
    logger.info('[secrets] vault-loaded WEBHOOK_SECRET');
  })
  .catch((err) => {
    // Fall back to env if vault is unconfigured or fails. Logged as warn
    // (not error) because env-only is a valid dev/CI mode.
    logger.warn({ err: (err as Error).message }, '[secrets] vault load failed; using env');
    WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';
  });

// v1.2.0 T3.4 race-window fix: reject requests with 503 until secrets
// are loaded. Applied globally so /api/bifrost/* never handles a request
// with a partial/stale secret. /health is EXEMPT so liveness probes work
// during boot (Kubernetes/load-balancers would otherwise mark the service
// unhealthy before secrets resolve).
function ensureSecretsLoaded(req: Request, res: Response, next: () => void): void {
  if (req.path === '/health') {
    next();
    return;
  }
  if (!WEBHOOK_SECRET) {
    res.status(503).json({ error: 'STARTING_UP', message: 'Secrets are still loading' });
    return;
  }
  next();
}

// Cap inbound frame size (16 KB) — commands are tiny; reject oversized payloads
// at the protocol layer to avoid unbounded JSON.parse work.
const MAX_WS_PAYLOAD = 16 * 1024;

const app = express();
// v1.2.0 T3.4: apply the secrets-loaded guard AFTER app is created so
// /api/bifrost/* never handles a request with a partial/stale secret.
// /health is EXEMPT (see ensureSecretsLoaded body) so liveness probes
// work during boot.
app.use(ensureSecretsLoaded);
const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: MAX_WS_PAYLOAD });

// Microcubic Matrix — each command runs in an isolated worker_threads microcube
// (Zero Docker). Cubes own DB side effects; this thread owns state + broadcast.
const matrix = new MicrocubicMatrix();
matrix.on('cube_collapsed', (event) => {
  if (event.success) {
    logger.info(
      { taskId: event.taskId, action: event.result.command.action },
      'cube collapsed',
    );
  } else {
    logger.error({ err: event.error, taskId: event.taskId }, 'cube failed');
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

// Rate limit env vars (v1.1.0 externalized) with safe defaults matching
// the historical hardcoded values.
const ISSUE_RATE_LIMIT_MAX = Number(process.env.ISSUE_RATE_LIMIT_MAX) || 30;
const ISSUE_RATE_LIMIT_WINDOW_MS = Number(process.env.ISSUE_RATE_LIMIT_WINDOW_MS) || 60_000;
const HITL_RATE_LIMIT_MAX = Number(process.env.HITL_RATE_LIMIT_MAX) || 60;
const HITL_RATE_LIMIT_WINDOW_MS = Number(process.env.HITL_RATE_LIMIT_WINDOW_MS) || 60_000;

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
      logger.error({ err: error }, 'microcube execution failed');
    }
  }

  setRouteTelemetry({
    response: outcome.response,
    lane: outcome.lane,
    latencyMs: outcome.latencyMs,
    rezeroed: outcome.rezeroed,
  });
  logger.info(
    {
      lane: outcome.lane,
      latencyMs: outcome.latencyMs,
      action: outcome.command.action,
      rezeroed: outcome.rezeroed,
      reason: outcome.reason,
    },
    'route',
  );
  broadcastState();
  return outcome;
}

// ── Task 2.4 — SMS/webhook ingress (Telnyx/Bandwidth), HMAC-signed + rate-limited ──
const webhookLimiter = rateLimit({
  windowMs: HITL_RATE_LIMIT_WINDOW_MS,
  max: HITL_RATE_LIMIT_MAX,
  standardHeaders: true,
});

// ── KBA Cartridge: HMAC issuance + HITL dispatch ──
const issueLimiter = rateLimit({
  windowMs: ISSUE_RATE_LIMIT_WINDOW_MS,
  max: ISSUE_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

const hitlLimiter = rateLimit({
  windowMs: HITL_RATE_LIMIT_WINDOW_MS,
  max: HITL_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
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

app.post('/api/bifrost/issue', requireRole('operator'), issueLimiter, async (req, res) => {
  const parsed = IssueBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_BODY', issues: parsed.error.issues });
  }
  const { actionId } = parsed.data;
  try {
    const signed = issueSignedAction(actionId, WEBHOOK_SECRET);
    res.status(200).json(signed);
  } catch (err) {
    logger.error({ err }, '[Bifrost/issue] issuance failed');
    res.status(500).json({ error: 'ISSUANCE_FAILED' });
  }
});

app.post('/api/bifrost/hitl', requireRole('operator'), hitlLimiter, async (req, res) => {
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
  logger.info(
    {
      actionId,
      lane: outcome.lane,
      latencyMs: outcome.latencyMs,
      rezeroed: outcome.rezeroed,
    },
    '[Bifrost/hitl] routed',
  );
  res.status(200).json({
    status: outcome.command.action === 'unknown' ? 'NO_LOCAL_HANDLER' : 'LOCKED_AND_ROUTED',
    actionId,
    timestamp,
    lane: outcome.lane,
    rezeroed: outcome.rezeroed,
  });
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
    logger.error({ err: error }, 'WebSocket error');
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
  logger.info({ port: PORT }, 'Bifrost gateway listening');
});

// ── Graceful shutdown: drain sockets, close server ──
function shutdown(signal: string): void {
  logger.info({ signal }, 'shutting down');
  clearInterval(interval);
  for (const client of wss.clients) client.terminate();
  wss.close();
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app, server, wss };
