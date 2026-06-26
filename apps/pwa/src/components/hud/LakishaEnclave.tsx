'use client';

import { useLakishaVoice } from '../../hooks/useLakishaVoice';

// Phase 3 — persistent headless voice enclave (bottom-right). No text inputs.
// Shares useLakishaVoice with the bottom-center HUD: recognition primary, VAD-only
// failsafe, so if one input path fails the other still keeps Lakisha live.
export function LakishaEnclave() {
  const { connected, connect, isSpeaking, mode, error } = useLakishaVoice();

  const status = isSpeaking
    ? 'Lakisha Active'
    : mode === 'vad-only'
      ? 'VAD Only'
      : 'Awaiting Audio';

  return (
    <div className="fixed right-8 bottom-8 z-[60]">
      <div
        className={`flex items-center gap-3 border border-[#D4AF37] bg-[#16161E]/85 px-4 py-3 backdrop-blur-md transition-shadow duration-200 ${
          isSpeaking ? 'animate-pulse shadow-[0_0_28px_rgba(157,78,221,0.6)]' : 'shadow-none'
        }`}
      >
        {!connected ? (
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
              {status}
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
