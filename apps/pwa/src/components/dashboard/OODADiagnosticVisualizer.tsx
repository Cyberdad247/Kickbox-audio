'use client';

import React, { useMemo, useEffect, useRef } from 'react';
import { useBifrost } from '../../context/BifrostContext';
import { useOodaSessionSync } from '../../hooks/useOodaSessionSync';

export type OodaStageId = 'observe' | 'orient' | 'decide' | 'act' | 'verify';

export interface OodaStageInfo {
  id: OodaStageId;
  name: string;
  shortName: string;
  code: string;
  tagline: string;
  icon: string;
  color: string;
  borderColor: string;
  bgGlow: string;
  primaryKnight: string;
  latencyMs: number;
  metrics: { label: string; value: string; detail?: string }[];
  details: {
    title: string;
    description: string;
    specs: { key: string; val: string }[];
    subsystems: string[];
    governanceLaw: string;
  };
}

export interface DiagnosticEvent {
  id: string;
  timestamp: string;
  stage: OodaStageId;
  type: 'INFO' | 'AUDIT' | 'SAT' | 'FIREWALL' | 'WARN';
  message: string;
  latencyMs: number;
  dataSnippet?: string;
}

export interface OodaStateTransition {
  id: string;
  fromStage: OodaStageId;
  toStage: OodaStageId;
  timestamp: string;
  cycleNumber: number;
  latencyMs: number;
  status: 'SUCCESS' | 'BLOCKED' | 'WARNING' | 'SAT';
  reason: string;
  details?: string;
  mutationLines?: number;
}

const STAGES: OodaStageInfo[] = [
  {
    id: 'observe',
    name: 'Observe (VFS & Telemetry)',
    shortName: 'Observe',
    code: 'O-01',
    tagline: 'VFS Merkle Audit & Sensor Ingestion',
    icon: '📡',
    color: '#00F0FF',
    borderColor: 'border-cyan-400/40',
    bgGlow: 'bg-cyan-500/10',
    primaryKnight: 'Lady Apis / Lady Mnemosyne',
    latencyMs: 14,
    metrics: [
      { label: 'Merkle Root', value: '0x8f4c...3a19', detail: '100% Valid Chain' },
      { label: 'VFS Inodes', value: '1,428 files', detail: 'Mirror Cloudbrain 1:1' },
      { label: 'Audio Ingestion', value: '48 kHz RMS', detail: 'Web Audio Viseme Bridge' },
      { label: 'Ingest Rate', value: '320 kbps', detail: 'Lossless WebRTC Link' },
    ],
    details: {
      title: 'Phase I: Multi-Modal Environment & Memory Ingestion',
      description:
        'Continuous ingestion of raw sensor telemetry, Web Audio viseme streams, Bifrost WebSocket packets, and real-time Git VFS tree state. Validates Merkle hash chains before feeding data to the cognitive lattice.',
      specs: [
        { key: 'Substrate Sync', val: 'Cleveland, OH Weather & Solar Vector' },
        { key: 'Memory Bridge', val: 'SurrealDB / SQLite WAL2 mmap backplane' },
        { key: 'Ingest Ceiling', val: '<20ms budget allocation' },
        { key: 'Zero-Copy VFS', val: 'Isomorphic tree-state synchronized' },
      ],
      subsystems: [
        'AudioRMSVisemeBridge',
        'VfsMerkleScanner',
        'BifrostBridgeNexus',
        'EnvironmentalSkySync',
      ],
      governanceLaw:
        'ANYA_IS_THE_GATE: No unverified packet enters without cryptographic origin validation.',
    },
  },
  {
    id: 'orient',
    name: 'Orient (Intent & Context)',
    shortName: 'Orient',
    code: 'O-02',
    tagline: 'MFOE Intent Classification & Token Matrix',
    icon: '🧭',
    color: '#9D4EDD',
    borderColor: 'border-purple-400/40',
    bgGlow: 'bg-purple-500/10',
    primaryKnight: 'Lady Mnemosyne_Ω',
    latencyMs: 28,
    metrics: [
      { label: 'Intent Accuracy', value: '99.7%', detail: 'Cosine similarity 0.94' },
      { label: 'Token Velocity', value: '148 tok/s', detail: 'Local edge model' },
      { label: 'Context Budget', value: '3.2 / 8k', detail: 'Babylonian Static stripped' },
      { label: 'Active Persona', value: 'Merlin_Ω', detail: 'System 2 Hypervisor' },
    ],
    details: {
      title: 'Phase II: Semantic Intent Mapping & Cognitive Alignment',
      description:
        'Analyzes observed signals against the 6-File Backplane and Worldtree memory clusters. Strips conversational fluff and Babylonian static to construct a pure token intent matrix for Knight dispatch.',
      specs: [
        { key: 'Filter Law', val: 'Babylonian Static Elimination active' },
        { key: 'Embedding Engine', val: 'SmolEmbeddings-Q4 on-device' },
        { key: 'Cognitive Bias', val: 'Dampened via orthogonal scoring' },
        { key: 'Roster Dispatch', val: 'Weighted Knight affinity router' },
      ],
      subsystems: [
        'MfoeIntentClassifier',
        'WorldtreeVectorStore',
        'KnightRosterRouter',
        'ContextOptimizer',
      ],
      governanceLaw: 'System Instructions §2: Strip all fluff; classify intent deterministically.',
    },
  },
  {
    id: 'decide',
    name: 'Decide (DAG & Reasoning)',
    shortName: 'Decide',
    code: 'D-03',
    tagline: 'System 2 DAG Synthesis & Gate Routing',
    icon: '⚡',
    color: '#FFD700',
    borderColor: 'border-gold/40',
    bgGlow: 'bg-gold/10',
    primaryKnight: 'Merlin_Ω',
    latencyMs: 36,
    metrics: [
      { label: 'Task DAG Nodes', value: '4 nodes', detail: '0 circular cycles' },
      { label: 'Critical Path', value: '78 ms', detail: 'Optimized pipeline' },
      { label: 'Parallel MicroVMs', value: '2 / 5 max', detail: 'CoW worktree isolates' },
      { label: 'HITL Gate Status', value: 'ARMED', detail: '10-line firewall ready' },
    ],
    details: {
      title: 'Phase III: System 2 Reasoning & Task DAG Construction',
      description:
        'Synthesizes an acyclic execution graph of atomic steps. Assesses risk, plans rollback checkpoints, and establishes execution branches for parallel microVM dispatch while arming human-in-the-loop firewalls.',
      specs: [
        { key: 'DAG Topology', val: 'Topologically sorted dependency tree' },
        { key: 'Concurrency Max', val: '5 parallel microVM workers' },
        { key: 'Isolation Plan', val: 'Copy-on-Write git worktree branches' },
        { key: 'Approval Threshold', val: 'Atomic net 10-line code firewall' },
      ],
      subsystems: [
        'MerlinTaskPlanner',
        'DagTopologicalSort',
        'HitlGateSentinel',
        'RollbackCheckpointManager',
      ],
      governanceLaw:
        'Swarm §1: All operations decompose to directed acyclic graphs before kinetic dispatch.',
    },
  },
  {
    id: 'act',
    name: 'Act (SmolVM & AST Mutation)',
    shortName: 'Act',
    code: 'A-04',
    tagline: 'Sandboxed MicroVM Execution & AST Patching',
    icon: '⚙️',
    color: '#38BDF8',
    borderColor: 'border-sky-400/40',
    bgGlow: 'bg-sky-500/10',
    primaryKnight: 'Sir Boris / Sir Codex',
    latencyMs: 42,
    metrics: [
      { label: 'MicroVM Engine', value: 'SmolVM / Wasm', detail: 'Capability leased' },
      { label: 'Memory Zone', value: 'Zone-0 Isolated', detail: '0 B leaked heap' },
      { label: 'AST Mutation', value: 'Tree-sitter', detail: 'Syntax-aware patch' },
      { label: 'ChaCha20 Lease', value: 'Signed', detail: 'Ephemeral 120s TTL' },
    ],
    details: {
      title: 'Phase IV: Sandboxed Kinetic Execution & AST Dispatch',
      description:
        'Executes planned DAG operations inside an isolated WasmEdge / SmolVM microVM sandbox with ChaCha20 signed capability leases. Modifies code via tree-sitter AST patches without mutating production state directly.',
      specs: [
        { key: 'Sandbox Engine', val: 'WasmEdge 0.13 with WASI-NN' },
        { key: 'Tree-sitter', val: 'AST-aware targeted patch generation' },
        { key: 'Capability Lease', val: 'Cryptographically signed token' },
        { key: 'RAM Floor', val: 'Constrained within 8GB edge ceiling' },
      ],
      subsystems: [
        'SmolVmRuntime',
        'TreeSitterPatcher',
        'ChaCha20LeaseAuthority',
        'BifrostAudioDispatcher',
      ],
      governanceLaw: 'Local Env §2: MicroVM sandbox execution prevents host contamination.',
    },
  },
  {
    id: 'verify',
    name: 'Verify (Z3 & 10-Line Gate)',
    shortName: 'Verify',
    code: 'V-05',
    tagline: 'Paladin Octem Z3 & Gideon Protocol',
    icon: '🛡️',
    color: '#10B981',
    borderColor: 'border-emerald-400/40',
    bgGlow: 'bg-emerald-500/10',
    primaryKnight: 'Sir Sentinel / Sir Boris',
    latencyMs: 18,
    metrics: [
      { label: 'Z3 SMT Solver', value: 'SAT (PROVEN)', detail: '0 invariant breaches' },
      { label: 'Net Lines Delta', value: '+4 / 10 limit', detail: 'Firewall PASSED' },
      { label: 'Gideon Defense', value: '5 / 5 Archetypes', detail: '100% Resilient' },
      { label: 'Integrity Seal', value: 'PERFECT', detail: 'Merkle block committed' },
    ],
    details: {
      title: 'Phase V: Formal Mathematical Verification & Iron Gate Check',
      description:
        'Routes all code and state mutations through the Paladin Octem Z3 SMT solver and executes the Gideon Protocol (5 failure archetype defense). Enforces the strict 10-line atomic code firewall before promotion.',
      specs: [
        { key: 'SMT Engine', val: 'Z3 theorem prover formal check' },
        { key: '10-Line Firewall', val: 'Net lines <= 10 or HITL blocked' },
        { key: 'Gideon Protocol', val: '5 failure archetypes validated' },
        { key: 'State Commit', val: 'Signed Merkle Ledger block minted' },
      ],
      subsystems: [
        'PaladinOctemZ3Solver',
        'Atomic10LineFirewall',
        'GideonProtocolAuditor',
        'MerkleLedgerMinter',
      ],
      governanceLaw:
        'Zero-Trust §4: No unverified mutation shall ever be committed without Z3 proof.',
    },
  },
];

