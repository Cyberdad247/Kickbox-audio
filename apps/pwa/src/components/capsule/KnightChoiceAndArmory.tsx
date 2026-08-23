'use client';

import React, { useState } from 'react';
import { speak } from '../../lib/voice';

export interface KnightPreset {
  id: string;
  name: string;
  codename: string;
  avatar: string;
  specialization: string;
  lore: string;
  glowColor: string;
  sigil: string;
}

export interface KnightChoiceAndArmoryProps {
  onKnightBestowed: (knightConfig: {
    name: string;
    avatar: string;
    visorStyle: string;
    material: string;
    capeLength: number;
    sigil: string;
    glowColor: string;
  }) => void;
}

export function KnightChoiceAndArmory({ onKnightBestowed }: KnightChoiceAndArmoryProps) {
  // Mode: 'hall_of_armor' (Stage 3) vs 'armory_forge' (Stage 4) vs 'ascension_briefing' (Stage 5)
  const [viewMode, setViewMode] = useState<'hall_of_armor' | 'armory_forge' | 'ascension_briefing'>(
    'hall_of_armor',
  );
  const [selectedPreset, setSelectedPreset] = useState<string>('cyber');

  // Stage 4 Customization State
  const [visorStyle, setVisorStyle] = useState<'Diamond' | 'Round' | 'Slit'>('Diamond');
  const [outfitMaterial, setOutfitMaterial] = useState<'Neon Mesh' | 'Plate Mail' | 'Silk Robe'>(
    'Neon Mesh',
  );
  const [capeLength, setCapeLength] = useState<number>(75);
  const [heraldrySigil, setHeraldrySigil] = useState<'Dragon' | 'Griffin' | 'Sword' | 'Oak'>(
    'Sword',
  );
  const [primaryGlow, setPrimaryGlow] = useState<string>('#00F0FF');
  const [customKnightName, setCustomKnightName] = useState<string>('SIR_CYBER');

  // Stage 5 Subtitle sync
  const [subtitleText, setSubtitleText] = useState<string>('');

  const prebuiltKnights: KnightPreset[] = [
    {
      id: 'cyber',
      name: 'Sir Cyber',
      codename: 'KNIGHT_CYBER',
      avatar: '⚔️',
      specialization: 'MicroVM Isolation & Neural Kernel Execution',
      lore: 'The Cyber Knight defends the core memory enclaves, executing low-latency WASM transformations with ruthless mathematical precision.',
      glowColor: '#00F0FF',
      sigil: 'Sword',
    },
    {
      id: 'arcane',
      name: 'Merlin Arcane',
      codename: 'KNIGHT_ARCANE',
      avatar: '🧙',
      specialization: 'RDF Knowledge Graphs & Temporal Anomalies',
      lore: 'The Arcane Knight masters the RDF topological lattice, weaving multi-agent state trees and bridging asynchronous temporal events.',
      glowColor: '#9D4EDD',
      sigil: 'Dragon',
    },
    {
      id: 'data',
      name: 'Lady Sentinel',
      codename: 'KNIGHT_DATA',
      avatar: '🛡️',
      specialization: 'Gideon Receipts, Merkle Proofs & HSM Leases',
      lore: 'The Data Knight guards the ledger gates. No state transition passes without a cryptographically sealed zero-knowledge capability lease.',
      glowColor: '#FFD700',
      sigil: 'Oak',
    },
  ];

  const playClangSound = () => {
    // Web Audio synthesizer for tactile feedback
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        const ctx = new (
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        )();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } catch {
        // ignore audio failures
      }
    }
  };

  const handleSelectPrebuilt = (k: KnightPreset) => {
    setSelectedPreset(k.id);
    setCustomKnightName(k.codename);
    setPrimaryGlow(k.glowColor);
    setHeraldrySigil(k.sigil as 'Dragon' | 'Griffin' | 'Sword' | 'Oak');
    playClangSound();
  };

  const handleTriggerAscension = () => {
    setViewMode('ascension_briefing');
    const speechScript =
      'Sovereign. The Round Table awaits your command. Anya will interpret your intent. Sentinel guards the gate. Excalibur binds your consent. I am your guide, never your authority.';

    setSubtitleText(speechScript);
    speak(speechScript);

    setTimeout(() => {
      onKnightBestowed({
        name: customKnightName,
        avatar: selectedPreset === 'arcane' ? '🧙' : selectedPreset === 'data' ? '🛡️' : '⚔️',
        visorStyle,
        material: outfitMaterial,
        capeLength,
        sigil: heraldrySigil,
        glowColor: primaryGlow,
      });
    }, 6000);
  };

  // ── STAGE 5: THE WELCOME ASCENSION BRIEFING ──
  if (viewMode === 'ascension_briefing') {
    return (
      <div
        id="ascension-briefing-root"
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05050A] p-6 text-center select-none"
      >
        {/* Dynamic Rotating Background Grid */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#00F0FF_1px,transparent_1px)] [background-size:40px_40px] opacity-20 animate-pulse" />
        <div className="pointer-events-none absolute h-[500px] w-[500px] rounded-full bg-[#00F0FF]/15 blur-[140px]" />

        {/* Life-Size Rising Sprite Pedestal */}
        <div className="relative z-10 mb-8 flex flex-col items-center animate-bounce">
          <div
            className="flex h-44 w-44 items-center justify-center rounded-3xl border-2 text-7xl shadow-2xl transition-all"
            style={{
              borderColor: primaryGlow,
              backgroundColor: 'rgba(10, 10, 20, 0.9)',
              boxShadow: `0 0 60px ${primaryGlow}`,
            }}
          >
            <span>
              {selectedPreset === 'arcane' ? '🧙' : selectedPreset === 'data' ? '🛡️' : '⚔️'}
            </span>
          </div>

          <div
            className="mt-4 flex h-10 w-48 items-center justify-center rounded-full border bg-black/80 font-mono text-xs font-bold tracking-[0.2em] uppercase"
            style={{ borderColor: primaryGlow, color: primaryGlow }}
          >
            {customKnightName}
          </div>
        </div>

        {/* Glowing Subtitle Sync Stream */}
        <div className="relative z-10 max-w-2xl rounded-2xl border border-white/15 bg-black/80 p-6 backdrop-blur-xl">
          <p className="font-serif text-lg text-white leading-relaxed tracking-wide italic sm:text-xl">
            &ldquo;{subtitleText}&rdquo;
          </p>
          <span className="mt-3 block font-mono text-[10px] text-[#FFD700] tracking-widest uppercase">
            SPEECH SYNTHESIS · CONSTITUTIONAL OATH
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            onKnightBestowed({
              name: customKnightName,
              avatar: selectedPreset === 'arcane' ? '🧙' : selectedPreset === 'data' ? '🛡️' : '⚔️',
              visorStyle,
              material: outfitMaterial,
              capeLength,
              sigil: heraldrySigil,
              glowColor: primaryGlow,
            })
          }
          className="relative z-10 mt-8 font-mono text-xs text-white/50 hover:text-white underline"
        >
          [ENTER THE ROUND TABLE SANCTUARY] →
        </button>
      </div>
    );
  }

  // ── STAGE 4: BUILD-YOUR-OWN KNIGHT CUSTOMIZATION (THE ARMORY) ──
  if (viewMode === 'armory_forge') {
    return (
      <div
        id="armory-forge-root"
        className="relative flex min-h-[640px] w-full flex-col overflow-hidden rounded-2xl border border-[#9D4EDD]/40 bg-[#0A0714]/95 p-6 backdrop-blur-2xl text-white shadow-[0_0_60px_rgba(157,78,221,0.15)]"
      >
        {/* Top Header */}
        <div className="relative z-10 mb-6 flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#9D4EDD]/50 bg-[#9D4EDD]/15 px-3 py-1 font-mono text-xs font-bold text-[#D8B4FE]">
              <span>🛡️</span>
              <span>STAGE 4: THE ARMORY FORGE · SOVEREIGN CUSTOMIZER</span>
            </div>
            <h2 className="mt-2 font-display text-xl font-bold uppercase tracking-wider text-white">
              Sovereign Avatar Customization Suite
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setViewMode('hall_of_armor')}
            className="rounded-lg border border-white/20 px-3 py-1.5 font-mono text-xs text-white/70 hover:border-white hover:text-white"
          >
            ← Back to Hall
          </button>
        </div>

        {/* 3-Panel Grid Layout */}
        <div className="relative z-10 grid flex-1 grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 1. Left Panel (The Armor Plate) */}
          <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-black/50 p-4">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#00F0FF]">
              1. Armor Plate Toggles
            </h3>

            {/* Visor Style */}
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase text-white/60">
                [Visor Style] Eye Shape
              </label>
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                {(['Diamond', 'Round', 'Slit'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      setVisorStyle(style);
                      playClangSound();
                    }}
                    className={`rounded-lg border py-2 text-center transition-all ${
                      visorStyle === style
                        ? 'border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF] font-bold'
                        : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Outfit Material */}
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase text-white/60">
                [Outfit Material]
              </label>
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                {(['Neon Mesh', 'Plate Mail', 'Silk Robe'] as const).map((mat) => (
                  <button
                    key={mat}
                    type="button"
                    onClick={() => {
                      setOutfitMaterial(mat);
                      playClangSound();
                    }}
                    className={`rounded-lg border py-2 text-center transition-all ${
                      outfitMaterial === mat
                        ? 'border-[#FFD700] bg-[#FFD700]/20 text-[#FFD700] font-bold'
                        : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    {mat}
                  </button>
                ))}
              </div>
            </div>

            {/* Cape Energy Trail */}
            <div>
              <div className="mb-1 flex justify-between font-mono text-[10px] text-white/60">
                <span>[Energy Cape Trail Length]</span>
                <span className="text-[#9D4EDD]">{capeLength}px</span>
              </div>
              <input
                type="range"
                min="20"
                max="150"
                value={capeLength}
                onChange={(e) => {
                  setCapeLength(Number(e.target.value));
                  playClangSound();
                }}
                className="w-full accent-[#9D4EDD]"
              />
            </div>
          </div>

          {/* 2. Center Panel (The Forge Canvas Preview) */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-black/70 p-6 text-center">
            <div className="relative flex h-52 w-52 items-center justify-center rounded-2xl border-2 bg-gradient-to-b from-[#1E1730] to-black shadow-[0_0_40px_rgba(0,0,0,0.8)]">
              {/* Dynamic Glow Aura */}
              <div
                className="absolute inset-0 rounded-2xl blur-xl opacity-40 transition-all duration-300"
                style={{ backgroundColor: primaryGlow }}
              />

              {/* Central Sprite Graphic & Layered Armor */}
              <div className="relative flex flex-col items-center">
                <div className="text-6xl transition-transform hover:scale-110">
                  <span>
                    {selectedPreset === 'arcane' ? '🧙' : selectedPreset === 'data' ? '🛡️' : '⚔️'}
                  </span>
                </div>
                {/* Dynamic Sigil Insignia Badge */}
                <div
                  className="mt-1 flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold shadow-md"
                  style={{
                    borderColor: primaryGlow,
                    color: primaryGlow,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                  }}
                >
                  <span>
                    {heraldrySigil === 'Dragon'
                      ? '🐉'
                      : heraldrySigil === 'Griffin'
                        ? '🦅'
                        : heraldrySigil === 'Oak'
                          ? '🌳'
                          : '🗡️'}
                  </span>
                  <span>{heraldrySigil}</span>
                </div>
                {/* Outfit & Visor Indicator */}
                <span className="mt-0.5 font-mono text-[8px] text-white/50">
                  {visorStyle} · {outfitMaterial}
                </span>
              </div>

              {/* Cape Energy Particle Representation */}
              <div
                className="absolute -bottom-4 h-3 rounded-full opacity-75 blur-sm transition-all"
                style={{
                  width: `${capeLength}px`,
                  backgroundColor: primaryGlow,
                }}
              />
            </div>

            {/* Heraldry Sigil Selection */}
            <div className="mt-4 w-full">
              <label className="mb-1 block font-mono text-[10px] uppercase text-white/60">
                [Heraldry Sigil] Placement
              </label>
              <div className="grid grid-cols-4 gap-2 font-mono text-xs">
                {(['Dragon', 'Griffin', 'Sword', 'Oak'] as const).map((sigil) => (
                  <button
                    key={sigil}
                    type="button"
                    onClick={() => {
                      setHeraldrySigil(sigil);
                      playClangSound();
                    }}
                    className={`rounded-lg border py-1.5 transition-all ${
                      heraldrySigil === sigil
                        ? 'border-[#FFD700] bg-[#FFD700]/20 text-[#FFD700] font-bold'
                        : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
                    }`}
                  >
                    {sigil}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Right Panel (The Color Palette Spectrum) */}
          <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-black/50 p-4">
            <div>
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#FFD700]">
                3. Neon Spectrum Ring
              </h3>

              <div className="mt-4 grid grid-cols-4 gap-2.5">
                {[
                  { name: 'Quantum Cyan', color: '#00F0FF' },
                  { name: 'Excalibur Gold', color: '#FFD700' },
                  { name: 'Royal Violet', color: '#9D4EDD' },
                  { name: 'Neon Magenta', color: '#FF00FF' },
                  { name: 'Emerald Sentinel', color: '#10B981' },
                  { name: 'Obsidian Crimson', color: '#EF4444' },
                  { name: 'Glacial Blue', color: '#38BDF8' },
                  { name: 'Amber Core', color: '#F59E0B' },
                ].map((palette) => (
                  <button
                    key={palette.color}
                    type="button"
                    onClick={() => {
                      setPrimaryGlow(palette.color);
                      playClangSound();
                    }}
                    className={`flex flex-col items-center rounded-xl border p-2 transition-all ${
                      primaryGlow === palette.color
                        ? 'border-white scale-105 shadow-[0_0_15px_rgba(255,255,255,0.4)]'
                        : 'border-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span
                      className="h-6 w-6 rounded-full border border-white/20 shadow-md"
                      style={{ backgroundColor: palette.color }}
                    />
                    <span className="mt-1 font-mono text-[8px] truncate w-full text-center">
                      {palette.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Save & Bestow Button */}
            <button
              type="button"
              onClick={handleTriggerAscension}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#FFD700] bg-gradient-to-r from-[#FFD700]/20 to-[#9D4EDD]/20 py-3 font-mono text-xs font-bold uppercase tracking-widest text-[#FFD700] hover:bg-[#FFD700] hover:text-black transition-all shadow-[0_0_25px_rgba(255,215,0,0.3)]"
            >
              <span>⚡</span>
              <span>Bestow & Forge Knight</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── STAGE 3: THE ORDER OF KNIGHTS (HALL OF ARMOR) ──
  return (
    <div
      id="knight-choice-root"
      className="relative flex min-h-[600px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#00F0FF]/30 bg-[#0A0A0A]/95 p-6 backdrop-blur-2xl text-white shadow-[0_0_60px_rgba(0,240,255,0.1)]"
    >
      {/* Background Cyber-Lattice */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,240,255,0.08)_0%,transparent_70%)]" />

      {/* Header */}
      <div className="relative z-10 mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-3.5 py-1 font-mono text-xs font-bold text-[#00F0FF]">
          <span>👑</span>
          <span>STAGE 3: THE ORDER OF KNIGHTS · HALL OF ARMOR</span>
        </div>
        <h2 className="mt-3 font-display text-2xl font-bold uppercase tracking-[0.2em] text-white sm:text-3xl">
          Choose Your Sovereign Knight
        </h2>
        <p className="mt-1 text-xs text-white/60">
          Select an archetype to guide your autonomous microVM swarm, or forge your custom armor.
        </p>
      </div>

      {/* ── 3 PEDESTAL STATUES ── */}
      <div className="relative z-10 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
        {prebuiltKnights.map((knight) => {
          const isSelected = selectedPreset === knight.id;
          return (
            <div
              key={knight.id}
              onClick={() => handleSelectPrebuilt(knight)}
              className={`group relative flex cursor-pointer flex-col items-center rounded-2xl border p-5 backdrop-blur-xl transition-all duration-300 ${
                isSelected
                  ? 'scale-105 border-white bg-gradient-to-b from-[#1E1730] to-black shadow-[0_0_30px_rgba(0,240,255,0.3)]'
                  : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-black/60'
              }`}
            >
              {/* Knight Avatar Hologram */}
              <div
                className="relative mb-3 flex h-24 w-24 items-center justify-center rounded-2xl border-2 text-5xl transition-all"
                style={{
                  borderColor: knight.glowColor,
                  backgroundColor: 'rgba(10, 10, 20, 0.8)',
                  boxShadow: isSelected ? `0 0 25px ${knight.glowColor}` : 'none',
                }}
              >
                <span>{knight.avatar}</span>
              </div>

              {/* Title & Lore */}
              <h3 className="font-display text-base font-bold uppercase text-white">
                {knight.name}
              </h3>
              <span
                className="font-mono text-[9px] font-bold tracking-widest uppercase"
                style={{ color: knight.glowColor }}
              >
                {knight.codename}
              </span>

              <p className="mt-2 text-center text-xs text-white/70 leading-relaxed line-clamp-3">
                {knight.lore}
              </p>

              {/* Specialization Pill */}
              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-center font-mono text-[9px] text-[#FFD700]">
                {knight.specialization}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── ACTION CONTROLS: FORGE OR PROCEED ── */}
      <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleTriggerAscension}
          className="flex items-center gap-2 rounded-xl border-2 border-[#00F0FF] bg-[#00F0FF]/20 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)]"
        >
          <span>⚡</span>
          <span>Bestow Selected Knight</span>
        </button>

        <button
          type="button"
          onClick={() => {
            playClangSound();
            setViewMode('armory_forge');
          }}
          className="flex items-center gap-2 rounded-xl border border-[#9D4EDD] bg-[#9D4EDD]/15 px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-[#D8B4FE] hover:bg-[#9D4EDD]/30 transition-all shadow-[0_0_20px_rgba(157,78,221,0.2)]"
        >
          <span>🔨</span>
          <span>Forge Your Own Knight (Armory)</span>
        </button>
      </div>
    </div>
  );
}
