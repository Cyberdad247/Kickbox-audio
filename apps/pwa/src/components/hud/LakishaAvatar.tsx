'use client';

import { useRef, useState } from 'react';

// Ambassador Lakisha — an animated living-presence avatar. Backed by the same
// /assets/lakisha_avatar.mp4 loop used by LakeishaVideoHUD; the audio-reactive
// SVG/CSS presence (rings + orb + eyes) rides on top as a live overlay so she
// still pulses violet while speaking even while the video loops underneath.
// Falls back to the SVG/CSS-only presence if the asset fails to load.
export function LakishaAvatar({ speaking, connected }: { speaking: boolean; connected: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <div className="w-56 border border-gold/50 bg-smoke-900/85 backdrop-blur-md shadow-gold">
      <div className="relative aspect-square overflow-hidden bg-gradient-to-b from-smoke-800 to-obsidian">
        {!videoFailed && (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            src="/assets/lakisha_avatar.mp4"
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
      <div className="flex items-center justify-between px-3 py-2">
        <div className="leading-tight">
          <p className="font-display text-gold-royal text-sm tracking-minted">Lakisha</p>
          <p className="text-[9px] text-white/35 uppercase tracking-[0.18em]">Ambassador</p>
        </div>
        <span
          className={`h-2 w-2 rounded-full ${speaking ? 'bg-violet shadow-glow' : connected ? 'bg-gold-royal' : 'bg-white/25'}`}
        />
      </div>
    </div>
  );
}
