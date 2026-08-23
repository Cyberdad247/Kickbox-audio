'use client';

import React from 'react';
import { useTenant } from '../../context/TenantContext';

export function TenantQuickBar() {
  const {
    activeTenant,
    activeCartridge,
    isKnightSwitchAllowed,
    openGateway,
    setShowAvatarKnightScreen,
  } = useTenant();

  return (
    <div className="flex items-center gap-3">
      {/* Active Knight Profile Chip */}
      <button
        type="button"
        onClick={() => setShowAvatarKnightScreen(true)}
        title="View Avatar Knight Enclave"
        className="group flex items-center gap-2.5 rounded-full border border-[#7B2CBF]/40 bg-[#120D22]/90 px-3 py-1 text-left shadow-[0_0_15px_rgba(123,44,191,0.2)] transition-all hover:border-[#FFD700] hover:bg-[#1E1235] hover:shadow-[0_0_20px_rgba(255,215,0,0.25)]"
      >
        {/* Avatar Orb */}
        <div className="relative flex h-6 w-6 items-center justify-center rounded-full border border-[#FFD700]/70 bg-[#0D0B14] text-xs shadow-[0_0_8px_rgba(255,215,0,0.4)] group-hover:scale-105">
          <span>{activeTenant.avatar}</span>
          <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-green-400" />
        </div>

        {/* Tenant Handle & ID */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-[10px] font-bold uppercase tracking-wider text-white group-hover:text-[#FFD700]">
              {activeTenant.handle}
            </span>
            <span className="rounded border border-[#7B2CBF]/50 bg-[#7B2CBF]/20 px-1 text-[8px] font-mono text-[#00E5FF]">
              {activeTenant.tenantId}
            </span>
          </div>
          <span className="text-[8px] uppercase tracking-widest text-white/40">
            {activeTenant.clearance}
          </span>
        </div>
      </button>

      {/* Cartridge Knight-Switch Status / Action Button */}
      {isKnightSwitchAllowed ? (
        <button
          type="button"
          onClick={openGateway}
          title="Knight Switching Authorized via Active Weaver Cartridge"
          className="hidden sm:flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest text-emerald-300 transition-all hover:border-emerald-400 hover:bg-emerald-400/20"
        >
          <span>⇄</span>
          <span>Switch Knight (Unlocked)</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={openGateway}
          title={`Knight switching locked under [${activeCartridge?.title || 'Active Cartridge'}]. Insert Weaver cartridge to enable.`}
          className="hidden sm:flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-mono uppercase tracking-widest text-white/40 transition-colors hover:text-white/70"
        >
          <span>🔒</span>
          <span>Cartridge Locked</span>
        </button>
      )}
    </div>
  );
}
