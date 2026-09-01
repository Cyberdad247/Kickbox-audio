'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLakishaVoice } from '../../hooks/useLakishaVoice';

export interface VoiceWaveformIndicatorProps {
  compact?: boolean;
  className?: string;
  showTranscript?: boolean;
}

export function VoiceWaveformIndicator({
  compact = false,
  className = '',
  showTranscript = false,
}: VoiceWaveformIndicatorProps) {
  const {
    listening,
    voiced,
    level,
    speaking,
    transcript,
    toggleListening,
    recognitionSupported,
    voiceSupported,
    error,
  } = useLakishaVoice();

  const [externalListening, setExternalListening] = useState(listening);
  const [externalVoiced, setExternalVoiced] = useState(voiced);
  const [externalLevel, setExternalLevel] = useState(level);
  const [externalSpeaking, setExternalSpeaking] = useState(speaking);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  // Sync with global voice broadcast events from any mounted HUD/surface
  useEffect(() => {
    const handleVoiceState = (e: Event) => {
      const customEvent = e as CustomEvent<{
        listening?: boolean;
        voiced?: boolean;
        level?: number;
        speaking?: boolean;
      }>;
      if (customEvent.detail) {
        if (typeof customEvent.detail.listening === 'boolean') {
          setExternalListening(customEvent.detail.listening);
        }
        if (typeof customEvent.detail.voiced === 'boolean') {
          setExternalVoiced(customEvent.detail.voiced);
        }
        if (typeof customEvent.detail.level === 'number') {
          setExternalLevel(customEvent.detail.level);
        }
        if (typeof customEvent.detail.speaking === 'boolean') {
          setExternalSpeaking(customEvent.detail.speaking);
        }
      }
    };

    window.addEventListener('camelot:lakisha-listening-state', handleVoiceState);
    return () => {
      window.removeEventListener('camelot:lakisha-listening-state', handleVoiceState);
    };
  }, []);

  const isListening = listening || externalListening;
  const isVoiced = voiced || externalVoiced;
  const currentLevel = Math.max(level, externalLevel);
  const isSpeaking = speaking || externalSpeaking;

  // Real-time canvas waveform visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;

    const render = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      phaseRef.current += 0.08 + (isVoiced ? currentLevel * 0.4 : 0.02);

      if (isListening || isSpeaking) {
        const numBars = 18;
        const barWidth = Math.max(2, (width - (numBars - 1) * 2) / numBars);
        const centerY = height / 2;

        for (let i = 0; i < numBars; i++) {
          const x = i * (barWidth + 2);
          const normalizedI = i / (numBars - 1);
          // Bell curve windowing
          const windowMultiplier = Math.sin(normalizedI * Math.PI);

          // Calculate dynamic height based on audio level and sinusoidal frequencies
          const wave1 = Math.sin(phaseRef.current + i * 0.45);
          const wave2 = Math.cos(phaseRef.current * 1.5 + i * 0.3);
          const combined = (Math.abs(wave1) * 0.6 + Math.abs(wave2) * 0.4) * windowMultiplier;

          const energyMultiplier = isVoiced
            ? Math.max(0.35, currentLevel * 4.5)
            : isSpeaking
              ? 0.7
              : 0.22;

          const barHeight = Math.min(
            height - 2,
            Math.max(3, combined * height * energyMultiplier + (isVoiced ? 4 : 2)),
          );

          // Cyber gradient: Cyan -> Magenta -> Gold
          const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
          if (isVoiced) {
            gradient.addColorStop(0, '#00F0FF');
            gradient.addColorStop(0.5, '#A855F7');
            gradient.addColorStop(1, '#FFD700');
          } else if (isSpeaking) {
            gradient.addColorStop(0, '#00F0FF');
            gradient.addColorStop(1, '#00A3B0');
          } else {
            gradient.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
            gradient.addColorStop(1, 'rgba(168, 85, 247, 0.3)');
          }

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 2);
          ctx.fill();
        }
      } else {
        // Idle standby line with subtle rhythmic pulse
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening, isVoiced, currentLevel, isSpeaking]);

  const handleToggle = () => {
    // Broadcast event to toggle listening across all registered HUDs/contexts
    window.dispatchEvent(new CustomEvent('camelot:toggle-lakisha-listening'));
    toggleListening();
  };

  const meterPercent = Math.min(100, Math.round(currentLevel * 100 * 5));

  return (
    <div
      id="voice-waveform-indicator-root"
      className={`relative inline-flex items-center gap-2 select-none ${className}`}
    >
      {/* Real-time Voice Command Button & Pulsing Visual Indicator */}
      <button
        type="button"
        id="voice-indicator-toggle-button"
        onClick={handleToggle}
        title={
          isListening
            ? isVoiced
              ? 'Microphone ACTIVE (Listening & Detecting Voice)'
              : 'Microphone Active (Waiting for Speech...)'
            : isSpeaking
              ? 'Voice Output Speaking...'
              : 'Click to start Voice Commands'
        }
        className={`group relative flex items-center gap-2 rounded-xl border px-2.5 py-1 transition-all duration-300 ${
          isListening && isVoiced
            ? 'border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.4)]'
            : isListening
              ? 'border-purple-400/80 bg-purple-500/15 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
              : isSpeaking
                ? 'border-[#00F0FF]/60 bg-[#00F0FF]/10 text-[#00F0FF]'
                : 'border-white/10 bg-black/40 text-white/60 hover:border-white/30 hover:bg-white/5 hover:text-white'
        }`}
      >
        {/* Pulsing Acoustic Rings (Concentric Ripples) */}
        {isListening && (
          <>
            <span
              className={`absolute inset-0 rounded-xl transition-opacity duration-300 pointer-events-none ${
                isVoiced
                  ? 'animate-ping bg-[#00F0FF]/25 opacity-75'
                  : 'animate-pulse bg-purple-500/20 opacity-40'
              }`}
            />
            {isVoiced && (
              <span
                className="absolute -inset-1 rounded-2xl border border-[#00F0FF]/50 animate-pulse pointer-events-none"
                style={{
                  boxShadow: '0 0 16px rgba(0, 240, 255, 0.45)',
                }}
              />
            )}
          </>
        )}

        {/* Mic Icon with Live Status Dot */}
        <div className="relative flex items-center justify-center shrink-0">
          <span
            className={`text-xs transition-transform duration-200 ${
              isVoiced ? 'scale-110' : isListening ? 'scale-105' : 'group-hover:scale-105'
            }`}
          >
            {isListening ? (isVoiced ? '🎙️' : '🎧') : isSpeaking ? '🔊' : '🎙️'}
          </span>
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-black transition-colors ${
              isListening
                ? isVoiced
                  ? 'bg-[#00F0FF] animate-ping'
                  : 'bg-purple-400 animate-pulse'
                : isSpeaking
                  ? 'bg-[#00F0FF]'
                  : 'bg-white/30'
            }`}
          />
        </div>

        {/* Canvas Real-Time Waveform Display */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-1.5">
            <canvas
              ref={canvasRef}
              width={compact ? 56 : 72}
              height={16}
              className="h-4 shrink-0 rounded"
              style={{
                width: compact ? '56px' : '72px',
                height: '16px',
              }}
            />

            {!compact && (
              <div className="flex flex-col items-start font-mono text-[9px] uppercase tracking-wider leading-none">
                <span
                  className={`font-bold transition-colors ${
                    isVoiced
                      ? 'text-[#00F0FF]'
                      : isListening
                        ? 'text-purple-300'
                        : isSpeaking
                          ? 'text-[#00F0FF]'
                          : 'text-white/40'
                  }`}
                >
                  {isVoiced
                    ? 'VOICE'
                    : isListening
                      ? 'LISTENING'
                      : isSpeaking
                        ? 'SPEAK'
                        : 'VOICE'}
                </span>
                {isListening ? (
                  <span className="text-[8px] text-white/40 lowercase">
                    {isVoiced ? `${meterPercent}% db` : 'hot mic'}
                  </span>
                ) : (
                  <span className="text-[8px] text-white/30 lowercase">standby</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Level Meter Bar */}
        {isListening && (
          <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-75 ${
                isVoiced ? 'bg-[#00F0FF]' : 'bg-purple-400'
              }`}
              style={{ width: `${Math.max(8, meterPercent)}%` }}
            />
          </div>
        )}
      </button>

      {/* Transcript Popover / Floating Indicator when speaking */}
      {showTranscript && isListening && transcript && (
        <div
          id="voice-active-transcript-bubble"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('camelot:toggle-transcript-panel'));
            }
          }}
          className="absolute left-0 top-full mt-2 z-50 flex items-center gap-2 rounded-xl border border-[#00F0FF]/40 bg-[#0A0714]/95 px-3 py-2 text-xs text-white shadow-[0_0_25px_rgba(0,240,255,0.25)] backdrop-blur-xl animate-snap-in whitespace-nowrap max-w-sm cursor-pointer hover:border-[#00F0FF] transition-all"
          title="Click to view full transcript panel"
        >
          <span className="h-2 w-2 rounded-full bg-[#00F0FF] animate-pulse" />
          <span className="font-mono text-[10px] text-[#00F0FF] uppercase">Live:</span>
          <span className="truncate italic text-white/90">"{transcript}"</span>
          <span className="text-[9px] text-[#00F0FF]/70 font-mono ml-1">↗</span>
        </div>
      )}

      {/* Error state tooltip */}
      {error && isListening && (
        <div className="absolute left-0 top-full mt-1.5 z-50 rounded-lg border border-red-500/40 bg-red-950/90 px-2 py-1 font-mono text-[9px] text-red-400 backdrop-blur-md">
          {error}
        </div>
      )}
    </div>
  );
}

export default VoiceWaveformIndicator;
