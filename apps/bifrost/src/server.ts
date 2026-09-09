import { randomUUID } from 'node:crypto';
import http from 'node:http';
import express, { type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { WebSocket, WebSocketServer } from 'ws';
<<<<<<< HEAD
import { z } from 'zod';
import {
  createAuthHandshake,
  getHandshakeStatus,
  resendAuthHandshake,
  verifyAuthHandshake,
} from './authHandshake';
import { geminiRouter, setupLiveWebsocket } from './gemini';
import { issueSignedAction } from './issuance';
import { MicrocubicMatrix } from './microcubic';
import { type RouteOutcome, route } from './router';
import { SignatureError, verifyActionSignature, verifyWebhookSignature } from './security';
import { applyCommand, setRouteTelemetry, snapshot } from './state';
import {
  StreamingTelemetrySchema,
  getStreamingSnapshot,
  upsertStreamingTelemetry,
} from './streaming';
=======
import { MicrocubicMatrix } from './microcubic';
import { type Command, parseCommand } from './nlp';
import { verifyWebhookSignature } from './security';
import { applyCommand, snapshot } from './state';
>>>>>>> remotes/origin/feat/microcubic-routing

// WebSocket carrying the heartbeat flag used by the reaper loop below.
interface LiveSocket extends WebSocket {
  isAlive?: boolean;
}

// Capture the raw body so the webhook route can verify its HMAC signature.
interface RawBodyRequest extends Request {
  rawBody?: string;
}

const PORT =
  Number(
    process.env.BIFROST_PORT ||
      (process.env.PORT && process.env.PORT !== '3000' ? process.env.PORT : undefined),
  ) || 3001;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? '';

// Cap inbound frame size (16 KB) — commands are tiny; reject oversized payloads
// at the protocol layer to avoid unbounded JSON.parse work.
const MAX_WS_PAYLOAD = 16 * 1024;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: MAX_WS_PAYLOAD });

// Setup Gemini API and Live WebSocket endpoints
app.use('/api', geminiRouter);
setupLiveWebsocket(wss);

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

app.get('/api/streaming/telemetry', (_req, res) => {
  res.status(200).json(getStreamingSnapshot());
});

const streamingTelemetryLimiter = rateLimit({
  windowMs: 60_000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/streaming/telemetry', streamingTelemetryLimiter, (req: RawBodyRequest, res) => {
  const signature = req.header('x-webhook-signature');
  const signed = WEBHOOK_SECRET
    ? verifyWebhookSignature(req.rawBody ?? '', signature, WEBHOOK_SECRET)
    : process.env.NODE_ENV !== 'production';

  if (!signed) return res.status(401).json({ error: 'INVALID_SIGNATURE' });

  const parsed = StreamingTelemetrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_PAYLOAD', details: parsed.error.issues });
  }

  try {
    const snapshotResult = upsertStreamingTelemetry(parsed.data);
    broadcastStreamingTelemetry();
    return res.status(200).json({ status: 'ACCEPTED', snapshot: snapshotResult });
  } catch (error) {
    return res.status(507).json({ error: (error as Error).message });
  }
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

function broadcastStreamingTelemetry(): void {
  const msg = JSON.stringify({
    type: 'STREAMING_TELEMETRY',
    payload: getStreamingSnapshot(),
  });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// Route a parsed command: update in-memory state, dispatch a microcube for the
// DB side effects, then broadcast the new state to all clients.
async function routeCommand(cmd: Command): Promise<void> {
  applyCommand(cmd);
  try {
    await matrix.executeCube({ id: randomUUID(), command: cmd });
  } catch (error) {
    console.error('microcube execution failed:', error);
  }
  broadcastState();
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

<<<<<<< HEAD
  const outcome = await handleUtterance(message);
  res.status(200).json({
    status: 'received',
    lane: outcome.lane,
    command: outcome.command.action,
    rezeroed: outcome.rezeroed,
  });
});

// ── 5-Minute TTL Biometric & Secret Vault Authorization Handshake Routes ──
const authHandshakeLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const GenerateHandshakeSchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required').max(64),
  tenantHandle: z.string().min(1, 'tenantHandle is required').max(64),
  channel: z.enum(['email', 'sms', 'biometric_push']).optional().default('email'),
  recipient: z.string().max(128).optional(),
});

const VerifyHandshakeSchema = z.object({
  sessionId: z.string().min(4, 'sessionId is required'),
  code: z.string().min(4, 'code is required').max(16),
});

const ResendHandshakeSchema = z.object({
  sessionId: z.string().min(4, 'sessionId is required'),
  channel: z.enum(['email', 'sms', 'biometric_push']).optional(),
});

/**
 * POST /api/auth/handshake/generate
 * Initiates a 5-minute TTL handshake session and dispatches randomized code.
 */
