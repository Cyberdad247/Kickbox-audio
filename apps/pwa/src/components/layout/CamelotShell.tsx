'use client';

import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useBifrost } from '../../context/BifrostContext';
import { useTenant } from '../../context/TenantContext';
import { useCamelotStore } from '../../stores/camelotStore';
import { ExcaliburNav } from './ExcaliburNav';

// --- Type Definitions for Arthurian Cyber Zone 0 ---
export type GovernorMode = 'normal' | 'constrained' | 'preservation';

export interface GideonReceipt {
  id: string;
  timestamp: string;
  action: string;
  status: 'verified' | 'pending' | 'failed';
  capabilityLease: string;
  excaliburSignature: string;
  hash: string;
  payload: Record<string, unknown>;
  latencyMs: number;
}

export interface WorldTreeNode {
  id: string;
  label: string;
  type: 'root' | 'agent' | 'cartridge' | 'vault' | 'sensor';
  status: 'active' | 'synced' | 'alert';
  metric: string;
  children?: string[];
}

export interface CamelotShellProps {
  children?: React.ReactNode;
  activeView?: 'roundtable' | 'worldtree' | 'avatars' | 'config' | 'vault';
  onViewChange?: (view: string) => void;
}

// --- Initial Preset Receipts ---
const INITIAL_RECEIPTS: GideonReceipt[] = [
  {
    id: 'rcpt-019a-excalibur',
    timestamp: '19:12:04.102',
    action: 'CAP_HSM_CHACHA20_LEASE',
    status: 'verified',
    capabilityLease: 'urn:camelot:lease:tenant:hsm:write',
    excaliburSignature: '0x8f2a...c4b9_sig_excalibur_v1.7',
    hash: '0x99fbc18402ac...e771',
    latencyMs: 14,
    payload: {
      tenant: 'Vizion711',
      zone: 'Zone_0_Observer',
      enclave: 'Lakisha_Voice_OS',
      entropy: 'Hardware_RNG_Validated',
    },
  },
  {
    id: 'rcpt-019b-bifrost',
    timestamp: '19:12:18.441',
    action: 'BIFROST_WEBRTC_FRAME_AUDIO',
    status: 'verified',
    capabilityLease: 'urn:camelot:lease:audio:viseme:stream',
    excaliburSignature: '0x4c1e...99da_sig_bifrost_v4',
    hash: '0x32eef01198aa...b109',
    latencyMs: 18,
    payload: {
      clock: 104289,
      channels: 2,
      codec: 'opus/48000',
      vadState: 'active_speech',
    },
  },
  {
    id: 'rcpt-019c-gideon',
    timestamp: '19:13:01.890',
    action: 'GIDEON_CONSENT_ATTESTATION',
    status: 'pending',
    capabilityLease: 'urn:camelot:lease:governance:bind',
    excaliburSignature: '0x0000...pending_gideon_attestation',
    hash: '0x77fa88be...2110',
    latencyMs: 32,
    payload: {
      action: 'BIND_CONSENT_POLICY',
      target: 'WorldTree_Root_Partition',
      quorum: '3_of_5_Knights',
    },
  },
];

// --- Preset World Tree Nodes ---
const WORLD_TREE_NODES: WorldTreeNode[] = [
  {
    id: 'node-root',
    label: 'EXCALIBUR LATTICE ROOT',
    type: 'root',
    status: 'synced',
    metric: '60 FPS / 100% HEALTH',
  },
  {
    id: 'node-knight-cyber',
    label: 'Sir Codex (Cyber)',
    type: 'agent',
    status: 'active',
    metric: '14ms Telemetry',
  },
  {
    id: 'node-knight-arcane',
    label: 'Merlin Ω (Orchestrator)',
    type: 'agent',
    status: 'synced',
    metric: 'Loop v4.0',
  },
  {
    id: 'node-knight-sentinel',
    label: 'Sir Sentinel (Gatekeeper)',
    type: 'agent',
    status: 'synced',
    metric: 'mTLS Strict',
  },
  {
    id: 'node-cart-kba',
    label: 'Lakisha Voice Cartridge',
    type: 'cartridge',
    status: 'active',
    metric: 'VAD Active',
  },
  {
    id: 'node-cart-vault',
    label: 'Biometric Secret Vault',
    type: 'vault',
    status: 'synced',
    metric: 'ChaCha20 Sealed',
  },
];

