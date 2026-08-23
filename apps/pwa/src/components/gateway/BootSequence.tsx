'use client';

import React, { useState, useEffect } from 'react';
import { speak } from '../../lib/voice';

export interface BootSequenceProps {
  onComplete: () => void;
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  // Phase progression:
  // 'conjuring' (0-3s) -> 'invocation' (3-7s) -> 'kernel_loading' (7-10s) -> 'entry_gate' (10s+)
  const [phase, setPhase] = useState<'conjuring' | 'invocation' | 'kernel_loading' | 'entry_gate'>(
    'conjuring',
  );
  const [progress, setProgress] = useState(0);
  const [activeNodeIndex, setActiveNodeIndex] = useState(0);

  const kernelNodes = [
    { label: 'Anya Gate', status: 'SYNCHRONIZED', icon: '🎙️' },
    { label: 'Bifröst Sync', status: 'STREAM_ONLINE', icon: '⚡' },
    { label: 'Sentinel Lease', status: 'HSM_SEALED', icon: '🛡️' },
    { label: 'Ledger Receipt', status: 'GIDEON_VERIFIED', icon: '📜' },
  ];

  useEffect(() => {
    // 0s - 3s: The Conjuring
    const t1 = setTimeout(() => {
      setPhase('invocation');
    }, 3000);

    // 3s - 7s: The Invocation
    const t2 = setTimeout(() => {
      setPhase('kernel_loading');
    }, 7000);

    // 7s - 10s: Kernel Loading
    const t3 = setTimeout(() => {
      setPhase('entry_gate');
    }, 10500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Progress Bar ticker during Kernel Loading
  useEffect(() => {
    if (phase !== 'kernel_loading') return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const next = prev + Math.floor(Math.random() * 8) + 4;
        if (next >= 25 && next < 50) setActiveNodeIndex(1);
        if (next >= 50 && next < 75) setActiveNodeIndex(2);
        if (next >= 75) setActiveNodeIndex(3);
        return Math.min(next, 100);
      });
    }, 120);

    return () => clearInterval(interval);
  }, [phase]);

  const handleAwaken = () => {
    speak('Sovereign awakened. Excalibur binds your consent.');
    onComplete();
  };

  return (
    <div
      id="boot-sequence-root"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#0A0A0A] select-none text-white"
      style={{
        background: 'radial-gradient(circle at 50% 50%, #150E28 0%, #0D091A 45%, #0A0A0A 100%)',
      }}
    >
      {/* Dynamic Golden Shockwave in Conjuring Phase */}
      <div
        className={`pointer-events-none absolute h-[600px] w-[600px] rounded-full blur-3xl transition-opacity duration-1000 ${
          phase === 'conjuring'
            ? 'opacity-80 scale-125 bg-[radial-gradient(circle,rgba(255,215,0,0.35)_0%,rgba(0,240,255,0.15)_40%,transparent_70%)] animate-pulse'
            : 'opacity-40 scale-100 bg-[radial-gradient(circle,rgba(0,240,255,0.2)_0%,transparent_60%)]'
        }`}
      />

      {/* Background Star Lattice */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(0,240,255,0.15)_1px,transparent_1px)] [background-size:32px_32px] opacity-25" />

      {/* ── CENTRAL EXCALIBUR SWORD & STONE PEDESTAL ── */}
      <div className="relative mb-8 flex flex-col items-center justify-center">
        {/* Plunged Sword Graphic */}
        <div
          className={`relative z-10 flex flex-col items-center transition-all duration-1000 ${
            phase === 'entry_gate'
              ? 'animate-bounce drop-shadow-[0_0_35px_rgba(255,215,0,0.8)] scale-110'
              : 'drop-shadow-[0_0_20px_rgba(0,240,255,0.6)]'
          }`}
        >
          {/* Sword Hilt & Guard */}
          <div className="h-4 w-12 rounded-sm border border-[#FFD700] bg-gradient-to-r from-[#FFD700] via-white to-[#FFD700] shadow-[0_0_15px_#FFD700]" />
          <div className="h-6 w-3 border-x border-[#FFD700] bg-black" />

          {/* Sword Blade */}
          <div className="relative flex h-36 w-4 justify-center bg-gradient-to-b from-white via-[#00F0FF] to-[#0A0A0A] shadow-[0_0_25px_#00F0FF]">
            <div className="h-full w-[1px] bg-white opacity-80" />
            {/* Rune on blade */}
            <span className="absolute top-8 font-mono text-[9px] font-bold text-black select-none">
              ᚲ
            </span>
          </div>
        </div>

        {/* Stone Pedestal */}
        <div className="relative -mt-3 flex h-14 w-40 items-center justify-center rounded-lg border border-[#FFD700]/40 bg-gradient-to-b from-[#1E1730] to-[#0D091A] shadow-[0_0_30px_rgba(255,215,0,0.2)]">
          <div className="absolute inset-x-3 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent animate-pulse" />
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#FFD700]/70 uppercase">
            ANVIL OF CONSENT
          </span>
        </div>
      </div>

      {/* ── STAGE 1: PARCHMENT SCROLL INVOCATION (3s - 7s) ── */}
      {(phase === 'invocation' || phase === 'kernel_loading') && (
        <div className="relative z-20 mx-4 max-w-lg animate-fadeIn rounded-2xl border border-[#FFD700]/30 bg-[#0E0A1A]/85 p-6 text-center backdrop-blur-xl shadow-[0_0_40px_rgba(255,215,0,0.15)]">
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#FFD700]" />
            <span className="font-mono text-[10px] tracking-[0.25em] text-[#FFD700] uppercase">
              PRIME AXIOM OF CAMELOT-OS
            </span>
            <span className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#FFD700]" />
          </div>

          <p className="font-serif text-lg italic text-[#F4E8C1] leading-relaxed tracking-wide sm:text-xl">
            &ldquo;The user controls consequence. Autonomy without consent is tyranny. Excalibur
            binds the sovereign intent.&rdquo;
          </p>

          <div className="mt-3 font-mono text-[10px] text-white/40 tracking-widest">
            ZONE-0 CITADEL CONSTITUTION · V1.7.1
          </div>
        </div>
      )}

      {/* ── STAGE 1: KERNEL LOADING (7s - 10s) ── */}
      {phase === 'kernel_loading' && (
        <div className="relative z-20 mt-6 flex w-full max-w-md flex-col items-center gap-4 px-4 animate-fadeIn">
          {/* Geometric Node Indicators */}
          <div className="grid w-full grid-cols-4 gap-2 font-mono text-[10px]">
            {kernelNodes.map((node, i) => (
              <div
                key={node.label}
                className={`flex flex-col items-center rounded-lg border p-2 text-center transition-all duration-300 ${
                  i <= activeNodeIndex
                    ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                    : 'border-white/10 bg-black/40 text-white/30'
                }`}
              >
                <span className="text-base mb-1">{node.icon}</span>
                <span className="font-bold truncate w-full">{node.label}</span>
                <span className="text-[8px] text-white/50">{node.status}</span>
              </div>
            ))}
          </div>

          {/* Precision Percentage Bar */}
          <div className="w-full">
            <div className="mb-1.5 flex justify-between font-mono text-xs">
              <span className="text-white/60">Loading MicroVM Pool & Enclaves...</span>
              <strong className="text-[#00F0FF]">{progress}%</strong>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#00F0FF] via-[#9D4EDD] to-[#FFD700] transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── STAGE 1: ENTRY GATE (10s+) ── */}
      {phase === 'entry_gate' && (
        <div className="relative z-20 mt-8 flex flex-col items-center gap-4 animate-fadeIn">
          <button
            type="button"
            onClick={handleAwaken}
            className="group relative flex items-center gap-3 rounded-2xl border-2 border-[#FFD700] bg-gradient-to-r from-[#241708] via-[#4D330A] to-[#241708] px-8 py-4 font-mono text-sm font-bold uppercase tracking-[0.25em] text-[#FFD700] shadow-[0_0_35px_rgba(255,215,0,0.5)] hover:scale-105 hover:bg-[#FFD700] hover:text-black transition-all active:scale-95"
          >
            <span className="text-xl group-hover:rotate-12 transition-transform">🗡️</span>
            <span>Touch to Awaken</span>
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#00F0FF] animate-ping" />
          </button>

          <span className="font-mono text-[11px] text-white/50 tracking-widest">
            CLICK TO ENTER THE SOVEREIGN SANCTUARY
          </span>
        </div>
      )}

      {/* Skip Button */}
      <button
        type="button"
        onClick={handleAwaken}
        className="absolute bottom-6 right-6 font-mono text-[11px] text-white/40 hover:text-white transition-colors"
      >
        [SKIP AWAKENING] →
      </button>
    </div>
  );
}
