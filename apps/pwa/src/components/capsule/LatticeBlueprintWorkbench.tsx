'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useBifrost } from '../../context/BifrostContext';
import { useTenant } from '../../context/TenantContext';
import { playSpatialTone, triggerHaptic } from '../../lib/hapticsAndSpatialAudio';
import { speak } from '../../lib/voice';
import { ProvenanceLedgerService } from '../../lib/provenanceLedger';

export type BlueprintId =
  | 'grand_lattice'
  | 'vps_hub'
  | 'voice_orb'
  | 'ravenry_mail'
  | 'graph_engine';

interface BlueprintMeta {
  id: BlueprintId;
  title: string;
  shortTitle: string;
  subtitle: string;
  icon: string;
  zone: string;
  badge: string;
  color: string;
}

const BLUEPRINTS: BlueprintMeta[] = [
  {
    id: 'grand_lattice',
    title: '1. The Grand Lattice (System Architecture)',
    shortTitle: 'Grand Lattice',
    subtitle: 'Macro-level topology of Zones 0-4, Experience, Control, Execution & Memory Planes',
    icon: '🏗️',
    zone: 'Zone 0..4',
    badge: 'MASTER TOPOLOGY',
    color: '#00F0FF',
  },
  {
    id: 'vps_hub',
    title: '2. The VPS Hub Topology (Cybertronia 8GB)',
    shortTitle: 'VPS 8GB Hub',
    subtitle: 'Native Linux cgroups v2, process memory budget, Tailscale mTLS & eBPF PSI monitoring',
    icon: '🛡️',
    zone: 'Zone 1 & 2',
    badge: '8GB VPS',
    color: '#D4AF37',
  },
  {
    id: 'voice_orb',
    title: '3. S26 Voice Orb → VPS Hub Flow',
    shortTitle: 'Voice Orb Flow',
    subtitle: 'Zero-trust audio loop: 4GB S26 thin client Opus capture → Bifrost → MultiVoice → Anya',
    icon: '📱',
    zone: 'Zero-Trust Audio',
    badge: 'SUB-250MS',
    color: '#10B981',
  },
  {
    id: 'ravenry_mail',
    title: '4. Ravenry Mail Sequence Diagram',
    shortTitle: 'Ravenry Mail HITL',
    subtitle: 'R4 mission lifecycle: Capability lease, Ollama drafting, WebAuthn HITL & WAL2 receipt',
    icon: '✉️',
    zone: 'HITL Governance',
    badge: 'R4 GOVERNANCE',
    color: '#EC4899',
  },
  {
    id: 'graph_engine',
    title: '5. Graph Engine Topology (Node/Edge Model)',
    shortTitle: 'Graph Engine',
    subtitle: 'Parallel fan-out, pipeline streams, barrier joins & Gideon/Socrates formal verification',
    icon: '🕸️',
    zone: 'WASI Orchestration',
    badge: 'CONVERGENT',
    color: '#9D4EDD',
  },
];

const MERMAID_SPECS: Record<BlueprintId, string> = {
  grand_lattice: `flowchart TD
  subgraph Z0["Zone 0: Experience Plane (PWA / S26 Voice / 3D)"]
    PWA["Camelot PWA (A2UI/HTMX)"]
    VOICE["S26 Voice Orb (Opus 16kHz VAD)"]
    CANVAS["3D OffscreenCanvas (WebGL/WebGPU)"]
  end
  subgraph Z1["Zone 1: Control Plane (Authority & Governance)"]
    ANYA["Anya Ω Intent Router (Go)"]
    SENTINEL["Sentinel OPA Policy (Capability Leases)"]
    EXCALIBUR["Excalibur HITL Gate (Java / FIDO2)"]
    ARTHUR["Arthur Ed25519 & SQLite WAL2 Ledger"]
  end
  subgraph Z2["Zone 2: Execution Plane (WASI / MicroVMs)"]
    BUS["NATS JetStream AgentBus"]
    WASM["Wasmtime (WASI 0.2 Sandbox)"]
    VM["Firecracker Ephemeral MicroVMs"]
    GRAPH["Rust Graph Engine (Async DAG)"]
  end
  subgraph Z3["Zone 3: Memory & Data Tier"]
    GMEM["GraphMemory (Neo4j νKG + Qdrant)"]
    PG["PostgreSQL (RLS Multi-Tenant DB)"]
    MINIO["MinIO S3 Encrypted Artifact Vault"]
    OLLAMA["Ollama (4-Bit Quantized Local LLM)"]
  end
  subgraph Z4["Zone 4: Connectors & Egress"]
    GW["Connector Gateway (Go OAuth2 Proxy)"]
    SOUP["Soup BM25 Hybrid Scorer"]
    HERMES["Hermes Cloud API Bridge"]
  end

  Z0 -->|Tailscale mTLS / WebSocket| Z1
  Z1 -->|Issued Capability Leases| Z2
  Z2 <-->|Vector & νKG State Sync| Z3
  Z1 -->|OAuth2 Read/Write Scope| Z4`,

  vps_hub: `graph TD
  VPS["Cybertronia VPS (8192 MB RAM / Native cgroups v2)"]
  subgraph Cgroups["cgroups v2 Native Process Allocations"]
    INGRESS["Ingress & Caddy TLS: 650 MB"]
    CONTROL["Control Plane (Anya/Sentinel/Excalibur): 1200 MB"]
    EXEC["Execution (WASI/NATS/Graph): 1400 MB"]
    DATA["Data Tier (Neo4j/Postgres/MinIO): 2250 MB"]
    LLM["Ollama 4-Bit Local LLM: 1600 MB"]
    HEADROOM["PSI Headroom & Kernel: 1092 MB"]
  end
  TAILSCALE["Tailscale WireGuard mTLS Enclave"] --> VPS
  VPS --> PSI["eBPF PSI Stall Monitor (<0.5% Stall OK)"]`,

  voice_orb: `sequenceDiagram
  autonumber
  actor User as Sovereign Operator
  participant S26 as S26 Voice Orb (4GB Thin Client)
  participant Bifrost as Bifrost Gateway (Go)
  participant Anya as Anya Ω Intent Engine
  participant Ollama as Ollama / Tools
  participant TTS as TTS Audio Synthesizer

  User->>S26: Speaks "Hey Camelot..."
  Note over S26: 16kHz PCM Capture & VAD Noise Gate
  S26->>Bifrost: 24kbps Opus Stream (Tailscale mTLS)
  Bifrost->>Anya: Normalized STT Text Stream (<70ms)
  Anya->>Ollama: Structured Intent Resolution (<110ms)
  Ollama-->>Anya: Action Result / Text Response
  Anya->>TTS: Synthesize Speech Stream (<40ms)
  TTS->>Bifrost: Opus Audio Buffer
  Bifrost->>S26: Audio Stream Return
  S26->>User: Playback via AudioContext (<250ms Total E2E)`,

  ravenry_mail: `sequenceDiagram
  autonumber
  actor Op as Operator (A2UI)
  participant Anya as Anya Ω (Go)
  participant Sentinel as Sentinel (OPA)
  participant GW as Connector GW
  participant Ollama as Ollama LLM
  participant Excalibur as Excalibur HITL
  participant Gmail as Gmail API
  participant Ledger as SQLite WAL2

  Op->>Anya: Intent: "Draft invoice reply to Jane"
  Anya->>Sentinel: Request "email.reply.draft" capability lease
  Sentinel-->>Anya: Grant Lease #L-4491
  Anya->>GW: Fetch thread metadata via lease
  GW->>Gmail: Read thread history
  Gmail-->>GW: Email context returned
  GW-->>Anya: Thread context payload
  Anya->>Ollama: Generate draft reply & confidence
  Ollama-->>Anya: Draft proposal JSON
  Anya->>Excalibur: Submit R4 Approval Card with diff
  Excalibur->>Op: Display HITL Diff & Passkey Prompt
  Op->>Excalibur: WebAuthn FIDO2 Consent Granted
  Excalibur->>GW: Authorize outbound write lease
  GW->>Gmail: Create approved draft in Gmail
  Gmail-->>GW: Draft ID #D-9921
  GW->>Ledger: Append Ed25519 receipt to WAL2
  Ledger-->>Op: Immutable proof stamped`,

  graph_engine: `flowchart TD
  A[Task Intent AST] --> B{Risk & Complexity Router}
  B -->|High Risk / Multi-Step| C[Parallel Fan-Out WASI MicroVMs]
  B -->|Low Risk / Stream| D[Pipelined Streaming WASI Engine]
  C --> E[Barrier Fan-In Synchronization]
  D --> E
  E --> F[Gideon Z3 SAT Invariant Verifier]
  F -->|Pass| G[Commit to WAL2 Ledger & Return]
  F -->|Fail| H[Rollback with Proof of Fault]`
};

