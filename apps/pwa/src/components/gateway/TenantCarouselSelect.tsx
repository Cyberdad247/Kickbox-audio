'use client';

import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { speak } from '../../lib/voice';

export interface TenantCarouselSelectProps {
  onSelectTenantComplete: () => void;
  onOpenArmoryCustomizer?: () => void;
}

export function TenantCarouselSelect({
  onSelectTenantComplete,
  onOpenArmoryCustomizer,
}: TenantCarouselSelectProps) {
  const { tenants, activeTenant, switchTenant } = useTenant();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [passphrase, setPassphrase] = useState<string>('');
  const [passphraseError, setPassphraseError] = useState<string | null>(null);
  const [isDissolving, setIsDissolving] = useState<boolean>(false);
  const [isCreatingTenant, setIsCreatingTenant] = useState<boolean>(false);
  const [newTenantHandle, setNewTenantHandle] = useState<string>('');

  const currentSelectedTenant = tenants[selectedIndex] || activeTenant;

  const handleNext = () => {
    setSelectedIndex((prev) => (prev + 1) % tenants.length);
    setPassphrase('');
    setPassphraseError(null);
  };

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev - 1 + tenants.length) % tenants.length);
    setPassphrase('');
    setPassphraseError(null);
  };

  const validatePassphrase = (input: string) => {
    // Local Zod-style regex validation for tenant authentication
    if (input.length < 3) {
      return 'Passphrase must be at least 3 characters.';
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
      return 'Passphrase may only contain letters, numbers, and dashes.';
    }
    return null;
  };

  const handleConfirmTenant = () => {
    const error = validatePassphrase(passphrase);
    if (error) {
      setPassphraseError(error);
      return;
    }

    setPassphraseError(null);
    setIsDissolving(true);
    speak(`Attaching to Sovereign partition ${currentSelectedTenant.handle}.`);

    setTimeout(() => {
      switchTenant(currentSelectedTenant.tenantId);
      onSelectTenantComplete();
    }, 900);
  };

  return (
    <div
      id="tenant-carousel-root"
      className="relative flex min-h-[600px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-[#00F0FF]/25 bg-[#0A0A0A]/95 p-6 backdrop-blur-2xl text-white shadow-[0_0_60px_rgba(0,240,255,0.1)]"
    >
      {/* Background 3D Radial Grid */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,240,255,0.08)_0%,transparent_70%)]" />
      <div className="pointer-events-none absolute -top-40 -left-40 h-80 w-80 rounded-full bg-[#9D4EDD]/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[#FFD700]/15 blur-[120px]" />

      {/* Header */}
      <div className="relative z-10 mb-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD700]/40 bg-[#FFD700]/10 px-3.5 py-1 font-mono text-xs font-bold text-[#FFD700]">
          <span>⚔️</span>
          <span>STAGE 2: TENANT CAROUSEL · IDENTITY SELECTION</span>
        </div>
        <h2 className="mt-3 font-display text-2xl font-bold uppercase tracking-[0.2em] text-white sm:text-3xl">
          The Round Table of Sovereign Seals
        </h2>
        <p className="mt-1 text-xs text-white/60">
          Select your heraldic partition seal to establish microVM memory isolation.
        </p>
      </div>

      {/* ── 3D HERALDIC CAROUSEL ── */}
      <div className="relative z-10 flex w-full max-w-4xl items-center justify-center gap-4 sm:gap-8">
        {/* Previous Button */}
        <button
          type="button"
          onClick={handlePrev}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/60 font-mono text-lg text-white/70 hover:border-[#00F0FF] hover:text-[#00F0FF] transition-all"
        >
          ‹
        </button>

        {/* Carousel Cards View */}
        <div className="relative flex min-h-[340px] w-full max-w-md items-center justify-center perspective-[1000px]">
          <div
            className={`relative flex w-full flex-col items-center rounded-2xl border p-6 backdrop-blur-xl transition-all duration-700 ${
              isDissolving
                ? 'scale-90 opacity-0 blur-md translate-y-6 shadow-[0_0_80px_#00F0FF]'
                : 'scale-100 opacity-100'
            }`}
            style={{
              borderColor: '#00F0FF',
              background:
                'linear-gradient(180deg, rgba(18, 13, 34, 0.95) 0%, rgba(10, 10, 10, 0.98) 100%)',
              boxShadow: '0 0 35px rgba(0, 240, 255, 0.25), inset 0 0 20px rgba(0, 240, 255, 0.05)',
            }}
          >
            {/* Heraldic Shield Seal */}
            <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-[#FFD700] bg-gradient-to-b from-[#251A3D] to-[#0A0A16] text-5xl shadow-[0_0_25px_rgba(255,215,0,0.4)]">
              <span>{currentSelectedTenant.avatar}</span>
              <span className="absolute -bottom-2 -right-2 rounded bg-black/80 border border-[#00F0FF] px-1.5 py-0.5 font-mono text-[9px] text-[#00F0FF]">
                {currentSelectedTenant.clearance}
              </span>
            </div>

            {/* Tenant Title & Partition ID */}
            <h3 className="font-display text-xl font-bold uppercase tracking-wider text-white">
              {currentSelectedTenant.handle}
            </h3>
            <span className="mt-1 font-mono text-[10px] text-[#00F0FF] tracking-widest uppercase">
              PARTITION: {currentSelectedTenant.tenantId}
            </span>
            <p className="mt-2 text-center text-xs text-white/60">{currentSelectedTenant.role}</p>

            {/* MicroVM Metrics */}
            <div className="mt-4 grid w-full grid-cols-3 gap-2 border-t border-white/10 pt-3 font-mono text-[10px]">
              <div className="flex flex-col items-center">
                <span className="text-white/40">LATENCY</span>
                <span className="text-[#00F0FF] font-bold">{currentSelectedTenant.latency}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-white/40">MEMORY</span>
                <span className="text-[#FFD700] font-bold">
                  {currentSelectedTenant.memory.used} GB
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-white/40">SYNC</span>
                <span className="text-emerald-400 font-bold">{currentSelectedTenant.coreSync}</span>
              </div>
            </div>

            {/* ── SECURITY INTERVENTION: PASSPHRASE INPUT ── */}
            <div className="mt-5 w-full">
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-white/50">
                Low-Energy Passphrase Validation
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => {
                    setPassphrase(e.target.value);
                    setPassphraseError(null);
                  }}
                  placeholder="Enter partition key..."
                  className="w-full rounded-xl border border-white/20 bg-black/60 px-3.5 py-2 font-mono text-xs text-white placeholder-white/30 focus:border-[#FFD700] focus:bg-[#1E1730] focus:shadow-[0_0_15px_rgba(255,215,0,0.3)] focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={handleConfirmTenant}
                  className="absolute right-1.5 top-1.5 rounded-lg border border-[#00F0FF] bg-[#00F0FF]/20 px-3 py-1 font-mono text-[10px] font-bold uppercase text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black transition-all"
                >
                  Confirm
                </button>
              </div>

              {passphraseError && (
                <p className="mt-1 font-mono text-[10px] text-red-400 animate-fadeIn">
                  ⚠️ {passphraseError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={handleNext}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/60 font-mono text-lg text-white/70 hover:border-[#00F0FF] hover:text-[#00F0FF] transition-all"
        >
          ›
        </button>
      </div>

      {/* ── NEW TENANT CREATION / FORGE TRIGGER ── */}
      <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setIsCreatingTenant(!isCreatingTenant)}
          className="flex items-center gap-2 rounded-xl border border-[#FFD700]/40 bg-[#FFD700]/10 px-4 py-2 font-mono text-xs font-bold uppercase text-[#FFD700] hover:bg-[#FFD700]/20 transition-all"
        >
          <span>🔨</span>
          <span>Forge New Tenant Seal</span>
        </button>

        {onOpenArmoryCustomizer && (
          <button
            type="button"
            onClick={onOpenArmoryCustomizer}
            className="flex items-center gap-2 rounded-xl border border-[#9D4EDD]/40 bg-[#9D4EDD]/10 px-4 py-2 font-mono text-xs font-bold uppercase text-[#D8B4FE] hover:bg-[#9D4EDD]/20 transition-all"
          >
            <span>🛡️</span>
            <span>Enter The Armory</span>
          </button>
        )}
      </div>

      {/* New Tenant Drawer */}
      {isCreatingTenant && (
        <div className="relative z-20 mt-4 flex w-full max-w-md items-center gap-2 rounded-xl border border-white/20 bg-black/80 p-3 animate-fadeIn">
          <input
            type="text"
            value={newTenantHandle}
            onChange={(e) => setNewTenantHandle(e.target.value)}
            placeholder="New Tenant Handle (e.g. SIR_GALAHAD)..."
            className="flex-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 font-mono text-xs text-white focus:border-[#00F0FF] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              if (newTenantHandle.trim()) {
                speak(`New Sovereign seal for ${newTenantHandle} forged.`);
                setIsCreatingTenant(false);
              }
            }}
            className="rounded-lg border border-emerald-400 bg-emerald-500/20 px-3 py-1.5 font-mono text-xs font-bold uppercase text-emerald-300 hover:bg-emerald-500/30"
          >
            Register
          </button>
        </div>
      )}
    </div>
  );
}
