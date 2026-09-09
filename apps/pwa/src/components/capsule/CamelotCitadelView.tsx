'use client';

import React, { useEffect, useState } from 'react';

export interface CamelotCitadelViewProps {
  onEnterWorkspace: () => void;
  onReplayBoot?: () => void;
}

export function CamelotCitadelView({ onEnterWorkspace, onReplayBoot }: CamelotCitadelViewProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Cinematic animation timeline
    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => setStep(2), 2400);
    const t3 = setTimeout(() => setStep(3), 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-void">
      {/* Dynamic Background Atmosphere */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15)_0%,rgba(10,10,10,1)_70%)]" />

      {/* Core Citadel Geometry */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div
          className={`transition-all duration-1000 ease-out ${
            step >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          {/* Hexagonal Gateway / Citadel Representation */}
          <div className="relative flex h-64 w-64 items-center justify-center">
            <div className="absolute inset-0 animate-[spin_20s_linear_infinite] rounded-full border border-gold-dark/30 border-t-gold-royal/80" />
            <div className="absolute inset-4 animate-[spin_15s_linear_infinite_reverse] rounded-full border border-gold-dark/20 border-b-cyan-dim/80" />
            <div className="absolute inset-8 rounded-full border border-white/5 bg-void/80 shadow-glass-gold backdrop-blur-md" />

            {/* The Citadel Iconography */}
            <div
              className={`transition-all duration-1000 delay-500 text-6xl ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}
            >
              🏰
            </div>
          </div>
        </div>

        <h1
          className={`mt-10 font-display text-3xl font-bold uppercase tracking-[0.2em] text-white transition-all duration-1000 ${
            step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          The Citadel of Camelot
        </h1>

        <p
          className={`mt-4 max-w-md text-center font-mono text-xs uppercase tracking-widest text-gold-royal/70 transition-all duration-1000 ${
            step >= 3 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          System Initialized. Synchronizing Runic Matrices.
        </p>

        {/* Action Buttons */}
        <div
          className={`mt-10 flex flex-wrap items-center justify-center gap-4 transition-all duration-1000 ${
            step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
          }`}
        >
          {onReplayBoot && (
            <button
              type="button"
              onClick={onReplayBoot}
              className="group flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-950/40 px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-widest text-cyan-300 shadow-[0_0_20px_rgba(0,240,255,0.2)] transition-all hover:bg-cyan-900/60 hover:border-cyan-300 hover:scale-105 cursor-pointer backdrop-blur-md"
            >
              <span className="text-base">🗡️</span>
              <span>Replay Excalibur Transition</span>
            </button>
          )}

          <button
            type="button"
            onClick={onEnterWorkspace}
            className="group flex items-center gap-3 rounded-full border border-gold-royal/50 bg-gold-royal/20 px-8 py-3.5 font-mono text-xs sm:text-sm font-bold uppercase tracking-widest text-gold-royal shadow-neon-gold transition-all hover:bg-gold-royal/30 hover:scale-105 cursor-pointer"
          >
            <span>Ascend to Workspace</span>
            <span className="transition-transform group-hover:translate-x-2">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
