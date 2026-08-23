import { z } from 'zod';

export const STREAMING_STALE_AFTER_MS = 15_000;
const MAX_STREAMING_NODES = 512;

export const StreamingTelemetrySchema = z
  .object({
    nodeId: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z0-9._-]+$/),
    region: z.string().trim().min(1).max(64),
    status: z.enum(['healthy', 'degraded', 'offline']),
    viewers: z.number().int().min(0).max(10_000_000),
    bitrateKbps: z.number().min(0).max(100_000),
    packetLossPct: z.number().min(0).max(100),
    latencyMs: z.number().min(0).max(60_000),
    loadPct: z.number().min(0).max(100),
  })
  .strict();

export type StreamingTelemetry = z.infer<typeof StreamingTelemetrySchema>;

export interface StreamingNodeSnapshot extends StreamingTelemetry {
  lastSeenAt: string;
}

export interface StreamingTelemetrySnapshot {
  generatedAt: string;
  totalViewers: number;
  healthyNodes: number;
  nodeCount: number;
  averageLatencyMs: number;
  averagePacketLossPct: number;
  nodes: StreamingNodeSnapshot[];
}

const nodes = new Map<string, StreamingNodeSnapshot>();

export function upsertStreamingTelemetry(
  telemetry: StreamingTelemetry,
  now = Date.now(),
): StreamingTelemetrySnapshot {
  if (!nodes.has(telemetry.nodeId) && nodes.size >= MAX_STREAMING_NODES) {
    throw new Error('STREAMING_NODE_CAPACITY');
  }

  nodes.set(telemetry.nodeId, {
    ...telemetry,
    lastSeenAt: new Date(now).toISOString(),
  });

  return getStreamingSnapshot(now);
}

export function getStreamingSnapshot(now = Date.now()): StreamingTelemetrySnapshot {
  const currentNodes = [...nodes.values()].map((node) => {
    const stale = now - Date.parse(node.lastSeenAt) > STREAMING_STALE_AFTER_MS;
    return stale && node.status !== 'offline' ? { ...node, status: 'offline' as const } : node;
  });

  const activeNodes = currentNodes.filter((node) => node.status !== 'offline');

  return {
    generatedAt: new Date(now).toISOString(),
    totalViewers: activeNodes.reduce((total, node) => total + node.viewers, 0),
    healthyNodes: currentNodes.filter((node) => node.status === 'healthy').length,
    nodeCount: currentNodes.length,
    averageLatencyMs: average(activeNodes.map((node) => node.latencyMs)),
    averagePacketLossPct: average(activeNodes.map((node) => node.packetLossPct)),
    nodes: currentNodes,
  };
}

export function resetStreamingTelemetry(): void {
  nodes.clear();
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}
