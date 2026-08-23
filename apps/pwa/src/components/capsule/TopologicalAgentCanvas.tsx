'use client';

import React, { useState, useEffect } from 'react';
import { useBifrost } from '../../context/BifrostContext';
import { useTenant } from '../../context/TenantContext';
import { playSpatialTone, triggerHaptic } from '../../lib/hapticsAndSpatialAudio';
import {
  type CrossRepoCartridge,
  PRE_REGISTERED_CROSS_REPO_CARTRIDGES,
} from '../../lib/kernel/cartridgeResolver';
import { speak } from '../../lib/voice';

interface AgentNode {
  id: string;
  name: string;
  role: string;
  icon: string;
  color: string;
  x: number;
  y: number;
  cpuLoad: number;
  ramUsageMb: number;
  status: 'nominal' | 'active' | 'evaluating' | 'beating';
  addressOffset: string;
  ringTier: string;
  beatHz: number;
  description: string;
  isCrossRepoCartridge?: boolean;
}

interface AgentLink {
  from: string;
  to: string;
  label: string;
  latencyMs: number;
  ratePerSec: number;
}

export function TopologicalAgentCanvas() {
  const { activeTenant, activeCartridge } = useTenant();
  const { connected, latencyMs } = useBifrost();

  const [selectedNode, setSelectedNode] = useState<AgentNode | null>(null);
  const [packetTick, setPacketTick] = useState(0);
  const [isInjectingStress, setIsInjectingStress] = useState(false);
  const [isHarmonicBeating, setIsHarmonicBeating] = useState(false);
  const [beatRateHz, setBeatRateHz] = useState<number>(60);
  const [activeAddressFilter, setActiveAddressFilter] = useState<'ALL' | 'RING_0' | 'RING_1'>(
    'ALL',
  );

  const [logs, setLogs] = useState<Array<{ id: string; time: string; msg: string; tag: string }>>([
    {
      id: '1',
      time: '00:01:12',
      msg: 'Anya VAD node streamed 240 bytes audio buffer to Bifröst bridge.',
      tag: 'AUDIO',
    },
    {
      id: '2',
      time: '00:01:15',
      msg: 'Merlin knowledge loop queried RDF triple store for active cartridge state.',
      tag: 'GRAPH',
    },
    {
      id: '3',
      time: '00:01:18',
      msg: 'Lady Sentinel verified no_std ChaCha20 capability signature in microVM.',
      tag: 'SEC',
    },
    {
      id: '4',
      time: '00:01:22',
      msg: 'Cross-repo cartridge cart-bifrost-gateway resolved at address 0x8000_BIFROST.',
      tag: 'CARTRIDGE',
    },
  ]);

  // Initial combined agent nodes & cross-repo cartridges in topological formation
  const [nodes, setNodes] = useState<AgentNode[]>([
    {
      id: 'anya',
      name: 'Anya Paladin Guard',
      role: 'Voice VAD & Intent Parsing',
      icon: '🎙️',
      color: '#00F0FF',
      x: 140,
      y: 110,
      cpuLoad: 14,
      ramUsageMb: 128,
      status: 'active',
      addressOffset: '0x0000_ANYA_VAD',
      ringTier: 'Ring 1 Workspace',
      beatHz: 60,
      description:
        'Isolates user acoustic speech buffers, filters ambient noise, and extracts structured intent.',
    },
    {
      id: 'merlin',
      name: 'Merlin Arcane Loop',
      role: 'RDF Graph & Orchestration',
      icon: '🧙‍♂️',
      color: '#9D4EDD',
      x: 400,
      y: 110,
      cpuLoad: 28,
      ramUsageMb: 340,
      status: 'nominal',
      addressOffset: '0x1000_MERLIN_KG',
      ringTier: 'Ring 0 Master',
      beatHz: 120,
      description:
        'Maintains temporal knowledge graph, routes sub-agent tasks, and resolves state bottlenecks.',
    },
    {
      id: 'sentinel',
      name: 'Lady Sentinel',
      role: 'MicroVM Isolation & SRE',
      icon: '🛡️',
      color: '#10B981',
      x: 660,
      y: 230,
      cpuLoad: 9,
      ramUsageMb: 96,
      status: 'nominal',
      addressOffset: '0x2000_SENTINEL',
      ringTier: 'Ring 0 Security',
      beatHz: 90,
      description:
        'Guarantees hardware memory boundaries, validates capability leases, and watches memory leaks.',
    },
    {
      id: 'gideon',
      name: 'Gideon Proof Engine',
      role: 'Cryptographic Receipts',
      icon: '📜',
      color: '#FFD700',
      x: 380,
      y: 350,
      cpuLoad: 18,
      ramUsageMb: 184,
      status: 'evaluating',
      addressOffset: '0x3000_GIDEON_ZK',
      ringTier: 'Ring 0 Master',
      beatHz: 45,
      description:
        'Generates non-repudiable cryptographic receipts for all executed workspace transactions.',
    },
    {
      id: 'excalibur',
      name: 'Excalibur Consent',
      role: 'Sovereign Gatekeeper',
      icon: '⚔️',
      color: '#FF00FF',
      x: 120,
      y: 330,
      cpuLoad: 5,
      ramUsageMb: 64,
      status: 'nominal',
      addressOffset: '0x4000_EXCALIBUR',
      ringTier: 'Ring 0 Security',
      beatHz: 30,
      description:
        'Enforces human-in-the-loop sovereign gate approval before any destructive action occurs.',
    },

    // Integrated Cross-Repo Cartridge Nodes
    {
      id: 'cart-bifrost-gateway',
      name: 'Bifröst Bridge GW',
      role: 'WebRTC & Tailscale Mesh',
      icon: '🌉',
      color: '#3B82F6',
      x: 630,
      y: 90,
      cpuLoad: 22,
      ramUsageMb: 210,
      status: 'nominal',
      addressOffset: '0x8000_BIFROST_GW',
      ringTier: 'Ring 0 Security',
      beatHz: 120,
      description:
        'Cross-repo bridge gateway managing WebRTC peer connections and mTLS Tailscale mesh nodes.',
      isCrossRepoCartridge: true,
    },
    {
      id: 'cart-mcp-query-guard',
      name: 'MCP Query Guard',
      role: 'Remote Context Guard',
      icon: '🛡️',
      color: '#F59E0B',
      x: 520,
      y: 240,
      cpuLoad: 12,
      ramUsageMb: 110,
      status: 'nominal',
      addressOffset: '0x8080_MCP_GUARD',
      ringTier: 'Ring 1 Enclave',
      beatHz: 75,
      description:
        'Tailscale remote Model Context Protocol guard enforcing zero-leakage read/write boundary policies.',
      isCrossRepoCartridge: true,
    },
    {
      id: 'cart-lakisha-voice-hud',
      name: 'Lakisha Voice HUD',
      role: 'Tap-to-Connect Audio',
      icon: '🎙️',
      color: '#EC4899',
      x: 260,
      y: 220,
      cpuLoad: 16,
      ramUsageMb: 145,
      status: 'active',
      addressOffset: '0x8100_LAKISHA_HUD',
      ringTier: 'Ring 1 Workspace',
      beatHz: 60,
      description:
        'Browser-side tap-to-connect VAD speech processor, autoplay gate, and WebRTC streaming enclave.',
      isCrossRepoCartridge: true,
    },
    {
      id: 'cart-db-ledger-validator',
      name: 'Prisma DB Ledger',
      role: 'Prisma Batch Validator',
      icon: '🗄️',
      color: '#6366F1',
      x: 250,
      y: 390,
      cpuLoad: 8,
      ramUsageMb: 95,
      status: 'nominal',
      addressOffset: '0x8200_PRISMA_DB',
      ringTier: 'Ring 0 Master',
      beatHz: 100,
      description:
        'Monorepo-shared Prisma ORM schema & transaction balance validator enforcing Merkle ledger integrity.',
      isCrossRepoCartridge: true,
    },
  ]);

  const links: AgentLink[] = [
    { from: 'anya', to: 'merlin', label: 'MsgPack Intent', latencyMs: 2, ratePerSec: 24 },
    { from: 'merlin', to: 'sentinel', label: 'Capability Lease', latencyMs: 1, ratePerSec: 12 },
    { from: 'sentinel', to: 'gideon', label: 'Execution Proof', latencyMs: 3, ratePerSec: 8 },
    { from: 'gideon', to: 'excalibur', label: 'Signed Receipt', latencyMs: 1, ratePerSec: 4 },
    { from: 'excalibur', to: 'anya', label: 'Consent State', latencyMs: 2, ratePerSec: 15 },

    // Cross-repo cartridge topology links
    {
      from: 'anya',
      to: 'cart-lakisha-voice-hud',
      label: 'Acoustic VAD',
      latencyMs: 1,
      ratePerSec: 30,
    },
    {
      from: 'merlin',
      to: 'cart-mcp-query-guard',
      label: 'Context Guard',
      latencyMs: 2,
      ratePerSec: 18,
    },
    {
      from: 'sentinel',
      to: 'cart-bifrost-gateway',
      label: 'mTLS Handshake',
      latencyMs: 1,
      ratePerSec: 20,
    },
    {
      from: 'gideon',
      to: 'cart-db-ledger-validator',
      label: 'Batch Ledger',
      latencyMs: 2,
      ratePerSec: 10,
    },
  ];

  // Particle and message animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setPacketTick((t) => (t + 1) % 100);

      // Random jitter in node CPU/RAM and status updates
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          cpuLoad: isInjectingStress
            ? Math.min(95, Math.floor(65 + Math.random() * 25))
            : isHarmonicBeating
              ? Math.min(80, Math.floor(40 + Math.random() * 30))
              : Math.max(4, Math.min(45, n.cpuLoad + (Math.random() > 0.5 ? 2 : -2))),
          status: isHarmonicBeating ? 'beating' : n.status === 'beating' ? 'nominal' : n.status,
        })),
      );
    }, 120);

    return () => clearInterval(interval);
  }, [isInjectingStress, isHarmonicBeating]);

  const handleTriggerStressTest = () => {
    setIsInjectingStress(true);
    triggerHaptic('error');
    playSpatialTone(0.5, 330, 200, 'sawtooth');
    speak('Initiating topological load test across all sovereign agent and cartridge nodes.');

    const newLog = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      msg: 'Topological stress injection started: 500 synthetic MsgPack packets routed to all cross-repo cartridges.',
      tag: 'STRESS',
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 7)]);

    setTimeout(() => {
      setIsInjectingStress(false);
      triggerHaptic('consent');
      speak('Topological stress test completed. All 9 cartridge address blocks intact.');
    }, 3500);
  };

  const handleTriggerHarmonicBeat = () => {
    setIsHarmonicBeating(true);
    triggerHaptic('pill-slot');
    playSpatialTone(0.8, 880, 300, 'sine');
    speak(
      `Harmonic beat frequency locked at ${beatRateHz} Hertz across topological address space 0x0000 to 0xFFFF.`,
    );

    const newLog = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString(),
      msg: `Harmonic pulse sync engaged @ ${beatRateHz} Hz. Beat frequency aligned across all cross-repo cartridges.`,
      tag: 'BEAT_SYNC',
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 7)]);

    setTimeout(() => {
      setIsHarmonicBeating(false);
      triggerHaptic('consent');
      playSpatialTone(0.5, 1040, 200, 'triangle');
    }, 4000);
  };

  const filteredNodes = nodes.filter((n) => {
    if (activeAddressFilter === 'RING_0') return n.ringTier.startsWith('Ring 0');
    if (activeAddressFilter === 'RING_1') return n.ringTier.startsWith('Ring 1');
    return true;
  });

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/10 bg-[#080810] text-white overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-[#0E0E1C] px-5 py-3 gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl text-[#00F0FF]">🕸️</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                Topological Whole Address Matrix & Cartridge Beat Operator
              </h2>
              <span className="rounded bg-[#00F0FF]/20 px-2 py-0.5 font-mono text-[9px] font-bold text-[#00F0FF] border border-[#00F0FF]/30">
                ADDR: 0x0000..0xFFFF
              </span>
            </div>
            <p className="font-mono text-[10px] text-white/50">
              IPC MsgPack FFI Telemetry · 9 Active Cartridges · Ring 0 & Ring 1 MicroVM Isolation
            </p>
          </div>
        </div>

        {/* Live Address Filter & Beat Sync Controls */}
        <div className="flex items-center gap-2">
          {/* Ring Filter Pills */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => setActiveAddressFilter('ALL')}
              className={`px-2 py-1 rounded-lg transition-all ${
                activeAddressFilter === 'ALL'
                  ? 'bg-[#00F0FF]/20 text-[#00F0FF] font-bold border border-[#00F0FF]/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              ALL (9)
            </button>
            <button
              type="button"
              onClick={() => setActiveAddressFilter('RING_0')}
              className={`px-2 py-1 rounded-lg transition-all ${
                activeAddressFilter === 'RING_0'
                  ? 'bg-[#FFD700]/20 text-[#FFD700] font-bold border border-[#FFD700]/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              RING 0 (5)
            </button>
            <button
              type="button"
              onClick={() => setActiveAddressFilter('RING_1')}
              className={`px-2 py-1 rounded-lg transition-all ${
                activeAddressFilter === 'RING_1'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              RING 1 (4)
            </button>
          </div>

          <button
            type="button"
            onClick={handleTriggerHarmonicBeat}
            disabled={isHarmonicBeating}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition-all ${
              isHarmonicBeating
                ? 'border-emerald-400 bg-emerald-500/25 text-emerald-300 animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                : 'border-[#00F0FF]/40 bg-[#00F0FF]/15 text-[#00F0FF] hover:bg-[#00F0FF]/30'
            }`}
          >
            <span>💓</span>
            <span>{isHarmonicBeating ? 'Beating @ 60Hz...' : 'Harmonic Beat Sync'}</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerStressTest}
            disabled={isInjectingStress}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs font-bold transition-all ${
              isInjectingStress
                ? 'border-amber-400 bg-amber-500/20 text-amber-300 animate-pulse'
                : 'border-[#FFD700]/40 bg-[#FFD700]/10 text-[#FFD700] hover:bg-[#FFD700]/20'
            }`}
          >
            <span>⚡</span>
            <span>{isInjectingStress ? 'Stress Testing...' : 'Inject Load Test'}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas & Inspector Split */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
        {/* SVG Dynamic Topology Canvas */}
        <div className="lg:col-span-2 relative bg-[#0A0A14] flex items-center justify-center p-6 border-b lg:border-b-0 lg:border-r border-white/10 overflow-hidden">
          {/* Animated Background Grid */}
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #00F0FF 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />

          <svg className="w-full h-[480px] max-w-[820px] select-none" viewBox="0 0 820 480">
            {/* Draw Links & Directional Packets */}
            {links.map((link, idx) => {
              const sourceNode = nodes.find((n) => n.id === link.from);
              const targetNode = nodes.find((n) => n.id === link.to);
              if (!sourceNode || !targetNode) return null;

              // Check if both nodes are visible under current address filter
              const isSourceVisible = filteredNodes.some((n) => n.id === sourceNode.id);
              const isTargetVisible = filteredNodes.some((n) => n.id === targetNode.id);
              if (!isSourceVisible || !isTargetVisible) return null;

              // Calculate packet position along line
              const speedMultiplier = isHarmonicBeating ? 2.5 : 1;
              const progress = ((packetTick * speedMultiplier + idx * 18) % 100) / 100;
              const packetX = sourceNode.x + (targetNode.x - sourceNode.x) * progress;
              const packetY = sourceNode.y + (targetNode.y - sourceNode.y) * progress;

              return (
                <g key={idx}>
                  {/* Link Path */}
                  <line
                    x1={sourceNode.x}
                    y1={sourceNode.y}
                    x2={targetNode.x}
                    y2={targetNode.y}
                    stroke={isHarmonicBeating ? '#10B981' : sourceNode.color}
                    strokeWidth={isHarmonicBeating ? '2.5' : '1.5'}
                    strokeOpacity={isHarmonicBeating ? '0.7' : '0.35'}
                    strokeDasharray="4 4"
                  />

                  {/* Flow Label */}
                  <text
                    x={(sourceNode.x + targetNode.x) / 2}
                    y={(sourceNode.y + targetNode.y) / 2 - 6}
                    fill="rgba(255,255,255,0.45)"
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {link.label} ({link.ratePerSec}/s)
                  </text>

                  {/* Animated Traveling Packet */}
                  <circle
                    cx={packetX}
                    cy={packetY}
                    r={isHarmonicBeating ? '5' : '3.5'}
                    fill={isHarmonicBeating ? '#00F0FF' : sourceNode.color}
                    className="filter drop-shadow-[0_0_8px_currentColor]"
                  />
                </g>
              );
            })}

            {/* Draw Nodes */}
            {filteredNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer group"
                  onClick={() => {
                    setSelectedNode(node);
                    triggerHaptic('click');
                    playSpatialTone(node.x / 820, 520, 100, 'sine');
                  }}
                >
                  {/* Node Outer Pulse Ring */}
                  <circle
                    r={isSelected ? 38 : 30}
                    fill="none"
                    stroke={isHarmonicBeating ? '#10B981' : node.color}
                    strokeWidth={isSelected ? '3' : '1.5'}
                    strokeOpacity={isSelected ? '0.9' : node.isCrossRepoCartridge ? '0.7' : '0.4'}
                    className="transition-all duration-300 group-hover:stroke-opacity-100"
                    style={{
                      filter: isSelected
                        ? `drop-shadow(0 0 15px ${node.color})`
                        : isHarmonicBeating
                          ? 'drop-shadow(0 0 10px #10B981)'
                          : 'none',
                    }}
                  />

                  {/* Cross-Repo Cartridge Dashed Outer Orbit */}
                  {node.isCrossRepoCartridge && (
                    <circle
                      r="35"
                      fill="none"
                      stroke="#00F0FF"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                      strokeOpacity="0.5"
                    />
                  )}

                  {/* Node Background Disc */}
                  <circle
                    r={isSelected ? 32 : 26}
                    fill="#0E0E1C"
                    stroke={node.color}
                    strokeWidth="1"
                  />

                  {/* Icon */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={isSelected ? '20' : '16'}
                  >
                    {node.icon}
                  </text>

                  {/* Node Name */}
                  <text
                    y="42"
                    textAnchor="middle"
                    fill="white"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                  >
                    {node.name.split(' ')[0]}
                  </text>

                  {/* Memory Address Label */}
                  <text
                    y="53"
                    textAnchor="middle"
                    fill={node.isCrossRepoCartridge ? '#00F0FF' : 'rgba(255,255,255,0.5)'}
                    fontSize="7"
                    fontFamily="monospace"
                  >
                    {node.addressOffset.split('_')[0]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right Sidebar: Node Details & Whole Address Space Inspector */}
        <div className="flex flex-col bg-[#0C0C18] p-5 space-y-4 overflow-y-auto">
          {/* Node Inspector */}
          <div className="rounded-2xl border border-white/10 bg-[#121224] p-4">
            <h3 className="font-mono text-[10px] font-bold text-[#00F0FF] uppercase tracking-wider">
              Address & Cartridge Inspector
            </h3>
            {selectedNode ? (
              <div className="mt-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl border"
                    style={{ borderColor: selectedNode.color, backgroundColor: 'rgba(0,0,0,0.5)' }}
                  >
                    {selectedNode.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-display text-sm font-bold text-white">
                        {selectedNode.name}
                      </h4>
                      {selectedNode.isCrossRepoCartridge && (
                        <span className="rounded bg-[#00F0FF]/20 text-[#00F0FF] text-[8px] font-mono font-bold px-1 py-0.2 border border-[#00F0FF]/40">
                          CROSS-REPO
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-white/50">{selectedNode.role}</p>
                  </div>
                </div>

                <p className="text-xs text-white/70 leading-relaxed">{selectedNode.description}</p>

                {/* Whole Address Space & Telemetry Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 font-mono text-xs">
                  <div className="rounded-lg bg-black/40 p-2">
                    <span className="text-white/40 block text-[9px]">ADDRESS OFFSET</span>
                    <span className="text-[#00F0FF] font-bold text-[11px] truncate block">
                      {selectedNode.addressOffset}
                    </span>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2">
                    <span className="text-white/40 block text-[9px]">RING TIER</span>
                    <span className="text-[#FFD700] font-bold text-[11px]">
                      {selectedNode.ringTier}
                    </span>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2">
                    <span className="text-white/40 block text-[9px]">CPU LOAD</span>
                    <span className="text-emerald-300 font-bold text-sm">
                      {selectedNode.cpuLoad}%
                    </span>
                  </div>
                  <div className="rounded-lg bg-black/40 p-2">
                    <span className="text-white/40 block text-[9px]">MEM FOOTPRINT</span>
                    <span className="text-amber-300 font-bold text-sm">
                      {selectedNode.ramUsageMb} MB
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-white/40 font-mono text-xs">
                Click any cartridge or agent node in the topology canvas to inspect real-time
                address space & telemetry metrics.
              </div>
            )}
          </div>

          {/* Whole Address Space Memory Allocation Map */}
          <div className="rounded-2xl border border-white/10 bg-[#121224] p-4 font-mono space-y-2">
            <h3 className="text-[10px] font-bold text-[#FFD700] uppercase tracking-wider flex items-center justify-between">
              <span>Whole Topology Memory Map</span>
              <span className="text-white/40 text-[8px]">0x0000 - 0xFFFF</span>
            </h3>

            <div className="space-y-1.5 pt-1 text-[10px]">
              {nodes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    setSelectedNode(n);
                    triggerHaptic('click');
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                    selectedNode?.id === n.id
                      ? 'border-[#00F0FF] bg-[#00F0FF]/10 text-white'
                      : 'border-white/5 bg-black/30 text-white/70 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{n.icon}</span>
                    <span className="font-bold text-white text-[11px]">{n.addressOffset}</span>
                  </div>
                  <span className="text-[9px] text-[#00F0FF] font-bold">
                    {n.ringTier.replace('Ring ', 'R')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Live IPC Message Stream */}
          <div className="rounded-2xl border border-white/10 bg-[#121224] p-4 flex-1 flex flex-col">
            <h3 className="font-mono text-[10px] font-bold text-[#10B981] uppercase tracking-wider mb-2">
              Live AgentBus Message Stream
            </h3>
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[140px] font-mono text-[10px]">
              {logs.map((log) => (
                <div key={log.id} className="rounded border border-white/5 bg-black/40 p-2">
                  <div className="flex justify-between text-white/40 text-[8px] mb-0.5">
                    <span>{log.time}</span>
                    <span className="text-[#00F0FF] font-bold">[{log.tag}]</span>
                  </div>
                  <p className="text-white/80">{log.msg}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
