'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

// Canonical high-definition Arthurian transition portal video MP4
const RELIABLE_CDN_VIDEO =
  'https://cdn.shopify.com/videos/c/o/v/be7aa2ea96ac4d3d86204a6dd0996846.mp4';

interface CamelotTransitionSequenceProps {
  active: boolean;
  onComplete: () => void;
  videoSrc?: string;
}

export function CamelotTransitionSequence({
  active,
  onComplete,
  videoSrc = RELIABLE_CDN_VIDEO,
}: CamelotTransitionSequenceProps) {
  const resolveInitialSrc = (src: string) => {
    if (!src || src.includes('admin.shopify.com')) {
      return RELIABLE_CDN_VIDEO;
    }
    return src;
  };

  const [activeVideoSrc, setActiveVideoSrc] = useState<string>(() => resolveInitialSrc(videoSrc));
  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasTriggeredComplete = useRef(false);

  // Sync if prop changes
  useEffect(() => {
    const nextSrc = resolveInitialSrc(videoSrc);
    setActiveVideoSrc(nextSrc);
  }, [videoSrc]);

  const handleComplete = useCallback(() => {
    if (!hasTriggeredComplete.current) {
      hasTriggeredComplete.current = true;
      onComplete();
    }
  }, [onComplete]);

  // Video error fallback
  const handleVideoError = useCallback(() => {
    console.warn(`Transition video failed from ${activeVideoSrc}.`);
    if (activeVideoSrc !== RELIABLE_CDN_VIDEO) {
      setActiveVideoSrc(RELIABLE_CDN_VIDEO);
    } else {
      handleComplete();
    }
  }, [activeVideoSrc, handleComplete]);

  // Play video only when active (user clicked Access Camelot)
  useEffect(() => {
    if (!active) {
      hasTriggeredComplete.current = false;
      setVideoLoaded(false);
      return;
    }

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      // Start with unmuted audio since click is a direct user gesture, with fallback to muted if blocked
      videoRef.current.muted = false;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setVideoLoaded(true);
          })
          .catch((err) => {
            console.info('Retrying video playback with muted mode:', err);
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current.play().then(() => setVideoLoaded(true)).catch(handleVideoError);
            }
          });
      }
    }
  }, [active, handleVideoError]);

  // Allow ESC or Space to skip video
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, handleComplete]);

  if (!active) return null;

  return (
    <div
      id="camelot-transition-overlay"
      className="fixed inset-0 z-50 overflow-hidden bg-black select-none transition-opacity duration-300"
    >
      {/* ── PURE FULL-SCREEN CINEMATIC VIDEO ── */}
      <video
        ref={videoRef}
        src={activeVideoSrc}
        playsInline
        autoPlay
        preload="auto"
        onLoadedData={() => setVideoLoaded(true)}
        onError={handleVideoError}
        onEnded={handleComplete}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          videoLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* ── TOP-RIGHT SKIP & SOUND CONTROLS ── */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            if (videoRef.current) {
              videoRef.current.muted = !videoRef.current.muted;
              setIsMuted(videoRef.current.muted);
            }
          }}
          className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 font-mono text-[11px] text-white/80 backdrop-blur-md hover:border-[#FFD700]/60 hover:text-white transition-all cursor-pointer"
        >
          <span>{isMuted ? '🔇' : '🔊'}</span>
          <span>{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          type="button"
          onClick={handleComplete}
          className="flex items-center gap-1.5 rounded-full border border-[#D4AF37]/50 bg-black/70 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[#FFD700] backdrop-blur-md hover:bg-[#D4AF37]/20 hover:border-[#FFD700] hover:text-white transition-all cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.3)]"
        >
          <span>Skip Intro ➔</span>
        </button>
      </div>
    </div>
  );
}