app.post('/api/auth/handshake/generate', authHandshakeLimiter, (req, res) => {
  const parsed = GenerateHandshakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_REQUEST', issues: parsed.error.issues });
  }

  try {
    const { session, code } = createAuthHandshake(parsed.data);
    res.status(200).json({
      status: 'DISPATCHED',
      session,
      code, // Dev/sandbox helper
    });
  } catch (err) {
    console.error('[Bifrost/auth/generate] Failed:', err);
    res.status(500).json({ error: 'HANDSHAKE_GENERATION_FAILED' });
  }
});

/**
 * POST /api/auth/handshake/verify
 * Validates candidate authorization code against 5-minute TTL state.
 */
app.post('/api/auth/handshake/verify', authHandshakeLimiter, (req, res) => {
  const parsed = VerifyHandshakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_REQUEST', issues: parsed.error.issues });
  }

  const { sessionId, code } = parsed.data;
  const result = verifyAuthHandshake(sessionId, code);

  if (!result.verified) {
    const statusCode = result.error === 'NOT_FOUND' ? 404 : result.error === 'EXPIRED' ? 410 : 401;
    return res.status(statusCode).json(result);
  }

  res.status(200).json(result);
});

/**
 * GET /api/auth/handshake/status/:sessionId
 * Queries real-time TTL status and remaining seconds.
 */
app.get('/api/auth/handshake/status/:sessionId', authHandshakeLimiter, (req, res) => {
  const { sessionId } = req.params;
  const status = getHandshakeStatus(sessionId);

  if (!status) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Handshake session not found.' });
  }

  res.status(200).json(status);
});

/**
 * POST /api/auth/handshake/resend
 * Regenerates code and resets the 5-minute TTL.
 */
app.post('/api/auth/handshake/resend', authHandshakeLimiter, (req, res) => {
  const parsed = ResendHandshakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'INVALID_REQUEST', issues: parsed.error.issues });
  }

  const { sessionId, channel } = parsed.data;
  const result = resendAuthHandshake(sessionId, channel);

  if (!result) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Handshake session not found.' });
  }

  res.status(200).json({
    status: 'RESENT',
    session: result.session,
    code: result.code,
  });
});

// ── Provenance Ledger Route ──
app.post('/api/provenance', express.json(), (req, res) => {
  const { command, outcome, timestamp } = req.body;
  if (!command || !outcome || !timestamp) {
    return res.status(400).json({ error: 'MISSING_DATA' });
  }

  try {
    const fsNode = require('fs');
    const pathNode = require('path');
    const cryptoNode = require('crypto');
    
    // Write directly to the workspace root ledger
    const ledgerPath = pathNode.resolve(__dirname, '../../../PROVENANCE_LEDGER.md');
    
    // Hash the entry payload for immutability check
    const hash = cryptoNode.createHash('sha256').update(`${timestamp}-${command}-${outcome}`).digest('hex');
    const shortHash = hash.substring(0, 12);
    
    const entry = `\n### Transaction 0x${shortHash}\n- **Status:** RECORDED\n- **Timestamp:** ${timestamp}\n- **Command:** \`${command}\`\n- **Outcome:** ${outcome.replace(/\n/g, ' ')}\n`;
    
    fsNode.appendFileSync(ledgerPath, entry, 'utf8');
    res.status(200).json({ status: 'RECORDED', hash: shortHash });
  } catch (err) {
    console.error('Failed to append to ledger:', err);
    res.status(500).json({ error: 'WRITE_FAILED' });
  }
=======
  const cmd = parseCommand(message);
  await routeCommand(cmd);
  res.status(200).json({ status: 'received', command: cmd.action });
>>>>>>> remotes/origin/feat/microcubic-routing
});

// ── WebSocket: command intake + heartbeat ──
wss.on('connection', (ws: LiveSocket, req: http.IncomingMessage) => {
  if (req.url === '/live') return; // Handled by gemini.ts setupLiveWebsocket

  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Send the current unified state immediately on connect.
  ws.send(JSON.stringify({ type: 'STATE_UPDATE', payload: snapshot() }));
  ws.send(JSON.stringify({ type: 'STREAMING_TELEMETRY', payload: getStreamingSnapshot() }));

  ws.on('message', async (data) => {
    let raw: string;
    try {
      const parsed = JSON.parse(data.toString());
<<<<<<< HEAD
      raw = typeof parsed?.payload === 'string' ? parsed.payload : data.toString();
    } catch {
      raw = data.toString();
    }
    await handleUtterance(raw);
=======
      cmd =
        typeof parsed?.payload === 'string'
          ? parseCommand(parsed.payload)
          : parseCommand(data.toString());
    } catch {
      cmd = parseCommand(data.toString());
    }
    await routeCommand(cmd);
>>>>>>> remotes/origin/feat/microcubic-routing
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
wss.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[bifrost wss] Port ${PORT} already in use; proceeding gracefully.`);
  } else {
    console.error('[bifrost wss] Error:', err);
  }
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[bifrost] Port ${PORT} already in use; proceeding gracefully.`);
  } else {
    console.error('[bifrost] Server error:', err);
  }
});

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
