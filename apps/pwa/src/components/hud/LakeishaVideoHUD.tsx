'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAvatarConfig } from '../../context/AvatarConfigContext';
import { useTenant } from '../../context/TenantContext';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'blocked';

export function LakeishaVideoHUD() {
  const { isConfigOpen, toggleConfig } = useAvatarConfig();
  let isAuthenticated = false;
  let isGatewayOpen = false;
  try {
    const tenantCtx = useTenant();
    isAuthenticated = tenantCtx.isAuthenticated;
    isGatewayOpen = tenantCtx.isGatewayOpen;
  } catch {
    // Fallback if tenant context not wrapped
  }

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [state, setState] = useState<ConnectionState>('idle');
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Minimize / Hide HUD State
  const [isMinimized, setIsMinimized] = useState(false);

  // Responsive & Draggable HUD State
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Detect mobile vs tablet/PC
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const video = videoRef.current;
    if (video) {
      video.muted = true;
      void video.play().catch(() => {
        setState('idle');
      });
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
    };
  }, []);

  const connect = async () => {
    setState('connecting');
    setMediaError(null);

    try {
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx && !audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      await audioContextRef.current?.resume();

      const video = videoRef.current;
      if (video) {
        video.muted = false;
        await video.play();
      }

      setState('connected');
    } catch {
      setMediaError('Tap again to unlock audio');
      setState('blocked');
    }
  };

  // Dragging event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    setDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    },
    [dragging],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    setDragging(true);
    const touch = e.touches[0];
    dragStartRef.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!dragging) return;
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStartRef.current.x,
        y: touch.clientY - dragStartRef.current.y,
      });
    },
    [dragging],
  );

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  // Hook Ordering Rule: All hooks called above. Do NOT render Avatar HUD before login authentication or when gateway/boot is open
  if (!isAuthenticated || isGatewayOpen) {
    return null;
  }

  const connected = state === 'connected';

  // Invisible on mobile (only voice assistant works in background)
  if (isMobile) {
    return (
      <audio
        ref={(el) => {
          if (el && videoRef.current) {
            // keep video playing in background for audio VAD loop
            void videoRef.current.play().catch(() => undefined);
          }
        }}
        src="/assets/lakisha_avatar.mp4"
        style={{ display: 'none' }}
      />
    );
  }

  // Minimized / Hidden State Floating Pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 rounded-full border border-[#FFD700]/60 bg-[#120D22]/90 px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.35)] backdrop-blur-xl transition-all hover:bg-[#FFD700]/20 hover:scale-105"
        >
          <span className="relative flex h-3 w-3 items-center justify-center">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${connected ? 'bg-emerald-400' : 'bg-[#FFD700]'}`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${connected ? 'bg-emerald-500' : 'bg-[#FFD700]'}`}
            />
          </span>
          <span>🎙️ Lakisha HUD</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/70">
            Expand ↗
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: dragging ? 'grabbing' : 'grab',
      }}
      className="fixed bottom-8 right-8 z-50 w-[min(20rem,calc(100vw-2rem))] border border-gold/50 bg-[#16161E]/70 shadow-[0_0_15px_#FFD700] backdrop-blur-xl select-none"
    >
      <div className="relative aspect-video overflow-hidden border-b border-gold/30 bg-[#050505] pointer-events-none">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src="/assets/lakisha_avatar.mp4"
          muted
          autoPlay
          loop
          playsInline
          preload="auto"
          onError={() => setMediaError('Avatar asset pending')}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(157,78,221,0.22),transparent_42%)]" />
      </div>

      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div>
          <p className="font-display text-sm text-gold-light">Lakeisha</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
            {connected ? 'persistent avatar online' : (mediaError ?? 'muted visual anchor')}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Minimize / Hide Avatar HUD Button */}
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            aria-label="Minimize Avatar HUD"
            title="Minimize / Hide Avatar HUD"
            className="flex h-7 w-7 items-center justify-center border border-white/20 bg-[#050505]/75 text-white/70 hover:border-gold hover:text-gold transition-colors"
          >
            <span className="font-mono text-sm leading-none font-bold">−</span>
          </button>

          {/* Avatar Configuration Symbol Button */}
          <button
            type="button"
            onClick={toggleConfig}
            aria-label="Avatar Configuration Menu"
            title="Configure Avatar (Chat, Live, Media, Transcribe)"
            className={`flex h-7 w-7 items-center justify-center border transition-all duration-200 ${
              isConfigOpen
                ? 'border-gold bg-gold/25 text-gold shadow-[0_0_8px_rgba(212,175,55,0.5)]'
                : 'border-gold/40 bg-[#050505]/75 text-gold-light hover:border-gold hover:bg-gold/10'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className={`h-3.5 w-3.5 transition-transform duration-300 ${isConfigOpen ? 'rotate-90 text-gold' : ''}`}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {!connected && (
            <button
              type="button"
              onClick={connect}
              disabled={state === 'connecting'}
              className="border border-gold/40 bg-[#050505]/75 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-gold-light transition-colors hover:border-violet hover:text-violet-light disabled:opacity-50"
            >
              {state === 'connecting' ? 'Connecting' : 'Tap to Connect'}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
