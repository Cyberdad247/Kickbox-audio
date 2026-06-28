import { randomUUID } from 'node:crypto';
import http from 'node:http';
import express, { type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { WebSocket, WebSocketServer } from 'ws';
import { MicrocubicMatrix } from './microcubic';
import { type RouteOutcome, route } from './router';
import { z } from 'zod';
import { SignatureError, verifyActionSignature, verifyWebhookSignature } from './security';
import { applyCommand, setRouteTelemetry, snapshot } from './state';
import { issueSignedAction } from './issuance';

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
