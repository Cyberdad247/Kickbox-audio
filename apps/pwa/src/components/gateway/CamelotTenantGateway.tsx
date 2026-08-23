'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAvatarConfig } from '../../context/AvatarConfigContext';
import { useTenant } from '../../context/TenantContext';
import type { TenantProfile } from '../../types/tenant';
import { ProfileCarousel } from '../profile/ProfileCarousel';
import { AddKnightModal } from './AddKnightModal';
import { BiometricAuthModal } from './BiometricAuthModal';
import { TenantWarpTransition } from './TenantWarpTransition';

export function CamelotTenantGateway() {
  const {
    tenants,
    activeTenant,
    isGatewayOpen,
    warpStage,
    targetTenant,
    selectTenant,
    addTenant,
    isAuthenticated,
    closeGateway,
  } = useTenant();

  const { openConfig } = useAvatarConfig();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [authTenant, setAuthTenant] = useState<TenantProfile | null>(null);

  // Global keybinds for Config (C) and Add Knight (N) when Gateway is open
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isGatewayOpen || warpStage !== 'idle' || isAddModalOpen || authTenant !== null) return;

      if (e.key === 'Escape' && isAuthenticated) {
        e.preventDefault();
        closeGateway();
      } else if (e.key === 'KeyN') {
        e.preventDefault();
        setIsAddModalOpen(true);
      } else if (e.key === 'KeyC') {
        e.preventDefault();
        openConfig();
      }
    },
    [
      isGatewayOpen,
      warpStage,
      isAddModalOpen,
      authTenant,
      openConfig,
      isAuthenticated,
      closeGateway,
    ],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleCardSelected = useCallback((tenant: TenantProfile) => {
    setAuthTenant(tenant);
  }, []);

  const handleAuthenticated = useCallback(
    (tenant: TenantProfile) => {
      setAuthTenant(null);
      selectTenant(tenant);
    },
    [selectTenant],
  );

  if (!isGatewayOpen && warpStage === 'idle') return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between overflow-hidden bg-[#0D0B14] text-white select-none">
      {/* Background Cyber-Lattice & Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#5A2A82_1px,transparent_1px)] [background-size:28px_28px] opacity-25" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[450px] w-[800px] rounded-full bg-[#7B2CBF]/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 h-[350px] w-[600px] rounded-full bg-[#FFD700]/10 blur-[100px]" />

      {/* ── 1. HEADER HUD RIBBON ── */}
      <header className="relative z-10 flex h-20 items-center justify-between border-b border-[#7B2CBF]/30 bg-[#0D0B14]/80 px-6 backdrop-blur-xl sm:px-10">
        {/* Left Status Readout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-full border border-[#00E5FF]/40 bg-[#00E5FF]/10 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.2)]">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#00E5FF]" />
            <span>SECURE_PROTOCOL v3.14</span>
          </div>
          <span className="hidden text-[10px] uppercase tracking-[0.2em] text-white/40 md:inline-block">
            STATUS: <strong className="text-green-400">ARMED</strong>
          </span>
        </div>

        {/* Center: Hero Metatron Crest & Title */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2">
            {/* Metatron Sacred Core Gem */}
            <div className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-[#FFD700] bg-[#120D22] shadow-[0_0_15px_rgba(255,215,0,0.4)]">
              <span className="text-xs">👑</span>
              <div className="absolute inset-0 animate-pulse rounded-lg border border-[#00E5FF]/40" />
            </div>
            <h1 className="font-display text-sm font-bold uppercase tracking-[0.3em] text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.5)] sm:text-base">
              CAMELOT-OS
            </h1>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-[#7DF9FF]/80">
            Sovereign Arch-Architect & Human Referral Controllers
          </span>
        </div>

        {/* Right Telemetry Readout */}
        <div className="flex items-center gap-4">
          <div className="hidden text-right font-mono text-[10px] uppercase tracking-widest text-white/50 sm:block">
            <div>
              HUMAN_GATE_SYNC: <span className="text-[#00E5FF]">OPTIMAL</span>
            </div>
            <div className="text-[9px] text-[#FFD700]/70">
              LATENCY: 8ms · HUMAN CONTROLLERS ONLY
            </div>
          </div>
          {isAuthenticated && (
            <button
              type="button"
              onClick={closeGateway}
              title="Return to Workspace"
              className="flex h-8 items-center justify-center gap-2 rounded-lg border border-[#00E5FF]/40 bg-[#00E5FF]/10 px-3 text-[10px] font-bold uppercase tracking-wider text-[#00E5FF] transition-all hover:border-[#00E5FF] hover:bg-[#00E5FF]/20"
            >
              <span>← Return</span>
            </button>
          )}
          <button
            type="button"
            onClick={openConfig}
            title="Configure Avatar / Agent OS"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#7B2CBF]/50 bg-[#120D22] text-[#FFD700] transition-all hover:border-[#FFD700] hover:bg-[#FFD700]/10"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* ── 2. HORIZONTAL PROFILE CAROUSEL (PS5 / CONSOLE STYLE) ── */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-6">
        <div className="mb-4 text-center">
          <span className="text-[10px] uppercase tracking-[0.3em] text-[#FFD700]/90 font-bold">
            Select Sovereign Arch-Architect or Verified Referral Controller Profile
          </span>
        </div>

        <ProfileCarousel
          tenants={tenants}
          selectedTenantId={activeTenant.id}
          onSelectTenant={handleCardSelected}
          onAddTenant={() => setIsAddModalOpen(true)}
          showAddSlot={true}
          enableKeybinds={!isAddModalOpen && authTenant === null}
        />
      </main>

      {/* ── 3. BOTTOM ACTION ARRAY (CONTROLLER / KEYBOARD LEGEND) ── */}
      <footer className="relative z-10 border-t border-[#7B2CBF]/30 bg-[#0D0B14]/80 px-6 py-4 backdrop-blur-xl sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          {/* Keybind Array */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-mono text-[11px] text-white/70">
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 items-center justify-center rounded border border-[#FFD700]/60 bg-[#FFD700]/15 px-1.5 text-[10px] font-bold text-[#FFD700]">
                ENTER / ⨉
              </span>
              <span>Select Human Controller</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="flex h-5 items-center justify-center rounded border border-[#00E5FF]/60 bg-[#00E5FF]/15 px-1.5 text-[10px] font-bold text-[#00E5FF]">
                C / △
              </span>
              <span>Config Matrix</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="flex h-5 items-center justify-center rounded border border-[#00E5FF]/80 bg-[#00E5FF]/20 px-1.5 text-[10px] font-bold text-[#00E5FF]">
                N / ▢
              </span>
              <span>Invite Referral User</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="flex h-5 items-center justify-center rounded border border-white/30 bg-white/10 px-1.5 text-[10px] font-bold text-white">
                ← →
              </span>
              <span>Traverse Carousel</span>
            </div>
          </div>

          {/* Direct return button if already in an active session */}
          {activeTenant && (
            <button
              type="button"
              onClick={() => handleCardSelected(activeTenant)}
              className="text-[10px] uppercase tracking-widest text-[#FFD700]/80 transition-colors hover:text-[#FFD700] hover:underline"
            >
              Resume Active [{activeTenant.handle}] →
            </button>
          )}
        </div>
      </footer>

      {/* Biometric & Hardware Token Decryption Modal */}
      <BiometricAuthModal
        isOpen={authTenant !== null}
        tenant={authTenant}
        onClose={() => setAuthTenant(null)}
        onAuthenticated={handleAuthenticated}
      />

      {/* Add Knight Provisioning Modal */}
      <AddKnightModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={addTenant}
      />

      {/* Shield Expand Warp Gate Animation Overlay */}
      <TenantWarpTransition stage={warpStage} targetTenant={targetTenant} />
    </div>
  );
}