const INITIAL_EVENTS: DiagnosticEvent[] = [
  {
    id: 'evt-1',
    timestamp: '06:40:12.110',
    stage: 'observe',
    type: 'INFO',
    message: 'VFS FileTree Merkle audit completed. 1,428 inodes verified.',
    latencyMs: 14,
    dataSnippet: 'root_hash: 0x8f4c0a19d2e7 · zone: edge_vfs',
  },
  {
    id: 'evt-2',
    timestamp: '06:40:12.138',
    stage: 'orient',
    type: 'INFO',
    message: 'MFOE semantic classification: Intent "SYSTEM_DIAGNOSTIC_QUERY" (99.7% conf).',
    latencyMs: 28,
    dataSnippet: 'persona: Merlin_Ω · context_tokens: 142 · fluff_stripped: true',
  },
  {
    id: 'evt-3',
    timestamp: '06:40:12.174',
    stage: 'decide',
    type: 'INFO',
    message: 'Task DAG synthesized: 4 nodes, 0 circular dependencies, critical path 78ms.',
    latencyMs: 36,
    dataSnippet: 'nodes: [Intake, AstPatch, SandboxExec, Z3Audit] · hitl_gate: ARMED',
  },
  {
    id: 'evt-4',
    timestamp: '06:40:12.216',
    stage: 'act',
    type: 'INFO',
    message: 'SmolVM microVM isolate #2 spawned with ChaCha20 signed capability lease.',
    latencyMs: 42,
    dataSnippet: 'zone: Zone-0 · heap_alloc: 12.4MB · ast_target: MacroContext.tsx',
  },
  {
    id: 'evt-5',
    timestamp: '06:40:12.234',
    stage: 'verify',
    type: 'SAT',
    message: 'Paladin Octem Z3 Solver: SATISFIABLE. 10-line firewall passed (+4 lines changed).',
    latencyMs: 18,
    dataSnippet: 'z3_proof: PROVEN · gideon_archetypes: 5/5 PASS · ledger_block: #849',
  },
];

const INITIAL_TRANSITIONS: OodaStateTransition[] = [
  {
    id: 'trans-1',
    fromStage: 'observe',
    toStage: 'orient',
    timestamp: '06:40:12.138',
    cycleNumber: 1492,
    latencyMs: 14,
    status: 'SUCCESS',
    reason: 'Sensor ingestion complete · Merkle chain valid',
    details: '0x8f4c...3a19 verified · 1,428 VFS inodes synchronized',
  },
  {
    id: 'trans-2',
    fromStage: 'orient',
    toStage: 'decide',
    timestamp: '06:40:12.174',
    cycleNumber: 1492,
    latencyMs: 28,
    status: 'SUCCESS',
    reason: 'Intent token matrix aligned (99.7% confidence)',
    details: 'Babylonian static stripped · Merlin_Ω hypervisor engaged',
  },
  {
    id: 'trans-3',
    fromStage: 'decide',
    toStage: 'act',
    timestamp: '06:40:12.216',
    cycleNumber: 1492,
    latencyMs: 36,
    status: 'SUCCESS',
    reason: 'Task DAG synthesized (4 nodes, 0 circular dependencies)',
    details: 'SmolVM microVM dispatch authorized · Capability lease signed',
  },
  {
    id: 'trans-4',
    fromStage: 'act',
    toStage: 'verify',
    timestamp: '06:40:12.234',
    cycleNumber: 1492,
    latencyMs: 42,
    status: 'SUCCESS',
    reason: 'AST Tree-sitter delta generated (+4 lines changed)',
    details: 'Zone-0 isolated heap allocation · AST mutation staged',
    mutationLines: 4,
  },
  {
    id: 'trans-5',
    fromStage: 'verify',
    toStage: 'observe',
    timestamp: '06:40:14.034',
    cycleNumber: 1493,
    latencyMs: 18,
    status: 'SAT',
    reason: 'Paladin Octem Z3 SAT proven · 10-line firewall passed',
    details: 'Merkle ledger block #849 sealed · Feedback loop closed to Observe',
    mutationLines: 4,
  },
];

interface OODADiagnosticVisualizerProps {
  /** If true, renders as a compact floating widget docked at top-right */
  floating?: boolean;
  /** Optional custom CSS classes */
  className?: string;
  /** Optional callback when navigating to full tab */
  onOpenFullDashboard?: () => void;
}

