'use client';

import React, { useState } from 'react';
import { useBifrost } from '../../context/BifrostContext';
import { useMacros } from '../../context/MacroContext';
import { useTenant } from '../../context/TenantContext';
import { useHardwareCompatibility } from '../../hooks/useHardwareCompatibility';
import { useLakishaVoice } from '../../hooks/useLakishaVoice';
import { CommandPalette } from '../navigation/CommandPalette';
import { CamelotHelperChat } from './CamelotHelperChat';
import { LivingWorkspaceView } from './LivingWorkspaceView';
import { HardwareAndEmbeddingModal } from '../gateway/HardwareAndEmbeddingModal';

export function MobileEdgeArchitectureView() {
  const { activeTenant, activeCartridge, isKnightSwitchAllowed, setShowAvatarKnightScreen } =
    useTenant();
  const { connected, isReconnecting, reconnectNow, latencyMs } = useBifrost();
  const { listening, speaking, toggleListening, input, setInput, dispatch } = useLakishaVoice();
  const { openMacroModal, activeMacros = [] } = useMacros();
  const hw = useHardwareCompatibility();

  const [activeTab, setActiveTab] = useState<'cockpit' | 'cartridge' | 'tactical' | 'hardware'>(
    'cockpit',
  );
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[#08080C] text-white pb-24 select-none">
      {/* ── TOP EDGE APP BAR ── */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#0A0A14]/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#FFD700] bg-[#1A1230] text-xl shadow-[0_0_12px_rgba(255,215,0,0.3)]">
            {activeTenant?.avatar || '👑'}
          </div>
          <div>
            <h1 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              {activeTenant?.handle || 'SOVEREIGN'}
            </h1>
            <div className="flex items-center gap-1.5 font-mono text-[9px]">
              <span
                className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : isReconnecting ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`}
              />
              <span className="text-white/60">
                {connected
                  ? `Bifröst (${latencyMs || 12}ms)`
                  : isReconnecting
                    ? 'Reconnecting...'
                    : 'Offline Enclave'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-1 rounded-xl border border-[#00F0FF]/30 bg-[#00F0FF]/10 px-2 py-1 font-mono text-[10px] text-[#00F0FF]"
          >
            <span>⚡</span>
            <span>Cmd+K</span>
          </button>
          <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/60">
            <span>
              {hw.cpuCores}C/{hw.deviceMemoryGB}GB
            </span>
          </div>
        </div>
      </header>

      {/* ── MAIN MOBILE CONTENT SWITCHER ── */}
      <main className="flex-1 p-4 space-y-4">
        {activeTab === 'cockpit' && (
          <div className="space-y-4">
            {/* Quick Hero Banner */}
            <div className="rounded-2xl border border-[#00F0FF]/30 bg-gradient-to-br from-[#0F1424] to-[#0A0A14] p-4 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-[#00F0FF] uppercase tracking-widest">
                  Knight Cockpit
                </span>
                <span className="rounded bg-[#FFD700]/20 px-2 py-0.5 font-mono text-[9px] font-bold text-[#FFD700]">
                  {activeTenant?.clearance || 'SOVEREIGN'}
                </span>
              </div>
              <p className="mt-2 text-xs text-white/80 leading-relaxed">
                Hardware optimized edge instance running lightweight wasm pills and native Web
                Audio.
              </p>

              {/* Quick Action Matrix */}
              <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setShowAvatarKnightScreen(true)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 py-2.5 font-bold hover:border-[#00F0FF] hover:text-[#00F0FF]"
                >
                  <span>🛡️</span>
                  <span>Knight Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => openMacroModal(null)}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 py-2.5 font-bold hover:border-[#FFD700] hover:text-[#FFD700]"
                >
                  <span>⚡</span>
                  <span>Voice Macros ({activeMacros?.length ?? 0})</span>
                </button>
              </div>
            </div>

            {/* Live Intent & Speech Dispatch */}
            <div className="rounded-2xl border border-white/10 bg-[#0A0A14]/90 p-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                Direct Speech Intent
              </span>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (input.trim()) {
                    dispatch(input);
                    setInput('');
                  }
                }}
                className="mt-2 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Speak or type command..."
                  className="flex-1 rounded-xl border border-white/20 bg-black/60 px-3 py-2 text-xs font-mono text-white placeholder-white/40 focus:border-[#00F0FF] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all ${
                    listening
                      ? 'border-red-400 bg-red-500/20 text-red-300 shadow-[0_0_12px_#ef4444]'
                      : 'border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF]'
                  }`}
                >
                  {listening ? '⏹️' : '🎙️'}
                </button>
              </form>
              <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-white/50">
                <span>
                  Status: {speaking ? '🎙️ Speaking' : listening ? '👂 Listening' : '✓ Ready'}
                </span>
                <span>Touch Target: 44px AA</span>
              </div>
            </div>

            {/* Active Cartridge Card */}
            <div className="rounded-2xl border border-white/10 bg-[#0E0E18] p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">
                  Mounted Cartridge
                </span>
                <span className="font-mono text-[9px] text-[#00F0FF]">
                  {activeCartridge?.category || 'Core'}
                </span>
              </div>
              <h3 className="mt-1 font-display text-sm font-bold text-white">
                {activeCartridge?.title || 'Arthurian OmniForge Core'}
              </h3>
              <p className="mt-1 text-xs text-white/70">
                {activeCartridge?.description || 'Native Linux & WASM process engine'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'cartridge' && (
          <div className="space-y-3">
            <h2 className="font-display text-sm font-bold text-[#00F0FF] uppercase tracking-wider">
              Available MicroVM Cartridges
            </h2>
            <div className="space-y-2.5">
              {[
                { name: 'KBA Audio Enclave', role: 'Voice OS & VAD', state: 'Active' },
                { name: 'Gideon Proof Engine', role: 'Cryptographic Receipts', state: 'Standby' },
                { name: 'Anya Paladin Guard', role: 'Sentinel Verification', state: 'Standby' },
                { name: 'Merlin Arcane Graph', role: 'RDF Topological State', state: 'Loaded' },
              ].map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0E0E18] p-3"
                >
                  <div>
                    <h4 className="font-display text-xs font-bold text-white">{c.name}</h4>
                    <p className="font-mono text-[10px] text-white/50">{c.role}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 font-mono text-[9px] ${c.state === 'Active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/10 text-white/60'}`}
                  >
                    {c.state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tactical' && (
          <div className="space-y-3">
            <h2 className="font-display text-sm font-bold text-[#FFD700] uppercase tracking-wider">
              Tactical Edge Nodes
            </h2>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              {[
                'Anya Guard',
                'Merlin Loop',
                'Gideon Audit',
                'Tailscale Mesh',
                'Receipt Sync',
                'Audio Bridge',
              ].map((node, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-[#0A0A14] p-3 text-center"
                >
                  <div className="text-base mb-1">⚙️</div>
                  <div className="font-bold text-white">{node}</div>
                  <div className="text-[9px] text-emerald-400 mt-1">● Nominal</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'hardware' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-bold text-[#00F0FF] uppercase tracking-wider">
                Hardware Screen & Profiling
              </h2>
              <button
                type="button"
                onClick={() => setIsHardwareModalOpen(true)}
                className="rounded-lg border border-[#00F0FF] bg-[#00F0FF]/15 px-2.5 py-1 font-mono text-[9px] text-[#00F0FF] hover:bg-[#00F0FF]/25 cursor-pointer font-bold"
              >
                🔍 Full Suite & Embed
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0E0E18] p-4 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/50">Device Classification:</span>
                <span className="text-[#00F0FF] font-bold uppercase">{hw.deviceCategory} ({hw.tier})</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/50">Active Viewport:</span>
                <span className="text-[#FFD700] font-bold">{hw.viewportWidth} × {hw.viewportHeight} px</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/50">Physical Hardware Screen:</span>
                <span className="text-white font-bold">{hw.screenWidth} × {hw.screenHeight} px</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/50">Pixel Density (DPR):</span>
                <span className="text-emerald-400 font-bold">{hw.pixelRatio.toFixed(2)}x High-DPI</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/50">UI Embedding Status:</span>
                <span className={hw.isEmbedded ? 'text-purple-300 font-bold' : 'text-white/60'}>
                  {hw.isEmbedded ? 'Embedded in IFrame' : 'Standalone Root Frame'}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/50">CPU Hardware Threads:</span>
                <span className="text-white font-bold">{hw.cpuCores} Cores</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/50">Allocated RAM:</span>
                <span className="text-white font-bold">{hw.deviceMemoryGB} GB</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/50">Graphics Engine:</span>
                <span className="text-white font-bold truncate max-w-[150px]">
                  {hw.gpuRenderer}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/50">WebRTC Bridge:</span>
                <span className={hw.hasWebRTC ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                  {hw.hasWebRTC ? 'Available (Direct mTLS)' : 'Unavailable'}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-white/50">Low-Power Throttling:</span>
                <span
                  className={
                    hw.isLowPowerDevice ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'
                  }
                >
                  {hw.isLowPowerDevice ? 'Enabled (Optimized Shaders)' : 'Disabled (Full Fidelity)'}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── BOTTOM MOBILE DOCK NAVIGATION ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-white/10 bg-[#0A0A14]/95 px-2 py-2 backdrop-blur-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('cockpit')}
          className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 font-mono text-[10px] transition-all ${
            activeTab === 'cockpit'
              ? 'text-[#00F0FF] font-bold bg-[#00F0FF]/15'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <span className="text-base">🛡️</span>
          <span>Cockpit</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cartridge')}
          className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 font-mono text-[10px] transition-all ${
            activeTab === 'cartridge'
              ? 'text-[#00F0FF] font-bold bg-[#00F0FF]/15'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <span className="text-base">💾</span>
          <span>Pills</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tactical')}
          className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 font-mono text-[10px] transition-all ${
            activeTab === 'tactical'
              ? 'text-[#FFD700] font-bold bg-[#FFD700]/15'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <span className="text-base">⚡</span>
          <span>Tactical</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hardware')}
          className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 font-mono text-[10px] transition-all ${
            activeTab === 'hardware'
              ? 'text-[#00F0FF] font-bold bg-[#00F0FF]/15'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <span className="text-base">📊</span>
          <span>Hardware</span>
        </button>
      </nav>

      {/* 13-Year-Old Friendly Onboarding & Helper Chat Bubble */}
      <CamelotHelperChat />

      {/* Arthurian Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigateTab={(tab) => {
          if (tab === 'avatar') {
            setShowAvatarKnightScreen(true);
          } else if (tab === 'cinematic') {
            setActiveTab('tactical');
          } else if (tab === 'dashboard' || tab === 'hardware') {
            setActiveTab('hardware');
          }
        }}
      />

      {/* Hardware Screen Verification & UI Embedding Modal */}
      <HardwareAndEmbeddingModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
        initialTab="hardware"
      />
    </div>
  );
}
