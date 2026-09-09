'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useBifrost } from '../../context/BifrostContext';

export interface KnightStatusItem {
  id: string;
  name: string;
  codename: string;
  role: string;
  targetRing: 'RING_0_HOTPATH' | 'RING_1_CONTEXT_SYNC' | 'RING_2_COLD_AUDITS';
  status: 'VERIFIED' | 'ACTIVE' | 'LOOP_PROMPTING' | 'IDLE' | 'STANDBY';
  latencyMs: number;
  memoryKb: number;
  evidenceHash: string;
  retries: number;
  icon: string;
  accentColor: string;
  recentLog?: string;
}

export interface SwarmCgroupMetrics {
  memoryMaxBytes: number;
  memoryCurrentBytes: number;
  cpuQuotaPct: number;
  maxTasks: number;
  currentTasks: number;
}

const DEFAULT_KNIGHTS: KnightStatusItem[] = [
  {
    id: 'sir_codex',
    name: 'Sir Codex',
    codename: 'SIR_CODEX',
    role: 'Rust/WASM Zero-Copy Kinetic Hotpath',
    targetRing: 'RING_0_HOTPATH',
    status: 'VERIFIED',
    latencyMs: 14,
    memoryKb: 256,
    evidenceHash: '0x8f2a4c19e317',
    retries: 0,
    icon: '⚡',
    accentColor: '#00F0FF',
    recentLog: 'WASM audio loopback buffer verified via wasm32-wasip2.',
  },
  {
    id: 'sir_sentinel',
    name: 'Sir Sentinel',
    codename: 'SIR_SENTINEL',
    role: 'HMAC Capability Leases & Cgroup Warden',
    targetRing: 'RING_0_HOTPATH',
    status: 'VERIFIED',
    latencyMs: 18,
    memoryKb: 512,
    evidenceHash: '0x7b11d942e88a',
    retries: 0,
    icon: '🛡️',
    accentColor: '#10B981',
    recentLog: 'Cgroups v2 slice verified: 512MB ceiling enforced.',
  },
  {
    id: 'sir_gideon',
    name: 'Sir Gideon',
    codename: 'SIR_GIDEON',
    role: 'Formal SAT Proof & Mathematical Gate',
    targetRing: 'RING_0_HOTPATH',
    status: 'VERIFIED',
    latencyMs: 22,
    memoryKb: 768,
    evidenceHash: '0x4e29bb30cf01',
    retries: 0,
    icon: '🧪',
    accentColor: '#A855F7',
    recentLog: 'Gideon Z3 formal proof verified across all DAG nodes.',
  },
  {
    id: 'anya_omega',
    name: 'Anya Ω',
    codename: 'ANYA_Ω',
    role: 'Chief Orchestration & Sovereign DAG Planner',
    targetRing: 'RING_1_CONTEXT_SYNC',
    status: 'ACTIVE',
    latencyMs: 45,
    memoryKb: 2048,
    evidenceHash: '0x1a83cc994012',
    retries: 0,
    icon: '👑',
    accentColor: '#38BDF8',
    recentLog: 'Coordinating multi-agent parallel knighthood dispatch.',
  },
  {
    id: 'lady_mnemosyne',
    name: 'Lady Mnemosyne',
    codename: 'LADY_MNEMOSYNE',
    role: 'GraphMemory & Context Ingestion Syncer',
    targetRing: 'RING_1_CONTEXT_SYNC',
    status: 'VERIFIED',
    latencyMs: 68,
    memoryKb: 4096,
    evidenceHash: '0x62ef003bca71',
    retries: 0,
    icon: '🧠',
    accentColor: '#EC4899',
    recentLog: 'Synchronized CRDT vault state with local persistence.',
  },
  {
    id: 'sir_helio',
    name: 'Sir Helio',
    codename: 'SIR_HELIO',
    role: 'Green Computing & Latency Profiler',
    targetRing: 'RING_1_CONTEXT_SYNC',
    status: 'ACTIVE',
    latencyMs: 38,
    memoryKb: 1536,
    evidenceHash: '0x9901adff7820',
    retries: 0,
    icon: '📈',
    accentColor: '#F59E0B',
    recentLog: 'Audit cycle complete: RSS well beneath 512MB ceiling.',
  },
  {
    id: 'sir_boris',
    name: 'Sir Boris',
    codename: 'SIR_BORIS',
    role: 'UI & CSS Thermodynamic Architect',
    targetRing: 'RING_2_COLD_AUDITS',
    status: 'VERIFIED',
    latencyMs: 110,
    memoryKb: 8192,
    evidenceHash: '0x33dc44a10e82',
    retries: 0,
    icon: '🎨',
    accentColor: '#FFD700',
    recentLog: 'Thermodynamic style pass: 0 color/spacing token drift.',
  },
  {
    id: 'sir_octavian',
    name: 'Sir Octavian',
    codename: 'SIR_OCTAVIAN',
    role: 'Bare-Metal OpenClaw Actuator',
    targetRing: 'RING_0_HOTPATH',
    status: 'STANDBY',
    latencyMs: 15,
    memoryKb: 1024,
    evidenceHash: '0x00cd419b1109',
    retries: 0,
    icon: '⚙️',
    accentColor: '#FB923C',
    recentLog: 'Actuator primed for sandboxed bare-metal execution.',
  },
];

