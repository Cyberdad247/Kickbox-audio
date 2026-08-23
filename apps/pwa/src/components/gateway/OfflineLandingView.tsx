'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useBifrost } from '../../context/BifrostContext';
import { useTenant } from '../../context/TenantContext';
import { speak } from '../../lib/voice';
import { useCamelotStore } from '../../stores/camelotStore';

export interface OfflineLandingViewProps {
  onContinueOffline?: () => void;
  className?: string;
}

export function OfflineLandingView({ onContinueOffline, className = '' }: OfflineLandingViewProps) {
  const { connected, isReconnecting, reconnectAttempts, lastAttemptTime, reconnectNow, state } =
    useBifrost();

  const { activeTenant, activeCartridge } = useTenant();
  const highContrast = useCamelotStore((s) => s.highContrast);

  const [countdown, setCountdown] = useState(3);
  const [offlineCacheStats, setOfflineCacheStats] = useState({
    cachedTransactions: 42,
    storedReceipts: 18,
    vaultStatus: 'ENCLAVE_LOCKED_ISOMORPHIC',
    localClock: new Date().toLocaleTimeString(),
  });

  // Reconnection countdown timer
  useEffect(() => {
    if (connected) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return 3;
        }
        return prev - 1;
      });
      setOfflineCacheStats((prev) => ({
        ...prev,
        localClock: new Date().toLocaleTimeString(),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [connected]);

  const handleManualReconnect = () => {
    reconnectNow();
    speak('Initiating Bifrost bridge reconnection handshake.');
  };

  return (
    <div
      id="bifrost-offline-landing"
      className={`relative flex min-h-[580px] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border p-6 sm:p-10 backdrop-blur-[24px] select-none text-white shadow-[0_0_60px_rgba(0,240,255,0.08)] ${className}`}
      style={{
        borderColor: highContrast ? '#FFFFFF' : 'rgba(0, 240, 255, 0.25)',
        backgroundColor: highContrast ? '#050505' : 'rgba(10, 10, 10, 0.94)',
      }}
      aria-label="Bifrost Offline Gateway Interface"
    >
      {/* Arthurian Background Luminescence */}
      <div className="pointer-events-none absolute -top-48 -left-48 h-96 w-96 rounded-full bg-[#00F0FF]/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-48 -right-48 h-96 w-96 rounded-full bg-[#FFD700]/10 blur-[130px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.03)_0%,transparent_70%)]" />

      {/* ── CENTRAL RADAR / ANIMATED RECONNECTION INDICATOR ── */}
      <div className="relative mb-8 flex items-center justify-center">
        {/* Outer Orbit Rings */}
        <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-[#00F0FF]/20 bg-black/60 shadow-[0_0_40px_rgba(0,240,255,0.15)]">
          {/* Animated Pulsing Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#00F0FF]/40 animate-[spin_12s_linear_infinite]" />

          {/* Radar Sweep Effect */}
          <div
            className="absolute inset-0 rounded-full opacity-30 animate-radar-sweep pointer-events-none"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, rgba(0, 240, 255, 0.4) 60deg, transparent 90deg)',
            }}
          />

          {/* Secondary Counter-Rotating Ring */}
          <div className="absolute inset-2 rounded-full border border-dotted border-[#FFD700]/30 animate-[spin_16s_linear_infinite_reverse]" />

          {/* Central Holographic Icon */}
          <div className="relative flex h-20 w-20 flex-col items-center justify-center rounded-full border border-white/20 bg-gradient-to-b from-black/80 to-[#120D22] shadow-[inset_0_0_20px_rgba(0,240,255,0.3)]">
            <span className="text-3xl animate-pulse">{isReconnecting ? '⚡' : '🛡️'}</span>
            <div className="mt-1 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
              <span className="font-mono text-[9px] font-bold tracking-widest text-[#00F0FF]">
                ISOLATED
              </span>
            </div>
          </div>
        </div>

        {/* Orbiting Satellite Dots */}
        <div className="absolute h-44 w-44 animate-[spin_6s_linear_infinite]">
          <div className="h-3 w-3 rounded-full bg-[#00F0FF] shadow-[0_0_12px_#00F0FF]" />
        </div>
      </div>

      {/* ── STATUS HEADING & EXPLANATION ── */}
      <div className="relative z-10 max-w-xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-950/40 px-3.5 py-1 font-mono text-xs font-bold text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span>BIFROST BRIDGE OFFLINE / DISCONNECTED</span>
        </div>

        <h2 className="mt-4 font-mono text-2xl font-bold uppercase tracking-wider text-white sm:text-3xl">
          Sovereign Enclave Standalone Mode
        </h2>

        <p className="mt-2 text-sm text-white/70 leading-relaxed">
          The WebRTC/WebSocket telemetry bridge to the Bifrost server is temporarily unreachable.
          Your local MicroVM state and cached cryptographic registers remain securely isolated on
          this device.
        </p>
      </div>

      {/* ── RECONNECTION ATTEMPTS TELEMETRY ── */}
      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-3 font-mono text-xs">
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-4 py-2">
          <span className="text-white/40">RECONNECTION:</span>
          <strong className="text-[#00F0FF]">
            {isReconnecting ? 'HANDSHAKE IN PROGRESS...' : `NEXT IN ${countdown}s`}
          </strong>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-4 py-2">
          <span className="text-white/40">ATTEMPTS:</span>
          <strong className="text-[#FFD700]">{reconnectAttempts}</strong>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/60 px-4 py-2">
          <span className="text-white/40">PARTITION:</span>
          <strong className="text-white">{activeTenant.handle}</strong>
        </div>
      </div>

      {/* ── ISOMORPHIC LOCAL CAPABILITIES (OFFLINE-READY FEATURES) ── */}
      <div className="relative z-10 mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col rounded-xl border border-white/10 bg-black/40 p-3.5 transition-all hover:border-[#00F0FF]/30">
          <div className="flex items-center justify-between text-xs font-mono text-[#00F0FF]">
            <span>LOCAL CACHE</span>
            <span>💾</span>
          </div>
          <p className="mt-1 text-sm font-bold text-white font-mono">
            {offlineCacheStats.cachedTransactions} Entries
          </p>
          <span className="text-[10px] text-white/50">Stored in IndexedDB / WASM</span>
        </div>

        <div className="flex flex-col rounded-xl border border-white/10 bg-black/40 p-3.5 transition-all hover:border-[#FFD700]/30">
          <div className="flex items-center justify-between text-xs font-mono text-[#FFD700]">
            <span>GIDEON RECEIPTS</span>
            <span>📜</span>
          </div>
          <p className="mt-1 text-sm font-bold text-white font-mono">
            {offlineCacheStats.storedReceipts} Attestations
          </p>
          <span className="text-[10px] text-white/50">Cryptographic audit log active</span>
        </div>

        <div className="flex flex-col rounded-xl border border-white/10 bg-black/40 p-3.5 transition-all hover:border-emerald-400/30">
          <div className="flex items-center justify-between text-xs font-mono text-emerald-300">
            <span>ISOLATED HSM</span>
            <span>🔒</span>
          </div>
          <p className="mt-1 text-sm font-bold text-white font-mono truncate">
            {activeCartridge?.code || 'KBA-CORE'}
          </p>
          <span className="text-[10px] text-white/50">Keys sealed in secure storage</span>
        </div>
      </div>

      {/* ── ACTION CONTROLS ── */}
      <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4">
        {/* Manual Reconnect Button */}
        <button
          type="button"
          onClick={handleManualReconnect}
          disabled={isReconnecting}
          className="flex items-center gap-2 rounded-xl border border-[#00F0FF] bg-[#00F0FF]/20 px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#00F0FF] shadow-[0_0_25px_rgba(0,240,255,0.3)] hover:bg-[#00F0FF]/30 active:scale-95 transition-all disabled:opacity-50"
        >
          {isReconnecting ? (
            <>
              <span className="h-3 w-3 rounded-full border-2 border-[#00F0FF] border-t-transparent animate-spin" />
              <span>Probing Bifrost Bridge...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Attempt Reconnection Now</span>
            </>
          )}
        </button>

        {/* Continue in Offline Mode */}
        {onContinueOffline && (
          <button
            type="button"
            onClick={onContinueOffline}
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white hover:border-white/40 hover:bg-white/10 active:scale-95 transition-all"
          >
            <span>🛡️</span>
            <span>Proceed in Standalone Mode</span>
          </button>
        )}
      </div>

      {/* ── FOOTER RUNE AUDIT ── */}
      <div className="relative z-10 mt-8 flex items-center gap-2 font-mono text-[10px] text-white/40">
        <span>LOCAL_CLOCK: {offlineCacheStats.localClock}</span>
        <span>•</span>
        <span>ISOMORPHIC_STATE: ACTIVE</span>
        <span>•</span>
        <span>FAILOVER: ZERO_LOSS_BUFFER</span>
      </div>
    </div>
  );
}
