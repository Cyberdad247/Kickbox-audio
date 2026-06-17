import { randomUUID } from 'node:crypto';
import http from 'node:http';
import express, { type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { WebSocket, WebSocketServer } from 'ws';
import { MicrocubicMatrix } from './microcubic';
import { type Command, parseCommand } from './nlp';
import { verifyWebhookSignature } from './security';
import { applyCommand, snapshot } from './state';

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

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

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

// ── Task 2.4 — SMS/webhook ingress (Telnyx/Bandwidth), HMAC-signed + rate-limited ──
const webhookLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true });

app.post('/webhook/sms', webhookLimiter, async (req: RawBodyRequest, res) => {
  const signature = req.header('x-webhook-signature');
  if (!verifyWebhookSignature(req.rawBody ?? '', signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const { message } = req.body ?? {};
  if (typeof message !== 'string' || message.length === 0) {
    return res.status(400).send('Message is required');
  }

  const cmd = parseCommand(message);
  await routeCommand(cmd);
  res.status(200).json({ status: 'received', command: cmd.action });
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
    let cmd: Command;
    try {
      const parsed = JSON.parse(data.toString());
      cmd =
        typeof parsed?.payload === 'string'
          ? parseCommand(parsed.payload)
          : parseCommand(data.toString());
    } catch {
      cmd = parseCommand(data.toString());
    }
    await routeCommand(cmd);
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
