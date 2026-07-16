import { describe, expect, it } from 'vitest';
import {
  StreamingTelemetrySchema,
  getStreamingSnapshot,
  resetStreamingTelemetry,
  upsertStreamingTelemetry,
} from './streaming';

describe('streaming telemetry contract', () => {
  it('accepts bounded edge telemetry and aggregates active viewers', () => {
    resetStreamingTelemetry();
    upsertStreamingTelemetry(
      {
        nodeId: 'edge-na-east',
        region: 'NA-East',
        status: 'healthy',
        viewers: 1284,
        bitrateKbps: 6400,
        packetLossPct: 0.2,
        latencyMs: 68,
        loadPct: 62,
      },
      1_000,
    );
    const snapshot = upsertStreamingTelemetry(
      {
        nodeId: 'edge-na-central',
        region: 'NA-Central',
        status: 'degraded',
        viewers: 842,
        bitrateKbps: 5400,
        packetLossPct: 1.1,
        latencyMs: 92,
        loadPct: 48,
      },
      2_000,
    );

    expect(snapshot.totalViewers).toBe(2126);
    expect(snapshot.healthyNodes).toBe(1);
    expect(snapshot.averageLatencyMs).toBe(80);
  });

  it('marks a node offline after the heartbeat window', () => {
    resetStreamingTelemetry();
    upsertStreamingTelemetry(
      {
        nodeId: 'edge-eu-west',
        region: 'EU-West',
        status: 'healthy',
        viewers: 40,
        bitrateKbps: 3200,
        packetLossPct: 0,
        latencyMs: 74,
        loadPct: 15,
      },
      1_000,
    );

    const snapshot = getStreamingSnapshot(16_001);
    expect(snapshot.nodes[0]?.status).toBe('offline');
    expect(snapshot.totalViewers).toBe(0);
    expect(snapshot.healthyNodes).toBe(0);
  });

  it('rejects malformed node identifiers and out-of-range loss values', () => {
    expect(
      StreamingTelemetrySchema.safeParse({
        nodeId: 'edge node',
        region: 'NA-East',
        status: 'healthy',
        viewers: 1,
        bitrateKbps: 100,
        packetLossPct: 101,
        latencyMs: 10,
        loadPct: 1,
      }).success,
    ).toBe(false);
  });
});
