'use client';

import React from 'react';
import type { TenantProfile, WarpStage } from '../../types/tenant';

interface TenantWarpTransitionProps {
  stage: WarpStage;
  targetTenant: TenantProfile | null;
}

export function TenantWarpTransition({ stage, targetTenant }: TenantWarpTransitionProps) {
  if (stage === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#0D0B14]/95 backdrop-blur-2xl transition-all duration-300">
      {/* Dynamic Cyber-Grid Warp Lines */}
      <div
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(#7B2CBF_1px,transparent_1px)] [background-size:24px_24px] transition-all duration-700 ${
          stage === 'warping' ? 'scale-[3] opacity-60' : 'scale-100 opacity-20'
        }`}
      />

      {/* Ambient Pulsing Backlight Rings */}
      <div
        className={`absolute rounded-full bg-gradient-to-tr from-[#5A2A82]/40 via-[#7B2CBF]/30 to-[#FFD700]/20 blur-3xl transition-all duration-700 ${
          stage === 'warping'
            ? 'h-[160vw] w-[160vw] opacity-100'
            : 'h-[400px] w-[400px] opacity-70 animate-pulse'
        }`}
      />

      {/* Main Center Holographic Aegis Shield Warp Core */}
      <div className="relative flex flex-col items-center justify-center text-center">
        {/* The Expanding Aegis Shield */}
        <div
          className={`relative flex items-center justify-center rounded-3xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            stage === 'warping'
              ? 'scale-[6] rotate-180 opacity-0 blur-lg'
              : stage === 'hydrating'
                ? 'scale-110 rotate-0 opacity-100'
                : 'scale-95 rotate-0 opacity-90'
          }`}
        >
          {/* Outer Solar Gold Halo Ring */}
          <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-2 border-[#FFD700] shadow-[0_0_50px_rgba(229,184,66,0.6)]">
            {/* Spinning Aegis Geometric Rings */}
            <div className="absolute inset-2 animate-[spin_4s_linear_infinite] rounded-full border border-dashed border-[#7B2CBF]" />
            <div className="absolute inset-4 animate-[spin_6s_linear_infinite_reverse] rounded-full border border-[#00E5FF]/50" />

            {/* Central Avatar Sigil */}
            <span className="text-5xl drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]">
              {targetTenant?.avatar || '🛡️'}
            </span>
          </div>
        </div>

        {/* Warp Status & Decryption Telemetry Stream */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[#FFD700]/30 bg-[#120D22]/80 px-4 py-1.5 shadow-[0_0_20px_rgba(123,44,191,0.4)]">
            <span className="h-2 w-2 animate-ping rounded-full bg-[#00E5FF]" />
            <span className="font-display text-xs uppercase tracking-[0.25em] text-[#FFD700]">
              {stage === 'decrypting' && 'Biometric / Token Auth Decryption'}
              {stage === 'hydrating' && 'Hydrating Tenant MicroVM Context'}
              {stage === 'warping' && 'Shield Expand Warp Gate Engaged'}
              {stage === 'complete' && 'Tenant Session Hydrated'}
            </span>
          </div>

          <h3 className="font-display text-xl font-bold uppercase tracking-[0.3em] text-white">
            {targetTenant?.handle || 'AUTHENTICATING KNIGHT'}
          </h3>

          <p className="text-xs uppercase tracking-widest text-[#00E5FF]/80">
            Tenant: {targetTenant?.tenantId} · Security Tier: {targetTenant?.clearance}
          </p>

          {/* MicroVM Hydration Progress Bar */}
          <div className="mt-3 h-1.5 w-64 overflow-hidden rounded-full border border-[#7B2CBF]/50 bg-[#120D22]">
            <div
              className={`h-full bg-gradient-to-r from-[#7B2CBF] via-[#00E5FF] to-[#FFD700] transition-all duration-500 ${
                stage === 'decrypting' ? 'w-1/3' : stage === 'hydrating' ? 'w-3/4' : 'w-full'
              }`}
            />
          </div>

          {/* Live System Log Snippet */}
          <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-white/40">
            {stage === 'decrypting' && `[VAULT_KEY] Verifying ${targetTenant?.cipher}...`}
            {stage === 'hydrating' &&
              `[MICRO_VM] Allocating ${targetTenant?.memory.used}GB / ${targetTenant?.memory.total}GB Lattice RAM...`}
            {stage === 'warping' &&
              `[LATTICE_SYNC] Initializing Sub-Agents (${targetTenant?.subAgents.join(', ')})...`}
          </div>
        </div>
      </div>
    </div>
  );
}
