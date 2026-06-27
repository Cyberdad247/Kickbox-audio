'use client';

import { useEffect, useRef, useState } from 'react';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'blocked';

export function LakeishaVideoHUD() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [state, setState] = useState<ConnectionState>('idle');
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => {
      setState('idle');
    });

    return () => {
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

  const connected = state === 'connected';

  return (
    <aside className="fixed bottom-8 right-8 z-50 w-[min(20rem,calc(100vw-2rem))] border border-gold/50 bg-[#16161E]/70 shadow-[0_0_15px_#FFD700] backdrop-blur-xl">
      <div className="relative aspect-video overflow-hidden border-b border-gold/30 bg-[#050505]">
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
