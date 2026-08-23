export interface StreamingNodeSnapshot {
  nodeId: string;
  region: string;
  status: 'healthy' | 'degraded' | 'offline';
  viewers: number;
  bitrateKbps: number;
  packetLossPct: number;
  latencyMs: number;
  loadPct: number;
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
