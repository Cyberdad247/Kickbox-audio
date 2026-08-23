'use client';

import React from 'react';
import type { TenantProfile } from '../../types/tenant';

export interface TenantCardProps {
  tenant: TenantProfile;
  isSelected: boolean;
  isCurrentActive?: boolean;
  onSelect: (tenant: TenantProfile) => void;
  onFocus?: () => void;
  className?: string;
}

export function TenantCard({
  tenant,
  isSelected,
  isCurrentActive = false,
  onSelect,
  onFocus,
  className = '',
}: TenantCardProps) {
  const isArch =
    tenant.clearance === 'SOVEREIGN_ARCH_ARCHITECT' ||
    tenant.controllerType === 'HUMAN_ARCH_ARCHITECT';

  return (
    <div
      onClick={() => onSelect(tenant)}
      onMouseEnter={onFocus}
      className={`group relative flex-shrink-0 cursor-pointer rounded-2xl p-6 transition-all duration-300 transform select-none ${
        isSelected
          ? 'w-80 sm:w-96 scale-105 border-2 border-[#FFD700] bg-gradient-to-b from-[#1E1235] via-[#120D22] to-[#0D0B14] shadow-[0_0_40px_rgba(229,184,66,0.4)] z-20'
          : 'w-64 sm:w-72 scale-90 sm:scale-95 border border-[#7B2CBF]/40 bg-[#120D22]/80 opacity-70 hover:opacity-100 hover:scale-95 sm:hover:scale-100 hover:border-[#7B2CBF] hover:shadow-[0_0_20px_rgba(123,44,191,0.3)] z-10'
      } ${className}`}
      style={{ scrollSnapAlign: 'center' }}
    >
      {/* ── Active Solar Core Gold Halo Ring & Ambient Refraction ── */}
      {isSelected && (
        <>
          {/* Pulsing Outer Halo Glow */}
          <div className="absolute -inset-1.5 -z-10 rounded-2xl bg-gradient-to-r from-[#FFD700]/30 via-[#7B2CBF]/40 to-[#00E5FF]/30 blur-md animate-pulse" />

          {/* Status Badge Tag */}
          <div className="absolute -top-3 right-6 rounded-full border border-[#FFD700] bg-[#FFD700]/20 px-3 py-0.5 text-[9px] font-mono uppercase tracking-widest text-[#FFD700] shadow-[0_0_12px_rgba(255,215,0,0.5)] backdrop-blur-md">
            {isCurrentActive ? '● Active Session' : 'Ready to Hydrate'}
          </div>
        </>
      )}

      {/* ── Controller Archetype Pill ── */}
      <div className="mb-3 flex items-center justify-center">
        {isArch ? (
          <span className="flex items-center gap-1.5 rounded-full border border-[#FFD700]/80 bg-[#FFD700]/15 px-3 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.3)]">
            <span>👑</span>
            <span>Sovereign Arch-Architect</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full border border-[#00E5FF]/70 bg-[#00E5FF]/10 px-3 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.2)]">
            <span>👤</span>
            <span>Human Referral Invitee</span>
          </span>
        )}
      </div>

      {/* ── Human Controller Avatar Core & Rotating Halo Rings ── */}
      <div className="flex flex-col items-center text-center">
        <div
          className={`relative flex h-24 w-24 items-center justify-center rounded-full border-2 transition-all duration-300 ${
            isSelected
              ? 'border-[#FFD700] bg-[#0D0B14] shadow-[0_0_30px_rgba(255,215,0,0.5)] scale-110 ring-4 ring-[#FFD700]/20'
              : 'border-[#7B2CBF]/50 bg-[#0D0B14] group-hover:border-[#7B2CBF] group-hover:scale-105'
          }`}
        >
          {/* Animated Tech Compass Rings for Active Selection */}
          {isSelected && (
            <>
              <div className="absolute -inset-1 animate-[spin_8s_linear_infinite] rounded-full border border-dashed border-[#00E5FF]/60" />
              <div className="absolute -inset-2 animate-[spin_12s_linear_infinite_reverse] rounded-full border border-dotted border-[#FFD700]/40" />
            </>
          )}
          <span className="text-4xl drop-shadow-[0_0_15px_rgba(255,215,0,0.7)] transition-transform group-hover:scale-110">
            {tenant.avatar}
          </span>
        </div>

        {/* Controller Callsign & Name */}
        <h3
          className={`mt-4 font-display font-bold uppercase tracking-[0.2em] transition-colors ${
            isSelected
              ? 'text-lg text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]'
              : 'text-sm text-white/80 group-hover:text-white'
          }`}
        >
          {tenant.handle}
        </h3>

        <p className="text-[11px] font-medium text-[#FFD700]/90">{tenant.name}</p>

        <p className="mt-1 line-clamp-2 text-[10px] text-white/50 group-hover:text-white/70">
          {tenant.role}
        </p>
      </div>

      {/* ── Tenant Metadata & Lattice Telemetry ── */}
      <div className="mt-5 rounded-xl border border-white/10 bg-[#0D0B14]/80 p-3 transition-colors group-hover:border-white/20">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/60">
          <span>Partition</span>
          <strong className="font-mono text-[#00E5FF]">{tenant.tenantId}</strong>
        </div>

        <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/60">
          <span>Human Status</span>
          <strong className="flex items-center gap-1 text-emerald-400 font-mono text-[9px]">
            <span>VERIFIED ✓</span>
          </strong>
        </div>

        {tenant.referralBy && (
          <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/60">
            <span>Referral By</span>
            <strong className="font-mono text-[#FFD700] text-[9px]">{tenant.referralBy}</strong>
          </div>
        )}

        {tenant.referralCode && (
          <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/60">
            <span>Invite Token</span>
            <strong className="font-mono text-[#7DF9FF] text-[9px]">{tenant.referralCode}</strong>
          </div>
        )}

        {/* Real-time Memory Bar Gauge */}
        <div className="mt-2.5">
          <div className="flex justify-between text-[9px] font-mono text-white/40">
            <span>Lattice RAM</span>
            <span className="text-white/70">
              {tenant.memory.used} / {tenant.memory.total} GB
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#7B2CBF] via-[#00E5FF] to-[#FFD700] transition-all duration-500"
              style={{
                width: `${Math.min(100, (tenant.memory.used / tenant.memory.total) * 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Sub-Agents Matrix */}
        <div className="mt-3">
          <span className="block text-[9px] uppercase tracking-widest text-white/40">
            Assigned Sub-Agents
          </span>
          <div className="mt-1 flex flex-wrap gap-1">
            {tenant.subAgents.map((agent) => (
              <span
                key={agent}
                className="rounded border border-[#7B2CBF]/50 bg-[#7B2CBF]/15 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-white/80"
              >
                {agent}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Direct Action Button for Selected Card ── */}
      {isSelected && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(tenant);
          }}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#FFD700] bg-[#FFD700]/20 py-2.5 text-xs font-bold uppercase tracking-[0.2em] text-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all hover:bg-[#FFD700]/30 hover:scale-[1.02] active:scale-95"
        >
          <span>👑</span>
          <span>Enter Human Workspace</span>
        </button>
      )}
    </div>
  );
}
