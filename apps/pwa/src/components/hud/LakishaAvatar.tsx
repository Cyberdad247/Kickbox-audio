'use client';

import { useRef, useState } from 'react';

// Ambassador Lakisha — an animated living-presence avatar backed by a looping
// /assets/lakisha_avatar.mp4; the audio-reactive SVG/CSS presence (rings)
// rides on top as a live overlay so she still pulses violet while speaking
// even while the video loops underneath. This is the sole avatar surface —
// the old bottom-right video HUD was removed.
//
// The still poster is set as a CSS background on the frame itself (not just
// the <video poster> attribute) so it's guaranteed visible any time the video
// doesn't render — load error, autoplay blocked, or a stall that never fires
// `onError` at all (seen in some installed-PWA contexts). It never depends on
// the <video> element's own lifecycle.
export function LakishaAvatar({
  speaking,
  connected,
  onSync,
}: {
  speaking: boolean;
  connected: boolean;
  onSync: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <div className="w-56 border border-gold/50 bg-smoke-900/85 backdrop-blur-md shadow-gold">
      <div
        className="relative aspect-square overflow-hidden bg-gradient-to-b from-smoke-800 to-obsidian bg-cover bg-top"
        style={{ backgroundImage: 'url(/assets/lakisha_avatar_poster.png)' }}
      >
        {!videoFailed && (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover object-top"
            src="/assets/lakisha_avatar.mp4"
            poster="/assets/lakisha_avatar_poster.png"
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
            onError={() => setVideoFailed(true)}
          />
        )}
        {/* concentric presence rings — pulse violet over the video while speaking.
            No solid orb/eyes here anymore: that was a face-substitute for when
            there was no video asset; with real video underneath it just masked
            her face, so only the reactive rings remain. */}
        <div className="absolute inset-0 flex items-center justify-center">
          {speaking && (
            <>
              <span className="absolute h-24 w-24 animate-ping rounded-full border border-violet/40" />
              <span className="absolute h-32 w-32 animate-pulse rounded-full border border-violet/20" />
            </>
          )}
        </div>
        {/* scanline sheen */}
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,0,0,0.18)_4px)] opacity-40" />
      </div>
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="leading-tight">
            <p className="font-display text-gold-royal text-sm tracking-minted">Lakisha</p>
            <p className="text-[9px] text-white/35 uppercase tracking-[0.18em]">Ambassador</p>
          </div>
          <button
            type="button"
            onClick={onSync}
            aria-label="Sync with Bifrost bridge"
            title="Sync with Bifrost bridge"
            className="rounded-full border border-gold/40 p-1 text-gold-light transition-colors hover:border-violet hover:text-violet-light"
          >
            <SyncIcon className="h-3 w-3" />
          </button>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${speaking ? 'bg-violet shadow-glow' : connected ? 'bg-gold-royal' : 'bg-white/25'}`}
          />
          <span className="text-[9px] uppercase tracking-[0.14em] text-white/45">
            {connected ? 'Persistent avatar online' : 'Bifrost disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}

function SyncIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 20v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M4.5 15a8 8 0 0 0 14 3.5M19.5 9a8 8 0 0 0-14-3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
