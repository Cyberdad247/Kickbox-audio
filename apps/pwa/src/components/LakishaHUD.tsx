'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useAvatarConfig } from '../context/AvatarConfigContext';
import { useBifrost } from '../context/BifrostContext';
import { useMacros } from '../context/MacroContext';
import { useTenant } from '../context/TenantContext';
import { useLakishaVoice } from '../hooks/useLakishaVoice';
import { useWakeWord } from '../hooks/useWakeWord';
import { QUERY_BUDGET_MS, TTFA_BUDGET_MS, budgetStatus, formatMs } from '../lib/telemetry';
import { speak } from '../lib/voice';
import { MacroQuickBar } from './macro/MacroQuickBar';

export type HUDDockPosition =
  | 'bottom-left'
  | 'bottom-right'
  | 'bottom-center'
  | 'top-right'
  | 'minimized-pill';

// One latency readout with a budget-colored status dot.
function TelemetryMetric({
  label,
  ms,
  budget,
}: { label: string; ms: number | null; budget: number }) {
  const status = budgetStatus(ms, budget);
  const dot =
    status === 'breach' ? 'bg-red-400' : status === 'warn' ? 'bg-amber-400' : 'bg-[#00F0FF]';
  const value =
    status === 'breach' ? 'text-red-400' : status === 'warn' ? 'text-amber-300' : 'text-white/60';
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10px]">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="text-white/35">{label}</span>
      <span className={value}>{formatMs(ms)}</span>
    </span>
  );
}

