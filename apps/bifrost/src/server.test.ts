import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

// Iron Gate Test B (verification.md §2.B) — Live WebSocket Synchronization.
// Connect a mock client and assert the gateway transmits a STATE_UPDATE frame
// carrying valid unified business metrics. No DB is contacted (no command sent).

let server: Server;
let wss: import('ws').WebSocketServer;
let url: string;
let httpUrl: string;

beforeAll(async () => {
  // Bind a dedicated test port (server.ts treats 0 as falsy → use a real one).
  process.env.PORT = '34117';
  const mod = await import('./server');
  server = mod.server;
  wss = mod.wss;
  if (!server.listening) {
    await new Promise<void>((resolve) => server.once('listening', () => resolve()));
  }
  const addr = server.address() as AddressInfo;
  url = `ws://127.0.0.1:${addr.port}`;
  httpUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  for (const client of wss.clients) client.terminate();
  wss.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('Bifrost WebSocket gateway', () => {
  it('transmits a STATE_UPDATE with valid metrics on connect', async () => {
    const ws = new WebSocket(url);

    const frame = await new Promise<{ type: string; payload: Record<string, unknown> }>(
      (resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('no STATE_UPDATE within 4s')), 4000);
        ws.on('message', (data) => {
          clearTimeout(timer);
          resolve(JSON.parse(data.toString()));
        });
        ws.on('error', reject);
      },
    );
    ws.close();

    expect(frame.type).toBe('STATE_UPDATE');
    expect(typeof frame.payload.portfolioValuation).toBe('number');
    expect(frame.payload.portfolioValuation).toBe(14_200_000);
    expect(typeof frame.payload.updatedAt).toBe('string');
  });

  it('ingests streaming telemetry and broadcasts the aggregate snapshot', async () => {
    const ws = new WebSocket(url);
    const telemetryFrame = new Promise<{ type: string; payload: Record<string, unknown> }>(
      (resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('no telemetry update within 4s')), 4000);
        ws.on('message', (data) => {
          const frame = JSON.parse(data.toString());
          if (frame.type === 'STREAMING_TELEMETRY' && frame.payload.totalViewers === 2126) {
            clearTimeout(timer);
            resolve(frame);
          }
        });
        ws.on('error', reject);
      },
    );

    await new Promise<void>((resolve, reject) => {
      ws.once('open', resolve);
      ws.once('error', reject);
    });

    const response = await fetch(`${httpUrl}/api/streaming/telemetry`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nodeId: 'test-edge-east',
        region: 'NA-East',
        status: 'healthy',
        viewers: 2126,
        bitrateKbps: 6400,
        packetLossPct: 0.2,
        latencyMs: 68,
        loadPct: 62,
      }),
    });
    expect(response.status).toBe(202);
    const frame = await telemetryFrame;
    expect(frame.payload.healthyNodes).toBe(1);
    ws.close();
  });
});
