'use client';

import React, { useState } from 'react';

const CAMELOT_BG_ARTWORK =
  'https://i.postimg.cc/3w4vtyhB/b-follow-suit-and-give.png';

interface GothicEnvironmentProps {
  mousePos: { x: number; y: number };
  isHoveringSword?: boolean;
  isInteractiveHover?: boolean;
  authSuccess: boolean;
  activeAuthMode?: string;
  selectedTenantHeraldry?: string;
}

export function CamelotGothicEnvironment({
  mousePos,
  isHoveringSword = false,
  isInteractiveHover = false,
  authSuccess,
}: GothicEnvironmentProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const isHoverActive = isHoveringSword || isInteractiveHover;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-[#030206]">
      {/* ── HIGH-FIDELITY CAMELOT GOTHIC BACKGROUND ARTWORK ── */}
      <div
        className="absolute inset-0 w-full h-full transition-transform duration-700 ease-out"
        style={{
          transform: `scale(1.05) translate(${mousePos.x * -15}px, ${mousePos.y * -10}px) rotateX(${mousePos.y * 4}deg) rotateY(${mousePos.x * 4}deg)`,
          transformStyle: 'preserve-3d',
          perspective: '1200px',
        }}
      >
        <img
          src={CAMELOT_BG_ARTWORK}
          alt="Camelot OS Boot Environment"
          onLoad={() => setImageLoaded(true)}
          className={`w-full h-full object-cover object-center transition-opacity duration-700 ${
            imageLoaded ? 'opacity-100' : 'opacity-90'
          } ${isHoverActive ? 'brightness-110 contrast-105' : 'brightness-100'}`}
        />
      </div>

      {/* ── AMBIENT VIGNETTE & SOVEREIGN TONAL OVERLAYS ── */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#030206] via-transparent to-[#030206]/60 pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#030206]/20 to-[#030206]/80 pointer-events-none" />

      {/* ── HOVER RESONANCE AURA ── */}
      {isHoverActive && !authSuccess && (
        <div className="absolute inset-0 bg-radial from-[#00F0FF]/15 via-[#D4AF37]/8 to-transparent pointer-events-none animate-pulse duration-1000" />
      )}

      {/* ── DYNAMIC AUTHENTICATION LIGHT SURGE ── */}
      {authSuccess && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/40 via-white/30 to-[#00F0FF]/40 animate-pulse pointer-events-none duration-700" />
      )}
    </div>
  );
}