export function LakishaHUD() {
  const {
    activeTenant,
    activeCartridge,
    isKnightSwitchAllowed,
    openGateway,
    showAvatarKnightScreen,
    setShowAvatarKnightScreen,
    isAuthenticated,
    isGatewayOpen,
  } = useTenant();

  const { connected, isReconnecting, reconnectNow, state } = useBifrost();
  const { isConfigOpen, toggleConfig } = useAvatarConfig();
  const { isMacroModalOpen, toggleMacroModal, activeExecution } = useMacros();

  // Unified voice core
  const {
    input,
    setInput,
    listening,
    recognitionSupported: supported,
    voiceSupported: voiceReady,
    muted,
    speaking,
    ttfaMs,
    queryMs,
    level,
    voiced,
    isWorkletActive,
    toggleListening,
    toggleMute,
    cameraEnabled,
    toggleCamera,
    dispatch,
    error,
  } = useLakishaVoice();

  // Listen for external mute toggles
  useEffect(() => {
    const handleToggleMute = () => {
      toggleMute();
    };
    window.addEventListener('camelot:toggle-lakisha-mute', handleToggleMute);
    return () => {
      window.removeEventListener('camelot:toggle-lakisha-mute', handleToggleMute);
    };
  }, [toggleMute]);

  // Listen for external listening toggles
  useEffect(() => {
    const handleToggleListen = () => {
      toggleListening();
    };
    window.addEventListener('camelot:toggle-lakisha-listening', handleToggleListen);
    return () => {
      window.removeEventListener('camelot:toggle-lakisha-listening', handleToggleListen);
    };
  }, [toggleListening]);

  // Broadcast listening, voiced, and audio level state to visual indicators in CapsuleHost
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('camelot:lakisha-listening-state', {
        detail: { listening, voiced, level, speaking },
      }),
    );
  }, [listening, voiced, level, speaking]);

  // Optimal Docking & Snap-Back System
  const [dockPosition, setDockPosition] = useState<HUDDockPosition>('bottom-left');
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [customCoords, setCustomCoords] = useState<{ x: number; y: number } | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isSnapping, setIsSnapping] = useState(false);
  const hudRef = useRef<HTMLDivElement>(null);

  // Wake word integration
  useWakeWord(() => {
    if (!isExpanded) {
      // If minimized, restore it
      window.dispatchEvent(
        new CustomEvent('camelot:toggle-lakisha-hud', { detail: { expand: true } }),
      );
    }
    // Auto-start listening if not already listening
    if (!listening) {
      toggleListening();
    }
  }, listening);

  // Expose muted and camera state
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('camelot:lakisha-muted-state', {
        detail: { muted },
      }),
    );
  }, [muted]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('camelot:lakisha-camera-state', {
        detail: { cameraEnabled },
      }),
    );
  }, [cameraEnabled]);

  useEffect(() => {
    const handleToggleCamera = () => {
      toggleCamera();
    };
    window.addEventListener('camelot:toggle-lakisha-camera', handleToggleCamera);
    return () => {
      window.removeEventListener('camelot:toggle-lakisha-camera', handleToggleCamera);
    };
  }, [toggleCamera]);

  // Load saved dock preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('camelot_lakeisha_hud_dock');
      if (
        saved &&
        ['bottom-left', 'bottom-right', 'bottom-center', 'top-right', 'minimized-pill'].includes(
          saved,
        )
      ) {
        setDockPosition(saved as HUDDockPosition);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Listen for toggle events from Cartridge Dock
  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEv = e as CustomEvent<{ expand?: boolean }>;
      if (customEv.detail && typeof customEv.detail.expand === 'boolean') {
        setIsExpanded(customEv.detail.expand);
        if (customEv.detail.expand) {
          setDockPosition('bottom-left');
        } else {
          setDockPosition('minimized-pill');
        }
      } else {
        setIsExpanded((prev) => {
          const next = !prev;
          setDockPosition(next ? 'bottom-left' : 'minimized-pill');
          return next;
        });
      }
    };

    window.addEventListener('camelot:toggle-lakisha-hud', handleToggle);
    return () => {
      window.removeEventListener('camelot:toggle-lakisha-hud', handleToggle);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('camelot_lakeisha_hud_dock', dockPosition);
    } catch {}

    window.dispatchEvent(
      new CustomEvent('camelot:lakisha-minimized', {
        detail: { minimized: dockPosition === 'minimized-pill' || !isExpanded },
      }),
    );
  }, [dockPosition, isExpanded]);

  // Snap back to optimal workspace anchor on left under Voice Macros / Enclave
  const snapBackToOptimal = (targetPos: HUDDockPosition = 'bottom-left') => {
    setIsSnapping(true);
    setCustomCoords(null);
    setDockPosition(targetPos);
    try {
      localStorage.setItem('camelot_lakeisha_hud_dock', targetPos);
    } catch {
      // Ignore
    }
    speak(`Lakisha Knight HUD snapped left under Voice Macro & Sovereign Enclave.`);
    setTimeout(() => {
      setIsSnapping(false);
    }, 450);
  };

  // Drag handlers for freeform repositioning
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, a')) return;
    setIsDragging(true);
    const rect = hudRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = Math.max(16, Math.min(window.innerWidth - 300, e.clientX - dragOffset.x));
      const newY = Math.max(16, Math.min(window.innerHeight - 200, e.clientY - dragOffset.y));
      setCustomCoords({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    dispatch(input);
  };

  const meter = Math.min(1, level * 6);

  // Telemetry lane info
  const lane = state?.lastLane;
  const laneLabel = state?.lastRezeroed
    ? '//REZERO'
    : lane === 'REMOTE_MCP'
      ? 'REMOTE'
      : lane === 'LOCAL_TOOLS'
        ? 'LOCAL'
        : null;

  const getDockClasses = () => {
    if (isMinimized) {
      // Return static/relative classes so it sits naturally inside its parent container (the Cartridge Dock)
      return 'relative w-full z-40 mt-auto shrink-0';
    }
    if (customCoords) return '';
    switch (dockPosition) {
      case 'bottom-left':
        return 'fixed bottom-6 left-6 z-40';
      case 'bottom-center':
        return 'fixed bottom-6 left-1/2 -translate-x-1/2 z-40';
      case 'top-right':
        return 'fixed top-20 right-6 z-40';
      case 'bottom-right':
      default:
        return 'fixed bottom-6 right-24 z-40';
    }
  };

  // 1. Executive PWA Phase: Only allow Lakisha HUD to exist when executive PWA workspace is active and available
  if (!isAuthenticated || isGatewayOpen || showAvatarKnightScreen) {
    return null;
  }

  // 2. Minimized state (Magnetic snap transition)
  const isMinimized = dockPosition === 'minimized-pill' || !isExpanded;

  return (
    <aside
      ref={hudRef}
      onMouseDown={isMinimized ? undefined : handleMouseDown}
      aria-label="Lakisha Avatar Knight Heads Up Display"
      style={
        customCoords && !isMinimized
          ? {
              position: 'fixed',
              left: `${customCoords.x}px`,
              top: `${customCoords.y}px`,
              bottom: 'auto',
              right: 'auto',
              transform: 'scale(1) translate(0, 0)',
              opacity: 1,
              zIndex: 40,
            }
          : {
              transform: 'scale(1) translate(0, 0)',
              opacity: 1,
            }
      }
      className={`${getDockClasses()} select-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isSnapping ? 'scale-105 shadow-[0_0_40px_rgba(0,240,255,0.4)] ring-2 ring-[#00F0FF]' : ''
      }`}
    >
      {isMinimized ? (
        <div className="flex flex-col gap-2 w-full px-2 animate-snap-in">
          <div
            className="group relative flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-[#120D22]/60 p-2.5 transition-all duration-300 hover:border-white/30 hover:bg-[#120D22]"
            onClick={() => {
              setIsExpanded(true);
              setDockPosition('bottom-left');
            }}
            title="Deploy Voice HUD"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#00F0FF]/30 bg-black/40 text-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.2)]">
                🎙️
              </div>
              <span className="font-mono text-[10px] uppercase text-white/80 group-hover:text-white">
                Lakisha
              </span>
            </div>
            <span className="text-[9px] uppercase tracking-widest text-[#00F0FF] opacity-0 group-hover:opacity-100 transition-opacity">
              Deploy
            </span>
          </div>

          <div className="flex gap-2">
            <div
              className={`flex flex-1 items-center justify-center cursor-pointer transition-colors rounded-xl p-2 border ${
                !cameraEnabled
                  ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 text-red-400'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30 text-white/60'
              }`}
              onClick={() => toggleCamera()}
              title={cameraEnabled ? 'Disable Camera' : 'Enable Camera'}
            >
              <span className="text-sm">📹</span>
            </div>
            <div
              className={`flex flex-1 items-center justify-center cursor-pointer transition-colors rounded-xl p-2 border ${
                muted
                  ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 text-red-400'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30 text-white/60'
              }`}
              onClick={() => toggleMute()}
              title={muted ? 'Unmute Voice HUD' : 'Mute Voice HUD'}
            >
              <span className="text-sm">{muted ? '🔇' : '🔊'}</span>
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className={`w-[min(92vw,28rem)] rounded-2xl border bg-[#0A0714]/90 p-4 text-white shadow-[0_0_35px_rgba(0,240,255,0.2)] backdrop-blur-xl transition-all ${
            speaking
              ? 'border-[#00F0FF] shadow-[0_0_40px_rgba(0,240,255,0.35)]'
              : listening && voiced
                ? 'border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)]'
                : listening
                  ? 'border-purple-400/60'
                  : 'border-[#00F0FF]/30'
          }`}
        >
          {/* Header Bar: Knight Avatar Badge & Drag Control */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
            <div className="flex items-center gap-2.5">
              {/* Active Knight Icon / Gateway Trigger */}
              <button
                type="button"
                onClick={() => {
                  if (isKnightSwitchAllowed) {
                    openGateway();
                  } else {
                    setShowAvatarKnightScreen(true);
                  }
                }}
                className="group relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/10 text-lg shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all hover:border-[#00F0FF] hover:scale-105"
                title="Click to switch active Cyber-Knight Avatar"
              >
                <span>{activeTenant?.icon || '🛡️'}</span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-black ${
                    speaking
                      ? 'bg-[#00F0FF] animate-ping'
                      : listening
                        ? 'bg-purple-400 animate-pulse'
                        : connected
                          ? 'bg-emerald-400'
                          : 'bg-amber-400'
                  }`}
                />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    {activeTenant?.name || 'Ambassador Lakisha'}
                  </span>
                  <span className="rounded border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-1.5 py-0.2 font-mono text-[8px] font-bold text-[#00F0FF]">
                    SOLE HUD
                  </span>
                </div>
                <p className="font-mono text-[9px] text-white/50">
                  {activeCartridge
                    ? `Cartridge: ${activeCartridge.code}`
                    : 'Unified Cyber-Knight Engine'}
                </p>
              </div>
            </div>

            {/* Quick Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => snapBackToOptimal('bottom-left')}
                title="Snap left under Voice Macro & Sovereign Enclave"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-white/70 hover:border-[#00F0FF] hover:text-[#00F0FF] transition-all"
              >
                📍
              </button>
              <button
                type="button"
                onClick={() => {
                  setDockPosition('minimized-pill');
                  setIsExpanded(false);
                }}
                title="Minimize HUD to Pill"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-white/70 hover:border-[#FFD700] hover:text-[#FFD700] transition-all"
              >
                ➖
              </button>
            </div>
          </div>

          {/* Core Input & Mic Section */}
          <div className="flex items-center gap-2">
            {/* Mic trigger */}
            {supported && (
              <button
                type="button"
                onClick={toggleListening}
                aria-pressed={listening}
                aria-label={listening ? 'Stop listening' : 'Start voice capture'}
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all ${
                  listening
                    ? 'border-purple-400 bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                    : 'border-white/15 bg-white/5 text-white/80 hover:border-[#00F0FF] hover:text-[#00F0FF]'
                }`}
              >
                {listening && voiced && (
                  <span className="absolute inset-0 animate-ping rounded-xl bg-purple-500/30" />
                )}
                🎙️
              </button>
            )}

            {/* Input Field */}
            <div className="relative flex-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  speaking
                    ? 'Speaking…'
                    : listening
                      ? 'Listening…'
                      : 'Speak or type voice command...'
                }
                className="w-full rounded-xl border border-white/10 bg-black/60 px-3 py-2 font-sans text-xs text-white placeholder:text-white/30 focus:border-[#00F0FF] focus:outline-none"
              />

              {/* Live Visual Waveform Overlay */}
              {listening && (
                <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 z-10 pointer-events-none">
                  <div
                    className="w-1 bg-purple-400 rounded-full transition-all duration-[50ms]"
                    style={{
                      height: `${Math.max(4, meter * 16)}px`,
                      opacity: meter > 0.1 ? 1 : 0.4,
                    }}
                  />
                  <div
                    className="w-1 bg-purple-400 rounded-full transition-all duration-[75ms]"
                    style={{
                      height: `${Math.max(6, meter * 24)}px`,
                      opacity: meter > 0.1 ? 1 : 0.4,
                    }}
                  />
                  <div
                    className="w-1 bg-purple-400 rounded-full transition-all duration-[50ms]"
                    style={{
                      height: `${Math.max(8, meter * 32)}px`,
                      opacity: meter > 0.1 ? 1 : 0.4,
                    }}
                  />
                  <div
                    className="w-1 bg-[#00F0FF] rounded-full transition-all duration-[75ms]"
                    style={{
                      height: `${Math.max(6, meter * 28)}px`,
                      opacity: meter > 0.1 ? 1 : 0.4,
                    }}
                  />
                  <div
                    className="w-1 bg-[#00F0FF] rounded-full transition-all duration-[50ms]"
                    style={{
                      height: `${Math.max(4, meter * 18)}px`,
                      opacity: meter > 0.1 ? 1 : 0.4,
                    }}
                  />
                </div>
              )}
              {/* Live VAD level meter */}
              {listening && (
                <span
                  className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-purple-400 transition-[width] duration-75"
                  style={{ width: `${meter * 100}%` }}
                />
              )}
            </div>

            {/* Camera toggle */}
            {voiceReady && (
              <button
                type="button"
                onClick={toggleCamera}
                aria-pressed={cameraEnabled}
                aria-label={cameraEnabled ? 'Disable Camera' : 'Enable Camera'}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all ${
                  !cameraEnabled
                    ? 'border-red-500/40 bg-red-950/30 text-red-400'
                    : 'border-[#00F0FF]/40 bg-[#00F0FF]/10 text-[#00F0FF] hover:border-[#00F0FF] hover:bg-[#00F0FF]/20'
                }`}
              >
                📹
              </button>
            )}

            {/* Mute toggle */}
            {voiceReady && (
              <button
                type="button"
                onClick={toggleMute}
                aria-pressed={muted}
                aria-label={muted ? 'Unmute Lakisha' : 'Mute Lakisha'}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all ${
                  muted
                    ? 'border-red-500/40 bg-red-950/30 text-red-400'
                    : 'border-white/15 bg-white/5 text-white/80 hover:border-[#00F0FF] hover:text-[#00F0FF]'
                }`}
              >
                {muted ? '🔇' : '🔊'}
              </button>
            )}

            {/* Macro Studio Shortcut Button */}
            <button
              type="button"
              onClick={toggleMacroModal}
              aria-label="Macro Studio"
              title="Voice Macros & Shortcut Studio (Ctrl+Shift+M / Alt+M)"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all ${
                isMacroModalOpen
                  ? 'border-[#FFD700] bg-[#FFD700]/25 text-[#FFD700]'
                  : 'border-white/15 bg-white/5 text-white/80 hover:border-[#FFD700] hover:text-[#FFD700]'
              }`}
            >
              ⚡
            </button>

            {/* Config Button */}
            <button
              type="button"
              onClick={toggleConfig}
              aria-label="Avatar Configuration"
              title="Configure Avatar Speech & Transcribe"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all ${
                isConfigOpen
                  ? 'border-[#00F0FF] bg-[#00F0FF]/25 text-[#00F0FF]'
                  : 'border-white/15 bg-white/5 text-white/80 hover:border-[#00F0FF] hover:text-[#00F0FF]'
              }`}
            >
              ⚙️
            </button>

            <button
              type="submit"
              className="rounded-xl border border-[#00F0FF] bg-[#00F0FF]/20 px-3 py-2 font-mono text-xs font-bold text-[#00F0FF] hover:bg-[#00F0FF]/30 transition-all"
            >
              Send
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 font-mono text-[10px] text-red-400">
              <span className="shrink-0 text-red-500">⚠️</span>
              <span className="leading-tight">{error}</span>
            </div>
          )}

          {/* Live Macro Execution Banner */}
          {activeExecution && (
            <div className="mt-2.5 flex items-center justify-between rounded-lg border border-[#FFD700]/40 bg-[#FFD700]/10 px-3 py-1.5 font-mono text-[10px] text-[#FFD700] animate-pulse">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#FFD700] animate-ping" />
                <span>
                  ⚡ MACRO: <strong>{activeExecution.macro.name}</strong>
                </span>
              </div>
              <span className="text-[9px] text-white/60">
                Step {activeExecution.currentStep}/{activeExecution.totalSteps}
              </span>
            </div>
          )}

          {/* Quick Macro Bar */}
          <div className="mt-2.5 border-t border-white/10 pt-2">
            <MacroQuickBar />
          </div>

          {/* Docking Presets & Telemetry Strip */}
          <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 font-mono text-[9px]">
            <div className="flex items-center gap-2">
              <TelemetryMetric label="TTFA" ms={ttfaMs} budget={TTFA_BUDGET_MS} />
              <TelemetryMetric label="Query" ms={queryMs} budget={QUERY_BUDGET_MS} />
              {isWorkletActive && (
                <span className="rounded bg-cyan-400/20 px-1 py-0.2 text-cyan-300">⚡ VAD</span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[8px] text-white/50">
              <button
                type="button"
                onClick={() => snapBackToOptimal('bottom-left')}
                className={`px-1 py-0.5 rounded border transition-all ${
                  dockPosition === 'bottom-left'
                    ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10 font-bold'
                    : 'border-white/10 hover:text-white'
                }`}
              >
                Bottom-Left
              </button>
              <button
                type="button"
                onClick={() => snapBackToOptimal('bottom-center')}
                className={`px-1 py-0.5 rounded border transition-all ${
                  dockPosition === 'bottom-center'
                    ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10 font-bold'
                    : 'border-white/10 hover:text-white'
                }`}
              >
                Center
              </button>
              <button
                type="button"
                onClick={() => snapBackToOptimal('bottom-right')}
                className={`px-1 py-0.5 rounded border transition-all ${
                  dockPosition === 'bottom-right'
                    ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10 font-bold'
                    : 'border-white/10 hover:text-white'
                }`}
              >
                Right
              </button>
            </div>
          </div>
        </form>
      )}
    </aside>
  );
}
