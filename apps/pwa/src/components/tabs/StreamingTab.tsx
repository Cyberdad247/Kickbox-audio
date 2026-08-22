'use client';

import { useBifrost } from '../../context/BifrostContext';
import { STREAM_NODES } from '../../lib/realm-data';

export function StreamingTab() {
  const { connected, streamingTelemetry } = useBifrost();
  const liveViewers =
    streamingTelemetry?.totalViewers ??
    STREAM_NODES.reduce((total, node) => total + node.viewers, 0);
  const demoNodes = STREAM_NODES.map((node) => ({
    nodeId: `demo-${node.region.toLowerCase()}`,
    region: node.region,
    status: node.status === 'Live' ? ('healthy' as const) : ('offline' as const),
    viewers: node.viewers,
    bitrateKbps: 0,
    packetLossPct: 0,
    latencyMs: 0,
    loadPct: node.load * 100,
    lastSeenAt: '',
  }));
  const nodes = streamingTelemetry?.nodes ?? demoNodes;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border border-gold/20 bg-smoke-900/60 px-6 py-4 backdrop-blur-sm">
        <div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
            KBA Streaming Live
          </span>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-white/30">
            {streamingTelemetry && connected ? 'Bifrost telemetry' : 'Demo fixture'}
          </p>
        </div>
        <div className="text-right">
          <span className="font-display text-xl tracking-minted text-gold-royal">
            {liveViewers.toLocaleString('en-US')} viewers
          </span>
          {streamingTelemetry && (
            <p className="mt-1 text-[10px] uppercase tracking-wider text-white/30">
              {streamingTelemetry.healthyNodes}/{streamingTelemetry.nodeCount} nodes healthy ·{' '}
              {streamingTelemetry.averageLatencyMs}ms avg latency
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {nodes.map((node) => (
          <div
            key={node.nodeId}
            className="border border-gold/20 bg-smoke-800/80 p-6 backdrop-blur-sm transition-shadow hover:shadow-gold"
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-lg text-white">Edge - {node.region}</p>
              <span
                className={`text-xs uppercase tracking-wider ${node.status === 'healthy' ? 'text-violet-light' : node.status === 'degraded' ? 'text-gold-light' : 'text-white/40'}`}
              >
                {node.status === 'healthy' ? 'Live' : node.status}
              </span>
            </div>
            <p className="mt-3 font-display text-2xl tracking-minted text-gold-light">
              {node.viewers.toLocaleString('en-US')}
            </p>
            <p className="text-[11px] uppercase tracking-wider text-white/35">live viewers</p>
            <div className="mt-4 h-1 w-full bg-white/10">
              <div className="h-1 bg-violet" style={{ width: `${Math.round(node.loadPct)}%` }} />
            </div>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-white/30">
              {Math.round(node.loadPct)}% load ·{' '}
              {node.latencyMs ? `${node.latencyMs}ms` : 'fixture'} latency
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
