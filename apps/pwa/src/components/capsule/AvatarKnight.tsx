'use client';

import React from 'react';
import { useAvatarConfig } from '../../context/AvatarConfigContext';
import { useTenant } from '../../context/TenantContext';

export function AvatarKnight() {
  const { openConfig } = useAvatarConfig();
  const {
    activeTenant,
    activeCartridge,
    isKnightSwitchAllowed,
    openGateway,
    setShowAvatarKnightScreen,
  } = useTenant();

  return (
    <div className="relative flex h-full min-h-[420px] w-full flex-col items-center justify-center rounded-2xl border border-[#7B2CBF]/30 bg-[#0D0B14]/60 p-8 text-center backdrop-blur-md">
      {/* Subtle Grid / Corner Crosshairs */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#5A2A82_1px,transparent_1px)] [background-size:28px_28px] opacity-20" />
      <div className="absolute top-4 left-4 font-mono text-[9px] uppercase tracking-widest text-[#00E5FF]/60">
        [TENANT_HYDRATED: {activeTenant.tenantId}]
      </div>
      <div className="absolute top-4 right-4 font-mono text-[9px] uppercase tracking-widest text-[#FFD700]/60">
        [SECURITY_TIER: {activeTenant.clearance}]
      </div>

      {/* Center Holographic Knight Core */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#FFD700] bg-[#120D22] text-4xl shadow-[0_0_30px_rgba(255,215,0,0.4)]">
          <div className="absolute inset-1 animate-[spin_10s_linear_infinite] rounded-full border border-dashed border-[#00E5FF]/40" />
          <span>{activeTenant.avatar}</span>
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/30 bg-[#FFD700]/10 px-3 py-0.5 text-[9px] font-mono uppercase tracking-widest text-[#FFD700]">
            <span>● MicroVM Active</span>
            <span>·</span>
            <span>{activeTenant.latency} Latency</span>
          </div>

          <h2 className="font-display text-base font-bold uppercase tracking-[0.25em] text-white">
            {activeTenant.handle} — {activeTenant.name}
          </h2>

          <p className="max-w-lg text-xs text-white/50">{activeTenant.description}</p>
        </div>

        {/* Active Mounted Cartridge Badge */}
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-mono text-white/70">
          <span>{activeCartridge?.icon || '🎛️'}</span>
          <span>
            Cartridge: <strong className="text-[#00E5FF]">{activeCartridge?.title}</strong>
          </span>
          <span>·</span>
          <span
            className={isKnightSwitchAllowed ? 'text-emerald-400 font-bold' : 'text-amber-400/80'}
          >
            {isKnightSwitchAllowed ? 'Knight Switch: UNLOCKED' : 'Knight Switch: LOCKED'}
          </span>
        </div>

        {/* Assigned Sub-Agents Matrix */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {activeTenant.subAgents.map((agent) => (
            <span
              key={agent}
              className="rounded-lg border border-[#7B2CBF]/40 bg-[#7B2CBF]/15 px-2.5 py-1 text-[9px] uppercase tracking-wider text-violet-200"
            >
              ⚡ {agent}
            </span>
          ))}
        </div>

        {/* Action Array */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={openConfig}
            className="flex items-center gap-2 rounded-xl border border-[#FFD700] bg-[#FFD700]/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.2)] transition-all hover:bg-[#FFD700]/25 hover:scale-105"
          >
            <span>⚙️</span>
            <span>Configure Lakisha HUD</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAvatarKnightScreen(true)}
            className="flex items-center gap-2 rounded-xl border border-[#00E5FF] bg-[#00E5FF]/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.2)] transition-all hover:bg-[#00E5FF]/25 hover:scale-105"
          >
            <span>🛡️</span>
            <span>Avatar Knight Sandbox</span>
          </button>

          {isKnightSwitchAllowed && (
            <button
              type="button"
              onClick={openGateway}
              className="flex items-center gap-2 rounded-xl border border-[#FFD700] bg-[#FFD700]/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.2)] transition-all hover:bg-[#FFD700]/25 hover:scale-105"
            >
              <span>⇄</span>
              <span>Switch Knight Profile (Weaver Active)</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Crosshairs */}
      <div className="absolute bottom-4 left-4 font-mono text-[9px] uppercase tracking-widest text-white/20">
        [CIPHER: {activeTenant.cipher}]
      </div>
      <div className="absolute bottom-4 right-4 font-mono text-[9px] uppercase tracking-widest text-white/20">
        [RAM: {activeTenant.memory.used}/{activeTenant.memory.total} GB]
      </div>
    </div>
  );
}
