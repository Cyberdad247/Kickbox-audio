import WebSocket, { WebSocketServer } from 'ws';
import express from 'express';
import http from 'http';
import { PrismaClient } from '@prisma/client';

// WebSocket carrying the heartbeat flag used by the reaper loop below.
interface LiveSocket extends WebSocket {
  isAlive?: boolean;
}

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Webhook endpoint for Zelle/SMS
app.post('/webhook/zelle-sms', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).send('Message is required');
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.echoLog.create({
        data: { message: `Webhook received: ${message}` },
      });
    });
    res.status(200).send('Webhook received and logged.');
  } catch (error) {
    console.error('Failed to log webhook:', error);
    res.status(500).send('Failed to process webhook.');
  }
});

wss.on('connection', (ws: LiveSocket) => {
  console.log('Client connected');

  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', message => {
    console.log(`Received message: ${message}`);
    // Handle incoming messages from clients if needed
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', error => {
    console.error('WebSocket error:', error);
  });
});

// Connection timeout reaper
const interval = setInterval(() => {
  wss.clients.forEach((ws: LiveSocket) => {
    if (!ws.isAlive) {
      console.log('Terminating dead client');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Ping every 30 seconds

wss.on('close', () => {
  clearInterval(interval);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Bifrost Bridge listening on port ${PORT}`);
});