export function LatticeBlueprintWorkbench() {
  const [activeBlueprint, setActiveBlueprint] = useState<BlueprintId>('grand_lattice');
  const [workbenchView, setWorkbenchView] = useState<'interactive' | 'mermaid' | 'spec'>('interactive');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [selectedElement, setSelectedElement] = useState<{
    title: string;
    zone: string;
    runtime: string;
    protocol: string;
    description: string;
    memoryMb?: number;
  } | null>(null);

  // Live execution variables
  const [packetTick, setPacketTick] = useState(0);
  const [mailStep, setMailStep] = useState<number>(0);
  const [showWebAuthnModal, setShowWebAuthnModal] = useState(false);
  const [graphRiskMode, setGraphRiskMode] = useState<'HIGH_RISK_PARALLEL' | 'LOW_RISK_PIPELINE'>('HIGH_RISK_PARALLEL');
  const [voiceOrbState, setVoiceOrbState] = useState<'IDLE' | 'WAKE' | 'STREAMING' | 'INFERENCE' | 'AUDIO_RETURN'>('IDLE');
  const [vpsAllocatedRam, setVpsAllocatedRam] = useState(7050);
  const [workerCount, setWorkerCount] = useState(4);

  const { activeTenant } = useTenant();
  const { connected, latencyMs } = useBifrost();

  // Animation cycle
  useEffect(() => {
    const interval = setInterval(() => {
      setPacketTick((t) => (t + 1) % 100);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  // Voice Orb simulation loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (voiceOrbState === 'WAKE') {
      timer = setTimeout(() => setVoiceOrbState('STREAMING'), 700);
    } else if (voiceOrbState === 'STREAMING') {
      timer = setTimeout(() => setVoiceOrbState('INFERENCE'), 1200);
    } else if (voiceOrbState === 'INFERENCE') {
      timer = setTimeout(() => setVoiceOrbState('AUDIO_RETURN'), 1000);
    } else if (voiceOrbState === 'AUDIO_RETURN') {
      timer = setTimeout(() => setVoiceOrbState('IDLE'), 1500);
    }
    return () => clearTimeout(timer);
  }, [voiceOrbState]);

  const handleSelectBlueprint = (id: BlueprintId) => {
    setActiveBlueprint(id);
    setSelectedElement(null);
    setSimulationStep(0);
    triggerHaptic('click');
    playSpatialTone(0.5, 520, 100, 'sine');
  };

  const handleTriggerVoiceSim = () => {
    setVoiceOrbState('WAKE');
    triggerHaptic('pill-slot');
    playSpatialTone(0.8, 660, 150, 'triangle');
    speak('Hey Camelot. S26 Voice Orb streaming Opus frame buffer to Bifrost gateway.');
    ProvenanceLedgerService.record('//voice_orb', 'S26 Voice Orb initiated wake-to-inference audio flow.');
  };

  const handleTriggerMailSim = () => {
    setMailStep(1);
    triggerHaptic('pill-slot');
    playSpatialTone(0.5, 440, 150, 'sine');
    speak('Initiating Ravenry mail mission: Drafting invoice reply to Jane.');

    // Step through 8 stages of Ravenry Mail
    const intervals = [
      setTimeout(() => setMailStep(2), 600),   // Anya -> Sentinel (Lease)
      setTimeout(() => setMailStep(3), 1200),  // Gateway fetch
      setTimeout(() => setMailStep(4), 1800),  // Ollama draft
      setTimeout(() => setMailStep(5), 2400),  // Excalibur R4 Card
      setTimeout(() => {
        setMailStep(6);
        playSpatialTone(0.7, 880, 200, 'triangle');
        triggerHaptic('consent');
      }, 3400),                                // WebAuthn approve
      setTimeout(() => setMailStep(7), 4000),  // Gmail draft created
      setTimeout(() => {
        setMailStep(8);
        playSpatialTone(0.9, 1040, 250, 'sine');
        speak('Ravenry mail receipt sealed with Ed25519 hash.');
        ProvenanceLedgerService.record('//ravenry', 'Ravenry mail mission executed and sealed to WAL2 ledger.');
      }, 4800),
    ];

    setTimeout(() => {
      setMailStep(0);
    }, 8000);
  };

  const handleTriggerGraphEngine = (risk: 'HIGH_RISK_PARALLEL' | 'LOW_RISK_PIPELINE') => {
    setGraphRiskMode(risk);
    setIsSimulating(true);
    setSimulationStep(1);
    triggerHaptic('pill-slot');
    playSpatialTone(0.6, risk === 'HIGH_RISK_PARALLEL' ? 740 : 540, 150, 'sine');

    setTimeout(() => setSimulationStep(2), 700);  // Fan out or pipeline
    setTimeout(() => setSimulationStep(3), 1500); // Barrier
    setTimeout(() => setSimulationStep(4), 2200); // Verifier
    setTimeout(() => {
      setSimulationStep(5);                       // Result & Receipt
      setIsSimulating(false);
      triggerHaptic('consent');
      playSpatialTone(0.8, 960, 200, 'triangle');
      speak(`Graph engine execution verified and committed. Mode: ${risk.replace(/_/g, ' ')}.`);
      ProvenanceLedgerService.record('//graph_engine', `Graph engine task executed with mode ${risk}.`);
    }, 3000);
  };

  const currentMeta = BLUEPRINTS.find((b) => b.id === activeBlueprint)!;

  return (
    <div className="flex flex-col h-full rounded-2xl border border-white/10 bg-[#050510] text-white overflow-hidden shadow-2xl">
      {/* ── TOP BANNER & BLUEPRINT TAB SELECTOR ── */}
      <div className="flex flex-col border-b border-white/10 bg-[#0A0A18] px-5 py-4 gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl p-2 rounded-xl bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              {currentMeta.icon}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-base font-bold uppercase tracking-wider text-white">
                  {currentMeta.title}
                </h1>
                <span
                  className="rounded-lg px-2.5 py-0.5 font-mono text-[9.5px] font-bold uppercase border"
                  style={{
                    color: currentMeta.color,
                    borderColor: `${currentMeta.color}40`,
                    backgroundColor: `${currentMeta.color}15`,
                  }}
                >
                  {currentMeta.badge}
                </span>
                <span className="rounded bg-black/50 px-2 py-0.5 font-mono text-[9px] text-white/50 border border-white/10">
                  {currentMeta.zone}
                </span>
              </div>
              <p className="font-mono text-xs text-white/60 mt-0.5">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Quick Runic Action Bar */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                speak('Deploying live sovereign processes across VPS node.');
                triggerHaptic('consent');
                playSpatialTone(0.8, 880, 200, 'triangle');
                ProvenanceLedgerService.record('//GO_LIVE', 'Sovereign process mesh committed live.');
              }}
              className="flex items-center gap-1.5 rounded-xl border border-[#D4AF37]/50 bg-[#D4AF37]/15 px-3 py-1.5 font-bold text-[#D4AF37] hover:bg-[#D4AF37]/30 transition-all shadow-[0_0_15px_rgba(212,175,55,0.25)]"
              title="Execute //GO_LIVE Sovereign Deployment"
            >
              <span>⚜️</span>
              <span>//GO_LIVE</span>
            </button>

            <button
              type="button"
              onClick={() => {
                speak('Dispatching lattice tasks across Wasmtime microVM executors.');
                triggerHaptic('pill-slot');
                playSpatialTone(0.6, 660, 150, 'sine');
                ProvenanceLedgerService.record('//DISPATCH', 'Lattice distribution engaged.');
              }}
              className="flex items-center gap-1.5 rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/15 px-3 py-1.5 font-bold text-[#00F0FF] hover:bg-[#00F0FF]/30 transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]"
              title="Execute //DISPATCH Multi-Worker Distribution"
            >
              <span>⚡</span>
              <span>//DISPATCH</span>
            </button>
          </div>
        </div>

        {/* Five Blueprint Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-white/5">
          {BLUEPRINTS.map((bp) => {
            const isActive = bp.id === activeBlueprint;
            return (
              <button
                key={bp.id}
                type="button"
                onClick={() => handleSelectBlueprint(bp.id)}
                className={`flex items-center gap-2.5 rounded-xl border p-2 text-left font-mono transition-all ${
                  isActive
                    ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-white shadow-[0_0_20px_rgba(212,175,55,0.3)] translate-y-[-1px]'
                    : 'border-white/10 bg-black/40 text-white/60 hover:border-white/30 hover:text-white hover:bg-black/60'
                }`}
              >
                <span className="text-lg">{bp.icon}</span>
                <div className="flex flex-col min-w-0">
                  <span className={`text-[11px] font-bold truncate ${isActive ? 'text-[#D4AF37]' : 'text-white/80'}`}>
                    {bp.shortTitle}
                  </span>
                  <span className="text-[8.5px] text-white/40 uppercase tracking-widest truncate">
                    {bp.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SUB-BAR: VIEW MODE (INTERACTIVE / MERMAID / JSON) & EXPORTERS ── */}
      <div className="flex flex-wrap items-center justify-between px-5 py-2.5 bg-[#070514] border-b border-white/5 gap-3 font-mono text-xs">
        <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => {
              setWorkbenchView('interactive');
              triggerHaptic('click');
            }}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              workbenchView === 'interactive'
                ? 'bg-[#D4AF37]/20 border border-[#D4AF37] text-[#D4AF37] font-bold shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <span>✨</span>
            <span>Interactive Stage</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setWorkbenchView('mermaid');
              triggerHaptic('click');
              playSpatialTone(0.5, 600, 100, 'sine');
            }}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              workbenchView === 'mermaid'
                ? 'bg-[#00F0FF]/20 border border-[#00F0FF] text-[#00F0FF] font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <span>📊</span>
            <span>Mermaid Architecture</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setWorkbenchView('spec');
              triggerHaptic('click');
              playSpatialTone(0.5, 700, 100, 'sine');
            }}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              workbenchView === 'spec'
                ? 'bg-[#9D4EDD]/20 border border-[#9D4EDD] text-[#9D4EDD] font-bold shadow-[0_0_10px_rgba(157,78,221,0.3)]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <span>📦</span>
            <span>A2UI Protocol Spec</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {copiedNotification && (
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/30 animate-pulse">
              {copiedNotification}
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(MERMAID_SPECS[activeBlueprint]);
              setCopiedNotification('Mermaid copied to clipboard!');
              triggerHaptic('consent');
              playSpatialTone(0.8, 880, 150, 'triangle');
              setTimeout(() => setCopiedNotification(null), 2500);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:text-[#00F0FF] hover:border-[#00F0FF]/50 transition-all text-[11px]"
            title="Copy Mermaid.js Markdown definition"
          >
            <span>📋</span>
            <span>Copy Mermaid</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const specData = {
                blueprint: activeBlueprint,
                version: 'vMAX_10000',
                title: currentMeta.title,
                zone: currentMeta.zone,
                mermaid: MERMAID_SPECS[activeBlueprint],
                provenance: '⚜️_SOVEREIGN_TRUTH',
                timestamp: new Date().toISOString(),
              };
              const blob = new Blob([JSON.stringify(specData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `camelot_blueprint_${activeBlueprint}.json`;
              a.click();
              URL.revokeObjectURL(url);
              setCopiedNotification('Spec JSON exported!');
              triggerHaptic('consent');
              playSpatialTone(0.9, 1040, 200, 'triangle');
              setTimeout(() => setCopiedNotification(null), 2500);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/25 transition-all text-[11px] font-bold"
            title="Export Blueprint JSON Specification"
          >
            <span>💾</span>
            <span>Export Spec</span>
          </button>
        </div>
      </div>

      {/* ── MAIN BLUEPRINT INTERACTIVE STAGE & INSPECTOR ── */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 overflow-hidden">
        {/* Left 2 Cols: High-Fidelity Interactive Visualizer */}
        <div className="xl:col-span-2 relative bg-[#06040F] p-6 border-b xl:border-b-0 xl:border-r border-white/10 overflow-y-auto flex flex-col items-center justify-start">
          {/* Subtle Grid backdrop */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #D4AF37 1px, transparent 0)',
              backgroundSize: '28px 28px',
            }}
          />

          {/* ── MERMAID SOURCE VIEW ── */}
          {workbenchView === 'mermaid' && (
            <div className="w-full max-w-4xl space-y-3 relative z-10 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs text-[#00F0FF] font-bold">MERMAID.JS ARCHITECTURE SPECIFICATION</span>
                <span className="text-[10px] text-white/50">Ready for documentation & GitHub markdown</span>
              </div>
              <pre className="p-4 rounded-2xl border border-white/10 bg-black/80 text-emerald-300 text-xs overflow-x-auto leading-relaxed shadow-inner">
                <code>{MERMAID_SPECS[activeBlueprint]}</code>
              </pre>
            </div>
          )}

          {/* ── A2UI JSON SPEC VIEW ── */}
          {workbenchView === 'spec' && (
            <div className="w-full max-w-4xl space-y-3 relative z-10 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs text-[#9D4EDD] font-bold">A2UI DECLARATIVE ARCHITECTURE SPECIFICATION</span>
                <span className="text-[10px] text-white/50">Agent-to-User Interface JSON payload</span>
              </div>
              <pre className="p-4 rounded-2xl border border-white/10 bg-black/80 text-cyan-300 text-xs overflow-x-auto leading-relaxed shadow-inner">
                <code>{JSON.stringify(
                  {
                    $schema: 'https://camelot.network/schemas/a2ui/vMAX/blueprint.json',
                    blueprintId: activeBlueprint,
                    meta: currentMeta,
                    memoryEnvelope: '8192 MB (Strict cgroups v2)',
                    securityBoundary: 'Tailscale mTLS WireGuard',
                    governance: 'Excalibur R4 HITL + Arthur Ed25519 WAL2',
                    executionModel: 'WASI 0.2 Component Sandbox + NATS JetStream',
                    seal: '⚜️_SOVEREIGN_TRUTH',
                  },
                  null,
                  2
                )}</code>
              </pre>
            </div>
          )}

          {/* ── VIEW 1: GRAND LATTICE (5 ZONES) ── */}
          {workbenchView === 'interactive' && activeBlueprint === 'grand_lattice' && (
            <div className="w-full max-w-4xl space-y-4 relative z-10">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="font-mono text-xs text-[#00F0FF] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#00F0FF] animate-pulse" />
                  <span>INTERACTIVE 5-ZONE SOVEREIGN TOPOLOGY</span>
                </div>
                <div className="font-mono text-[10px] text-white/50">
                  Click any node to inspect memory & capability protocol
                </div>
              </div>

              {/* 5 Zones Visual Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono">
                {/* Zone 0: Experience Plane */}
                <div className="rounded-2xl border border-cyan-500/30 bg-[#09101C]/80 p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-[10px] text-cyan-400 font-bold border-b border-cyan-500/20 pb-1.5">
                    <span>ZONE 0: EXPERIENCE</span>
                    <span className="text-[8px] bg-cyan-500/20 px-1 py-0.5 rounded">PWA / 3D</span>
                  </div>
                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'Camelot PWA (A2UI / HTMX)',
                        zone: 'Zone 0: Experience Plane',
                        runtime: 'Next.js 14 App Router · React 18 · Tailwind',
                        protocol: 'Agent-to-User Interface (A2UI) Declarative JSON',
                        description:
                          'Primary human interface executing Luxury Minimalist Brutalism, offline caching, and WebAuthn key authentication.',
                        memoryMb: 85,
                      })
                    }
                    className="p-2.5 rounded-xl border border-cyan-400/20 bg-black/40 hover:border-cyan-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">📱 Camelot PWA</div>
                    <div className="text-[9px] text-white/50">A2UI · RadianUI · HTMX</div>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'S26 Voice Orb (Kickbox Audio)',
                        zone: 'Zone 0: Experience Plane',
                        runtime: 'Browser AudioContext · WebRTC DSP',
                        protocol: 'Opus 16kHz Streaming over Tailscale WireGuard',
                        description:
                          'Acoustic microphone capture, client-side VAD, tap-to-connect autoplay gating, and live waveform telemetry.',
                        memoryMb: 48,
                      })
                    }
                    className="p-2.5 rounded-xl border border-cyan-400/20 bg-black/40 hover:border-cyan-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">🎙️ S26 Voice Orb</div>
                    <div className="text-[9px] text-white/50">Kickbox Audio · VAD DSP</div>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: '3D Renderer (OffscreenCanvas)',
                        zone: 'Zone 0: Experience Plane',
                        runtime: 'WebGL 2.0 / WebGPU Canvas',
                        protocol: 'SharedArrayBuffer · Web Worker IPC',
                        description:
                          'Off-thread hardware-accelerated 3D Damascus blade, particle weather, and kinetic shockwave renderer.',
                        memoryMb: 110,
                      })
                    }
                    className="p-2.5 rounded-xl border border-cyan-400/20 bg-black/40 hover:border-cyan-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">🗡️ 3D Renderer</div>
                    <div className="text-[9px] text-white/50">Offscreen WebGL / WebGPU</div>
                  </div>
                </div>

                {/* Zone 1: Control Plane */}
                <div className="rounded-2xl border border-amber-500/30 bg-[#161208]/80 p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold border-b border-amber-500/20 pb-1.5">
                    <span>ZONE 1: CONTROL</span>
                    <span className="text-[8px] bg-amber-500/20 px-1 py-0.5 rounded">AUTHORITY</span>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'Anya Ω Intent Router',
                        zone: 'Zone 1: Control Plane',
                        runtime: 'Go Native Daemon (cgroups v2)',
                        protocol: 'Structured TOON Intent Pipeline',
                        description:
                          'Strips conversational static, parses user speech to capability intents, and orchestrates downstream Knights.',
                        memoryMb: 120,
                      })
                    }
                    className="p-2 rounded-xl border border-amber-400/20 bg-black/40 hover:border-amber-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">⚡ Anya Ω (Go)</div>
                    <div className="text-[9px] text-white/50">Intent Parser</div>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'Sentinel Policy Gate',
                        zone: 'Zone 1: Control Plane',
                        runtime: 'Open Policy Agent (OPA) Engine',
                        protocol: 'Capability Lease Issuance & Revocation',
                        description:
                          'Zero-trust authorization boundary enforcing RBAC, token budgets, and granular capability leasing.',
                        memoryMb: 75,
                      })
                    }
                    className="p-2 rounded-xl border border-amber-400/20 bg-black/40 hover:border-amber-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">🛡️ Sentinel (OPA)</div>
                    <div className="text-[9px] text-white/50">Capability Leases</div>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'Excalibur HITL Gate',
                        zone: 'Zone 1: Control Plane',
                        runtime: 'Java Virtual Process / FIDO2 Bridge',
                        protocol: 'Risk Classification (R0..R5) & WebAuthn Approval',
                        description:
                          'Human-In-The-Loop gatekeeper preventing destructive mutations without explicit cryptographic consent.',
                        memoryMb: 160,
                      })
                    }
                    className="p-2 rounded-xl border border-amber-400/20 bg-black/40 hover:border-amber-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">⚔️ Excalibur (Java)</div>
                    <div className="text-[9px] text-white/50">HITL Approvals</div>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'Arthur Ed25519 & SQLite WAL2',
                        zone: 'Zone 1: Control Plane',
                        runtime: 'Rust Native Binary · SQLite WAL2',
                        protocol: 'Cryptographic Non-Repudiation Stamping',
                        description:
                          'Appends tamper-evident audit receipts with Ed25519 key signatures into the immutable local ledger.',
                        memoryMb: 60,
                      })
                    }
                    className="p-2 rounded-xl border border-amber-400/20 bg-black/40 hover:border-amber-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">📜 Arthur & Ledger</div>
                    <div className="text-[9px] text-white/50">Ed25519 · WAL2</div>
                  </div>
                </div>

                {/* Zone 2: Execution Plane */}
                <div className="rounded-2xl border border-purple-500/30 bg-[#120A1E]/80 p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold border-b border-purple-500/20 pb-1.5">
                    <span>ZONE 2: EXECUTION</span>
                    <span className="text-[8px] bg-purple-500/20 px-1 py-0.5 rounded">WASI / VM</span>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'AgentBus & NATS JetStream',
                        zone: 'Zone 2: Execution Plane',
                        runtime: 'Shared Memory Backplane · NATS Daemon',
                        protocol: 'High-Throughput IPC Message Passing',
                        description:
                          'Low-latency pub-sub event bus enabling sub-millisecond coordination across microVMs and worker threads.',
                        memoryMb: 140,
                      })
                    }
                    className="p-2 rounded-xl border border-purple-400/20 bg-black/40 hover:border-purple-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">🚌 NATS JetStream</div>
                    <div className="text-[9px] text-white/50">AgentBus Shared Mem</div>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'Wasmtime (WASI 0.2 Sandbox)',
                        zone: 'Zone 2: Execution Plane',
                        runtime: 'Wasmtime Sandboxing Engine',
                        protocol: 'Component Model Capabilities',
                        description:
                          'Near-zero overhead execution sandbox for deterministic compute modules, AST linters, and graph algorithms.',
                        memoryMb: 180,
                      })
                    }
                    className="p-2 rounded-xl border border-purple-400/20 bg-black/40 hover:border-purple-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">⚙️ Wasmtime</div>
                    <div className="text-[9px] text-white/50">WASI 0.2 Sandbox</div>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'Firecracker MicroVMs',
                        zone: 'Zone 2: Execution Plane',
                        runtime: 'KVM-Isolated Linux MicroVMs',
                        protocol: 'Hardware Virtualization Boundaries',
                        description:
                          'Ephemeral, high-isolation execution enclosures for multi-tenant workloads with sub-5ms boot times.',
                        memoryMb: 350,
                      })
                    }
                    className="p-2 rounded-xl border border-purple-400/20 bg-black/40 hover:border-purple-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">🔥 Firecracker</div>
                    <div className="text-[9px] text-white/50">MicroVM Isolation</div>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'camelot-graph-engine (Rust)',
                        zone: 'Zone 2: Execution Plane',
                        runtime: 'Rust WASI Component',
                        protocol: 'DAG Branching & Barrier Synchronization',
                        description:
                          'High-performance orchestration engine routing parallel vs pipelined tasks with formal invariant verification.',
                        memoryMb: 95,
                      })
                    }
                    className="p-2 rounded-xl border border-purple-400/20 bg-black/40 hover:border-purple-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">🕸️ Graph Engine</div>
                    <div className="text-[9px] text-white/50">Rust Async DAG</div>
                  </div>
                </div>

                {/* Zone 3: Memory & Data */}
                <div className="rounded-2xl border border-emerald-500/30 bg-[#0A1812]/80 p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold border-b border-emerald-500/20 pb-1.5">
                    <span>ZONE 3: MEMORY</span>
                    <span className="text-[8px] bg-emerald-500/20 px-1 py-0.5 rounded">DATA TIER</span>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'GraphMemory (Neo4j & Qdrant)',
                        zone: 'Zone 3: Memory & Data',
                        runtime: 'Neo4j Cypher · Qdrant Vector Engine',
                        protocol: 'Temporal νKG Crystals & Cosine Embeddings',
                        description:
                          'Dynamic associative memory graph connecting entities, historical decisions, and vector embeddings.',
                        memoryMb: 850,
                      })
                    }
                    className="p-2 rounded-xl border border-emerald-400/20 bg-black/40 hover:border-emerald-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">🧠 GraphMemory</div>
                    <div className="text-[9px] text-white/50">Neo4j + Qdrant</div>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'PostgreSQL with RLS',
                        zone: 'Zone 3: Memory & Data',
                        runtime: 'Native Postgres Process',
                        protocol: 'Row Level Security Tenant Isolation',
                        description:
                          'Relational persistence tier isolating tenant workspaces, credential vaults, and schema definitions.',
                        memoryMb: 420,
                      })
                    }
                    className="p-2 rounded-xl border border-emerald-400/20 bg-black/40 hover:border-emerald-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">🗄️ PostgreSQL</div>
                    <div className="text-[9px] text-white/50">RLS Multi-Tenant</div>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'MinIO S3 Object Store',
                        zone: 'Zone 3: Memory & Data',
                        runtime: 'Native MinIO Daemon',
                        protocol: 'S3 API Compatible Encrypted Buckets',
                        description:
                          'Secure storage for signed QR receipt artifacts, audio frame dumps, and exportable .camelot cartridges.',
                        memoryMb: 240,
                      })
                    }
                    className="p-2 rounded-xl border border-emerald-400/20 bg-black/40 hover:border-emerald-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">📦 MinIO S3</div>
                    <div className="text-[9px] text-white/50">Artifact Vault</div>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'Ollama (Local LLM Inference)',
                        zone: 'Zone 3: Memory & Data',
                        runtime: 'Quantized 4-Bit GGUF Engine',
                        protocol: 'Local Loop Inference via IPC',
                        description:
                          'On-premises LLM processing private drafting tasks without sending unencrypted prompts to third parties.',
                        memoryMb: 1800,
                      })
                    }
                    className="p-2 rounded-xl border border-emerald-400/20 bg-black/40 hover:border-emerald-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">🤖 Ollama (LLM)</div>
                    <div className="text-[9px] text-white/50">Local Heavy Inference</div>
                  </div>
                </div>

                {/* Zone 4: Connectors */}
                <div className="rounded-2xl border border-blue-500/30 bg-[#09101C]/80 p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-[10px] text-blue-400 font-bold border-b border-blue-500/20 pb-1.5">
                    <span>ZONE 4: CONNECTORS</span>
                    <span className="text-[8px] bg-blue-500/20 px-1 py-0.5 rounded">EGRESS</span>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'Connector Gateway (Go)',
                        zone: 'Zone 4: Connectors',
                        runtime: 'Go Egress Proxy',
                        protocol: 'OAuth2 Scope Validation & Egress Auditing',
                        description:
                          'Regulates external API calls (Gmail, Google Drive, Sheets) requiring explicit Sentinel capability leases.',
                        memoryMb: 65,
                      })
                    }
                    className="p-2 rounded-xl border border-blue-400/20 bg-black/40 hover:border-blue-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">🚪 Connector GW</div>
                    <div className="text-[9px] text-white/50">OAuth2 Egress Proxy</div>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'Soup Router (BM25)',
                        zone: 'Zone 4: Connectors',
                        runtime: 'Rust BM25 Lexical Scorer',
                        protocol: 'Hybrid Keyword & Semantic Context Matching',
                        description:
                          'Routes queries to the most relevant external documentation or workspace context cache instantly.',
                        memoryMb: 80,
                      })
                    }
                    className="p-2 rounded-xl border border-blue-400/20 bg-black/40 hover:border-blue-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">🔍 Soup Router</div>
                    <div className="text-[9px] text-white/50">BM25 Lexical Search</div>
                  </div>

                  <div
                    onClick={() =>
                      setSelectedElement({
                        title: 'Hermes Cloud API Bridge',
                        zone: 'Zone 4: Connectors',
                        runtime: 'mTLS Cloud Proxy',
                        protocol: 'Split-Brain Cognitive Offload',
                        description:
                          'Offloads massive 1M+ token context tasks to Gemini Cloud Brain while keeping data encrypted at rest.',
                        memoryMb: 55,
                      })
                    }
                    className="p-2 rounded-xl border border-blue-400/20 bg-black/40 hover:border-blue-400 cursor-pointer transition-all hover:scale-[1.02]"
                  >
                    <div className="font-bold text-xs text-white">☁️ Hermes Bridge</div>
                    <div className="text-[9px] text-white/50">Cloud Brain Sync</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── VIEW 2: VPS HUB TOPOLOGY (8GB BUDGET) ── */}
          {workbenchView === 'interactive' && activeBlueprint === 'vps_hub' && (
            <div className="w-full max-w-4xl space-y-4 relative z-10">
              <div className="flex flex-wrap items-center justify-between pb-2 border-b border-white/10 gap-2">
                <div className="font-mono text-xs text-[#D4AF37] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#D4AF37] animate-pulse" />
                  <span>CYBERTRONIA 8GB VPS MEMORY & PROCESS ALLOCATOR</span>
                </div>
                <div className="font-mono text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  Total Allocated: {vpsAllocatedRam} MB / 8192 MB ({Math.round((vpsAllocatedRam / 8192) * 100)}% Peak)
                </div>
              </div>

              {/* Dynamic RAM Allocation Slider */}
              <div className="p-3.5 rounded-2xl border border-white/10 bg-black/60 font-mono space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70">Interactive cgroups v2 Budget Tuning:</span>
                  <span className="text-[#D4AF37] font-bold">{vpsAllocatedRam} MB</span>
                </div>
                <input
                  type="range"
                  min="5120"
                  max="8192"
                  step="64"
                  value={vpsAllocatedRam}
                  onChange={(e) => {
                    setVpsAllocatedRam(Number(e.target.value));
                    triggerHaptic('click');
                  }}
                  className="w-full accent-[#D4AF37] cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-white/40">
                  <span>5120 MB (Conservative)</span>
                  <span>7050 MB (Balanced vMAX)</span>
                  <span>8192 MB (Hard Limit)</span>
                </div>
              </div>

              {/* Memory Allocation Bar Visualizer */}
              <div className="space-y-1.5 font-mono">
                <div className="flex justify-between text-[10px] text-white/60">
                  <span>CGROUPS v2 MEMORY DISTRIBUTION (8192 MB)</span>
                  <span className="text-[#D4AF37]">Zero-Docker Native Processes</span>
                </div>
                <div className="h-6 w-full rounded-xl bg-black/60 border border-white/10 overflow-hidden flex p-0.5 gap-0.5">
                  <div style={{ width: '8%' }} className="bg-cyan-500/80 rounded-sm text-[8px] flex items-center justify-center font-bold" title="Caddy & PWA (650MB)">
                    Ingress
                  </div>
                  <div style={{ width: '15%' }} className="bg-amber-500/80 rounded-sm text-[8px] flex items-center justify-center font-bold" title="Control Plane (1200MB)">
                    Control
                  </div>
                  <div style={{ width: '18%' }} className="bg-purple-500/80 rounded-sm text-[8px] flex items-center justify-center font-bold" title="Execution & Wasm (1400MB)">
                    Wasm/NATS
                  </div>
                  <div style={{ width: '28%' }} className="bg-emerald-500/80 rounded-sm text-[8px] flex items-center justify-center font-bold" title="Data Tier (2250MB)">
                    DB/Graph
                  </div>
                  <div style={{ width: '20%' }} className="bg-blue-500/80 rounded-sm text-[8px] flex items-center justify-center font-bold" title="Ollama Inference (1600MB)">
                    Ollama 4bit
                  </div>
                  <div style={{ width: `${Math.max(2, 100 - Math.round((vpsAllocatedRam / 8192) * 100))}%` }} className="bg-white/10 rounded-sm text-[8px] flex items-center justify-center text-white/40 font-bold" title="Headroom & PSI">
                    Headroom
                  </div>
                </div>
              </div>

              {/* Process & Observability Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                {/* Process Stack 1: Ingress & Security */}
                <div className="rounded-2xl border border-white/10 bg-[#0E0E1C]/80 p-3.5 space-y-2">
                  <div className="font-bold text-[#00F0FF] text-[11px] border-b border-white/10 pb-1 flex justify-between">
                    <span>SECURITY & INGRESS</span>
                    <span>mTLS</span>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between p-1.5 rounded bg-black/40 border border-white/5">
                      <span>Caddy Server</span>
                      <span className="text-cyan-300 font-bold">HTTPS / TLS 1.3</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-black/40 border border-white/5">
                      <span>Tailscale WireGuard</span>
                      <span className="text-cyan-300 font-bold">mTLS Enclave</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-black/40 border border-white/5">
                      <span>bifrost Bridge (Go)</span>
                      <span className="text-cyan-300 font-bold">WebRTC Data</span>
                    </div>
                  </div>
                </div>

                {/* Process Stack 2: Core Control */}
                <div className="rounded-2xl border border-white/10 bg-[#0E0E1C]/80 p-3.5 space-y-2">
                  <div className="font-bold text-[#D4AF37] text-[11px] border-b border-white/10 pb-1 flex justify-between">
                    <span>CONTROL PROCESSES</span>
                    <span>cgroups v2</span>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between p-1.5 rounded bg-black/40 border border-white/5">
                      <span>camelot-sentinel</span>
                      <span className="text-amber-300 font-bold">OPA Policy</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-black/40 border border-white/5">
                      <span>camelot-excalibur</span>
                      <span className="text-amber-300 font-bold">Java HITL</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-black/40 border border-white/5">
                      <span>camelot-arthur</span>
                      <span className="text-amber-300 font-bold">Rust Ed25519</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-black/40 border border-white/5">
                      <span>camelot-ledger</span>
                      <span className="text-amber-300 font-bold">SQLite WAL2</span>
                    </div>
                  </div>
                </div>

                {/* Process Stack 3: Observability Stack */}
                <div className="rounded-2xl border border-white/10 bg-[#0E0E1C]/80 p-3.5 space-y-2">
                  <div className="font-bold text-emerald-400 text-[11px] border-b border-white/10 pb-1 flex justify-between">
                    <span>OBSERVABILITY</span>
                    <span>eBPF PSI</span>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between p-1.5 rounded bg-black/40 border border-white/5">
                      <span>eBPF PSI Monitor</span>
                      <span className="text-emerald-300 font-bold">0.4% Stall (OK)</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-black/40 border border-white/5">
                      <span>Prometheus + Grafana</span>
                      <span className="text-emerald-300 font-bold">1s Scrape</span>
                    </div>
                    <div className="flex justify-between p-1.5 rounded bg-black/40 border border-white/5">
                      <span>camelot-vitals</span>
                      <span className="text-emerald-300 font-bold">Heartbeat OK</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── VIEW 3: S26 VOICE ORB → VPS HUB FLOW ── */}
          {workbenchView === 'interactive' && activeBlueprint === 'voice_orb' && (
            <div className="w-full max-w-4xl space-y-5 relative z-10">
              <div className="flex flex-wrap items-center justify-between pb-2 border-b border-white/10 gap-2">
                <div className="font-mono text-xs text-emerald-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>S26 VOICE ORB (4GB) ↔ VPS HUB (8GB) ZERO-TRUST LOOP</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playSpatialTone(0.8, 520, 300, 'triangle');
                      triggerHaptic('click');
                    }}
                    className="px-2.5 py-1 bg-white/5 text-white/70 border border-white/10 rounded-xl font-mono text-[11px] hover:text-white hover:bg-white/10 transition-all"
                  >
                    🔊 Test Spatial Audio
                  </button>
                  <button
                    type="button"
                    onClick={handleTriggerVoiceSim}
                    className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl font-mono text-xs font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                  >
                    <span>🎙️</span>
                    <span>Simulate Voice Flow ("Hey Camelot")</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Audio Frequency Equalizer Bar */}
              <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-black/60 font-mono flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <span className="text-sm">📻</span>
                  <span>16kHz PCM / Opus Stream Activity:</span>
                </div>
                <div className="flex items-end gap-1.5 h-7">
                  {[40, 65, 85, 95, 70, 50, 80, 90, 60, 45, 75, 92, 68, 55, 82, 35].map((val, idx) => {
                    const isActive = voiceOrbState !== 'IDLE';
                    const dynamicHeight = isActive
                      ? Math.min(100, Math.max(15, (val + (packetTick * (idx + 1) * 7) % 60)))
                      : 15;
                    return (
                      <div
                        key={idx}
                        className={`w-1.5 rounded-full transition-all duration-100 ${
                          isActive ? 'bg-gradient-to-t from-emerald-500 to-[#00F0FF]' : 'bg-white/10'
                        }`}
                        style={{ height: `${dynamicHeight}%` }}
                      />
                    );
                  })}
                </div>
                <span className="text-[10px] font-bold text-white/60">
                  {voiceOrbState === 'IDLE' ? 'STANDBY' : `STATUS: ${voiceOrbState}`}
                </span>
              </div>

              {/* Step Flow Nodes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
                {/* S26 Thin Client Enclave */}
                <div className="rounded-2xl border border-emerald-500/30 bg-[#0A1812]/90 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-bold border-b border-emerald-500/20 pb-2">
                    <span>SAMSUNG S26 (4GB THIN CLIENT)</span>
                    <span className="text-[9px] bg-emerald-500/20 px-1.5 py-0.5 rounded">OPUS VAD</span>
                  </div>

                  <div className={`p-3 rounded-xl border transition-all ${voiceOrbState === 'WAKE' || voiceOrbState === 'STREAMING' ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-white/10 bg-black/40'}`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>🎤 1. Microphone & Audio Capture</span>
                      <span className="text-[9px] text-emerald-300">16kHz PCM</span>
                    </div>
                    <p className="text-[9px] text-white/50 mt-1">
                      Local DSP filters noise and triggers wake word detection ("Hey Camelot").
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border transition-all ${voiceOrbState === 'STREAMING' ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-white/10 bg-black/40'}`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>📡 2. Audio Streamer (Opus)</span>
                      <span className="text-[9px] text-emerald-300">Tailscale mTLS</span>
                    </div>
                    <p className="text-[9px] text-white/50 mt-1">
                      Encodes speech frames to 24kbps Opus and routes through private Tailscale mesh.
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border transition-all ${voiceOrbState === 'AUDIO_RETURN' ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-white/10 bg-black/40'}`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>🔊 3. Speaker / Audio Playback</span>
                      <span className="text-[9px] text-emerald-300">Autoplay Gated</span>
                    </div>
                    <p className="text-[9px] text-white/50 mt-1">
                      Streams synthesized response audio instantly without UI freeze or memory spike.
                    </p>
                  </div>
                </div>

                {/* VPS Hub Cognitive Engine */}
                <div className="rounded-2xl border border-[#00F0FF]/30 bg-[#08121E]/90 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#00F0FF] font-bold border-b border-[#00F0FF]/20 pb-2">
                    <span>VPS HUB (8GB CYBERTRONIA)</span>
                    <span className="text-[9px] bg-[#00F0FF]/20 px-1.5 py-0.5 rounded">INTENT & INFERENCE</span>
                  </div>

                  <div className={`p-3 rounded-xl border transition-all ${voiceOrbState === 'STREAMING' || voiceOrbState === 'INFERENCE' ? 'border-[#00F0FF] bg-[#00F0FF]/20 shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'border-white/10 bg-black/40'}`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>🌉 1. Bifrost & Multivoice STT</span>
                      <span className="text-[9px] text-cyan-300">STT Router</span>
                    </div>
                    <p className="text-[9px] text-white/50 mt-1">
                      Converts incoming Opus buffer into clean normalized text stream.
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border transition-all ${voiceOrbState === 'INFERENCE' ? 'border-[#00F0FF] bg-[#00F0FF]/20 shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'border-white/10 bg-black/40'}`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>🧠 2. Anya Intent & Sentinel OPA</span>
                      <span className="text-[9px] text-cyan-300">Governance Gate</span>
                    </div>
                    <p className="text-[9px] text-white/50 mt-1">
                      Validates capability leases and routes to Ollama or local tool execution.
                    </p>
                  </div>

                  <div className={`p-3 rounded-xl border transition-all ${voiceOrbState === 'AUDIO_RETURN' ? 'border-[#00F0FF] bg-[#00F0FF]/20 shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'border-white/10 bg-black/40'}`}>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>🗣️ 3. TTS Router & Opus Encoder</span>
                      <span className="text-[9px] text-cyan-300">&lt;220ms E2E</span>
                    </div>
                    <p className="text-[9px] text-white/50 mt-1">
                      Synthesizes natural speech and dispatches back across WebRTC audio channel.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── VIEW 4: RAVENRY MAIL SEQUENCE (R4 HITL) ── */}
          {workbenchView === 'interactive' && activeBlueprint === 'ravenry_mail' && (
            <div className="w-full max-w-4xl space-y-4 relative z-10">
              <div className="flex flex-wrap items-center justify-between pb-2 border-b border-white/10 gap-2">
                <div className="font-mono text-xs text-[#EC4899] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#EC4899] animate-pulse" />
                  <span>RAVENRY MAIL: END-TO-END R4 HITL MISSION LIFECYCLE</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowWebAuthnModal(true)}
                    className="px-3 py-1 bg-white/5 text-white/80 border border-white/10 rounded-xl font-mono text-xs hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
                  >
                    <span>🛡️</span>
                    <span>View R4 Approval Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerMailSim}
                    disabled={mailStep > 0}
                    className="px-3 py-1 bg-[#EC4899]/20 text-[#EC4899] border border-[#EC4899]/40 rounded-xl font-mono text-xs font-bold hover:bg-[#EC4899]/30 transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(236,72,153,0.25)]"
                  >
                    <span>✉️</span>
                    <span>{mailStep > 0 ? `Stage ${mailStep}/8 Executing...` : 'Run Mission: "Reply to Jane"'}</span>
                  </button>
                </div>
              </div>

              {/* Interactive R4 Approval Modal Simulator */}
              {showWebAuthnModal && (
                <div className="p-4 rounded-2xl border border-[#EC4899]/40 bg-[#160B18] font-mono space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#EC4899]">
                      <span>🛡️ EXCALIBUR R4 APPROVAL CARD #AC-4912</span>
                      <span className="text-[9px] bg-[#EC4899]/20 px-2 py-0.5 rounded text-white">HITL REQUIRED</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWebAuthnModal(false)}
                      className="text-white/40 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="text-xs space-y-2">
                    <div className="p-2.5 rounded-xl bg-black/60 border border-white/5 text-[11px]">
                      <div className="text-white/50 text-[9px]">OUTBOUND DRAFT DIFF:</div>
                      <div className="text-emerald-300 font-bold mt-1">To: Jane Doe &lt;jane.doe@client.com&gt;</div>
                      <div className="text-white/80 mt-1">Subject: Re: Invoice #INV-2026-088 Confirmation</div>
                      <div className="text-white/60 mt-1 pl-2 border-l border-emerald-500/40 text-[10px]">
                        "Hi Jane, please find attached the revised invoice receipt. All milestones have been verified by Camelot-OS ledger seal."
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-white/50">FIDO2 Passkey Signature Status: PENDING</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowWebAuthnModal(false);
                          setMailStep(6);
                          triggerHaptic('consent');
                          playSpatialTone(0.8, 880, 200, 'triangle');
                          speak('WebAuthn FIDO2 Passkey biometric consent verified.');
                          ProvenanceLedgerService.record('//consent', 'WebAuthn passkey authorization granted for invoice email reply.');
                        }}
                        className="px-4 py-1.5 rounded-xl bg-[#EC4899] text-black font-bold text-xs hover:bg-[#EC4899]/90 transition-all shadow-[0_0_15px_rgba(236,72,153,0.4)]"
                      >
                        Authorize with FIDO2 Passkey 🔑
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 8-Stage Interactive Sequence Pipeline */}
              <div className="space-y-2 font-mono text-xs">
                {[
                  { step: 1, from: 'Operator (A2UI)', to: 'Anya (Go)', action: 'Propose Intent: "Draft reply to Jane about invoice"', desc: 'Speech parsed to structured email mission' },
                  { step: 2, from: 'Anya (Go)', to: 'Sentinel (OPA)', action: 'Request "email.reply.draft" Capability Lease', desc: 'Sentinel checks read scope & token rate limit' },
                  { step: 3, from: 'Connector GW', to: 'Gmail API', action: 'Fetch Thread & Metadata via Read Scope', desc: 'Returns email history and subject hash' },
                  { step: 4, from: 'Anya (Ollama)', to: 'Ollama LLM', action: 'Generate Draft Body & Confidence Score', desc: 'On-premises LLM crafts structured invoice response' },
                  { step: 5, from: 'Anya', to: 'Excalibur (Java)', action: 'Submit R4 Approval Card with Exact Diff', desc: 'Enforces human-in-the-loop sovereign gate' },
                  { step: 6, from: 'Operator', to: 'Excalibur', action: 'Cryptographic WebAuthn / Passkey Consent Granted', desc: 'FIDO2 signature unlocks outbound write lease' },
                  { step: 7, from: 'Connector GW', to: 'Gmail API', action: 'Send Approved Draft (Gmail Write Scope)', desc: 'Official draft created in Google Workspace' },
                  { step: 8, from: 'Compositor / Arthur', to: 'MinIO & Ledger', action: 'Generate Signed QR Artifact & Commit WAL2 Receipt', desc: 'Immutable non-repudiation stamped in SQLite WAL2' },
                ].map((item) => {
                  const isActive = mailStep === item.step;
                  const isDone = mailStep > item.step;
                  return (
                    <div
                      key={item.step}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                        isActive
                          ? 'border-[#EC4899] bg-[#EC4899]/20 shadow-[0_0_15px_rgba(236,72,153,0.35)] scale-[1.01]'
                          : isDone
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-white/90'
                          : 'border-white/5 bg-black/40 text-white/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold ${isActive ? 'bg-[#EC4899] text-white animate-pulse' : isDone ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/60'}`}>
                          {isDone ? '✓' : item.step}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-[11px]">{item.action}</span>
                            <span className="text-[9px] text-[#EC4899] font-bold">[{item.from} → {item.to}]</span>
                          </div>
                          <p className="text-[9px] text-white/50">{item.desc}</p>
                        </div>
                      </div>

                      <span className="text-[9px] uppercase tracking-wider font-bold">
                        {isActive ? '⚡ IN PROGRESS' : isDone ? '✓ VERIFIED' : 'PENDING'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── VIEW 5: GRAPH ENGINE TOPOLOGY ── */}
          {workbenchView === 'interactive' && activeBlueprint === 'graph_engine' && (
            <div className="w-full max-w-4xl space-y-4 relative z-10">
              <div className="flex flex-wrap items-center justify-between pb-2 border-b border-white/10 gap-2">
                <div className="font-mono text-xs text-[#9D4EDD] flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#9D4EDD] animate-pulse" />
                  <span>RUST WASI GRAPH ENGINE: FAN-OUT, BARRIERS & VERIFICATION</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTriggerGraphEngine('HIGH_RISK_PARALLEL')}
                    disabled={isSimulating}
                    className="px-2.5 py-1 bg-[#9D4EDD]/20 text-[#9D4EDD] border border-[#9D4EDD]/40 rounded-xl font-mono text-xs font-bold hover:bg-[#9D4EDD]/30 transition-all shadow-[0_0_12px_rgba(157,78,221,0.25)]"
                  >
                    ⚡ High Risk (Parallel Fan-Out)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerGraphEngine('LOW_RISK_PIPELINE')}
                    disabled={isSimulating}
                    className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-xl font-mono text-xs font-bold hover:bg-cyan-500/30 transition-all"
                  >
                    🌊 Low Risk (Pipelined Stream)
                  </button>
                </div>
              </div>

              {/* Parallel Worker Count Slider */}
              <div className="p-3.5 rounded-2xl border border-white/10 bg-black/60 font-mono space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70">Parallel WASI MicroVM Worker Threads:</span>
                  <span className="text-[#9D4EDD] font-bold">{workerCount} MicroVM Workers</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={workerCount}
                  onChange={(e) => {
                    setWorkerCount(Number(e.target.value));
                    triggerHaptic('click');
                  }}
                  className="w-full accent-[#9D4EDD] cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-white/40">
                  <span>1 Worker (Single Thread)</span>
                  <span>4 Workers (Recommended vMAX)</span>
                  <span>8 Workers (Max Parallel Fan-Out)</span>
                </div>
              </div>

              {/* Interactive Graph Engine SVG */}
              <div className="rounded-2xl border border-white/10 bg-black/60 p-4 font-mono">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center">
                  {/* Step 1: Ingest */}
                  <div className={`p-3 rounded-xl border transition-all ${simulationStep >= 1 ? 'border-[#9D4EDD] bg-[#9D4EDD]/20 shadow-[0_0_15px_rgba(157,78,221,0.3)]' : 'border-white/10 bg-black/30'}`}>
                    <div className="text-xl">🎯</div>
                    <div className="font-bold text-xs mt-1 text-white">1. Intent Ingest</div>
                    <div className="text-[9px] text-white/50 mt-1">AST Analysis</div>
                  </div>

                  {/* Step 2: Conditional Router */}
                  <div className={`p-3 rounded-xl border transition-all ${simulationStep >= 2 ? 'border-[#9D4EDD] bg-[#9D4EDD]/20 shadow-[0_0_15px_rgba(157,78,221,0.3)]' : 'border-white/10 bg-black/30'}`}>
                    <div className="text-xl">🔀</div>
                    <div className="font-bold text-xs mt-1 text-white">2. Router</div>
                    <div className="text-[9px] text-[#9D4EDD] font-bold mt-1">
                      {graphRiskMode === 'HIGH_RISK_PARALLEL' ? 'Parallel Fan-Out' : 'Pipelined Stream'}
                    </div>
                  </div>

                  {/* Step 3: Barrier */}
                  <div className={`p-3 rounded-xl border transition-all ${simulationStep >= 3 ? 'border-[#9D4EDD] bg-[#9D4EDD]/20 shadow-[0_0_15px_rgba(157,78,221,0.3)]' : 'border-white/10 bg-black/30'}`}>
                    <div className="text-xl">🚧</div>
                    <div className="font-bold text-xs mt-1 text-white">3. Barrier</div>
                    <div className="text-[9px] text-white/50 mt-1">Fan-In Sync</div>
                  </div>

                  {/* Step 4: Gideon Verifier */}
                  <div className={`p-3 rounded-xl border transition-all ${simulationStep >= 4 ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-white/10 bg-black/30'}`}>
                    <div className="text-xl">🧪</div>
                    <div className="font-bold text-xs mt-1 text-white">4. Verifier</div>
                    <div className="text-[9px] text-emerald-300 font-bold mt-1">Gideon Z3 SAT</div>
                  </div>

                  {/* Step 5: Ledger Receipt */}
                  <div className={`p-3 rounded-xl border transition-all ${simulationStep >= 5 ? 'border-[#FFD700] bg-[#FFD700]/20 shadow-[0_0_15px_rgba(255,215,0,0.3)]' : 'border-white/10 bg-black/30'}`}>
                    <div className="text-xl">📜</div>
                    <div className="font-bold text-xs mt-1 text-white">5. Receipt</div>
                    <div className="text-[9px] text-[#FFD700] font-bold mt-1">WAL2 Sealed</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Node & Protocol Inspector + Mermaid Markdown Exporter */}
        <div className="flex flex-col bg-[#0B0916] p-5 space-y-4 overflow-y-auto">
          {/* Active Element Inspector */}
          <div className="rounded-2xl border border-white/10 bg-[#110D24] p-4 font-mono space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">
                Lattice Node & Protocol Inspector
              </span>
              <span className="text-[8.5px] text-white/40">Z3 Verified</span>
            </div>

            {selectedElement ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-white text-sm">{selectedElement.title}</h3>
                  <span className="text-[9px] bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/30">
                    {selectedElement.zone}
                  </span>
                </div>

                <p className="text-white/70 text-[11px] leading-relaxed">
                  {selectedElement.description}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[10px]">
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-white/40 block text-[8px]">RUNTIME</span>
                    <span className="text-cyan-300 font-bold truncate block">{selectedElement.runtime}</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-white/40 block text-[8px]">PROTOCOL</span>
                    <span className="text-amber-300 font-bold truncate block">{selectedElement.protocol}</span>
                  </div>
                  {selectedElement.memoryMb && (
                    <div className="p-2 rounded bg-black/40 border border-white/5 col-span-2">
                      <span className="text-white/40 block text-[8px]">ESTIMATED MEMORY FOOTPRINT</span>
                      <span className="text-emerald-400 font-bold text-xs">{selectedElement.memoryMb} MB (cgroups bound)</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-white/40 text-xs">
                Select any component in the visualizer to inspect runtime process bindings, isolation parameters, and IPC protocols.
              </div>
            )}
          </div>

          {/* Core System Governance Law Verification */}
          <div className="rounded-2xl border border-white/10 bg-[#110D24] p-4 font-mono space-y-2.5">
            <span className="text-[10px] font-bold text-[#00F0FF] uppercase tracking-wider block border-b border-white/10 pb-2">
              Sovereign Execution Laws (vMAX)
            </span>

            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
                <span className="text-white/80">1. Zero-Docker Mandate</span>
                <span className="text-emerald-400 font-bold">Native cgroups v2 ✓</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
                <span className="text-white/80">2. R4 HITL Governance</span>
                <span className="text-emerald-400 font-bold">Excalibur FIDO2 ✓</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
                <span className="text-white/80">3. Non-Repudiation</span>
                <span className="text-emerald-400 font-bold">Ed25519 WAL2 ✓</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/5">
                <span className="text-white/80">4. Tailscale Mesh Tunnel</span>
                <span className="text-emerald-400 font-bold">mTLS WireGuard ✓</span>
              </div>
            </div>
          </div>

          {/* Cryptographic Seal */}
          <div className="mt-auto p-3 rounded-xl border border-[#D4AF37]/30 bg-[#06040F] flex items-center justify-between font-mono text-[9px]">
            <span className="text-white/50">CAMELOT-OS LATTICE BLUEPRINTS</span>
            <span className="text-[#D4AF37] font-bold">⚜️_SOVEREIGN_TRUTH</span>
          </div>
        </div>
      </div>
    </div>
  );
}
