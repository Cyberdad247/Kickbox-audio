'use client';

import React, { useState } from 'react';
import { useBifrost } from '../../context/BifrostContext';
import { useTenant } from '../../context/TenantContext';
import { useEnvironmentalSky } from '../../hooks/useEnvironmentalSky';
import { speak } from '../../lib/voice';

export interface EcosystemPill {
  id: string;
  name: string;
  category: 'Anya' | 'Merlin' | 'Knowledge' | 'Alerts' | 'Growth' | 'Sustainability';
  icon: string;
  description: string;
  sentiment: string;
}

export function LivingWorkspaceView() {
  const {
    skyGradient,
    timePeriod,
    weatherOverlay,
    temperature,
    locationName,
    hour,
    minute,
    refreshWeather,
  } = useEnvironmentalSky();

  const { activeTenant, activeCartridge, mountCartridge } = useTenant();
  const { connected } = useBifrost();

  // Stage 6.2 Cartridge Carousel State
  const cartridges = activeTenant?.configuration?.cartridges || [];
  const [selectedCartridgeIndex, setSelectedCartridgeIndex] = useState(0);

  // Stage 6.3 Tactical Table 3x3 Pill Grid State
  const initialSlots: (EcosystemPill | null)[] = [
    {
      id: 'anya_paladin',
      name: 'Anya Paladin Pill',
      category: 'Anya',
      icon: '🎙️',
      description: 'Zero-shot Intent Parser & Natural Voice Synthesizer',
      sentiment: 'ACTIVE_GUARD',
    },
    {
      id: 'merlin_orchestrator',
      name: 'Merlin Orchestrator',
      category: 'Merlin',
      icon: '🧙',
      description: 'Autonomous DAG Task Planner & MicroVM Coordinator',
      sentiment: 'DISPATCH_LOOP',
    },
    {
      id: 'knowledge_sync',
      name: 'Knowledge Sync Pill',
      category: 'Knowledge',
      icon: '📚',
      description: 'RDF Memory Graph & Isomorphic Local Storage Vault',
      sentiment: 'ISOLATED_SYNC',
    },
    null,
    null,
    null,
    null,
    null,
    null,
  ];

  const [slottedPills, setSlottedPills] = useState<(EcosystemPill | null)[]>(initialSlots);
  const [armoryDrawerOpen, setArmoryDrawerOpen] = useState(false);
  const [ecosystemActivated, setEcosystemActivated] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  const availableArmoryPills: EcosystemPill[] = [
    {
      id: 'growth_ecommerce',
      name: 'Growth: E-commerce Analytics',
      category: 'Growth',
      icon: '📈',
      description: 'Real-time telemetry, CAC/LTV projections, and order funnel audit.',
      sentiment: 'GROWTH_RESONANCE',
    },
    {
      id: 'sustainability_supply',
      name: 'Sustainability: Supply Chain',
      category: 'Sustainability',
      icon: '🌱',
      description: 'Green computing carbon index & low-energy microVM throttling.',
      sentiment: 'CARBON_NEUTRAL',
    },
    {
      id: 'notification_dispatcher',
      name: 'Notification Dispatcher',
      category: 'Alerts',
      icon: '🔔',
      description: 'High-assurance encrypted webhook alerts & threshold pings.',
      sentiment: 'SENTINEL_GATE',
    },
  ];

  const handleSlotPill = (pill: EcosystemPill) => {
    if (selectedSlotIndex !== null) {
      const updated = [...slottedPills];
      updated[selectedSlotIndex] = pill;
      setSlottedPills(updated);
      setSelectedSlotIndex(null);
      setArmoryDrawerOpen(false);
      speak(`Slotted ${pill.name} into Tactical Table.`);
    }
  };

  const handleActivateEcosystem = () => {
    setEcosystemActivated(true);
    speak('Sovereign Ecosystem Activated. All slotted pills initialized under Sentinel lease.');
  };

  const activePillCount = slottedPills.filter(Boolean).length;

  return (
    <div
      id="living-workspace-root"
      className="relative flex min-h-[850px] w-full flex-col overflow-hidden rounded-3xl border border-[#00F0FF]/30 bg-[#0A0A0A] text-white shadow-[0_0_60px_rgba(0,240,255,0.12)]"
    >
      {/* ── 6.1 THE DYNAMIC SKY & CAMELOT CASTLE HEADER ── */}
      <div
        className="relative flex h-48 w-full flex-col justify-between overflow-hidden border-b border-white/15 p-6 transition-all duration-1000 select-none"
        style={{ background: skyGradient }}
      >
        {/* Weather FX Overlay Layer */}
        {weatherOverlay === 'rain' && (
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(0,240,255,0.15)_0px,rgba(0,240,255,0.15)_2px,transparent_3px,transparent_14px)] animate-pulse" />
        )}
        {weatherOverlay === 'snow' && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,white_2px,transparent_4px),radial-gradient(circle_at_60%_70%,white_2px,transparent_4px)] [background-size:40px_40px] opacity-40 animate-pulse" />
        )}
        {weatherOverlay === 'fog' && (
          <div className="pointer-events-none absolute inset-0 backdrop-blur-md bg-white/5" />
        )}

        {/* Low-Poly Wireframe Camelot Castle Abstract Representation */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center opacity-35">
          <div className="flex items-end gap-1 font-mono text-cyan-300">
            <div className="h-16 w-8 border-t-2 border-x-2 border-cyan-400 bg-black/40 text-center text-[9px]">
              ▲
            </div>
            <div className="h-28 w-14 border-t-2 border-x-2 border-cyan-300 bg-black/60 text-center text-[10px] shadow-[0_0_20px_#00F0FF]">
              🏰 KEEP
            </div>
            <div className="h-20 w-10 border-t-2 border-x-2 border-cyan-400 bg-black/40 text-center text-[9px]">
              ▲
            </div>
          </div>
        </div>

        {/* Top Header Metrics */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#FFD700] bg-black/60 text-xl shadow-[0_0_15px_#FFD700]">
              🏰
            </div>
            <div>
              <h1 className="font-display text-base font-bold uppercase tracking-[0.2em] text-white">
                Citadel of Camelot
              </h1>
              <p className="font-mono text-[10px] text-white/70">
                TIME: {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')} ·{' '}
                {timePeriod.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Weather & Location Telemetry Pill */}
          <button
            type="button"
            onClick={refreshWeather}
            title="Click to refresh local weather"
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/60 px-3.5 py-1.5 font-mono text-xs text-white backdrop-blur-md hover:border-[#00F0FF] transition-all"
          >
            <span>
              {weatherOverlay === 'rain'
                ? '🌧️'
                : weatherOverlay === 'snow'
                  ? '❄️'
                  : weatherOverlay === 'fog'
                    ? '🌫️'
                    : '☀️'}
            </span>
            <span className="text-[#00F0FF] font-bold">{temperature}°C</span>
            <span className="text-white/40">·</span>
            <span className="text-white/80">{locationName}</span>
          </button>
        </div>

        {/* Bottom Castle Subtitle */}
        <div className="relative z-10 flex items-center justify-between font-mono text-[10px] text-white/60">
          <span>ZONE-0 ENTREPRENEURIAL CITADEL</span>
          <span>BIFRÖST: {connected ? 'CONNECTED ⚡' : 'ISOMORPHIC STANDALONE 🛡️'}</span>
        </div>
      </div>

      {/* ── 6.2 THE CARTRIDGE LAUNCHPAD (MAIN 3D CAROUSEL) ── */}
      <div className="relative z-10 border-b border-white/10 bg-black/60 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#00F0FF] animate-pulse" />
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#00F0FF]">
              6.2 Reliquary Cartridge Carousel
            </h2>
          </div>
          <span className="font-mono text-[10px] text-white/50">
            ACTIVE: {activeCartridge?.title || 'NONE'}
          </span>
        </div>

        <div className="flex items-center justify-center gap-4 overflow-x-auto py-2">
          {cartridges.map((cart, idx) => {
            const isCenter = idx === selectedCartridgeIndex;
            const isMounted = activeCartridge?.id === cart.id;

            return (
              <div
                key={cart.id}
                onClick={() => setSelectedCartridgeIndex(idx)}
                className={`relative flex min-w-[240px] cursor-pointer flex-col rounded-2xl border p-4 backdrop-blur-xl transition-all duration-300 ${
                  isCenter
                    ? 'scale-105 border-[#FFD700] bg-[#1A1230] shadow-[0_0_30px_rgba(255,215,0,0.3)]'
                    : 'scale-95 border-white/10 bg-black/40 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-2xl">{cart.icon}</span>
                  <span className="rounded bg-black/60 border border-white/20 px-1.5 py-0.5 font-mono text-[9px] text-[#00F0FF]">
                    {cart.code}
                  </span>
                </div>

                <h3 className="font-display text-sm font-bold uppercase text-white">
                  {cart.title}
                </h3>
                <p className="mt-1 text-[11px] text-white/60 line-clamp-2">{cart.description}</p>

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-2 font-mono text-[10px]">
                  <span className="text-white/40">{cart.role}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      mountCartridge(cart.id);
                      speak(`Mounted cartridge ${cart.title}.`);
                    }}
                    className={`rounded px-2.5 py-1 font-bold uppercase transition-all ${
                      isMounted
                        ? 'border border-emerald-400 bg-emerald-500/20 text-emerald-300'
                        : 'border border-[#FFD700] bg-[#FFD700]/20 text-[#FFD700] hover:bg-[#FFD700] hover:text-black'
                    }`}
                  >
                    {isMounted ? 'MOUNTED' : 'HOT-SWAP'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 6.3 THE PILL CONFIGURATOR (THE TACTICAL TABLE) ── */}
      <div className="relative z-10 flex-1 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#FFD700]">
              6.3 The Tactical Table · Ecosystem Growth Grid
            </h2>
            <p className="text-[11px] text-white/50">
              Slot autonomous agent personas (Pills) to drive background intelligence loops.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setArmoryDrawerOpen(!armoryDrawerOpen)}
              className="flex items-center gap-1.5 rounded-xl border border-[#9D4EDD] bg-[#9D4EDD]/20 px-3.5 py-1.5 font-mono text-xs font-bold text-[#D8B4FE] hover:bg-[#9D4EDD]/30 transition-all"
            >
              <span>🛡️</span>
              <span>The Armory ({availableArmoryPills.length})</span>
            </button>

            <button
              type="button"
              onClick={handleActivateEcosystem}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                ecosystemActivated
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_#10b981]'
                  : 'border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]'
              }`}
            >
              <span>⚡</span>
              <span>{ecosystemActivated ? 'Ecosystem Active' : 'Activate Ecosystem'}</span>
            </button>
          </div>
        </div>

        {/* 3x3 Grid of Sockets */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {slottedPills.map((pill, idx) => (
            <div
              key={idx}
              onClick={() => {
                setSelectedSlotIndex(idx);
                setArmoryDrawerOpen(true);
              }}
              className={`relative flex min-h-[90px] cursor-pointer flex-col justify-between rounded-xl border p-3.5 backdrop-blur-md transition-all ${
                pill
                  ? 'border-[#00F0FF]/60 bg-[#120D22]/80 shadow-[0_0_20px_rgba(0,240,255,0.15)] hover:border-[#00F0FF]'
                  : 'border-dashed border-white/20 bg-black/30 hover:border-white/40'
              }`}
            >
              {pill ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{pill.icon}</span>
                      <span className="font-display text-xs font-bold uppercase text-white truncate">
                        {pill.name}
                      </span>
                    </div>
                    <span className="rounded bg-black/60 px-1.5 py-0.5 font-mono text-[8px] text-[#00F0FF]">
                      {pill.category}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-white/60 line-clamp-1">{pill.description}</p>
                  <div className="mt-2 flex items-center justify-between font-mono text-[8px] text-[#FFD700]">
                    <span>SLOT 0{idx + 1}</span>
                    <span>{pill.sentiment}</span>
                  </div>
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-white/30 hover:text-white/60">
                  <span className="font-mono text-sm">+</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider">
                    Empty Socket 0{idx + 1} (Tap to Slot)
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Armory Drawer Modal if Open */}
        {armoryDrawerOpen && (
          <div className="mt-4 rounded-2xl border border-[#9D4EDD]/60 bg-[#150E28] p-4 shadow-2xl animate-fadeIn">
            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#D8B4FE]">
                Select Sigil from The Armory for Socket #
                {selectedSlotIndex !== null ? selectedSlotIndex + 1 : '1'}
              </h3>
              <button
                type="button"
                onClick={() => setArmoryDrawerOpen(false)}
                className="font-mono text-xs text-white/50 hover:text-white"
              >
                ✕ Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {availableArmoryPills.map((pill) => (
                <div
                  key={pill.id}
                  onClick={() => handleSlotPill(pill)}
                  className="cursor-pointer rounded-xl border border-white/10 bg-black/50 p-3 hover:border-[#FFD700] hover:bg-black/80 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{pill.icon}</span>
                    <span className="font-mono text-xs font-bold text-white">{pill.name}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-white/60">{pill.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 6.4 THE PERMANENT CAPSULE DOCK ── */}
      <div className="relative z-20 flex h-24 items-center justify-between border-t border-[#00F0FF]/30 bg-[#0A0A0A]/95 px-6 backdrop-blur-2xl">
        {/* Left: 2D Customized Avatar Badge */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[#FFD700] bg-[#120D22] text-2xl shadow-[0_0_15px_rgba(255,215,0,0.3)]">
            <span>{activeTenant?.avatar || '👑'}</span>
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div>
            <h4 className="font-display text-xs font-bold uppercase text-white">
              {activeTenant?.handle || 'SOVEREIGN'}
            </h4>
            <span className="font-mono text-[9px] text-[#00F0FF]">
              AUTONOMOUS CAPSULE SLOT · ACTIVE
            </span>
          </div>
        </div>

        {/* Center: Live Transcript Stream */}
        <div className="hidden max-w-md flex-1 px-4 text-center md:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-1 font-mono text-[10px] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00F0FF] animate-ping" />
            <span>Sync Manager: {activePillCount} Pills synchronized to Sentinel microVM.</span>
          </div>
        </div>

        {/* Right: Excalibur Consent Trigger */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => speak('Consent verified by Excalibur cipher.')}
            className="flex items-center gap-2 rounded-xl border border-[#FFD700] bg-[#FFD700]/15 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[#FFD700] hover:bg-[#FFD700] hover:text-black transition-all shadow-[0_0_15px_rgba(255,215,0,0.3)]"
          >
            <span>🗡️</span>
            <span>Excalibur Consent</span>
          </button>
        </div>
      </div>
    </div>
  );
}
