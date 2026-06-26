'use client';

import { useEffect, useRef, useState } from 'react';

// Phase 3 — persistent headless voice enclave (bottom-right). No text inputs.
// Tap-to-connect bypasses autoplay, requests the mic, then runs a live HUD.
export function LakishaEnclave() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const connect = async () => {
    setError(null);
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsConnected(true);
    } catch {
      setError('MIC DENIED');
    }
  };

  // Mock speaking cadence (visual proof the mic is hot) — real VAD replaces this.
  useEffect(() => {
    if (!isConnected) return;
    const id = setInterval(() => setIsSpeaking((s) => !s), 1400);
    return () => clearInterval(id);
  }, [isConnected]);

  // Release the mic on unmount.
  useEffect(
    () => () => {
      for (const t of streamRef.current?.getTracks() ?? []) t.stop();
    },
    [],
  );

  return (
    <div className="fixed right-8 bottom-8 z-[60]">
      <div
        className={`flex items-center gap-3 border border-[#D4AF37] bg-[#16161E]/85 px-4 py-3 backdrop-blur-md transition-shadow duration-200 ${
          isSpeaking ? 'animate-pulse shadow-[0_0_28px_rgba(157,78,221,0.6)]' : 'shadow-none'
        }`}
      >
        {!isConnected ? (
          // The Gilded Gate — autoplay bypass.
          <button
            type="button"
            onClick={connect}
            className="flex items-center gap-2 text-[#D4AF37] text-xs uppercase tracking-widest transition-colors hover:text-[#FFD700]"
          >
            <MicIcon className="h-4 w-4" />
            {error ?? 'Tap to Connect'}
          </button>
        ) : (
          // The Active HUD.
          <>
            <span
              className={`relative flex h-2.5 w-2.5 ${isSpeaking ? 'text-[#9D4EDD]' : 'text-white/40'}`}
            >
              {isSpeaking && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#9D4EDD] opacity-70" />
              )}
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-current" />
            </span>

            <Waveform active={isSpeaking} />

            <span
              className={`text-xs uppercase tracking-widest ${
                isSpeaking ? 'text-[#9D4EDD]' : 'text-white/50'
              }`}
            >
              {isSpeaking ? 'Lakisha Active' : 'Awaiting Audio'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

const WAVE_BARS = [
  { id: 'w1', h: 0.4 },
  { id: 'w2', h: 0.85 },
  { id: 'w3', h: 0.55 },
  { id: 'w4', h: 1 },
  { id: 'w5', h: 0.7 },
];

function Waveform({ active }: { active: boolean }) {
  return (
    <span className="flex h-5 items-center gap-0.5" aria-hidden="true">
      {WAVE_BARS.map((bar, i) => (
        <span
          key={bar.id}
          className={`w-0.5 rounded-full transition-all duration-150 ${
            active ? 'animate-pulse bg-[#9D4EDD]' : 'bg-white/25'
          }`}
          style={{
            height: `${(active ? bar.h : 0.3) * 100}%`,
            animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
    </span>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="21" strokeLinecap="round" />
    </svg>
  );
}
