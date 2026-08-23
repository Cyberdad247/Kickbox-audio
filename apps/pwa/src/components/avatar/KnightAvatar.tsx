'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AvatarState, AvatarType, AvatarWorkerInboundMessage } from './avatar.worker';

export interface KnightAvatarProps {
  avatarType?: AvatarType;
  state?: AvatarState;
  audioClock?: number;
  viseme?: number;
  size?: number | string;
  className?: string;
  interactive?: boolean;
  onAvatarClick?: () => void;
  showBadge?: boolean;
  highContrast?: boolean;
}

const PERSONA_DETAILS: Record<
  AvatarType,
  {
    name: string;
    title: string;
    description: string;
    primaryColor: string;
    badgeBorder: string;
    rune: string;
  }
> = {
  Knight_Cyber: {
    name: 'Sir Codex',
    title: 'Cyber-Knight Sovereign',
    description: 'Specialized in Kinetic WASM execution & zero-trust gates.',
    primaryColor: '#00F0FF',
    badgeBorder: 'border-[#00F0FF]/40',
    rune: '⚡',
  },
  Knight_Arcane: {
    name: 'Merlin Ω',
    title: 'High Orchestrator',
    description: 'Topological state loop adjudicator & capability lease signer.',
    primaryColor: '#FF00FF',
    badgeBorder: 'border-[#FF00FF]/40',
    rune: '🔮',
  },
  Knight_Data: {
    name: 'Sir Sentinel',
    title: 'Gideon Gatekeeper',
    description: 'ChaCha20-Poly1305 vault sentry & mTLS compliance auditor.',
    primaryColor: '#10B981',
    badgeBorder: 'border-[#10B981]/40',
    rune: '🛡️',
  },
};