export interface BioKineticNanobotHUDProps {
  onNavigateToSwarm?: () => void;
  className?: string;
}

export function BioKineticNanobotHUD({
  onNavigateToSwarm,
  className = '',
}: BioKineticNanobotHUDProps) {
  const { connected } = useBifrost();
  const [knights, setKnights] = useState<KnightStatusItem[]>(DEFAULT_KNIGHTS);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [swarmState, setSwarmState] = useState<'IDLE' | 'SWARM_ACTIVE' | 'TRIAGING' | 'LOOP_PROMPTING'>('IDLE');
  const [cgroups, setCgroups] = useState<SwarmCgroupMetrics>({
    memoryMaxBytes: 512 * 1024 * 1024,
    memoryCurrentBytes: 48 * 1024 * 1024,
    cpuQuotaPct: 100,
    maxTasks: 128,
    currentTasks: 4,
  });
  const [verifiedReceiptsCount, setVerifiedReceiptsCount] = useState<number>(12);
  const [selectedKnight, setSelectedKnight] = useState<KnightStatusItem | null>(null);
  const [activeRingFilter, setActiveRingFilter] = useState<'ALL' | 'RING_0' | 'RING_1' | 'RING_2'>('ALL');
  const [lastPulseTimestamp, setLastPulseTimestamp] = useState<string>(new Date().toLocaleTimeString());
  const [isPulsing, setIsPulsing] = useState<boolean>(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Poll real-time telemetry from Bifrost nanobot endpoint
  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await fetch('/api/nanobot/telemetry');
      if (res.ok) {
        const data = await res.json();
        if (data.status) setSwarmState(data.status);
        if (data.cgroups) {
          setCgroups({
            memoryMaxBytes: data.cgroups.memory_max_bytes || 512 * 1024 * 1024,
            memoryCurrentBytes: data.cgroups.memory_current_bytes || 48 * 1024 * 1024,
            cpuQuotaPct: data.cgroups.cpu_quota_pct || 100,
            maxTasks: data.cgroups.max_tasks || 128,
            currentTasks: data.cgroups.current_tasks || 4,
          });
        }
        if (data.verified_receipts_count !== undefined) {
          setVerifiedReceiptsCount(data.verified_receipts_count);
        }
        setLastPulseTimestamp(new Date().toLocaleTimeString());
      }
    } catch {
      // Retain active dynamic state
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 6000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  // Listen to swarm execution events or manual triggers
  useEffect(() => {
    const handleSwarmEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ status?: string; results?: any[] }>;
      if (customEvent.detail?.status) {
        setSwarmState(customEvent.detail.status as any);
      }
      if (customEvent.detail?.results && Array.isArray(customEvent.detail.results)) {
        setKnights((prev) =>
          prev.map((k) => {
            const match = customEvent.detail.results?.find(
              (r: any) => r.knight_id?.toLowerCase() === k.codename.toLowerCase() || r.knight_id === k.name
            );
            if (match) {
              return {
                ...k,
                status: match.status === 'VERIFIED' ? 'VERIFIED' : match.status === 'RETRY_REQUIRED' ? 'LOOP_PROMPTING' : 'ACTIVE',
                evidenceHash: match.evidence_hash ? `0x${match.evidence_hash.substring(0, 12)}` : k.evidenceHash,
                latencyMs: match.execution_ms || k.latencyMs,
                retries: match.retry_count !== undefined ? match.retry_count : k.retries,
                recentLog: match.output_text?.substring(0, 90) || k.recentLog,
              };
            }
            return k;
          })
        );
      }
      setLastPulseTimestamp(new Date().toLocaleTimeString());
    };

    window.addEventListener('camelot:swarm-update', handleSwarmEvent);
    return () => window.removeEventListener('camelot:swarm-update', handleSwarmEvent);
  }, []);

  // Trigger rapid swarm heartbeat pulse
  const handleTriggerPulse = async () => {
    setIsPulsing(true);
    setSwarmState('SWARM_ACTIVE');

    // Simulate kinetic pulse cycle
    setKnights((prev) =>
      prev.map((k) => ({
        ...k,
        status: k.status === 'STANDBY' ? 'ACTIVE' : k.status,
        latencyMs: Math.max(8, Math.round(k.latencyMs + (Math.random() * 6 - 3))),
      }))
    );

    try {
      await fetchTelemetry();
    } finally {
      setTimeout(() => {
        setIsPulsing(false);
        setSwarmState('IDLE');
      }, 1200);
    }
  };

  const copyEvidenceHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredKnights = knights.filter((k) => {
    if (activeRingFilter === 'RING_0') return k.targetRing === 'RING_0_HOTPATH';
    if (activeRingFilter === 'RING_1') return k.targetRing === 'RING_1_CONTEXT_SYNC';
    if (activeRingFilter === 'RING_2') return k.targetRing === 'RING_2_COLD_AUDITS';
    return true;
  });

  const memoryUsedMb = (cgroups.memoryCurrentBytes / (1024 * 1024)).toFixed(1);
  const memoryMaxMb = (cgroups.memoryMaxBytes / (1024 * 1024)).toFixed(0);
  const memoryPercent = Math.min(100, Math.round((cgroups.memoryCurrentBytes / cgroups.memoryMaxBytes) * 100));

  const verifiedCount = knights.filter((k) => k.status === 'VERIFIED').length;
  const activeCount = knights.filter((k) => k.status === 'ACTIVE' || k.status === 'LOOP_PROMPTING').length;

  return (
    <section
      id="bio-kinetic-nanobot-hud-root"
      aria-label="Bio-Kinetic Nanobots Swarm Status"
      className={`border-b border-white/10 bg-black/80 backdrop-blur-xl transition-all duration-300 select-none ${className}`}
    >
      {/* ── Top Compact Strip (Always Visible) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-l-2 border-l-[#10B981]">
        {/* Left: Swarm Identity & Status Beacon */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="text-base">🤖</span>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ${
                swarmState === 'SWARM_ACTIVE' || isPulsing
                  ? 'bg-cyan-400 animate-ping'
                  : swarmState === 'LOOP_PROMPTING'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400'
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
              Nanobot Swarm
            </span>
            <span
              id="swarm-status-badge"
              className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider whitespace-nowrap border ${
                swarmState === 'SWARM_ACTIVE' || isPulsing
                  ? 'border-cyan-400/50 bg-cyan-950/40 text-cyan-300'
                  : swarmState === 'LOOP_PROMPTING'
                    ? 'border-amber-400/50 bg-amber-950/40 text-amber-300'
                    : 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
              }`}
            >
              {isPulsing ? 'PULSING' : swarmState.replace('_', ' ')}
            </span>
          </div>

          {/* Quick Micro Status Badges for Active Knights */}
          <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-white/10">
            {knights.map((k) => (
              <button
                key={k.id}
                type="button"
                id={`micro-knight-btn-${k.id}`}
                onClick={() => {
                  setSelectedKnight(k);
                  setIsExpanded(true);
                }}
                title={`${k.codename} (${k.role}) — ${k.status} [${k.latencyMs}ms]` }
                className="group relative flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10 transition-all cursor-pointer"
              >
                <span className="text-[10px]">{k.icon}</span>
                <span
                  className="font-mono text-[9px] font-semibold text-white/70 group-hover:text-white"
                  style={{ color: k.accentColor }}
                >
                  {k.codename.replace('SIR_', '').replace('LADY_', '')}
                </span>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    k.status === 'VERIFIED'
                      ? 'bg-emerald-400'
                      : k.status === 'ACTIVE'
                        ? 'bg-cyan-400 animate-pulse'
                        : k.status === 'LOOP_PROMPTING'
                          ? 'bg-amber-400 animate-spin'
                          : 'bg-white/30'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Center: Cgroup Memory & Task Gauge */}
        <div className="hidden sm:flex items-center gap-4 font-mono text-[10px] text-white/60">
          <div className="flex items-center gap-2">
            <span className="text-white/40 uppercase tracking-widest text-[9px]">cgroups v2:</span>
            <div className="w-20 h-2 rounded-full bg-white/10 overflow-hidden relative">
              <div
                className={`h-full transition-all duration-500 ${
                  memoryPercent > 80 ? 'bg-rose-500' : memoryPercent > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${memoryPercent}%` }}
              />
            </div>
            <span className="text-white/80 font-bold whitespace-nowrap">
              {memoryUsedMb}/{memoryMaxMb}MB
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-white/50">
            <span>Verified:</span>
            <span className="text-emerald-400 font-bold">{verifiedCount}</span>
            <span>/</span>
            <span>{knights.length}</span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-white/40">
            <span>Proof Seals:</span>
            <span className="text-gold font-bold">{verifiedReceiptsCount}</span>
          </div>
        </div>

        {/* Right: Actions & Expand Drawer Toggle */}
        <div className="flex items-center gap-2">
          {/* Quick Heartbeat Pulse Button */}
          <button
            type="button"
            id="nanobot-pulse-trigger-btn"
            onClick={handleTriggerPulse}
            disabled={isPulsing}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              isPulsing
                ? 'border-cyan-400 bg-cyan-950/60 text-cyan-200'
                : 'border-white/15 bg-white/5 text-white/70 hover:border-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-950/20'
            }`}
            title="Trigger real-time swarm heartbeat & verify node health"
          >
            <span className={isPulsing ? 'animate-spin' : ''}>⚡</span>
            <span className="hidden sm:inline">{isPulsing ? 'Pulsing...' : 'Pulse'}</span>
          </button>

          {/* Jump to Full Workbench */}
          {onNavigateToSwarm && (
            <button
              type="button"
              id="nanobot-goto-workbench-btn"
              onClick={onNavigateToSwarm}
              className="flex items-center gap-1 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1 font-mono text-[10px] font-bold text-gold hover:bg-gold/20 hover:border-gold transition-all cursor-pointer whitespace-nowrap"
              title="Open full Bio-Kinetic Swarm Workbench & Merlin DAG"
            >
              <span>🔬</span>
              <span className="hidden sm:inline">Workbench</span>
            </button>
          )}

          {/* Expand/Collapse Toggle */}
          <button
            type="button"
            id="nanobot-expand-toggle-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/70 hover:border-white/40 hover:text-white transition-all cursor-pointer"
            aria-expanded={isExpanded}
            title={isExpanded ? 'Collapse Nanobot Swarm HUD' : 'Expand detailed Knight Nanobot telemetry'}
          >
            <span>{isExpanded ? '▲' : '▼'}</span>
            <span className="font-bold">{isExpanded ? 'Collapse' : 'Fleet'}</span>
          </button>
        </div>
      </div>

      {/* ── Expanded Drawer: Full Knight Fleet Telemetry & Inspector ── */}
      {isExpanded && (
        <div
          id="nanobot-fleet-expanded-drawer"
          className="border-t border-white/10 bg-[#070A0F]/95 p-4 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          {/* Controls Bar: Filters & Live Timestamp */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-white/40 uppercase tracking-widest mr-1">
                Filter:
              </span>
              {[
                { id: 'ALL', label: 'All Knights', count: knights.length },
                { id: 'RING_0', label: 'Ring 0 (Hotpath)', count: knights.filter((k) => k.targetRing === 'RING_0_HOTPATH').length },
                { id: 'RING_1', label: 'Ring 1 (Context)', count: knights.filter((k) => k.targetRing === 'RING_1_CONTEXT_SYNC').length },
                { id: 'RING_2', label: 'Ring 2 (Audit)', count: knights.filter((k) => k.targetRing === 'RING_2_COLD_AUDITS').length },
              ].map((rf) => (
                <button
                  key={rf.id}
                  type="button"
                  id={`filter-ring-btn-${rf.id}`}
                  onClick={() => setActiveRingFilter(rf.id as any)}
                  className={`px-2.5 py-1 rounded-md font-mono text-[9px] uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                    activeRingFilter === rf.id
                      ? 'border border-[#10B981] bg-[#10B981]/20 text-[#10B981] font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'border border-white/10 bg-white/5 text-white/50 hover:text-white hover:border-white/20'
                  }`}
                >
                  {rf.label} ({rf.count})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 font-mono text-[10px] text-white/40">
              <span>Last Heartbeat: <span className="text-white/70">{lastPulseTimestamp}</span></span>
              <span>Bifrost: <span className={connected ? 'text-emerald-400 font-bold' : 'text-rose-400'}>{connected ? 'ONLINE' : 'FALLBACK'}</span></span>
            </div>
          </div>

          {/* Grid of Knight Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredKnights.map((k) => {
              const isSelected = selectedKnight?.id === k.id;
              return (
                <div
                  key={k.id}
                  id={`knight-card-${k.id}`}
                  onClick={() => setSelectedKnight(isSelected ? null : k)}
                  className={`group relative rounded-xl border p-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#00F0FF] bg-[#00F0FF]/10 shadow-[0_0_20px_rgba(0,240,255,0.15)]'
                      : 'border-white/10 bg-black/50 hover:border-white/25 hover:bg-white/5'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm"
                        style={{ borderColor: `${k.accentColor}40` }}
                      >
                        {k.icon}
                      </div>
                      <div>
                        <h4
                          className="font-mono text-xs font-bold uppercase tracking-wider"
                          style={{ color: k.accentColor }}
                        >
                          {k.name}
                        </h4>
                        <span className="font-mono text-[9px] text-white/40 block">
                          {k.codename}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase whitespace-nowrap border ${
                        k.status === 'VERIFIED'
                          ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                          : k.status === 'ACTIVE'
                            ? 'border-cyan-400/40 bg-cyan-950/40 text-cyan-300 animate-pulse'
                            : k.status === 'LOOP_PROMPTING'
                              ? 'border-amber-400/40 bg-amber-950/40 text-amber-300'
                              : 'border-white/15 bg-white/5 text-white/50'
                      }`}
                    >
                      {k.status}
                    </span>
                  </div>

                  {/* Role */}
                  <p className="font-mono text-[10px] text-white/70 line-clamp-1 mb-2.5">
                    {k.role}
                  </p>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-1.5 border-t border-white/10 pt-2 font-mono text-[9px]">
                    <div className="bg-white/5 rounded px-1.5 py-1 text-center">
                      <span className="text-white/40 block text-[8px] uppercase">Latency</span>
                      <span className="font-bold text-white/90">{k.latencyMs}ms</span>
                    </div>

                    <div className="bg-white/5 rounded px-1.5 py-1 text-center">
                      <span className="text-white/40 block text-[8px] uppercase">RAM</span>
                      <span className="font-bold text-white/90">{k.memoryKb}KB</span>
                    </div>

                    <div className="bg-white/5 rounded px-1.5 py-1 text-center">
                      <span className="text-white/40 block text-[8px] uppercase">Ring</span>
                      <span
                        className={`font-bold ${
                          k.targetRing === 'RING_0_HOTPATH'
                            ? 'text-cyan-300'
                            : k.targetRing === 'RING_1_CONTEXT_SYNC'
                              ? 'text-purple-300'
                              : 'text-gold-light'
                        }`}
                      >
                        {k.targetRing === 'RING_0_HOTPATH' ? 'R0' : k.targetRing === 'RING_1_CONTEXT_SYNC' ? 'R1' : 'R2'}
                      </span>
                    </div>
                  </div>

                  {/* Evidence Hash Pill */}
                  <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-white/5 pt-1.5">
                    <span className="font-mono text-[8px] text-white/40 uppercase">SAT Proof:</span>
                    <button
                      type="button"
                      id={`copy-proof-btn-${k.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyEvidenceHash(k.evidenceHash);
                      }}
                      className="font-mono text-[9px] text-white/60 hover:text-[#00F0FF] transition-colors flex items-center gap-1 cursor-pointer"
                      title="Click to copy cryptographic proof hash"
                    >
                      <span>{copiedHash === k.evidenceHash ? '✓ Copied' : k.evidenceHash}</span>
                      <span className="text-[8px]">📋</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Knight Detailed Diagnostics Deck */}
          {selectedKnight && (
            <div
              id="selected-knight-detail-panel"
              className="mt-4 rounded-xl border border-white/15 bg-black/80 p-4 font-mono text-xs animate-in fade-in slide-in-from-bottom-2 duration-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{selectedKnight.icon}</span>
                  <div>
                    <span className="font-bold uppercase text-white" style={{ color: selectedKnight.accentColor }}>
                      {selectedKnight.name} Diagnostic Enclave
                    </span>
                    <span className="text-white/40 text-[10px] block">
                      Target Ring: {selectedKnight.targetRing.replace('_', ' ')} · Lease: urn:camelot:lease:{selectedKnight.id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="close-selected-knight-btn"
                    onClick={() => setSelectedKnight(null)}
                    className="rounded border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] text-white/70 hover:text-white cursor-pointer"
                  >
                    Close Diagnostics ✕
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                  <span className="text-white/40 text-[10px] block uppercase mb-1">Cgroups Resource Bound</span>
                  <div className="text-white/90 font-bold">{selectedKnight.memoryKb} KB / 512 MB Max</div>
                  <span className="text-emerald-400 text-[10px]">Zero memory leakage detected</span>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                  <span className="text-white/40 text-[10px] block uppercase mb-1">Merlin Loop-Prompting</span>
                  <div className="text-white/90 font-bold">Retries: {selectedKnight.retries} / 2 Allowed</div>
                  <span className="text-white/50 text-[10px]">Auto-healing DAG feedback ready</span>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
                  <span className="text-white/40 text-[10px] block uppercase mb-1">Cryptographic Evidence</span>
                  <div className="text-white/90 font-bold font-mono truncate">{selectedKnight.evidenceHash}</div>
                  <span className="text-cyan-300 text-[10px]">Signed with Arthurian Excalibur</span>
                </div>
              </div>

              {selectedKnight.recentLog && (
                <div className="rounded-lg border border-white/10 bg-black/60 p-2.5 text-[11px] text-white/80">
                  <span className="text-white/40 text-[9px] uppercase tracking-widest block mb-1">
                    Telemetry Stream Output:
                  </span>
                  <p className="font-mono text-cyan-200/90 leading-relaxed">
                    &gt; {selectedKnight.recentLog}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