export function CamelotShell({
  children,
  activeView = 'roundtable',
  onViewChange,
}: CamelotShellProps) {
  // Navigation & Shell State
  const [currentNav, setCurrentNav] = useState<string>(activeView);
  const [navExpanded, setNavExpanded] = useState<boolean>(false);
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [audioClock, setAudioClock] = useState<number>(0);

  // Resource Governor State
  const [ramUsage, setRamUsage] = useState<number>(48);
  const [cpuUsage, setCpuUsage] = useState<number>(24);
  const [latency, setLatency] = useState<number>(16);
  const [governorMode, setGovernorMode] = useState<GovernorMode>('normal');

  // Receipts & Gideon Stream
  const [receipts, setReceipts] = useState<GideonReceipt[]>(INITIAL_RECEIPTS);
  const [selectedReceipt, setSelectedReceipt] = useState<GideonReceipt | null>(null);
  const [receiptFilter, setReceiptFilter] = useState<'all' | 'verified' | 'pending' | 'failed'>(
    'all',
  );

  // WorldTree Canvas Interactive State
  const [selectedNode, setSelectedNode] = useState<string>('node-root');
  const [treeZoom, setTreeZoom] = useState<number>(1);

  // Avatar & Intent Bar State
  const [intentInput, setIntentInput] = useState<string>('');
  const [isPushToTalk, setIsPushToTalk] = useState<boolean>(false);
  const [avatarState, setAvatarState] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>(
    'idle',
  );
  const [transcriptStream, setTranscriptStream] = useState<string>(
    'Sovereign Enclave standing by. Voice OS and Gideon verification active.',
  );

  // Tenant & Bifrost Contexts
  const { activeTenant, activeCartridge, mountCartridge } = useTenant();
  const { isConnected, isAudioActive, latencyMs } = useBifrost();

  // Handle Tab Switch
  const handleNavSelect = (viewId: string) => {
    setCurrentNav(viewId);
    onViewChange?.(viewId);
  };

  // Live Audio Clock & Simulated Resource Governor Loop
  useEffect(() => {
    const clockInterval = setInterval(() => {
      setAudioClock((prev) => (prev + 1) % 1000000);
    }, 100);

    const perfInterval = setInterval(() => {
      // Dynamic baseline jitter around 45-55%
      setRamUsage((prev) => {
        const delta = (Math.random() - 0.48) * 1.5;
        const next = Math.min(96, Math.max(30, prev + delta));
        if (next >= 92) setGovernorMode('preservation');
        else if (next >= 85) setGovernorMode('constrained');
        else setGovernorMode('normal');
        return Math.round(next * 10) / 10;
      });

      setCpuUsage((prev) => {
        const delta = (Math.random() - 0.5) * 3;
        return Math.round(Math.min(99, Math.max(10, prev + delta)));
      });

      setLatency(latencyMs || Math.round(14 + Math.random() * 6));
    }, 2000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(perfInterval);
    };
  }, [latencyMs]);

  // Determine Intent Rune Icon based on text input prefix
  const intentRune = useMemo(() => {
    const trimmed = intentInput.trim().toLowerCase();
    if (!trimmed) return '🛡️';
    if (trimmed.startsWith('sync') || trimmed.startsWith('update')) return '🛡️';
    if (trimmed.startsWith('query') || trimmed.startsWith('find') || trimmed.startsWith('search'))
      return '🗡️';
    if (
      trimmed.startsWith('approve') ||
      trimmed.startsWith('bind') ||
      trimmed.startsWith('consent')
    )
      return '📜';
    if (trimmed.startsWith('build') || trimmed.startsWith('deploy') || trimmed.startsWith('run'))
      return '⚙️';
    return '✨';
  }, [intentInput]);

  // Filtered Receipts
  const filteredReceipts = useMemo(() => {
    if (receiptFilter === 'all') return receipts;
    return receipts.filter((r) => r.status === receiptFilter);
  }, [receipts, receiptFilter]);

  // Handle Intent Submission
  const handleIntentSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!intentInput.trim()) return;

    const query = intentInput.trim();
    setIntentInput('');
    setAvatarState('thinking');
    setTranscriptStream(
      `Evaluating proposal: "${query}" through Sentinel & Gideon verification...`,
    );

    // Create a new Gideon pending receipt
    const newReceipt: GideonReceipt = {
      id: `rcpt-${Date.now().toString(36)}`,
      timestamp: new Date().toLocaleTimeString(),
      action: `INTENT_PROPOSAL_${intentRune === '🗡️' ? 'QUERY' : intentRune === '📜' ? 'CONSENT' : 'SYNC'}`,
      status: 'pending',
      capabilityLease: 'urn:camelot:lease:intent:proposal',
      excaliburSignature:
        '0x' +
        Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      hash:
        '0x' +
        Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      latencyMs: Math.round(15 + Math.random() * 15),
      payload: {
        rawIntent: query,
        rune: intentRune,
        tenant: activeTenant.handle,
        audioClockTick: audioClock,
      },
    };

    setReceipts((prev) => [newReceipt, ...prev]);

    setTimeout(() => {
      setAvatarState('speaking');
      setTranscriptStream(`Proposal verified: "${query}" bound to capability lease.`);
      setReceipts((prev) =>
        prev.map((r) => (r.id === newReceipt.id ? { ...r, status: 'verified' as const } : r)),
      );
      setTimeout(() => setAvatarState('idle'), 3000);
    }, 1200);
  };

  return (
    <div
      className={`relative flex h-screen w-full flex-col overflow-hidden select-none font-sans ${
        highContrast ? 'bg-black text-white' : 'bg-[#0A0A0A] text-[#00F0FF]/90'
      }`}
      style={{
        backgroundColor: '#0A0A0A',
        color: highContrast ? '#FFFFFF' : '#E0F7FF',
      }}
    >
      {/* ========================================================================= */}
      {/* 1. TOP BAR: RESOURCE GOVERNOR BAR & ARTHURIC STATUS                       */}
      {/* ========================================================================= */}
      <header
        className="z-30 flex h-11 w-full shrink-0 items-center justify-between border-b px-4 backdrop-blur-[20px] transition-all"
        style={{
          borderColor: highContrast ? '#FFFFFF' : 'rgba(0, 240, 255, 0.2)',
          background: highContrast ? '#000000' : 'rgba(10, 10, 10, 0.85)',
          boxShadow: highContrast ? 'none' : '0 4px 20px rgba(0, 240, 255, 0.05)',
        }}
      >
        {/* Left: Brand / System Identity */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="text-base font-bold text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">
              ⚜️
            </span>
            <span className="font-mono text-xs font-semibold tracking-[0.2em] text-[#FFD700]">
              CAMELOT-OS
            </span>
            <span className="rounded border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[#00F0FF]">
              v1.7.1
            </span>
          </div>

          <div className="hidden h-4 w-px bg-white/10 md:block" />

          {/* Governance Mode Badge */}
          <div className="hidden items-center space-x-1.5 md:flex">
            <span
              className={`h-2 w-2 rounded-full animate-pulse ${
                governorMode === 'preservation'
                  ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                  : governorMode === 'constrained'
                    ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                    : 'bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]'
              }`}
            />
            <span className="font-mono text-[10px] uppercase tracking-widest text-white/70">
              {governorMode === 'preservation'
                ? 'CRITICAL PRESERVATION MODE'
                : governorMode === 'constrained'
                  ? 'CONSTRAINED RESOURCE TIER'
                  : 'SOVEREIGN NORMAL'}
            </span>
          </div>
        </div>

        {/* Center: Audio Clock / Heartbeat */}
        <div className="hidden items-center space-x-3 lg:flex">
          <div className="flex items-center space-x-1 font-mono text-[10px] text-white/50">
            <span>AUDIO_CLOCK:</span>
            <span className="font-bold text-[#00F0FF]">
              {audioClock.toString().padStart(6, '0')}
            </span>
          </div>
          <div className="flex items-center space-x-1 font-mono text-[10px] text-white/50">
            <span>LATENCY:</span>
            <span className="font-bold text-emerald-400">{latency}ms</span>
          </div>
          <div className="flex items-center space-x-1 font-mono text-[10px] text-white/50">
            <span>GIDEON_ATTESTATION:</span>
            <span className="font-bold text-[#FFD700]">99.98%</span>
          </div>
        </div>

        {/* Right: Live Resource Governor Gauge & Mode Toggles */}
        <div className="flex items-center space-x-3">
          {/* RAM Meter */}
          <div
            className="flex items-center space-x-2 rounded border px-2 py-0.5"
            style={{
              borderColor:
                ramUsage >= 92
                  ? 'rgba(239, 68, 68, 0.8)'
                  : ramUsage >= 85
                    ? 'rgba(245, 158, 11, 0.8)'
                    : 'rgba(0, 240, 255, 0.25)',
              background:
                ramUsage >= 92
                  ? 'rgba(239, 68, 68, 0.15)'
                  : ramUsage >= 85
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(0, 240, 255, 0.05)',
            }}
            title={`RAM Consumption: ${ramUsage}%. Constrained threshold: 85%, Preservation threshold: 92%`}
          >
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/60">RAM</span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full transition-all duration-500 ${
                  ramUsage >= 92 ? 'bg-red-500' : ramUsage >= 85 ? 'bg-amber-400' : 'bg-[#00F0FF]'
                }`}
                style={{ width: `${ramUsage}%` }}
              />
            </div>
            <span
              className={`font-mono text-[10px] font-bold ${
                ramUsage >= 92
                  ? 'text-red-400'
                  : ramUsage >= 85
                    ? 'text-amber-300'
                    : 'text-[#00F0FF]'
              }`}
            >
              {ramUsage}%
            </span>
          </div>

          {/* CPU Meter */}
          <div
            className="hidden items-center space-x-2 rounded border border-white/10 bg-white/5 px-2 py-0.5 sm:flex"
            title={`CPU Load: ${cpuUsage}%`}
          >
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/60">CPU</span>
            <span className="font-mono text-[10px] font-bold text-white/80">{cpuUsage}%</span>
          </div>

          {/* High-Contrast AAA Toggle */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            className={`flex items-center rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider transition-all ${
              highContrast
                ? 'border-yellow-400 bg-yellow-400 text-black font-bold'
                : 'border-white/20 bg-white/5 text-white/60 hover:border-white/40 hover:text-white'
            }`}
            title="Toggle WCAG 2.1 AAA High Contrast Mode"
          >
            AAA {highContrast ? 'ON' : 'OFF'}
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* PRESERVATION MODE CRITICAL ALERT BANNER (If RAM >= 92%)                   */}
      {/* ========================================================================= */}
      {governorMode === 'preservation' && (
        <div className="z-20 flex w-full shrink-0 items-center justify-between border-b border-red-500/40 bg-red-950/90 px-4 py-1.5 text-xs text-red-200 backdrop-blur-md">
          <div className="flex items-center space-x-2 font-mono text-[11px]">
            <span className="text-red-400 animate-pulse">⚠️</span>
            <span className="font-bold uppercase tracking-wider">
              Preservation Governor Active:
            </span>
            <span>WebGL & particle meshes frozen. Ledger & Consent authority preserved.</span>
          </div>
          <button
            onClick={() => setRamUsage(65)}
            className="rounded bg-red-800 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-red-700"
          >
            Purge Ephemeral Cache
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN 3-COLUMN "ROUND TABLE" WORKSPACE (ZONE 0 LAYOUT)                  */}
      {/* ========================================================================= */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* ----------------------------------------------------------------------- */}
        {/* COLUMN 1: LEFT EXCALIBUR NAV RAIL (~80px or 220px expanded)             */}
        {/* ----------------------------------------------------------------------- */}
        <ExcaliburNav
          activeView={currentNav}
          onViewChange={handleNavSelect}
          highContrast={highContrast}
        />

        {/* ----------------------------------------------------------------------- */}
        {/* COLUMN 2: CENTER CANVAS & INTERACTIVE WORLD TREE VIEW                   */}
        {/* ----------------------------------------------------------------------- */}
        <main className="relative flex flex-1 flex-col overflow-hidden bg-transparent">
          {/* Top Bar for Center Canvas (Breadcrumb / Filter) */}
          <div
            className="z-10 flex h-10 w-full shrink-0 items-center justify-between border-b px-4 backdrop-blur-md"
            style={{
              borderColor: 'rgba(0, 240, 255, 0.1)',
              background: 'rgba(10, 10, 10, 0.4)',
            }}
          >
            <div className="flex items-center space-x-2 font-mono text-xs">
              <span className="text-[#FFD700]">LATTICE:</span>
              <span className="text-white/80">/SOVEREIGN/ZONE_0/</span>
              <span className="font-bold text-[#00F0FF] uppercase">{currentNav}</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="font-mono text-[10px] text-white/40">
                ZOOM: {Math.round(treeZoom * 100)}%
              </span>
              <button
                onClick={() => setTreeZoom((z) => Math.max(0.6, z - 0.1))}
                className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/70 hover:bg-white/10"
              >
                -
              </button>
              <button
                onClick={() => setTreeZoom((z) => Math.min(1.5, z + 0.1))}
                className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/70 hover:bg-white/10"
              >
                +
              </button>
            </div>
          </div>

          {/* Center Stage: Children or Default WorldTree View */}
          <div className="relative flex flex-1 items-center justify-center overflow-auto p-6">
            {children ? (
              <div className="h-full w-full">{children}</div>
            ) : (
              /* Default Interactive 3D/2D World Tree Canvas */
              <div
                className="relative flex flex-col items-center justify-center transition-transform duration-300"
                style={{ transform: `scale(${treeZoom})` }}
              >
                {/* World Tree Root Node */}
                <div
                  onClick={() => setSelectedNode('node-root')}
                  className={`group relative flex cursor-pointer flex-col items-center rounded-2xl border p-4 transition-all duration-300 ${
                    selectedNode === 'node-root'
                      ? 'border-[#FFD700] bg-[#FFD700]/10 shadow-[0_0_30px_rgba(255,215,0,0.3)]'
                      : 'border-[#FFD700]/30 bg-black/60 hover:border-[#FFD700]'
                  }`}
                  style={{
                    backdropFilter: 'blur(20px)',
                  }}
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#FFD700] bg-[#0A0A0A] text-2xl shadow-[0_0_15px_rgba(255,215,0,0.4)]">
                    ⚔️
                  </div>
                  <div className="mt-2 font-mono text-xs font-bold tracking-widest text-[#FFD700]">
                    EXCALIBUR WORLD TREE ROOT
                  </div>
                  <div className="text-[10px] text-white/50">
                    Topological State Graph & Node Cluster
                  </div>
                </div>

                {/* Connecting Pulse Lines */}
                <div className="my-3 h-8 w-px bg-gradient-to-b from-[#FFD700] via-[#00F0FF] to-transparent" />

                {/* Secondary Cluster Nodes */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {WORLD_TREE_NODES.filter((n) => n.id !== 'node-root').map((node) => {
                    const isSelected = selectedNode === node.id;
                    const isAlert = node.status === 'alert';
                    const isCyan = node.type === 'agent' || node.type === 'cartridge';

                    return (
                      <div
                        key={node.id}
                        onClick={() => setSelectedNode(node.id)}
                        className={`group relative flex cursor-pointer flex-col rounded-xl border p-3 transition-all duration-200 ${
                          isSelected
                            ? isCyan
                              ? 'border-[#00F0FF] bg-[#00F0FF]/15 shadow-[0_0_20px_rgba(0,240,255,0.25)]'
                              : 'border-[#FF00FF] bg-[#FF00FF]/15 shadow-[0_0_20px_rgba(255,0,255,0.25)]'
                            : 'border-white/10 bg-black/40 hover:border-white/30'
                        }`}
                        style={{
                          backdropFilter: 'blur(16px)',
                          boxShadow: '0 8px 32px rgba(0, 240, 255, 0.06)',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm">
                            {node.type === 'agent' ? '🛡️' : node.type === 'vault' ? '🔒' : '📼'}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider ${
                              isAlert
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-[#00F0FF]/10 text-[#00F0FF]'
                            }`}
                          >
                            {node.status}
                          </span>
                        </div>
                        <div className="mt-1 font-mono text-xs font-semibold text-white/90">
                          {node.label}
                        </div>
                        <div className="mt-0.5 font-mono text-[9px] text-[#00F0FF]/70">
                          {node.metric}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* --------------------------------------------------------------------- */}
          {/* INTEGRATED BOTTOM 2D AVATAR CAPSULE & INTENT BAR (~160px height)     */}
          {/* --------------------------------------------------------------------- */}
          <section
            className="z-20 flex shrink-0 flex-col border-t backdrop-blur-[20px] transition-all"
            style={{
              borderColor: highContrast ? '#FFFFFF' : 'rgba(0, 240, 255, 0.2)',
              background: highContrast ? '#000000' : 'rgba(10, 10, 10, 0.85)',
              boxShadow: highContrast ? 'none' : '0 -8px 32px rgba(0, 240, 255, 0.08)',
            }}
          >
            {/* Top Bar of Capsule: Viseme state & Transcript */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <div className="flex items-center space-x-3 overflow-hidden">
                {/* 2D Hologram Avatar Sprite Frame Indicator */}
                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/10 text-base shadow-[0_0_12px_rgba(0,240,255,0.3)]">
                  <span>
                    {avatarState === 'speaking' ? '🗣️' : avatarState === 'thinking' ? '🌀' : '🛡️'}
                  </span>
                  {avatarState === 'speaking' && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#00F0FF] animate-ping" />
                  )}
                </div>

                {/* Transcript Stream Display */}
                <div className="overflow-hidden">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#FFD700]">
                      LAKISHA VOICE HUD:
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-[#00F0FF]">
                      [{avatarState.toUpperCase()}]
                    </span>
                  </div>
                  <p className="truncate font-mono text-xs text-white/90">{transcriptStream}</p>
                </div>
              </div>

              {/* Quick Action Chips */}
              <div className="hidden items-center space-x-2 lg:flex">
                <button
                  onClick={() => setIntentInput('sync lattice')}
                  className="rounded-lg border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#00F0FF] hover:bg-[#00F0FF]/20"
                >
                  🛡️ Sync Lattice
                </button>
                <button
                  onClick={() => setIntentInput('query gideon receipts')}
                  className="rounded-lg border border-[#FF00FF]/30 bg-[#FF00FF]/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#FF00FF] hover:bg-[#FF00FF]/20"
                >
                  🗡️ Query Receipts
                </button>
                <button
                  onClick={() => setIntentInput('bind sovereign consent')}
                  className="rounded-lg border border-[#FFD700]/30 bg-[#FFD700]/10 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-[#FFD700] hover:bg-[#FFD700]/20"
                >
                  📜 Bind Consent
                </button>
              </div>
            </div>

            {/* Bottom Intent Input Bar (<AnyaIntentBar /> Pattern) */}
            <form onSubmit={handleIntentSubmit} className="flex items-center space-x-2 p-3">
              {/* Push-to-Talk Toggle Button */}
              <button
                type="button"
                onClick={() => setIsPushToTalk(!isPushToTalk)}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
                  isPushToTalk
                    ? 'border-red-500 bg-red-500/20 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse'
                    : 'border-[#00F0FF]/40 bg-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/20'
                }`}
                title={
                  isPushToTalk
                    ? 'Push-To-Talk Active (Live Stream)'
                    : 'Click to activate Push-To-Talk'
                }
              >
                <span>{isPushToTalk ? '🎙️' : '🎤'}</span>
              </button>

              {/* Proposal Intent Input Field */}
              <div className="relative flex flex-1 items-center">
                <span className="absolute left-3 text-sm">{intentRune}</span>
                <input
                  type="text"
                  value={intentInput}
                  onChange={(e) => setIntentInput(e.target.value)}
                  placeholder="Enter typed intent (e.g. 'sync ledger', 'query knights', 'bind consent')..."
                  className="w-full rounded-xl border border-white/15 bg-black/60 py-2 pl-9 pr-24 font-mono text-xs text-white placeholder-white/40 transition-all focus:border-[#00F0FF] focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
                />
                <span className="absolute right-3 font-mono text-[9px] text-white/30">
                  {intentRune === '🛡️'
                    ? 'SYNC'
                    : intentRune === '🗡️'
                      ? 'QUERY'
                      : intentRune === '📜'
                        ? 'CONSENT'
                        : 'INTENT'}
                </span>
              </div>

              {/* Submit Intent Proposal Button */}
              <button
                type="submit"
                disabled={!intentInput.trim()}
                className="flex h-10 items-center rounded-xl border border-[#FFD700]/50 bg-[#FFD700]/20 px-4 font-mono text-xs font-bold uppercase tracking-wider text-[#FFD700] transition-all hover:bg-[#FFD700]/30 disabled:opacity-30"
              >
                Propose
              </button>
            </form>
          </section>
        </main>

        {/* ----------------------------------------------------------------------- */}
        {/* COLUMN 3: RIGHT RECEIPT & GIDEON STREAM FEED (320px wide)               */}
        {/* ----------------------------------------------------------------------- */}
        <aside
          className="z-20 flex w-80 shrink-0 flex-col border-l backdrop-blur-[20px] transition-all"
          style={{
            borderColor: highContrast ? '#FFFFFF' : 'rgba(0, 240, 255, 0.15)',
            background: highContrast ? '#050505' : 'rgba(10, 10, 10, 0.8)',
            boxShadow: highContrast ? 'none' : '-4px 0 24px rgba(0, 240, 255, 0.04)',
          }}
        >
          {/* Header of Gideon Feed */}
          <div className="flex h-11 items-center justify-between border-b border-white/10 px-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-emerald-400">📜</span>
              <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-white/90">
                GIDEON LEDGER FEED
              </h2>
            </div>
            <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-white/50">
              {receipts.length} RECEIPTS
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center justify-between border-b border-white/5 bg-black/40 px-3 py-1.5">
            {(['all', 'verified', 'pending', 'failed'] as const).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setReceiptFilter(filterKey)}
                className={`rounded px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider transition-all ${
                  receiptFilter === filterKey
                    ? 'border border-[#00F0FF]/60 bg-[#00F0FF]/20 font-bold text-[#00F0FF]'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {filterKey}
              </button>
            ))}
          </div>

          {/* Scrollable Receipt Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredReceipts.map((receipt) => {
              const isVerified = receipt.status === 'verified';
              const isPending = receipt.status === 'pending';

              return (
                <div
                  key={receipt.id}
                  onClick={() => setSelectedReceipt(receipt)}
                  className={`group relative cursor-pointer rounded-xl border p-3 transition-all duration-200 ${
                    isVerified
                      ? 'border-emerald-500/30 bg-emerald-950/20 hover:border-emerald-500/60'
                      : isPending
                        ? 'border-amber-500/40 bg-amber-950/20 hover:border-amber-500/80 animate-pulse'
                        : 'border-red-500/40 bg-red-950/20 hover:border-red-500/80'
                  }`}
                  style={{
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-mono text-[10px] font-bold ${
                        isVerified
                          ? 'text-emerald-400'
                          : isPending
                            ? 'text-amber-400'
                            : 'text-red-400'
                      }`}
                    >
                      {receipt.action}
                    </span>
                    <span className="font-mono text-[8px] text-white/40">{receipt.timestamp}</span>
                  </div>

                  <div className="mt-1 truncate font-mono text-[9px] text-white/60">
                    ID: <span className="text-[#00F0FF]">{receipt.id}</span>
                  </div>

                  <div className="mt-0.5 truncate font-mono text-[8px] text-white/40">
                    Sig: {receipt.excaliburSignature.slice(0, 16)}...
                  </div>

                  <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-1.5">
                    <span className="font-mono text-[8px] text-white/40">
                      {receipt.latencyMs}ms verification
                    </span>
                    <span
                      className={`font-mono text-[8px] uppercase tracking-wider font-semibold ${
                        isVerified
                          ? 'text-emerald-400'
                          : isPending
                            ? 'text-amber-400'
                            : 'text-red-400'
                      }`}
                    >
                      {isVerified ? '✓ Verified' : isPending ? '⏳ Checking Hash' : '✕ Proof Fail'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Gideon Summary Footer */}
          <div className="border-t border-white/10 bg-black/60 p-3">
            <div className="flex items-center justify-between font-mono text-[9px] text-white/60">
              <span>CIPHER INTEGRITY:</span>
              <span className="font-bold text-emerald-400">CHACHA20_POLY1305</span>
            </div>
            <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-white/60">
              <span>ZERO-TRUST AUTHORITY:</span>
              <span className="font-bold text-[#FFD700]">ZONE 0 ACTIVE</span>
            </div>
          </div>
        </aside>
      </div>

      {/* ========================================================================= */}
      {/* 3. RECEIPT INSPECTION DRAWER / MODAL (Cryptographic Audit)                */}
      {/* ========================================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border p-5 shadow-2xl"
            style={{
              borderColor: 'rgba(0, 240, 255, 0.3)',
              background: '#0D0D11',
              boxShadow: '0 12px 48px rgba(0, 240, 255, 0.15)',
            }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg text-[#FFD700]">📜</span>
                <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
                  Gideon Receipt Attestation
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="rounded-lg p-1 text-white/60 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
              <div>
                <span className="font-mono text-[10px] uppercase text-white/40">Receipt ID</span>
                <div className="font-mono text-xs font-bold text-[#00F0FF]">
                  {selectedReceipt.id}
                </div>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase text-white/40">
                  Capability Lease
                </span>
                <div className="font-mono text-xs text-white/80">
                  {selectedReceipt.capabilityLease}
                </div>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase text-white/40">
                  Excalibur Signature
                </span>
                <div className="break-all rounded bg-black/60 p-2 font-mono text-[10px] text-[#FFD700]">
                  {selectedReceipt.excaliburSignature}
                </div>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase text-white/40">
                  Gideon Merkle Hash
                </span>
                <div className="break-all rounded bg-black/60 p-2 font-mono text-[10px] text-emerald-400">
                  {selectedReceipt.hash}
                </div>
              </div>

              <div>
                <span className="font-mono text-[10px] uppercase text-white/40">
                  Payload Metadata
                </span>
                <pre className="rounded bg-black/80 p-2 font-mono text-[10px] text-white/80 overflow-x-auto">
                  {JSON.stringify(selectedReceipt.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end space-x-2 border-t border-white/10 pt-3">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/20"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CamelotShell;
