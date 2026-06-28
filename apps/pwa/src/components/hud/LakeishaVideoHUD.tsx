'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'blocked';

export function LakeishaVideoHUD() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [state, setState] = useState<ConnectionState>('idle');
  const [mediaError, setMediaError] = useState<string | null>(null);

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

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  }, [dragging]);

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

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!dragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStartRef.current.x,
      y: touch.clientY - dragStartRef.current.y,
    });
  }, [dragging]);

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
            {connected ? 'persistent avatar online' : mediaError ?? 'muted visual anchor'}
          </p>
        </div>

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
    </aside>
  );
}