export function KnightAvatar({
  avatarType = 'Knight_Cyber',
  state = 'idle',
  audioClock = 0,
  viseme = 0,
  size = 200,
  className = '',
  interactive = true,
  onAvatarClick,
  showBadge = true,
  highContrast = false,
}: KnightAvatarProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const isOffscreenTransferred = useRef<boolean>(false);
  const lastCursorPostTime = useRef<number>(0);

  const [hasWorkerSupport, setHasWorkerSupport] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const persona = PERSONA_DETAILS[avatarType] || PERSONA_DETAILS.Knight_Cyber;

  // Initialize Worker and OffscreenCanvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width || (typeof size === 'number' ? size : 200);
    const height = rect.height || (typeof size === 'number' ? size : 200);
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

    // Check OffscreenCanvas support
    if (typeof canvas.transferControlToOffscreen === 'function' && typeof Worker !== 'undefined') {
      try {
        if (!workerRef.current) {
          const worker = new Worker(new URL('./avatar.worker.ts', import.meta.url), {
            type: 'module',
          });
          workerRef.current = worker;

          if (!isOffscreenTransferred.current) {
            const offscreen = canvas.transferControlToOffscreen();
            isOffscreenTransferred.current = true;

            const initMsg: AvatarWorkerInboundMessage = {
              type: 'INIT',
              canvas: offscreen,
              width,
              height,
              dpr,
              avatarType,
              state,
            };
            worker.postMessage(initMsg, [offscreen]);
          }
        }
      } catch (err) {
        console.warn(
          '[KnightAvatar] OffscreenCanvas transfer failed, falling back to local thread:',
          err,
        );
        setHasWorkerSupport(false);
      }
    } else {
      setHasWorkerSupport(false);
    }

    return () => {
      if (workerRef.current) {
        const destroyMsg: AvatarWorkerInboundMessage = { type: 'DESTROY' };
        workerRef.current.postMessage(destroyMsg);
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [size]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dispatch state updates to Worker
  useEffect(() => {
    if (workerRef.current) {
      const msg: AvatarWorkerInboundMessage = {
        type: 'UPDATE_STATE',
        state,
        audioClock,
        viseme,
        avatarType,
      };
      workerRef.current.postMessage(msg);
    }
  }, [state, audioClock, viseme, avatarType]);

  // Handle ResizeObserver for responsive canvas updates
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && workerRef.current) {
          const dpr = window.devicePixelRatio || 1;
          const msg: AvatarWorkerInboundMessage = {
            type: 'RESIZE',
            width,
            height,
            dpr,
          };
          workerRef.current.postMessage(msg);
        }
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Track cursor position for environmental gaze tracking
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    const container = containerRef.current;
    if (!container || !workerRef.current) return;

    const now = performance.now();
    if (now - lastCursorPostTime.current < 25) return; // Throttle to 40Hz
    lastCursorPostTime.current = now;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Normalized screen offset from avatar center (-1 to 1)
    const normalizedX = Math.max(-1, Math.min(1, (e.clientX - centerX) / (window.innerWidth / 2)));
    const normalizedY = Math.max(-1, Math.min(1, (e.clientY - centerY) / (window.innerHeight / 2)));

    const msg: AvatarWorkerInboundMessage = {
      type: 'UPDATE_CURSOR',
      x: normalizedX,
      y: normalizedY,
    };
    workerRef.current.postMessage(msg);
  }, []);

  // Global window cursor tracking when active
  useEffect(() => {
    if (!interactive) return;
    const onWindowMove = (e: MouseEvent) => handleMouseMove(e);
    window.addEventListener('mousemove', onWindowMove, { passive: true });
    return () => window.removeEventListener('mousemove', onWindowMove);
  }, [interactive, handleMouseMove]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onAvatarClick}
      className={`group relative flex flex-col items-center select-none ${
        interactive ? 'cursor-pointer' : ''
      } ${className}`}
      style={{
        width: typeof size === 'number' ? `${size}px` : size,
      }}
      role="region"
      aria-label={`Cyber-Knight Avatar: ${persona.name}, State: ${state}`}
    >
      {/* Outer Arthurian Glassmorphism Card Frame */}
      <div
        className="relative flex w-full aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl border transition-all duration-300 backdrop-blur-[20px]"
        style={{
          borderColor: highContrast
            ? '#FFFFFF'
            : isHovered
              ? persona.primaryColor
              : 'rgba(0, 240, 255, 0.25)',
          background: highContrast ? '#000000' : 'rgba(8, 12, 18, 0.85)',
          boxShadow: highContrast
            ? 'none'
            : isHovered
              ? `0 0 30px ${persona.primaryColor}40, inset 0 0 15px ${persona.primaryColor}20`
              : '0 8px 32px rgba(0, 240, 255, 0.08)',
        }}
      >
        {/* The Transferred Offscreen Canvas */}
        <canvas ref={canvasRef} className="h-full w-full object-contain pointer-events-none" />

        {/* Fallback Display if Worker / OffscreenCanvas is unavailable */}
        {!hasWorkerSupport && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <span className="text-3xl">{persona.rune}</span>
            <span className="mt-1 font-mono text-[10px] font-bold text-white/80">
              {persona.name}
            </span>
            <span className="font-mono text-[8px] uppercase tracking-wider text-[#00F0FF]">
              [{state.toUpperCase()}]
            </span>
          </div>
        )}

        {/* State Status Aura Ring Pill in Top-Right Corner */}
        <div className="absolute top-2 right-2 flex items-center space-x-1 rounded-full border border-white/10 bg-black/60 px-2 py-0.5 backdrop-blur-md">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              state === 'speaking'
                ? 'bg-[#00F0FF] animate-ping'
                : state === 'thinking'
                  ? 'bg-[#FF00FF] animate-pulse'
                  : state === 'listening'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-emerald-400'
            }`}
          />
          <span className="font-mono text-[8px] uppercase tracking-widest text-white/70">
            {state}
          </span>
        </div>

        {/* Runic Persona Seal in Top-Left Corner */}
        <div className="absolute top-2 left-2 flex h-5 w-5 items-center justify-center rounded-lg border border-white/10 bg-black/60 text-[10px] text-white/80 backdrop-blur-md">
          <span>{persona.rune}</span>
        </div>

        {/* Subtle Scanline Holographic Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.25)_3px)] opacity-30" />
      </div>

      {/* Optional Arthurian Knight Identity Badge */}
      {showBadge && (
        <div className="mt-2 flex w-full flex-col items-center rounded-xl border border-white/10 bg-black/60 p-2 backdrop-blur-md transition-all group-hover:border-white/20">
          <div className="flex w-full items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
              {persona.name}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#FFD700]">
              {avatarType.replace('Knight_', '')}
            </span>
          </div>
          <p className="mt-0.5 w-full truncate font-mono text-[9px] text-white/50 text-left">
            {persona.title}
          </p>
        </div>
      )}
    </div>
  );
}

export default KnightAvatar;
