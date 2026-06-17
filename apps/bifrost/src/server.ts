import http from 'node:http';
import { prisma } from '@sovereign/db';
import express, { type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { WebSocket, WebSocketServer } from 'ws';
import { type Command, parseCommand } from './nlp';
import { verifyWebhookSignature } from './security';
import { applyCommand, snapshot, state } from './state';

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

// Persist a command's side effects (best-effort; broadcast already reflects state).
async function persistCommand(cmd: Command): Promise<void> {
  try {
    if (cmd.action === 'add_transaction') {
      // Balanced journal entry (placeholder debit/credit mapping).
      await prisma.journalEntry.create({
        data: {
          memo: `Command: add transaction ${cmd.amount}`,
          lines: {
            create: [
              { debit: cmd.amount, credit: 0 },
              { debit: 0, credit: cmd.amount },
            ],
          },
        },
      });
    } else if (cmd.action === 'remind') {
      await prisma.echoLog.create({ data: { message: `Reminder set for ${cmd.who}` } });
    } else if (cmd.action === 'order') {
      await prisma.echoLog.create({ data: { message: `Order placed: ${cmd.item}` } });
    } else {
      await prisma.echoLog.create({ data: { message: `Unrecognized command: ${cmd.raw}` } });
    }
  } catch (error) {
    console.error('persistCommand failed:', error);
  }
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

  await prisma.echoLog.create({ data: { message: `SMS webhook: ${message}` } });

  // Route the inbound text through the command parser, then broadcast new state.
  const cmd = parseCommand(message);
  applyCommand(cmd);
  await persistCommand(cmd);
  broadcastState();

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
      if (parsed?.type === 'VOICE_COMMAND' && typeof parsed.payload === 'string') {
        cmd = parseCommand(parsed.payload);
      } else if (typeof parsed?.payload === 'string') {
        cmd = parseCommand(parsed.payload);
      } else {
        cmd = parseCommand(data.toString());
      }
    } catch {
      // Plain-text command frame.
      cmd = parseCommand(data.toString());
    }

    applyCommand(cmd);
    await persistCommand(cmd);
    broadcastState();
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

// ── Graceful shutdown: drain sockets, close server, disconnect Prisma ──
async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received — shutting down...`);
  clearInterval(interval);
  for (const client of wss.clients) client.terminate();
  wss.close();
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

export { app, server, wss };
