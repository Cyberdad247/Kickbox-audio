'use client';

import type React from 'react';
import { useState } from 'react';
import { useAvatarConfig } from '../../context/AvatarConfigContext';
import { useBifrost } from '../../context/BifrostContext';
import { useMacros } from '../../context/MacroContext';
import { useLakishaVoice } from '../../hooks/useLakishaVoice';
import { LakishaAvatar } from './LakishaAvatar';

export interface SovereignEnclaveStandaloneViewProps {
  isPopup?: boolean;
  onMinimize?: () => void;
  onLaunchPopup?: () => void;
}

export function SovereignEnclaveStandaloneView({
  isPopup = false,
  onMinimize,
  onLaunchPopup,
}: SovereignEnclaveStandaloneViewProps) {
  const {
    connected,
    connect,
    disconnect,
    isSpeaking,
    voiced,
    level,
    mode,
    error,
    transcript,
    setTranscript,
    dispatch,
    speaking,
    muted,
    toggleMute,
    ttfaMs,
    queryMs,
  } = useLakishaVoice({ continuous: true });

  const { isConfigOpen, toggleConfig } = useAvatarConfig();
  const { macros, executeMacro } = useMacros();
  const { state: bifrostState } = useBifrost();

  const [activeKnight, setActiveKnight] = useState<string>('Ambassador Lakisha');
  const [vadThreshold, setVadThreshold] = useState<number>(35);
  const [audioGain, setAudioGain] = useState<number>(1.2);
  const [manualInput, setManualInput] = useState<string>('');

  const statusLabel = isSpeaking
    ? 'Lakisha Audio Active'
    : mode === 'vad-only'
      ? 'VAD Only Failsafe'
      : connected
        ? 'Audio Bridge Standby'
        : 'Awaiting Audio Bypass';

  const handleManualDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    dispatch(manualInput.trim());
    setManualInput('');
  };

  return (
    <div
      className={`relative w-full flex flex-col font-sans transition-all duration-300 ${
        isPopup
          ? 'max-w-4xl w-full border-2 border-[#00F0FF]/50 bg-[#0A0714]/95 p-6 sm:p-8 rounded-3xl text-white shadow-[0_0_90px_rgba(0,240,255,0.35)] backdrop-blur-2xl'
          : 'border border-[#00F0FF]/30 bg-[#0A0714]/90 p-6 rounded-2xl text-white shadow-[0_0_30px_rgba(0,240,255,0.15)] backdrop-blur-xl'
      }`}
    >
      {/* Background ambient light */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-[#00F0FF]/10 blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-[#FFD700]/10 blur-[90px]" />

      {/* ── HEADER BAR ── */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#00F0FF]/40 bg-[#00F0FF]/15 text-2xl shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <span>🏰</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-mono text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                Sovereign Enclave {isPopup ? '— Standalone Pop-up' : '— Voice Macro Tab'}
              </h2>
              <span className="rounded-full border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-2 py-0.5 font-mono text-[9px] font-bold text-[#00F0FF]">
                RING 1 ENCLAVE
              </span>
            </div>
            <p className="mt-0.5 text-xs text-white/60">
              Isolated audio VAD enclave, Cyber-Knight voice dispatcher & real-time telemetry
              bridge.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {isPopup ? (
            <button
              type="button"
              onClick={onMinimize}
              className="flex items-center gap-2 rounded-xl border border-[#FFD700] bg-[#FFD700]/20 px-4 py-2 font-mono text-xs font-bold text-[#FFD700] hover:bg-[#FFD700]/30 hover:border-[#FFD700] transition-all shadow-[0_0_20px_rgba(255,215,0,0.3)]"
            >
              <span>➖</span>
              <span>Minimize to Voice Macro Tab</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onLaunchPopup}
              className="flex items-center gap-2 rounded-xl border border-[#00F0FF] bg-[#00F0FF]/20 px-4 py-2 font-mono text-xs font-bold text-[#00F0FF] hover:bg-[#00F0FF]/30 hover:border-[#00F0FF] transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)]"
            >
              <span>🚀</span>
              <span>Push into Standalone Pop-up Mode</span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleConfig}
            title="Configure Avatar Presets & Speech Synthesis"
            className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
              isConfigOpen
                ? 'border-[#FFD700] bg-[#FFD700]/20 text-[#FFD700]'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-[#FFD700] hover:text-[#FFD700]'
            }`}
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* ── CORE ENCLAVE MAIN STAGE ── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Avatar & Live Audio Control */}
        <div className="lg:col-span-5 flex flex-col items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-6 text-center">
          <div className="relative my-2 flex flex-col items-center">
            {/* Lakisha Avatar with live audio state */}
            <div className="relative">
              <LakishaAvatar speaking={isSpeaking || speaking} connected={connected} />
              {(isSpeaking || speaking) && (
                <div className="pointer-events-none absolute -inset-4 rounded-full border-2 border-[#00F0FF] animate-ping opacity-30" />
              )}
            </div>

            <h3 className="mt-4 font-mono text-sm font-bold uppercase tracking-wider text-white">
              {activeKnight}
            </h3>

            {/* Live status badge */}
            <div className="mt-2 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 font-mono text-[11px]">
              <span
                className={`h-2 w-2 rounded-full ${
                  isSpeaking
                    ? 'bg-[#00F0FF] animate-pulse shadow-[0_0_10px_#00F0FF]'
                    : connected
                      ? 'bg-emerald-400'
                      : 'bg-amber-400'
                }`}
              />
              <span className="text-white/80">{statusLabel}</span>
            </div>
          </div>

          {/* Autoplay Gate & Audio Controls */}
          <div className="w-full mt-4 space-y-2">
            {!connected ? (
              <button
                type="button"
                onClick={connect}
                className="w-full rounded-xl border border-[#FFD700] bg-[#FFD700]/20 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.25)] hover:bg-[#FFD700]/30 transition-all flex items-center justify-center gap-2"
              >
                <span>🎙️</span>
                <span>{error ? `Error: ${error} — Retry` : 'Tap to Connect Audio Bridge'}</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`rounded-xl border py-2 px-3 font-bold transition-all ${
                    muted
                      ? 'border-red-500/50 bg-red-950/40 text-red-300'
                      : 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                  }`}
                >
                  {muted ? '🔇 Muted' : '🔊 Audio Active'}
                </button>
                <button
                  type="button"
                  onClick={disconnect}
                  className="rounded-xl border border-white/10 bg-white/5 py-2 px-3 font-bold text-white/70 hover:border-red-400 hover:text-red-300 transition-all"
                >
                  ⏹️ Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: VAD Telemetry, Waveform & Command Console */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          {/* Waveform & Mic Energy Level */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-[10px] uppercase tracking-wider font-bold">
                Real-Time Mic VAD Energy Level
              </span>
              <span className="text-[#00F0FF] font-bold text-[10px]">
                {Math.round(level * 100)}%
              </span>
            </div>

            {/* Animated Energy Bar */}
            <div className="h-3 w-full rounded-full bg-black/60 border border-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-[#00F0FF] to-[#FFD700] transition-all duration-75"
                style={{ width: `${Math.min(100, Math.max(0, level * 100))}%` }}
              />
            </div>

            {/* Quick Sensitivity Controls */}
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/10 text-[11px]">
              <div>
                <label className="text-white/50 text-[10px]">VAD Noise Floor Threshold</label>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={vadThreshold}
                  onChange={(e) => setVadThreshold(Number(e.target.value))}
                  className="w-full accent-[#00F0FF] mt-1"
                />
              </div>
              <div>
                <label className="text-white/50 text-[10px]">
                  Audio Pre-Amp Gain ({audioGain}x)
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={audioGain}
                  onChange={(e) => setAudioGain(Number(e.target.value))}
                  className="w-full accent-[#FFD700] mt-1"
                />
              </div>
            </div>
          </div>

          {/* Transcript & Command Telemetry Readout */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-2">
                <span className="text-[#00F0FF] font-bold text-[10px] uppercase tracking-wider">
                  Live Voice Recognition Feed
                </span>
                {ttfaMs && <span className="text-emerald-400 text-[10px]">TTFA: {ttfaMs}ms</span>}
              </div>

              <div className="p-3 rounded-xl border border-white/5 bg-black/60 min-h-[60px] text-white/80 italic text-xs mb-3">
                {transcript ||
                  (connected
                    ? 'Awaiting spoken voice command...'
                    : 'Connect audio bridge to start listening.')}
              </div>
            </div>

            {/* Manual Voice Dispatch Form */}
            <form onSubmit={handleManualDispatch} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Or type voice command (e.g. 'morning briefing')..."
                className="flex-1 rounded-xl border border-white/10 bg-black/60 px-3 py-2 text-xs text-white focus:border-[#00F0FF] focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl border border-[#00F0FF] bg-[#00F0FF]/20 px-4 py-2 font-mono text-xs font-bold text-[#00F0FF] hover:bg-[#00F0FF]/30 transition-all"
              >
                Dispatch
              </button>
            </form>
          </div>

          {/* Quick Voice Macro Triggers */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs">
            <span className="text-white/50 text-[10px] uppercase tracking-wider font-bold mb-2 block">
              Quick Enclave Routines
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => dispatch('morning briefing')}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-[10px] font-bold text-white/80 hover:border-[#00F0FF] hover:text-[#00F0FF] transition-all"
              >
                ⚡ Briefing
              </button>
              <button
                type="button"
                onClick={() => dispatch('audit citadel')}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-[10px] font-bold text-white/80 hover:border-[#FFD700] hover:text-[#FFD700] transition-all"
              >
                🛡️ Audit Citadel
              </button>
              <button
                type="button"
                onClick={() => dispatch('emergency freeze')}
                className="rounded-lg border border-red-500/30 bg-red-950/20 p-2 text-[10px] font-bold text-red-300 hover:border-red-400 transition-all"
              >
                🚨 Freeze
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