export function OODADiagnosticVisualizer({
  floating = true,
  className = '',
  onOpenFullDashboard,
}: OODADiagnosticVisualizerProps) {
  const { connected } = useBifrost();

  // Use sessionStorage synchronization hook
  const { state: sessionState, updateState } = useOodaSessionSync({
    selectedStageId: 'verify',
    activeRunningStage: 'observe',
    isAutoLooping: true,
    loopCycleCount: 1492,
    simulatedMutationLines: 4,
    filterType: 'ALL',
    isMinimized: true,
    events: INITIAL_EVENTS,
    transitions: INITIAL_TRANSITIONS,
  });

  const {
    selectedStageId = 'verify',
    activeRunningStage = 'observe',
    isAutoLooping = true,
    loopCycleCount = 1492,
    events = INITIAL_EVENTS,
    transitions = INITIAL_TRANSITIONS,
    simulatedMutationLines = 4,
    filterType = 'ALL',
    isMinimized = true,
  } = sessionState || {};

  const safeEvents = Array.isArray(events) ? events : INITIAL_EVENTS;
  const safeTransitions = Array.isArray(transitions) ? transitions : INITIAL_TRANSITIONS;

  // Local UI state for Transition History Panel
  const [activeInspectorTab, setActiveInspectorTab] = React.useState<'TRANSITIONS' | 'EVENTS'>(
    'TRANSITIONS',
  );
  const [transitionStageFilter, setTransitionStageFilter] = React.useState<'ALL' | OodaStageId>(
    'ALL',
  );
  const [transitionStatusFilter, setTransitionStatusFilter] = React.useState<string>('ALL');
  const [transitionSearchQuery, setTransitionSearchQuery] = React.useState<string>('');
  const [copiedTransitions, setCopiedTransitions] = React.useState<boolean>(false);
  const [floatingTab, setFloatingTab] = React.useState<'DIAGNOSTICS' | 'TRANSITIONS'>(
    'DIAGNOSTICS',
  );

  const autoLoopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const prevRunningStageRef = useRef<OodaStageId>(activeRunningStage);

  // Save minimize state
  const handleToggleMinimize = (nextState?: boolean) => {
    updateState((prev) => ({
      isMinimized: nextState !== undefined ? nextState : !prev.isMinimized,
    }));
  };

  const setSelectedStageId = (stageId: OodaStageId) => {
    updateState({ selectedStageId: stageId });
  };

  const setActiveRunningStage = (stageId: OodaStageId) => {
    updateState({ activeRunningStage: stageId });
  };

  const setTransitions = (
    valOrFn: OodaStateTransition[] | ((prev: OodaStateTransition[]) => OodaStateTransition[]),
  ) => {
    updateState((prev) => ({
      transitions:
        typeof valOrFn === 'function' ? valOrFn(prev.transitions || INITIAL_TRANSITIONS) : valOrFn,
    }));
  };

  // Helper to record state transitions
  const recordTransition = React.useCallback(
    (
      fromStage: OodaStageId,
      toStage: OodaStageId,
      reason: string,
      status: 'SUCCESS' | 'BLOCKED' | 'WARNING' | 'SAT' = 'SUCCESS',
      details?: string,
      mutationLines?: number,
    ) => {
      const now = new Date();
      const timeStr =
        now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
      const toStageInfo = STAGES.find((s) => s.id === toStage) || STAGES[0];

      const newTrans: OodaStateTransition = {
        id: `trans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fromStage,
        toStage,
        timestamp: timeStr,
        cycleNumber: loopCycleCount,
        latencyMs: toStageInfo.latencyMs,
        status,
        reason,
        details,
        mutationLines,
      };

      updateState((prev) => ({
        transitions: [newTrans, ...(prev.transitions || INITIAL_TRANSITIONS).slice(0, 49)],
      }));
    },
    [loopCycleCount, updateState],
  );

  const setIsAutoLooping = (valOrFn: boolean | ((prev: boolean) => boolean)) => {
    updateState((prev) => ({
      isAutoLooping: typeof valOrFn === 'function' ? valOrFn(prev.isAutoLooping) : valOrFn,
    }));
  };

  const setLoopCycleCount = (valOrFn: number | ((prev: number) => number)) => {
    updateState((prev) => ({
      loopCycleCount: typeof valOrFn === 'function' ? valOrFn(prev.loopCycleCount) : valOrFn,
    }));
  };

  const setEvents = (
    valOrFn: DiagnosticEvent[] | ((prev: DiagnosticEvent[]) => DiagnosticEvent[]),
  ) => {
    updateState((prev) => ({
      events: typeof valOrFn === 'function' ? valOrFn(prev.events) : valOrFn,
    }));
  };

  const setSimulatedMutationLines = (lines: number) => {
    updateState({ simulatedMutationLines: lines });
  };

  const setFilterType = (filter: string) => {
    updateState({ filterType: filter });
  };

  const selectedStage = useMemo(() => {
    return STAGES.find((s) => s.id === selectedStageId) || STAGES[0];
  }, [selectedStageId]);

  const activeStageInfo = useMemo(() => {
    return STAGES.find((s) => s.id === activeRunningStage) || STAGES[0];
  }, [activeRunningStage]);

  const totalCycleLatency = useMemo(() => {
    return STAGES.reduce((acc, s) => acc + s.latencyMs, 0);
  }, []);

  // Continuous loop telemetry simulation with state transition tracking
  useEffect(() => {
    if (!isAutoLooping) {
      if (autoLoopTimerRef.current) clearInterval(autoLoopTimerRef.current);
      return;
    }

    const stageSequence: OodaStageId[] = ['observe', 'orient', 'decide', 'act', 'verify'];
    let currentIndex = 0;

    autoLoopTimerRef.current = setInterval(() => {
      const currentStage = stageSequence[currentIndex];
      const prevStage = prevRunningStageRef.current;
      prevRunningStageRef.current = currentStage;

      setActiveRunningStage(currentStage);

      // Record state transition
      const transitionReason =
        currentStage === 'observe'
          ? `Loop closure: Verify ➔ Observe (Cycle #${loopCycleCount + 1})`
          : currentStage === 'orient'
            ? 'Sensory ingestion analyzed · Intent vector aligned'
            : currentStage === 'decide'
              ? 'DAG decision synthesized · Execution path planned'
              : currentStage === 'act'
                ? 'Task dispatch authorized · MicroVM execution armed'
                : 'AST mutation staged · Z3 formal verification initiated';

      const transitionStatus = currentStage === 'verify' ? 'SAT' : 'SUCCESS';

      recordTransition(
        prevStage,
        currentStage,
        transitionReason,
        transitionStatus,
        `Loop execution stream · Stage Code ${STAGES.find((s) => s.id === currentStage)?.code}`,
        currentStage === 'act' || currentStage === 'verify' ? simulatedMutationLines : undefined,
      );

      if (currentStage === 'verify') {
        setLoopCycleCount((prev) => prev + 1);
      }

      currentIndex = (currentIndex + 1) % stageSequence.length;
    }, 1800);

    return () => {
      if (autoLoopTimerRef.current) clearInterval(autoLoopTimerRef.current);
    };
  }, [isAutoLooping, loopCycleCount, recordTransition, simulatedMutationLines]);

  // Trigger manual cycle with transition recording
  const triggerManualCycle = () => {
    const stageSequence: OodaStageId[] = ['observe', 'orient', 'decide', 'act', 'verify'];
    let step = 0;

    const interval = setInterval(() => {
      if (step < stageSequence.length) {
        const stageId = stageSequence[step];
        const prevStage = step === 0 ? prevRunningStageRef.current : stageSequence[step - 1];
        prevRunningStageRef.current = stageId;

        setActiveRunningStage(stageId);
        setSelectedStageId(stageId);

        const now = new Date();
        const timeStr =
          now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
        const stInfo = STAGES.find((s) => s.id === stageId)!;

        // Record transition
        recordTransition(
          prevStage,
          stageId,
          `Manual Pulse: Transitioned to ${stInfo.name}`,
          stageId === 'verify' ? (simulatedMutationLines > 10 ? 'BLOCKED' : 'SAT') : 'SUCCESS',
          `Target: ${stInfo.code} · Primary: ${stInfo.primaryKnight}`,
          stageId === 'verify' ? simulatedMutationLines : undefined,
        );

        const newEvent: DiagnosticEvent = {
          id: `evt-${Date.now()}-${step}`,
          timestamp: timeStr,
          stage: stageId,
          type: stageId === 'verify' ? (simulatedMutationLines > 10 ? 'FIREWALL' : 'SAT') : 'INFO',
          message:
            stageId === 'verify'
              ? simulatedMutationLines > 10
                ? `❌ Sentinel Block: Mutation (+${simulatedMutationLines} lines) exceeded 10-line firewall! HITL required.`
                : `✅ Paladin Octem Z3 Solver: SAT. Net lines (+${simulatedMutationLines}) within 10-line limit.`
              : `Manual dispatch completed for ${stInfo.name}. Latency: ${stInfo.latencyMs}ms.`,
          latencyMs: stInfo.latencyMs,
          dataSnippet: `knight: ${stInfo.primaryKnight} · code: ${stInfo.code}`,
        };

        setEvents((prev) => [newEvent, ...prev.slice(0, 29)]);
        step++;
      } else {
        clearInterval(interval);
        setLoopCycleCount((prev) => prev + 1);
      }
    }, 450);
  };

  const injectScenario = (
    scenario: 'audio' | 'valid-patch' | 'oversized-patch' | 'merkle-audit',
  ) => {
    const now = new Date();
    const timeStr =
      now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    if (scenario === 'audio') {
      const prev = activeRunningStage;
      setActiveRunningStage('observe');
      setSelectedStageId('observe');
      recordTransition(
        prev,
        'observe',
        'Audio Ingestion Injected: 48kHz RMS Viseme chunk',
        'SUCCESS',
        'channel: bifrost_webrtc · rms_power: -18.2 dB',
      );
      const newEvt: DiagnosticEvent = {
        id: `evt-${Date.now()}`,
        timestamp: timeStr,
        stage: 'observe',
        type: 'INFO',
        message:
          'Web Audio RMS Viseme packet captured: 48kHz audio chunk processed. Zero packet drop.',
        latencyMs: 11,
        dataSnippet: 'viseme_channels: 16 · rms_power: -18.2 dB · channel: bifrost_webrtc',
      };
      setEvents((prevEvents) => [newEvt, ...prevEvents.slice(0, 29)]);
    } else if (scenario === 'valid-patch') {
      const prev = activeRunningStage;
      setSimulatedMutationLines(3);
      setActiveRunningStage('verify');
      setSelectedStageId('verify');
      recordTransition(
        prev,
        'verify',
        'AST Patch Injected (+3 lines) · Z3 SAT Passed',
        'SAT',
        'target: MacroQuickBar.tsx · diff: +3 lines',
        3,
      );
      const newEvt: DiagnosticEvent = {
        id: `evt-${Date.now()}`,
        timestamp: timeStr,
        stage: 'verify',
        type: 'SAT',
        message:
          'AST Tree-sitter patch (+3 lines) verified by Paladin Octem Z3. Firewall status: PASS.',
        latencyMs: 16,
        dataSnippet: 'target: apps/pwa/src/components/macro/MacroQuickBar.tsx · diff_lines: +3',
      };
      setEvents((prevEvents) => [newEvt, ...prevEvents.slice(0, 29)]);
    } else if (scenario === 'oversized-patch') {
      const prev = activeRunningStage;
      setSimulatedMutationLines(18);
      setActiveRunningStage('verify');
      setSelectedStageId('verify');
      recordTransition(
        prev,
        'verify',
        'Oversized Mutation Injected (+18 lines) · Firewall Blocked',
        'BLOCKED',
        'exceeds 10-line firewall threshold · HITL required',
        18,
      );
      const newEvt: DiagnosticEvent = {
        id: `evt-${Date.now()}`,
        timestamp: timeStr,
        stage: 'verify',
        type: 'FIREWALL',
        message:
          '🛡️ [IRON GATE FIREWALL TRIGGERED]: Mutation (+18 lines) exceeds 10-line limit. HITL lock active.',
        latencyMs: 5,
        dataSnippet: 'override_cmd: CAMELOT_BYPASS_FIREWALL=1 git commit //GO',
      };
      setEvents((prevEvents) => [newEvt, ...prevEvents.slice(0, 29)]);
    } else if (scenario === 'merkle-audit') {
      const prev = activeRunningStage;
      setActiveRunningStage('observe');
      setSelectedStageId('observe');
      recordTransition(
        prev,
        'observe',
        'Merkle VFS Audit Injected · 100% Match',
        'SUCCESS',
        'local_root: 0x8f4c0a19d2e7 · inodes: 1,428',
      );
      const newEvt: DiagnosticEvent = {
        id: `evt-${Date.now()}`,
        timestamp: timeStr,
        stage: 'observe',
        type: 'AUDIT',
        message: 'VFS Merkle Tree Root Hash audited against Worldtree Cloudbrain. Match 100%.',
        latencyMs: 19,
        dataSnippet: 'cloudbrain_root: 0x8f4c0a19d2e7 · local_vfs_root: 0x8f4c0a19d2e7',
      };
      setEvents((prevEvents) => [newEvt, ...prevEvents.slice(0, 29)]);
    }
  };

  const filteredEvents = useMemo(() => {
    if (filterType === 'ALL') return safeEvents;
    return safeEvents.filter(
      (e) => e && (e.type === filterType || (e.stage && e.stage === filterType.toLowerCase())),
    );
  }, [safeEvents, filterType]);

  const filteredTransitions = useMemo(() => {
    return safeTransitions.filter((trans) => {
      if (!trans) return false;
      // Stage filter
      if (transitionStageFilter !== 'ALL') {
        if (trans.fromStage !== transitionStageFilter && trans.toStage !== transitionStageFilter) {
          return false;
        }
      }
      // Status filter
      if (transitionStatusFilter !== 'ALL') {
        if (trans.status !== transitionStatusFilter) {
          return false;
        }
      }
      // Search query filter
      if (transitionSearchQuery.trim()) {
        const query = transitionSearchQuery.toLowerCase();
        const matchesQuery =
          (trans.fromStage && trans.fromStage.toLowerCase().includes(query)) ||
          (trans.toStage && trans.toStage.toLowerCase().includes(query)) ||
          (trans.reason && trans.reason.toLowerCase().includes(query)) ||
          (trans.details && trans.details.toLowerCase().includes(query)) ||
          String(trans.cycleNumber || '').includes(query) ||
          (trans.timestamp && trans.timestamp.toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [safeTransitions, transitionStageFilter, transitionStatusFilter, transitionSearchQuery]);

  const handleCopyTransitions = () => {
    try {
      const dataStr = JSON.stringify(safeTransitions, null, 2);
      navigator.clipboard.writeText(dataStr);
      setCopiedTransitions(true);
      setTimeout(() => setCopiedTransitions(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleOpenFull = () => {
    if (onOpenFullDashboard) {
      onOpenFullDashboard();
    } else {
      window.dispatchEvent(new CustomEvent('koa:navigate_tab', { detail: 'OODA Loop' }));
    }
  };

  // If floating is enabled, render the sleek top-right widget
  if (floating) {
    return (
      <aside
        id="ooda-floating-diagnostic-widget"
        aria-label="OODA Loop Diagnostics"
        className={`fixed top-4 right-4 z-40 transition-all duration-300 ${className}`}
      >
        {isMinimized ? (
          /* ── Minimized Floating Pill ───────────────────────────────── */
          <div
            id="ooda-minimized-pill"
            className="flex items-center gap-2.5 rounded-full border border-gold/40 bg-smoke-900/90 px-3.5 py-1.5 backdrop-blur-xl shadow-glass-gold hover:border-gold/70 transition-all cursor-pointer group"
            onClick={() => handleToggleMinimize(false)}
            title="Click to expand OODA-MGV Cybernetic Diagnostics"
          >
            {/* Pulsing loop stage dot with Sovereign Aura glow */}
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ backgroundColor: activeStageInfo.color }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full animate-ooda-pill"
                style={{ backgroundColor: activeStageInfo.color }}
              />
            </span>

            <span className="font-mono text-[11px] font-bold tracking-wider text-gold-royal">
              OODA-MGV
            </span>

            {/* Stage Indicator Pill with subtle gold aura */}
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase transition-all animate-ooda-pill"
              style={{
                backgroundColor: `${activeStageInfo.color}22`,
                color: activeStageInfo.color,
                border: `1px solid ${activeStageInfo.color}55`,
              }}
            >
              {activeStageInfo.shortName}
            </span>

            <span className="font-mono text-[10px] text-white/50">{totalCycleLatency}ms</span>

            <span className="font-mono text-[9px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1 py-0.2 rounded">
              Z3:SAT
            </span>

            {/* Expand Icon */}
            <button
              id="ooda-btn-expand-widget"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleMinimize(false);
              }}
              className="ml-1 text-white/40 group-hover:text-gold-light transition-colors text-xs"
              aria-label="Expand OODA diagnostics widget"
            >
              ↙
            </button>
          </div>
        ) : (
          /* ── Expanded Floating Diagnostic Panel ───────────────────── */
          <div
            id="ooda-expanded-panel"
            className="w-[360px] sm:w-[420px] max-h-[85vh] overflow-y-auto rounded-lg border border-gold/30 bg-smoke-900/95 p-4 backdrop-blur-2xl shadow-2xl space-y-4 ring-1 ring-gold/20 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header / Top Control Bar */}
            <div className="flex items-center justify-between border-b border-gold/15 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded border border-gold/40 bg-gold/10 text-gold-royal text-xs font-bold font-mono">
                  Ω
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[9px] uppercase tracking-widest text-gold-royal font-bold">
                      OODA-MGV Loop
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <h4 className="font-display text-sm font-bold text-white tracking-wide">
                    Live Cybernetic Diagnostics
                  </h4>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenFull}
                  className="rounded border border-gold/30 bg-gold/10 px-2 py-1 font-mono text-[9px] font-bold text-gold-light hover:bg-gold/20 transition-all cursor-pointer"
                  title="Open Full Screen Dashboard Tab"
                >
                  Full View ↗
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMinimize(true)}
                  className="rounded border border-white/10 p-1 text-white/40 hover:text-white hover:border-white/30 transition-colors text-xs cursor-pointer"
                  title="Minimize widget"
                  aria-label="Minimize widget"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Floating Tab Switcher: Diagnostics vs State Transitions */}
            <div className="flex items-center rounded bg-black/40 p-0.5 border border-white/10 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setFloatingTab('DIAGNOSTICS')}
                className={`flex-1 py-1 px-2 rounded font-bold transition-all cursor-pointer text-center ${
                  floatingTab === 'DIAGNOSTICS'
                    ? 'bg-gold/20 text-gold-royal border border-gold/30 shadow-sm'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                ⚡ Live Loop
              </button>
              <button
                type="button"
                onClick={() => setFloatingTab('TRANSITIONS')}
                className={`flex-1 py-1 px-2 rounded font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  floatingTab === 'TRANSITIONS'
                    ? 'bg-gold/20 text-gold-royal border border-gold/30 shadow-sm'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <span>📜 Transitions</span>
                <span className="rounded-full bg-gold/20 px-1 py-0.2 text-[8px] text-gold-light">
                  {transitions.length}
                </span>
              </button>
            </div>

            {floatingTab === 'TRANSITIONS' ? (
              /* ── Floating Transition History List ─────────────────── */
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] font-mono text-white/40 border-b border-white/5 pb-1">
                  <span>Recent State Handoffs</span>
                  <button
                    type="button"
                    onClick={handleCopyTransitions}
                    className="text-gold-light hover:underline cursor-pointer"
                  >
                    {copiedTransitions ? '✓ Copied' : 'Copy Log'}
                  </button>
                </div>

                <div
                  id="ooda-floating-transitions-scroll"
                  className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1"
                >
                  {safeTransitions.slice(0, 15).map((trans) => {
                    const fromInfo = STAGES.find((s) => s.id === trans.fromStage) || STAGES[0];
                    const toInfo = STAGES.find((s) => s.id === trans.toStage) || STAGES[0];

                    return (
                      <div
                        key={trans.id}
                        className="rounded border border-white/10 bg-black/50 p-2 text-[10px] font-mono space-y-1 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold">
                            <span style={{ color: fromInfo.color }}>{fromInfo.shortName}</span>
                            <span className="text-gold-light text-xs animate-glow-pass">➔</span>
                            <span style={{ color: toInfo.color }}>{toInfo.shortName}</span>
                          </div>
                          <span
                            className={`px-1 py-0.2 rounded text-[8px] font-bold ${
                              trans.status === 'SAT'
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                                : trans.status === 'BLOCKED'
                                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                                  : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30'
                            }`}
                          >
                            {trans.status}
                          </span>
                        </div>

                        <p className="text-[10px] text-white/80 font-sans leading-tight">
                          {trans.reason}
                        </p>

                        <div className="flex items-center justify-between text-[8px] text-white/40 pt-0.5 border-t border-white/5">
                          <span>
                            #{trans.cycleNumber} · {trans.timestamp}
                          </span>
                          <span className="text-gold-light font-bold">+{trans.latencyMs}ms</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ── Floating Live Diagnostics View ────────────────────── */
              <>
                {/* Quick 5-Stage Step Flow Indicator with Traveling Glow Connectors */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-white/40">
                    <span>Phase Feedback Loop</span>
                    <span className="text-gold-royal">Cycle #{loopCycleCount}</span>
                  </div>

                  {/* Interconnected Step Pipeline */}
                  <div className="relative flex items-center justify-between gap-1">
                    {STAGES.map((st, idx) => {
                      const isActive = activeRunningStage === st.id;
                      const isSelected = selectedStageId === st.id;
                      const activeIdx = STAGES.findIndex((s) => s.id === activeRunningStage);
                      const isConnectorActive = activeIdx === idx;

                      return (
                        <React.Fragment key={st.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedStageId(st.id)}
                            className={`relative flex-1 flex flex-col items-center py-1.5 px-0.5 rounded border transition-all cursor-pointer z-10 ${
                              isSelected
                                ? `${st.borderColor} ${st.bgGlow} ring-1 ring-gold/40`
                                : 'border-white/5 bg-black/50 hover:border-white/20'
                            } ${isActive ? 'animate-ooda-aura border-gold/70' : ''}`}
                          >
                            {isActive && (
                              <span
                                className="absolute -top-0.5 left-1/2 -translate-x-1/2 h-1 w-3 rounded-full animate-ooda-pill"
                                style={{ backgroundColor: st.color }}
                              />
                            )}
                            <span className="text-xs">{st.icon}</span>
                            <span
                              className="font-mono text-[8px] font-bold uppercase mt-0.5 truncate max-w-full"
                              style={{ color: isSelected || isActive ? st.color : '#888' }}
                            >
                              {st.shortName}
                            </span>
                          </button>

                          {/* Traveling Glow Connector Line between stages */}
                          {idx < STAGES.length - 1 && (
                            <div className="relative w-2.5 sm:w-3.5 h-[2px] bg-white/10 shrink-0 overflow-hidden rounded-full">
                              {isConnectorActive && (
                                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-light to-transparent animate-glow-pass" />
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Stage Detail Capsule */}
                <div className="rounded border border-white/10 bg-black/50 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{selectedStage.icon}</span>
                      <span
                        className="font-mono text-xs font-bold uppercase"
                        style={{ color: selectedStage.color }}
                      >
                        {selectedStage.name}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-gold-light">
                      {selectedStage.latencyMs} ms
                    </span>
                  </div>

                  <p className="text-[11px] text-white/60 leading-snug">
                    {selectedStage.details.description}
                  </p>

                  {/* 2-Tile Stage Invariants */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {selectedStage.metrics.slice(0, 2).map((m, idx) => (
                      <div
                        key={idx}
                        className="border border-white/5 bg-white/5 p-1.5 rounded text-[10px] font-mono"
                      >
                        <span className="text-white/40 block text-[8px] uppercase truncate">
                          {m.label}
                        </span>
                        <span className="text-gold-light font-bold truncate block">{m.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-[9px] font-mono text-gold-royal/80 border-t border-white/5 pt-1.5 flex items-center gap-1">
                    <span>⚖️</span>
                    <span className="truncate">{selectedStage.details.governanceLaw}</span>
                  </div>
                </div>
              </>
            )}

            {/* Fast Control & Test Scenarios */}
            <div className="flex items-center justify-between gap-1.5 border-t border-white/10 pt-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={triggerManualCycle}
                  className="rounded border border-gold/40 bg-gold/15 px-2.5 py-1 font-mono text-[10px] font-bold text-gold-light hover:bg-gold/25 transition-all cursor-pointer"
                >
                  ⚡ Pulse
                </button>
                <button
                  type="button"
                  onClick={() => setIsAutoLooping((p) => !p)}
                  className={`rounded border px-2 py-1 font-mono text-[10px] font-bold transition-all cursor-pointer ${
                    isAutoLooping
                      ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-300'
                      : 'border-white/10 bg-white/5 text-white/60'
                  }`}
                >
                  {isAutoLooping ? '⏸' : '▶'}
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => injectScenario('audio')}
                  className="rounded border border-cyan-500/30 bg-cyan-950/30 px-2 py-1 text-[9px] font-mono text-cyan-300 hover:bg-cyan-900/40"
                  title="Simulate 48kHz RMS Web Audio Packet"
                >
                  🎙️ Audio
                </button>
                <button
                  type="button"
                  onClick={() => injectScenario('valid-patch')}
                  className="rounded border border-emerald-500/30 bg-emerald-950/30 px-2 py-1 text-[9px] font-mono text-emerald-300 hover:bg-emerald-900/40"
                  title="Test +3L AST Patch (Passes 10-line firewall)"
                >
                  ✅ +3L
                </button>
                <button
                  type="button"
                  onClick={() => injectScenario('oversized-patch')}
                  className="rounded border border-rose-500/30 bg-rose-950/30 px-2 py-1 text-[9px] font-mono text-rose-300 hover:bg-rose-900/40"
                  title="Test +18L Mutation (Blocks on 10-line firewall)"
                >
                  🛡️ +18L
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    );
  }

  // Fallback for non-floating full view mode
  return (
    <div id="ooda-mgv-dashboard" className={`space-y-6 pb-12 ${className}`}>
      {/* ── Top Header & Hero Status Bar ───────────────────────────────── */}
      <div
        id="ooda-hero-banner"
        className="relative overflow-hidden border border-gold/20 bg-smoke-900/80 p-6 md:p-8 backdrop-blur-xl shadow-glass-gold"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-gold-royal text-sm font-bold">
                Ω
              </span>
              <span className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-gold-royal">
                OODA-MGV System Hypervisor
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase font-bold tracking-wider ${
                  isAutoLooping
                    ? 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 animate-pulse'
                    : 'border border-amber-500/40 bg-amber-950/40 text-amber-300'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {isAutoLooping ? 'Live Cybernetic Loop' : 'Paused Loop'}
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl text-white tracking-minted">
              OODA-MGV Operational Loop Diagnostics
            </h2>
            <p className="max-w-2xl text-xs md:text-sm text-white/50 leading-relaxed">
              Real-time cybernetic feedback architecture maintaining total system transparency
              across <strong className="text-cyan-400">Observe</strong>,{' '}
              <strong className="text-purple-400">Orient</strong>,{' '}
              <strong className="text-gold-light">Decide</strong>,{' '}
              <strong className="text-sky-400">Act</strong>, and{' '}
              <strong className="text-emerald-400">Verify</strong> execution phases.
            </p>
          </div>

          {/* Quick Metrics Ticker */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="border border-white/10 bg-black/40 px-4 py-3 min-w-[130px]">
              <span className="block text-[10px] text-white/40 uppercase tracking-widest font-mono">
                Loop Cycles
              </span>
              <span className="font-mono text-xl text-gold-royal font-bold">
                #{loopCycleCount.toLocaleString()}
              </span>
            </div>
            <div className="border border-white/10 bg-black/40 px-4 py-3 min-w-[130px]">
              <span className="block text-[10px] text-white/40 uppercase tracking-widest font-mono">
                Cycle Latency
              </span>
              <span className="font-mono text-xl text-cyan-neon font-bold">
                {totalCycleLatency} ms
              </span>
            </div>
            <div className="border border-white/10 bg-black/40 px-4 py-3 min-w-[130px]">
              <span className="block text-[10px] text-white/40 uppercase tracking-widest font-mono">
                Memory Floor
              </span>
              <span className="font-mono text-xl text-emerald-400 font-bold">4.1 / 8.0 GB</span>
            </div>
          </div>
        </div>

        {/* Global Control Action Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gold/10 pt-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="ooda-btn-trigger-cycle"
              type="button"
              onClick={triggerManualCycle}
              className="flex items-center gap-2 rounded-sm border border-gold/50 bg-gold/15 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-gold-light shadow-gold hover:bg-gold/25 hover:scale-[1.02] transition-all cursor-pointer"
            >
              <span>⚡</span>
              <span>Pulse Single Cycle</span>
            </button>

            <button
              id="ooda-btn-toggle-loop"
              type="button"
              onClick={() => setIsAutoLooping((prev) => !prev)}
              className={`flex items-center gap-2 rounded-sm border px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                isAutoLooping
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
                  : 'border-white/20 bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              <span>{isAutoLooping ? '⏸' : '▶'}</span>
              <span>{isAutoLooping ? 'Pause Auto-Loop' : 'Resume Auto-Loop'}</span>
            </button>
          </div>

          {/* Test Simulation Injections */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/30 mr-1">
              Simulate Ingestion:
            </span>
            <button
              id="ooda-sim-audio"
              type="button"
              onClick={() => injectScenario('audio')}
              className="rounded border border-cyan-500/30 bg-cyan-950/30 px-2.5 py-1 text-[11px] font-mono text-cyan-300 hover:bg-cyan-900/40 transition-colors"
              title="Simulate 48kHz RMS Viseme Audio Ingestion"
            >
              🎙️ Audio RMS
            </button>
            <button
              id="ooda-sim-merkle"
              type="button"
              onClick={() => injectScenario('merkle-audit')}
              className="rounded border border-purple-500/30 bg-purple-950/30 px-2.5 py-1 text-[11px] font-mono text-purple-300 hover:bg-purple-900/40 transition-colors"
              title="Audit VFS Merkle Tree Root against Cloudbrain"
            >
              📂 Merkle Audit
            </button>
            <button
              id="ooda-sim-valid-patch"
              type="button"
              onClick={() => injectScenario('valid-patch')}
              className="rounded border border-emerald-500/30 bg-emerald-950/30 px-2.5 py-1 text-[11px] font-mono text-emerald-300 hover:bg-emerald-900/40 transition-colors"
              title="Test AST mutation with 3 lines changed (Passes 10-line firewall)"
            >
              ✅ Valid AST (+3L)
            </button>
            <button
              id="ooda-sim-firewall-block"
              type="button"
              onClick={() => injectScenario('oversized-patch')}
              className="rounded border border-rose-500/40 bg-rose-950/30 px-2.5 py-1 text-[11px] font-mono text-rose-300 hover:bg-rose-900/40 transition-colors"
              title="Test mutation exceeding 10 lines (Triggers Sentinel Firewall)"
            >
              🛡️ Oversized (+18L)
            </button>
          </div>
        </div>
      </div>

      {/* ── 5-Stage Interactive Cybernetic Pipeline Flow ────────────────── */}
      <div id="ooda-pipeline-flow" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-white/60">
            Cybernetic Stage Pipeline Matrix
          </h3>
          <span className="text-[11px] font-mono text-white/40">
            Select a stage below to inspect deep telemetry & invariants
          </span>
        </div>

        {/* Cybernetic Highway Connector Rail */}
        <div className="relative rounded-lg border border-gold/20 bg-black/60 p-3 backdrop-blur-md overflow-hidden">
          {/* Top Rail Loopback Status */}
          <div className="flex items-center justify-between text-[10px] font-mono text-white/50 mb-2 px-1">
            <span className="flex items-center gap-1.5 text-gold-royal">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
              </span>
              <span>SYNCHRONIZED BUS HIGHWAY</span>
            </span>
            <span className="text-white/40">
              Active Flow:{' '}
              <strong className="text-gold-light uppercase">{activeRunningStage}</strong> ➔{' '}
              <span className="text-white/60">
                {
                  STAGES[(STAGES.findIndex((s) => s.id === activeRunningStage) + 1) % STAGES.length]
                    .shortName
                }
              </span>
            </span>
          </div>

          {/* Connected Node Tracks with Traveling Glow Pass */}
          <div className="relative flex items-center justify-between px-2 sm:px-6 py-2">
            {STAGES.map((stage, idx) => {
              const isActive = activeRunningStage === stage.id;
              const isSelected = selectedStageId === stage.id;
              const activeIdx = STAGES.findIndex((s) => s.id === activeRunningStage);
              const isConnectorActive = activeIdx === idx;

              return (
                <React.Fragment key={`bus-${stage.id}`}>
                  {/* Node Icon Capsule */}
                  <button
                    type="button"
                    onClick={() => setSelectedStageId(stage.id)}
                    className={`relative z-10 flex flex-col items-center group cursor-pointer transition-all ${
                      isActive ? 'scale-110' : 'hover:scale-105'
                    }`}
                  >
                    <div
                      className={`h-9 w-9 sm:h-11 sm:w-11 rounded-full flex items-center justify-center border transition-all text-sm sm:text-base ${
                        isActive
                          ? 'border-gold bg-gold/20 text-white shadow-lg ring-2 ring-gold/60 animate-ooda-pill'
                          : isSelected
                            ? 'border-gold/60 bg-smoke-800 text-gold shadow-md ring-1 ring-gold/40'
                            : 'border-white/20 bg-smoke-900 text-white/60 hover:border-white/40'
                      }`}
                    >
                      <span>{stage.icon}</span>
                    </div>
                    <span
                      className={`mt-1 font-mono text-[9px] sm:text-[10px] font-bold uppercase transition-colors ${
                        isActive
                          ? 'text-gold-light'
                          : isSelected
                            ? 'text-white'
                            : 'text-white/40 group-hover:text-white/70'
                      }`}
                    >
                      {stage.shortName}
                    </span>
                  </button>

                  {/* Connector Line Highway with Glow Pass Beam */}
                  {idx < STAGES.length - 1 && (
                    <div className="relative flex-1 mx-2 sm:mx-3.5 h-1.5 bg-white/10 rounded-full overflow-hidden border border-white/5">
                      {/* Base Track */}
                      {isConnectorActive && (
                        <>
                          <div className="absolute inset-0 bg-gold/30 animate-pulse" />
                          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-light to-transparent animate-glow-pass" />
                        </>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Loopback Feedback Channel (Verify -> Observe) */}
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-mono px-2 text-white/40">
            <span className="flex items-center gap-1 text-gold/70">
              <span>⟲ Closed Cybernetic Loopback (Verify ➔ Observe)</span>
            </span>
            <div className="relative w-36 sm:w-56 h-1 bg-white/10 rounded-full overflow-hidden">
              {activeRunningStage === 'verify' && (
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-gold-light to-transparent animate-glow-pass-reverse" />
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {STAGES.map((stage) => {
            const isSelected = selectedStageId === stage.id;
            const isRunning = activeRunningStage === stage.id;

            return (
              <button
                key={stage.id}
                id={`ooda-stage-card-${stage.id}`}
                type="button"
                onClick={() => setSelectedStageId(stage.id)}
                className={`group relative flex flex-col justify-between border p-5 text-left transition-all cursor-pointer backdrop-blur-md overflow-hidden ${
                  isSelected
                    ? `${stage.borderColor} ${stage.bgGlow} shadow-lg ring-1 ring-gold/40`
                    : 'border-white/10 bg-smoke-800/80 hover:border-white/25 hover:bg-smoke-800'
                } ${isRunning ? 'animate-ooda-aura border-gold/80 ring-1 ring-gold/50' : ''}`}
              >
                {/* Active loop pulse beam with Sovereign Aura gold scan */}
                {isRunning && (
                  <span className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-light to-transparent animate-ooda-beam" />
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold tracking-widest text-white/40 uppercase">
                      {stage.code}
                    </span>
                    <span className="text-lg">{stage.icon}</span>
                  </div>

                  <h4
                    className="mt-2 font-display text-base font-bold tracking-wide"
                    style={{ color: isSelected ? stage.color : '#FFFFFF' }}
                  >
                    {stage.shortName}
                  </h4>
                  <p className="mt-1 text-[11px] text-white/50 line-clamp-2 leading-tight">
                    {stage.tagline}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-white/40">Latency</span>
                  <span className="font-bold text-gold-royal">{stage.latencyMs} ms</span>
                </div>

                <div className="mt-2 flex items-center justify-between text-[9px] font-mono text-white/40">
                  <span>Knight</span>
                  <span className="text-white/70 truncate max-w-[100px]">
                    {stage.primaryKnight.split('/')[0]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Deep Inspector & Telemetry Matrix (Active Stage) ───────────── */}
      <div id="ooda-deep-inspector" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stage Deep Details (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border border-gold/20 bg-smoke-800/90 p-6 backdrop-blur-md shadow-glass-edge">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedStage.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gold-royal uppercase">
                      {selectedStage.code}
                    </span>
                    <span className="text-white/30">•</span>
                    <span className="font-mono text-xs text-white/50">
                      Lead: {selectedStage.primaryKnight}
                    </span>
                  </div>
                  <h3
                    className="font-display text-xl text-white font-bold"
                    style={{ color: selectedStage.color }}
                  >
                    {selectedStage.name}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded border border-gold/30 bg-gold/10 px-2.5 py-1 font-mono text-[11px] text-gold-light">
                  {selectedStage.latencyMs} ms latency
                </span>
              </div>
            </div>

            {/* Description & Overview */}
            <p className="mt-4 text-xs md:text-sm text-white/70 leading-relaxed">
              {selectedStage.details.description}
            </p>

            {/* 4-Tile Live Stage Telemetry Metrics */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {selectedStage.metrics.map((m, i) => (
                <div key={i} className="border border-white/10 bg-black/40 p-3 rounded-sm">
                  <span className="block text-[9px] font-mono text-white/40 uppercase tracking-wider truncate">
                    {m.label}
                  </span>
                  <span className="mt-1 block font-mono text-sm font-bold text-gold-light truncate">
                    {m.value}
                  </span>
                  {m.detail && (
                    <span className="mt-0.5 block text-[9px] text-white/40 truncate">
                      {m.detail}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Invariant & Architecture Specs */}
            <div className="mt-5 space-y-2">
              <span className="block text-[10px] font-mono uppercase tracking-widest text-white/40">
                Phase Invariants & Runtime Constraints
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedStage.details.specs.map((sp, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between border border-white/5 bg-smoke-900/60 px-3 py-2 text-xs font-mono"
                  >
                    <span className="text-white/50">{sp.key}</span>
                    <span className="text-white/90 font-bold">{sp.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mounted Subsystems */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 mr-1">
                Mounted Modules:
              </span>
              {selectedStage.details.subsystems.map((sub, idx) => (
                <span
                  key={idx}
                  className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/70"
                >
                  {sub}
                </span>
              ))}
            </div>

            {/* Sovereign Governance Law */}
            <div className="mt-5 rounded border border-gold/30 bg-gold/5 p-3 font-mono text-[11px] text-gold-light/90 flex items-start gap-2.5">
              <span className="text-sm">⚖️</span>
              <div>
                <span className="font-bold uppercase tracking-wider block text-[10px] text-gold-royal">
                  Sovereign Law Enforced
                </span>
                <span>{selectedStage.details.governanceLaw}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: State Transitions History & Kernel Event Stream (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border border-gold/20 bg-smoke-800/90 p-6 backdrop-blur-md shadow-glass-edge flex flex-col h-full">
            {/* Top View Selector Tabs */}
            <div className="flex items-center justify-between border-b border-gold/10 pb-3 gap-2">
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded border border-white/10 text-xs font-mono">
                <button
                  id="ooda-tab-transitions"
                  type="button"
                  onClick={() => setActiveInspectorTab('TRANSITIONS')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer transition-all font-bold ${
                    activeInspectorTab === 'TRANSITIONS'
                      ? 'bg-gold/25 text-gold-royal border border-gold/40 shadow-sm'
                      : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  <span>📜 Transitions</span>
                  <span className="rounded-full bg-gold/20 px-1.5 py-0.2 text-[9px] text-gold-light">
                    {safeTransitions.length}
                  </span>
                </button>

                <button
                  id="ooda-tab-events"
                  type="button"
                  onClick={() => setActiveInspectorTab('EVENTS')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded cursor-pointer transition-all font-bold ${
                    activeInspectorTab === 'EVENTS'
                      ? 'bg-gold/25 text-gold-royal border border-gold/40 shadow-sm'
                      : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  <span>⚡ Kernel Events</span>
                  <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[9px] text-white/70">
                    {safeEvents.length}
                  </span>
                </button>
              </div>

              {/* Quick Action Button */}
              {activeInspectorTab === 'TRANSITIONS' && (
                <button
                  type="button"
                  onClick={handleCopyTransitions}
                  className="hidden sm:flex items-center gap-1 rounded border border-gold/30 bg-gold/10 px-2 py-1 font-mono text-[10px] font-bold text-gold-light hover:bg-gold/20 transition-all cursor-pointer"
                  title="Copy transition history JSON to clipboard"
                >
                  {copiedTransitions ? '✓ Copied' : '📋 Copy JSON'}
                </button>
              )}
            </div>

            {activeInspectorTab === 'TRANSITIONS' ? (
              /* ── Scrollable State Transition History Panel ───────── */
              <div className="mt-4 flex flex-col flex-1 space-y-3">
                {/* Search & Filter Toolbar */}
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      id="ooda-search-transitions"
                      type="text"
                      value={transitionSearchQuery}
                      onChange={(e) => setTransitionSearchQuery(e.target.value)}
                      placeholder="Search transitions by keyword, stage, or #cycle..."
                      className="w-full rounded border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-white placeholder-white/30 font-mono focus:border-gold/50 focus:outline-none"
                    />
                    {transitionSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setTransitionSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Stage & Status Filter Chips */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-white/30 mr-0.5">Stage:</span>
                      {(['ALL', 'observe', 'orient', 'decide', 'act', 'verify'] as const).map(
                        (st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setTransitionStageFilter(st)}
                            className={`px-1.5 py-0.5 rounded uppercase font-bold transition-all cursor-pointer ${
                              transitionStageFilter === st
                                ? 'bg-gold/20 text-gold-royal border border-gold/30'
                                : 'text-white/40 hover:text-white/80 bg-white/5'
                            }`}
                          >
                            {st === 'ALL' ? 'ALL' : st.slice(0, 3)}
                          </button>
                        ),
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-white/30 mr-0.5">Status:</span>
                      {['ALL', 'SUCCESS', 'SAT', 'BLOCKED'].map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setTransitionStatusFilter(status)}
                          className={`px-1.5 py-0.5 rounded uppercase font-bold transition-all cursor-pointer ${
                            transitionStatusFilter === status
                              ? 'bg-gold/20 text-gold-royal border border-gold/30'
                              : 'text-white/40 hover:text-white/80 bg-white/5'
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Transition History Scrollable Log */}
                <div
                  id="ooda-transitions-scroll"
                  className="flex-1 space-y-2.5 overflow-y-auto max-h-[380px] pr-1.5"
                >
                  {filteredTransitions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center rounded border border-white/5 bg-black/30 space-y-2">
                      <span className="text-2xl">🔍</span>
                      <p className="text-xs text-white/50 font-mono">
                        No matching transitions found
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setTransitionSearchQuery('');
                          setTransitionStageFilter('ALL');
                          setTransitionStatusFilter('ALL');
                        }}
                        className="text-[10px] text-gold-light hover:underline font-mono cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </div>
                  ) : (
                    filteredTransitions.map((trans) => {
                      const fromStageInfo =
                        STAGES.find((s) => s.id === trans.fromStage) || STAGES[0];
                      const toStageInfo = STAGES.find((s) => s.id === trans.toStage) || STAGES[0];

                      return (
                        <div
                          key={trans.id}
                          className="border border-white/10 bg-black/50 p-3 rounded space-y-2 transition-all hover:border-gold/30 hover:bg-black/70 group"
                        >
                          {/* Top Row: Flow Direction, Status, Timestamp */}
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <div className="flex items-center gap-1.5">
                              {/* Source Stage Pill */}
                              <span
                                className="px-1.5 py-0.5 rounded font-bold uppercase text-[9px] flex items-center gap-1"
                                style={{
                                  backgroundColor: `${fromStageInfo.color}18`,
                                  color: fromStageInfo.color,
                                  border: `1px solid ${fromStageInfo.color}44`,
                                }}
                              >
                                <span>{fromStageInfo.icon}</span>
                                <span>{fromStageInfo.shortName}</span>
                              </span>

                              {/* Traveling Flow Arrow */}
                              <span className="text-gold-light font-bold text-xs animate-glow-pass">
                                ➔
                              </span>

                              {/* Target Stage Pill */}
                              <span
                                className="px-1.5 py-0.5 rounded font-bold uppercase text-[9px] flex items-center gap-1"
                                style={{
                                  backgroundColor: `${toStageInfo.color}18`,
                                  color: toStageInfo.color,
                                  border: `1px solid ${toStageInfo.color}44`,
                                }}
                              >
                                <span>{toStageInfo.icon}</span>
                                <span>{toStageInfo.shortName}</span>
                              </span>
                            </div>

                            {/* Status and Latency */}
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold text-[9px] uppercase ${
                                  trans.status === 'SAT'
                                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                                    : trans.status === 'BLOCKED'
                                      ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                                      : trans.status === 'WARNING'
                                        ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                                        : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                                }`}
                              >
                                {trans.status}
                              </span>
                              <span className="text-gold-light font-bold text-[10px]">
                                +{trans.latencyMs}ms
                              </span>
                            </div>
                          </div>

                          {/* Reason and Context Narrative */}
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs text-white/90 font-sans leading-snug">
                              {trans.reason}
                            </p>
                          </div>

                          {/* Details / Spec Payload snippet */}
                          {trans.details && (
                            <div className="font-mono text-[9px] text-white/50 bg-white/5 px-2.5 py-1 rounded truncate border border-white/5">
                              {trans.details}
                            </div>
                          )}

                          {/* Metadata Bottom Strip */}
                          <div className="flex items-center justify-between text-[9px] font-mono text-white/40 pt-1.5 border-t border-white/5">
                            <div className="flex items-center gap-2">
                              <span className="text-gold-royal font-bold">
                                Cycle #{trans.cycleNumber}
                              </span>
                              {trans.mutationLines !== undefined && (
                                <span className="text-white/60">
                                  AST Delta: +{trans.mutationLines} lines
                                </span>
                              )}
                            </div>
                            <span>{trans.timestamp}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Controls for Transitions */}
                <div className="mt-2 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/40">
                  <span>
                    Showing {filteredTransitions.length} of {transitions.length} transitions
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCopyTransitions}
                      className="hover:text-gold-light underline cursor-pointer"
                    >
                      {copiedTransitions ? '✓ JSON Copied!' : 'Copy Log'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransitions(INITIAL_TRANSITIONS)}
                      className="hover:text-rose-300 underline cursor-pointer"
                    >
                      Reset History
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── Kernel Event Stream View ───────────────────────── */
              <div className="mt-4 flex flex-col flex-1 space-y-3">
                {/* Event Stream Filter Tabs */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[10px] font-mono">
                  <span className="text-white/40">Filter Event Types:</span>
                  <div className="flex items-center gap-1">
                    {['ALL', 'SAT', 'FIREWALL', 'INFO'].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFilterType(f)}
                        className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                          filterType === f
                            ? 'bg-gold/20 text-gold-royal font-bold'
                            : 'text-white/40 hover:text-white/80'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Event List */}
                <div
                  id="ooda-events-scroll"
                  className="flex-1 space-y-2.5 overflow-y-auto max-h-[380px] pr-1.5"
                >
                  {filteredEvents.map((evt) => {
                    const stageColor =
                      evt.stage === 'observe'
                        ? '#00F0FF'
                        : evt.stage === 'orient'
                          ? '#9D4EDD'
                          : evt.stage === 'decide'
                            ? '#FFD700'
                            : evt.stage === 'act'
                              ? '#38BDF8'
                              : '#10B981';

                    return (
                      <div
                        key={evt.id}
                        className="border border-white/10 bg-black/40 p-3 rounded space-y-1.5 transition-all hover:border-white/20"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-1.5 py-0.2 rounded font-bold uppercase"
                              style={{
                                backgroundColor: `${stageColor}22`,
                                color: stageColor,
                                border: `1px solid ${stageColor}44`,
                              }}
                            >
                              {evt.stage}
                            </span>
                            <span
                              className={`font-bold ${
                                evt.type === 'SAT'
                                  ? 'text-emerald-400'
                                  : evt.type === 'FIREWALL'
                                    ? 'text-rose-400'
                                    : evt.type === 'AUDIT'
                                      ? 'text-purple-400'
                                      : 'text-cyan-300'
                              }`}
                            >
                              [{evt.type}]
                            </span>
                          </div>
                          <span className="text-white/30">{evt.timestamp}</span>
                        </div>

                        <p className="text-xs text-white/85 leading-snug font-sans">
                          {evt.message}
                        </p>

                        {evt.dataSnippet && (
                          <div className="mt-1 font-mono text-[9px] text-white/40 bg-white/5 px-2 py-1 rounded truncate">
                            {evt.dataSnippet}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Event Footer Controls */}
                <div className="mt-2 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/40">
                  <span>{filteredEvents.length} events logged</span>
                  <button
                    type="button"
                    onClick={() => setEvents(INITIAL_EVENTS)}
                    className="hover:text-gold-light underline cursor-pointer"
                  >
                    Reset Log Stream
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Re-export as alias for compatibility
export { OODADiagnosticVisualizer as OodaMgvVisualizer };
export default OODADiagnosticVisualizer;
