'use client';

import React, { useState } from 'react';
import { useAvatarConfig } from '../../context/AvatarConfigContext';
import { useBifrost } from '../../context/BifrostContext';
import { useTenant } from '../../context/TenantContext';
import { LakishaAvatar } from '../hud/LakishaAvatar';
import { TenantCartridgeCarousel } from '../profile/TenantCartridgeCarousel';

export interface AvatarKnightScreenProps {
  onEnterDashboard?: () => void;
}

export function AvatarKnightScreen({ onEnterDashboard }: AvatarKnightScreenProps) {
  const {
    activeTenant,
    activeCartridge,
    isKnightSwitchAllowed,
    mountCartridge,
    openGateway,
    forceOpenGateway,
    setShowAvatarKnightScreen,
    knightSwitchBlockMessage,
    clearKnightSwitchBlockMessage,
    updateConfiguration,
  } = useTenant();

  const { openConfig } = useAvatarConfig();
  const { connected, sendVoiceCommand } = useBifrost();
  const [activeTab, setActiveTab] = useState<'cockpit' | 'cartridges' | 'subagents' | 'config'>(
    'cockpit',
  );

  const tenantConfig = activeTenant.configuration;
  const cartridges = tenantConfig?.cartridges || [];

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] w-full flex-col overflow-hidden rounded-2xl border border-[#7B2CBF]/40 bg-[#0A0714]/90 p-6 backdrop-blur-2xl shadow-[0_0_50px_rgba(123,44,191,0.2)]">
      {/* Background Cyber-Lattice */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#7B2CBF_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#00E5FF]/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#FFD700]/10 blur-[100px]" />

      {/* Knight Switch Restriction Banner if triggered */}
      {knightSwitchBlockMessage && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-500/50 bg-amber-950/70 p-3.5 text-xs font-mono text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{knightSwitchBlockMessage}</span>
          </div>
          <button
            type="button"
            onClick={clearKnightSwitchBlockMessage}
            className="rounded border border-amber-400/40 bg-amber-400/20 px-2 py-0.5 text-[10px] text-amber-300 hover:bg-amber-400/30"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* ── 1. TOP STATUS BAR ── */}
      <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        {/* Left: Tenant Identity */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#FFD700] bg-[#120D22] text-2xl shadow-[0_0_20px_rgba(255,215,0,0.4)]">
            <span>{activeTenant.avatar}</span>
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-lg font-bold uppercase tracking-[0.2em] text-white">
                {activeTenant.handle}
              </h1>
              <span className="rounded border border-[#7B2CBF]/60 bg-[#7B2CBF]/20 px-1.5 py-0.5 text-[9px] font-mono uppercase text-[#00E5FF]">
                {activeTenant.tenantId}
              </span>
              <span className="rounded border border-[#FFD700]/60 bg-[#FFD700]/15 px-1.5 py-0.5 text-[9px] font-mono uppercase text-[#FFD700]">
                {activeTenant.clearance}
              </span>
            </div>
            <p className="text-xs text-white/50">{activeTenant.role}</p>
          </div>
        </div>

        {/* Right: Telemetry & Navigation Tabs */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/70">
            <span className="text-[#00E5FF]">LATENCY: {activeTenant.latency}</span>
            <span>·</span>
            <span className="text-[#FFD700]">
              RAM: {activeTenant.memory.used}/{activeTenant.memory.total}GB
            </span>
            <span>·</span>
            <span className="text-emerald-400">SYNC: {activeTenant.coreSync}</span>
          </div>

          <button
            type="button"
            onClick={openConfig}
            className="flex items-center gap-1.5 rounded-lg border border-[#7B2CBF]/50 bg-[#120D22] px-3 py-1.5 text-xs text-[#FFD700] hover:border-[#FFD700] hover:bg-[#FFD700]/10 transition-all"
            title="Configure Avatar Persona"
          >
            <span>⚙️</span>
            <span className="hidden md:inline">Avatar Config</span>
          </button>
        </div>
      </div>

      {/* ── 2. SCREEN TAB NAVIGATION ── */}
      <div className="relative z-10 mb-6 flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('cockpit')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-all ${
            activeTab === 'cockpit'
              ? 'border border-[#00E5FF] bg-[#00E5FF]/20 text-[#00E5FF] font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>🛡️</span>
          <span>Avatar Cockpit</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cartridges')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-all ${
            activeTab === 'cartridges'
              ? 'border border-[#FFD700] bg-[#FFD700]/20 text-[#FFD700] font-bold shadow-[0_0_15px_rgba(255,215,0,0.3)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>🎛️</span>
          <span>Cartridge Deck ({cartridges.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('subagents')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-all ${
            activeTab === 'subagents'
              ? 'border border-[#7B2CBF] bg-[#7B2CBF]/30 text-purple-200 font-bold shadow-[0_0_15px_rgba(123,44,191,0.4)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>⚡</span>
          <span>Sub-Agent Swarm</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-all ${
            activeTab === 'config'
              ? 'border border-emerald-400 bg-emerald-400/20 text-emerald-300 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>⚙️</span>
          <span>Tenant Configuration</span>
        </button>
      </div>

      {/* ── 3. TAB CONTENT VIEWS ── */}
      <div className="relative z-10 flex-1">
        {/* TAB 1: AVATAR COCKPIT */}
        {activeTab === 'cockpit' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left: 3D/Holographic Avatar Projection Core (Sandbox Configuration Card) */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#120D22]/80 p-6 text-center lg:col-span-5 shadow-[0_0_25px_rgba(123,44,191,0.2)]">
              <div className="mb-2 rounded-full border border-[#FFD700]/50 bg-[#FFD700]/10 px-3 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[#FFD700]">
                🛡️ Sandbox Avatar Knight · Configuration Card
              </div>

              <div className="relative my-3 flex h-36 w-36 items-center justify-center rounded-full border-2 border-[#FFD700] bg-[#0D0B14] text-6xl shadow-[0_0_40px_rgba(255,215,0,0.4)]">
                <div className="absolute -inset-3 animate-[spin_12s_linear_infinite] rounded-full border border-dashed border-[#00E5FF]/50" />
                <div className="absolute -inset-6 animate-[spin_20s_linear_infinite_reverse] rounded-full border border-dotted border-[#7B2CBF]/50" />
                <span>{activeTenant.avatar}</span>
              </div>

              <h2 className="font-display text-base font-bold uppercase tracking-[0.25em] text-white">
                {activeTenant.handle} AVATAR KNIGHT
              </h2>
              <p className="mt-1 max-w-xs text-xs text-white/50">{activeTenant.description}</p>

              {/* Directly Links to Lakisha HUD Configuration Modal */}
              <div className="mt-4 flex flex-col items-center gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={openConfig}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-[#FFD700] bg-[#FFD700]/15 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.25)] transition-all hover:bg-[#FFD700]/25 hover:scale-[1.02]"
                >
                  <span>⚙️</span>
                  <span>Configure Lakisha HUD Persona</span>
                </button>

                <button
                  type="button"
                  onClick={() => sendVoiceCommand('engage knight avatar protocol')}
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-[#00E5FF] bg-[#00E5FF]/15 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all hover:bg-[#00E5FF]/25"
                >
                  <span>🎙️</span>
                  <span>{connected ? 'Engage Voice OS Stream' : 'Connect Voice Enclave'}</span>
                </button>
              </div>
            </div>

            {/* Right: Cartridge Capability Gate & Quick Actions */}
            <div className="flex flex-col justify-between gap-4 lg:col-span-7">
              {/* Active Cartridge Capability Gate Status */}
              <div className="rounded-2xl border border-[#7B2CBF]/40 bg-[#120D22]/90 p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{activeCartridge?.icon || '🎛️'}</span>
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-[#00E5FF]">
                        MOUNTED CARTRIDGE
                      </span>
                      <h3 className="font-display text-sm font-bold uppercase text-white">
                        {activeCartridge?.title || 'No Cartridge Mounted'}
                      </h3>
                    </div>
                  </div>
                  <span className="rounded border border-emerald-400/50 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300 uppercase">
                    {activeCartridge?.runtimeTier || 'Ring 0'}
                  </span>
                </div>

                <p className="mt-3 text-xs text-white/70">{activeCartridge?.description}</p>

                {/* Knight-Switch Governance Status Indicator */}
                <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-white/60">
                      KNIGHT SWITCHING PERMISSION:
                    </span>
                    {isKnightSwitchAllowed ? (
                      <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        UNLOCKED (CARTRIDGE GRANTED)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-400">
                        <span className="h-2 w-2 rounded-full bg-rose-400" />
                        LOCKED (REQUIRES WEAVER CARTRIDGE)
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 text-[11px] text-white/45">
                    {isKnightSwitchAllowed
                      ? 'The active cartridge permits switching between Knight partitions via the Camelot Round Table Gateway.'
                      : 'Knights are locked to this tenant partition. To switch knights, mount an [Avatar Knight Weaver] cartridge in the Cartridge Deck.'}
                  </p>

                  {/* Switch Knight Trigger (Governed) */}
                  <div className="mt-3 flex items-center gap-3">
                    {isKnightSwitchAllowed ? (
                      <button
                        type="button"
                        onClick={openGateway}
                        className="flex items-center gap-2 rounded-lg border border-[#FFD700] bg-[#FFD700]/20 px-4 py-2 font-mono text-xs font-bold uppercase text-[#FFD700] hover:bg-[#FFD700]/30 shadow-[0_0_15px_rgba(255,215,0,0.3)] transition-all"
                      >
                        <span>⇄</span>
                        <span>Switch Knight Profile (Gateway)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          const weaverCart = cartridges.find((c) => c.allowKnightSwitch);
                          if (weaverCart) {
                            mountCartridge(weaverCart.id);
                          } else {
                            openGateway();
                          }
                        }}
                        className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-xs text-white/60 hover:text-white hover:border-[#FFD700]/50 transition-all"
                      >
                        <span>🎛️</span>
                        <span>Mount Avatar Weaver Cartridge</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#120D22]/60 p-4">
                <button
                  type="button"
                  onClick={() => {
                    if (activeCartridge) {
                      mountCartridge(activeCartridge.id);
                    }
                    if (onEnterDashboard) {
                      onEnterDashboard();
                    } else {
                      setShowAvatarKnightScreen(false);
                    }
                  }}
                  className="flex items-center gap-2 rounded-xl border border-[#00E5FF] bg-gradient-to-r from-[#00E5FF]/25 to-[#7B2CBF]/25 px-5 py-2.5 font-display text-xs font-bold uppercase tracking-[0.15em] text-white hover:scale-[1.02] shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all"
                >
                  <span>🚀</span>
                  <span>Load Cartridge & Launch Floating Avatar</span>
                </button>

                <button
                  type="button"
                  onClick={forceOpenGateway}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 font-mono text-xs text-white/60 hover:text-white hover:bg-white/10 transition-all"
                >
                  <span>🔒</span>
                  <span>Lock / Gateway Enclave</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CARTRIDGE DECK */}
        {activeTab === 'cartridges' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                  Dynamic Cartridge Carousel for [{activeTenant.handle}]
                </h3>
                <p className="text-xs text-white/50">
                  Filter, search, and hot-swap microVM cartridges scoped specifically to this
                  authenticated tenant configuration.
                </p>
              </div>
              <span className="font-mono text-xs text-[#FFD700]">
                {cartridges.length} Cartridge{cartridges.length !== 1 ? 's' : ''} Configured
              </span>
            </div>

            {/* Tenant Cartridge Carousel Component */}
            <div className="rounded-2xl border border-white/10 bg-[#0D0B14]/80 p-5 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <TenantCartridgeCarousel />
            </div>

            {/* Detailed Grid Breakdown */}
            <div className="pt-2">
              <h4 className="mb-3 font-display text-xs uppercase tracking-wider text-white/70">
                Cartridge Roster Matrix
              </h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cartridges.map((cartridge) => {
                  const isActive = cartridge.id === activeCartridge?.id;
                  return (
                    <div
                      key={cartridge.id}
                      className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                        isActive
                          ? 'border-[#FFD700] bg-[#1a1230] shadow-[0_0_20px_rgba(255,215,0,0.25)]'
                          : 'border-white/10 bg-[#120D22]/80 hover:border-white/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{cartridge.icon}</span>
                            <div>
                              <h5 className="font-display text-xs font-bold uppercase text-white">
                                {cartridge.title}
                              </h5>
                              <span className="font-mono text-[9px] uppercase text-[#00E5FF]">
                                {cartridge.code} · v{cartridge.version}
                              </span>
                            </div>
                          </div>
                          {isActive && (
                            <span className="rounded-full bg-[#FFD700] px-2 py-0.5 font-mono text-[8px] font-bold text-black uppercase">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-xs text-white/60 line-clamp-2">
                          {cartridge.description}
                        </p>

                        <div className="mt-3 space-y-1 font-mono text-[9px]">
                          <div className="flex items-center justify-between text-white/50">
                            <span>CATEGORY:</span>
                            <span className="text-white">{cartridge.category}</span>
                          </div>
                          <div className="flex items-center justify-between text-white/50">
                            <span>KNIGHT SWITCH:</span>
                            <span
                              className={
                                cartridge.allowKnightSwitch
                                  ? 'text-emerald-400 font-bold'
                                  : 'text-rose-400'
                              }
                            >
                              {cartridge.allowKnightSwitch ? 'ALLOWED ✓' : 'RESTRICTED ✗'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/10">
                        {isActive ? (
                          <div className="flex items-center justify-center rounded-lg bg-[#FFD700]/10 py-1 font-mono text-[10px] font-bold text-[#FFD700]">
                            CURRENTLY MOUNTED
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => mountCartridge(cartridge.id)}
                            className="w-full rounded-lg border border-white/20 bg-white/5 py-1 font-mono text-[10px] text-white hover:border-[#00E5FF] hover:bg-[#00E5FF]/20 hover:text-[#00E5FF] transition-all"
                          >
                            Mount Cartridge
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SUB-AGENT SWARM */}
        {activeTab === 'subagents' && (
          <div className="space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                Assigned Sub-Agents for [{activeTenant.handle}]
              </h3>
              <p className="text-xs text-white/50">
                Autonomous sub-agent micro-threads managed by {activeTenant.name}.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeTenant.subAgents.map((agent, idx) => (
                <div
                  key={agent}
                  className="flex items-center gap-3.5 rounded-2xl border border-[#7B2CBF]/30 bg-[#120D22]/80 p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#7B2CBF] bg-[#0D0B14] font-mono text-sm text-[#00E5FF]">
                    #{idx + 1}
                  </div>
                  <div>
                    <h4 className="font-display text-xs font-bold uppercase text-white">{agent}</h4>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-emerald-400">
                      ● MICROVM THREAD ARMED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: TENANT CONFIGURATION */}
        {activeTab === 'config' && (
          <div className="space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                Partition Configuration — [{activeTenant.tenantId}]
              </h3>
              <p className="text-xs text-white/50">
                Sovereign environment policies and cryptographic token declarations.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#120D22]/80 p-5 space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/50">CIPHER:</span>
                  <span className="text-[#00E5FF]">{activeTenant.cipher}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/50">MEMORY PARTITION:</span>
                  <span className="text-[#FFD700]">
                    {activeTenant.memory.used} / {activeTenant.memory.total} GB
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/50">VOICE PERSONA:</span>
                  <span className="text-white">{tenantConfig?.voicePersona || 'Lakisha'}</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/50">DEFENSE AUTOMATION:</span>
                  <span className="text-emerald-400">
                    {tenantConfig?.autoArmDefense ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-white/50">WAKE WORD LISTENER:</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateConfiguration({ wakeWordEnabled: !tenantConfig?.wakeWordEnabled })
                      }
                      className={`rounded px-2 py-0.5 text-[10px] font-bold transition-colors ${
                        tenantConfig?.wakeWordEnabled
                          ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/40'
                          : 'bg-red-400/20 text-red-400 border border-red-400/40'
                      }`}
                    >
                      {tenantConfig?.wakeWordEnabled ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </div>
                  {tenantConfig?.wakeWordEnabled && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-white/50 text-[10px]">ACTIVATION PHRASE:</span>
                      <input
                        type="text"
                        value={tenantConfig?.wakeWord || 'lakisha'}
                        onChange={(e) =>
                          updateConfiguration({ wakeWord: e.target.value.toLowerCase() })
                        }
                        className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[#00E5FF] w-24 text-right focus:outline-none focus:border-[#00E5FF]/50"
                        placeholder="lakisha"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#120D22]/80 p-5 space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#FFD700]">
                  DECLARED SECURITY TOKENS
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {tenantConfig?.customTokens?.map((token) => (
                    <span
                      key={token}
                      className="rounded border border-[#00E5FF]/40 bg-[#00E5FF]/10 px-2 py-1 font-mono text-[10px] text-[#00E5FF]"
                    >
                      {token}
                    </span>
                  )) || <span className="text-xs text-white/40">Standard Sovereign Tokens</span>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. FOOTER STATUS BAR ── */}
      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 font-mono text-[10px] text-white/40">
        <div>
          AUTONOMOUS OS: <span className="text-[#00E5FF]">CAMELOT_V4_SINGULARITY</span>
        </div>
        <div className="text-right">
          AUTHENTICATION: <span className="text-emerald-400">BIOMETRIC_UNSEALED</span>
        </div>
      </div>
    </div>
  );
}
