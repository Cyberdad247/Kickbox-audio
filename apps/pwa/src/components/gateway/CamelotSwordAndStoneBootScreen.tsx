'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTenant } from '../../context/TenantContext';
import type { TenantProfile } from '../../types/tenant';
import { speak } from '../../lib/voice';
import { playVaultUnsealSound, playSystemBootSound, triggerDetectionFeedback } from '../../lib/feedbackCues';
import { CamelotGothicEnvironment } from './CamelotGothicEnvironment';
import { CamelotTransitionSequence } from './CamelotTransitionSequence';
import { CamelotVoiceHelpModal, CAMELOT_VOICE_COMMANDS } from './CamelotVoiceHelpModal';
import { TenantCarouselSelect } from './TenantCarouselSelect';

export interface BootScreenProps {
  onComplete?: () => void;
  isInitialBoot?: boolean;
  videoSrc?: string;
}

const DEFAULT_TRANSITION_VIDEO = 'https://cdn.shopify.com/videos/c/o/v/be7aa2ea96ac4d3d86204a6dd0996846.mp4';

export function CamelotSwordAndStoneBootScreen({
  onComplete,
  isInitialBoot = true,
  videoSrc = DEFAULT_TRANSITION_VIDEO,
}: BootScreenProps) {
  const {
    tenants,
    activeTenant,
    selectTenant,
    setIsAuthenticated,
    closeGateway,
    isAuthenticated,
  } = useTenant();

  // Tenant selection
  const [selectedTenantIndex, setSelectedTenantIndex] = useState(() => {
    const idx = tenants.findIndex((t) => t.id === activeTenant?.id);
    return idx !== -1 ? idx : 0;
  });

  const currentTenant: TenantProfile = tenants[selectedTenantIndex] || tenants[0] || activeTenant;

  // Unlocking / Authentication States
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [isPlayingTransition, setIsPlayingTransition] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Web Speech API Voice Listening State
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isTenantCarouselOpen, setIsTenantCarouselOpen] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Web Audio Synthetic Arthurian Sounds
  const playCyberSound = useCallback((type: 'hover' | 'click' | 'auth') => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'hover') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'auth') {
        // Multi-frequency harmonic resonance + hyperdrive charging sweep
        [587.33, 739.99, 880.0, 1174.66, 1760.0].forEach((freq, i) => {
          const chordOsc = ctx.createOscillator();
          const chordGain = ctx.createGain();
          chordOsc.type = 'sine';
          chordOsc.frequency.setValueAtTime(freq, now + i * 0.08);
          chordOsc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 1.8);
          chordGain.gain.setValueAtTime(0.04, now + i * 0.08);
          chordGain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
          chordOsc.connect(chordGain);
          chordGain.connect(ctx.destination);
          chordOsc.start(now + i * 0.08);
          chordOsc.stop(now + 2.0);
        });
      }
    } catch {
      // Audio fallback
    }
  }, []);

  // 3D Parallax Mouse Tracking
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMousePos({ x, y });
  }, []);

  // Execute Core Unlocking & Video Transition Sequence
  const handleAccessCamelot = useCallback(
    (customVoicePrompt?: string) => {
      const target = currentTenant;
      if (!target || isAuthenticating || authSuccess || isPlayingTransition) return;

      setIsAuthenticating(true);
      playCyberSound('click');

      // Trigger video and warp transition sequence
      setTimeout(() => {
        setAuthSuccess(true);
        setIsPlayingTransition(true);
        playSystemBootSound(0.14);
        triggerDetectionFeedback({ sound: false, haptics: true });
        playVaultUnsealSound(0.06);

        if (customVoicePrompt) {
          speak(customVoicePrompt);
        } else {
          speak(`Welcome to Camelot OS, ${target.name}.`);
        }
      }, 250);
    },
    [currentTenant, isAuthenticating, authSuccess, isPlayingTransition, playCyberSound]
  );

  // Final transition completion callback
  const handleTransitionComplete = useCallback(() => {
    const target = currentTenant;
    selectTenant(target);
    setIsAuthenticated(true);
    if (onComplete) {
      onComplete();
    } else {
      closeGateway();
    }
  }, [currentTenant, selectTenant, setIsAuthenticated, onComplete, closeGateway]);

  // Execute from voice command selection in help modal
  const handleSelectCommand = useCallback(
    (commandPhrase: string) => {
      setIsHelpModalOpen(false);
      const lower = commandPhrase.toLowerCase();
      if (lower.includes('vault')) {
        handleAccessCamelot('Opening Sovereign Secure Vault.');
      } else if (lower.includes('sync') || lower.includes('drive')) {
        handleAccessCamelot('Synchronizing Google Drive and Workspace.');
      } else if (lower.includes('status') || lower.includes('telemetry')) {
        handleAccessCamelot('System status nominal. Diagnostic HUD online.');
      } else if (lower.includes('lakisha')) {
        handleAccessCamelot('Summoning Lakisha Voice HUD.');
      } else if (lower.includes('help') || lower.includes('command')) {
        setIsHelpModalOpen(true);
      } else {
        handleAccessCamelot();
      }
    },
    [handleAccessCamelot]
  );

  // Web Speech API Voice Recognition Activation
  const startListening = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      window.SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition: typeof window.SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setVoiceFeedback('Voice recognition not supported');
      setTimeout(() => setVoiceFeedback(null), 3000);
      return;
    }

    try {
      // Abort any existing instance
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceFeedback('Listening... speak a command or say "Help"');
        playCyberSound('hover');
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript.toLowerCase())
          .join(' ');

        setVoiceFeedback(`Heard: "${transcript}"`);

        // Check for specific intent branches
        if (transcript.includes('help') || transcript.includes('show command') || transcript.includes('commands')) {
          setIsListening(false);
          setVoiceFeedback('Opening Voice Directives...');
          setIsHelpModalOpen(true);
          recognition.stop();
          speak('Opening Voice Directives list.');
          return;
        }

        if (transcript.includes('open vault') || transcript.includes('vault') || transcript.includes('storage')) {
          setIsListening(false);
          setVoiceFeedback('Verified: OPENING VAULT');
          recognition.stop();
          handleAccessCamelot('Opening Sovereign Secure Vault.');
          return;
        }

        if (transcript.includes('sync drive') || transcript.includes('sync storage') || transcript.includes('google drive') || transcript.includes('sync')) {
          setIsListening(false);
          setVoiceFeedback('Verified: SYNCING DRIVE');
          recognition.stop();
          handleAccessCamelot('Synchronizing Google Drive and Workspace.');
          return;
        }

        if (transcript.includes('system status') || transcript.includes('status') || transcript.includes('telemetry') || transcript.includes('diagnostics')) {
          setIsListening(false);
          setVoiceFeedback('Verified: SYSTEM STATUS NOMINAL');
          recognition.stop();
          handleAccessCamelot('System status nominal. Diagnostic HUD online.');
          return;
        }

        if (transcript.includes('lakisha') || transcript.includes('summon') || transcript.includes('voice hud') || transcript.includes('anya')) {
          setIsListening(false);
          setVoiceFeedback('Verified: SUMMONING LAKISHA');
          recognition.stop();
          handleAccessCamelot('Lakisha Voice OS activated.');
          return;
        }

        // Standard activation triggers
        const activationPhrases = [
          'access camelot',
          'camelot',
          'access',
          'enter',
          'open',
          'start',
          'login',
          'unlock',
          'launch',
          'begin',
          'go',
          'sword',
          'excalibur',
        ];

        const matched = activationPhrases.some((phrase) => transcript.includes(phrase));

        if (matched) {
          setIsListening(false);
          setVoiceFeedback('Voice command verified: ACCESS GRANTED');
          recognition.stop();
          handleAccessCamelot();
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setVoiceFeedback('Microphone permission denied');
        } else if (event.error === 'no-speech') {
          setVoiceFeedback('No voice detected. Click LISTEN to retry.');
        } else {
          setVoiceFeedback(`Voice error: ${event.error}`);
        }
        setTimeout(() => setVoiceFeedback(null), 3500);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setVoiceFeedback('Failed to start microphone');
      setTimeout(() => setVoiceFeedback(null), 3000);
    }
  }, [handleAccessCamelot, playCyberSound]);

  const toggleListening = useCallback(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setVoiceFeedback(null);
    } else {
      startListening();
    }
  }, [isListening, startListening]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Keyboard navigation: Enter or Space triggers Access Camelot, ? or H opens help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '?' || e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setIsHelpModalOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (isHelpModalOpen) {
          e.preventDefault();
          setIsHelpModalOpen(false);
        } else if (isAuthenticated) {
          e.preventDefault();
          closeGateway();
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (!isHelpModalOpen) {
          e.preventDefault();
          handleAccessCamelot();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAccessCamelot, isAuthenticated, closeGateway, isHelpModalOpen]);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      id="camelot-boot-screen-root"
      className="fixed inset-0 z-50 overflow-hidden bg-[#030206] text-white select-none perspective-[1200px]"
    >
      {/* Full-bleed Gothic Cathedral Artwork Environment */}
      <CamelotGothicEnvironment
        mousePos={mousePos}
        isInteractiveHover={isButtonHovered}
        authSuccess={authSuccess}
        selectedTenantHeraldry={currentTenant?.heraldryColor || '#D4AF37'}
      />

      {/* ── CINEMATIC VIDEO & HYPERSPACE WARP TRANSITION LAYER ── */}
      <CamelotTransitionSequence
        active={isPlayingTransition}
        onComplete={handleTransitionComplete}
        videoSrc={videoSrc}
      />

      {/* ── TOP-RIGHT QUICK ACTIONS (ROUND TABLE & VOICE DIRECTIVES) ── */}
      <div className={`absolute top-4 right-4 sm:top-6 sm:right-6 z-40 flex items-center gap-2 transition-opacity duration-300 ${
        isPlayingTransition ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <button
          id="top-tenant-roundtable-btn"
          type="button"
          onClick={() => {
            playCyberSound('hover');
            setIsTenantCarouselOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-[#00F0FF]/50 bg-[#040914]/80 px-2.5 py-1.5 text-[11px] font-mono text-[#00F0FF] hover:border-[#00F0FF] hover:bg-[#08152A] shadow-[0_0_15px_rgba(0,240,255,0.2)] backdrop-blur-md transition-all cursor-pointer"
        >
          <span className="text-xs">🛡️</span>
          <span className="hidden sm:inline tracking-wider font-semibold">ROUND TABLE</span>
        </button>

        <button
          id="top-voice-help-btn"
          type="button"
          onClick={() => {
            playCyberSound('hover');
            setIsHelpModalOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/50 bg-[#090B14]/80 px-2.5 py-1.5 text-[11px] font-mono text-[#FFD700] hover:border-[#FFD700] hover:bg-[#141A2E] shadow-[0_0_15px_rgba(212,175,55,0.2)] backdrop-blur-md transition-all cursor-pointer"
        >
          <span className="text-xs">🎙️</span>
          <span className="hidden sm:inline tracking-wider font-semibold">VOICE COMMANDS</span>
          <kbd className="rounded border border-white/20 bg-white/10 px-1 py-0.2 text-[9px] text-white/70">?</kbd>
        </button>
      </div>

      {/* ── ACCESS CAMELOT BUTTON & LISTEN VOICE ACTIVATION OVERLAY ── */}
      <div
        className={`absolute right-6 sm:right-12 md:right-20 lg:right-28 xl:right-36 bottom-10 sm:bottom-16 md:bottom-20 lg:bottom-28 z-40 flex flex-col items-center gap-3 transition-all duration-400 ${
          isPlayingTransition ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
        }`}
      >
        {/* Dynamic Voice Status Feedback Banner */}
        {voiceFeedback && (
          <div
            id="voice-feedback-toast"
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono tracking-wide backdrop-blur-md transition-all duration-300 animate-fade-in shadow-lg text-center max-w-[280px] sm:max-w-[340px] ${
              isListening
                ? 'border-[#00F0FF]/80 bg-[#001824]/90 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : voiceFeedback.includes('ACCESS GRANTED') || voiceFeedback.includes('Verified')
                ? 'border-emerald-400 bg-emerald-950/90 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                : 'border-amber-400/80 bg-amber-950/90 text-amber-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {isListening && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F0FF] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F0FF]"></span>
                </span>
              )}
              <span>{voiceFeedback}</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {/* ── PRIMARY ACCESS CAMELOT BUTTON ── */}
          <button
            id="access-camelot-btn"
            type="button"
            onClick={() => handleAccessCamelot()}
            disabled={isAuthenticating || authSuccess || isPlayingTransition}
            onMouseEnter={() => {
              setIsButtonHovered(true);
              playCyberSound('hover');
            }}
            onMouseLeave={() => setIsButtonHovered(false)}
            className={`group relative flex items-center justify-center gap-2 rounded-xl border-2 py-2.5 px-5 sm:px-6 font-serif text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-white transition-all duration-300 cursor-pointer disabled:opacity-80 shadow-2xl active:scale-[0.97] ${
              authSuccess
                ? 'border-emerald-400 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 shadow-[0_0_40px_rgba(52,211,153,0.9)]'
                : isButtonHovered
                ? 'border-[#FFD700] bg-gradient-to-r from-[#FFD700]/40 via-[#00F0FF]/40 to-[#FFD700]/40 shadow-[0_0_35px_rgba(255,215,0,0.8)] scale-105'
                : 'border-[#00F0FF]/90 bg-gradient-to-r from-[#002D3F]/90 via-[#005B73]/90 to-[#002D3F]/90 shadow-[0_0_25px_rgba(0,240,255,0.6)] backdrop-blur-md'
            }`}
          >
            {/* Glowing Corner Accents */}
            <div className="absolute -top-1 -left-1 h-2.5 w-2.5 border-t-2 border-l-2 border-[#FFD700]" />
            <div className="absolute -top-1 -right-1 h-2.5 w-2.5 border-t-2 border-r-2 border-[#FFD700]" />
            <div className="absolute -bottom-1 -left-1 h-2.5 w-2.5 border-b-2 border-l-2 border-[#FFD700]" />
            <div className="absolute -bottom-1 -right-1 h-2.5 w-2.5 border-b-2 border-r-2 border-[#FFD700]" />

            <span className="text-base transition-transform group-hover:scale-110">
              {authSuccess ? '🔓' : '🛡️'}
            </span>
            <span className="drop-shadow-[0_0_8px_rgba(255,255,255,0.9)] whitespace-nowrap">
              {isAuthenticating
                ? 'VERIFYING...'
                : authSuccess
                ? 'UNSEALED'
                : 'ACCESS CAMELOT'}
            </span>
          </button>

          {/* ── HANDS-FREE WEB SPEECH API 'LISTEN' BUTTON ── */}
          {speechSupported && (
            <button
              id="voice-listen-trigger-btn"
              type="button"
              onClick={toggleListening}
              disabled={isAuthenticating || authSuccess || isPlayingTransition}
              title={isListening ? 'Stop listening' : 'Voice activation: Click and say "Access Camelot", "Open Vault", or "Sync Drive"'}
              className={`group relative flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 px-3 sm:px-3.5 font-serif text-xs font-bold uppercase tracking-wider text-white transition-all duration-300 cursor-pointer disabled:opacity-50 shadow-xl active:scale-95 ${
                isListening
                  ? 'border-[#00F0FF] bg-gradient-to-r from-[#00F0FF]/30 to-[#006680]/50 shadow-[0_0_25px_rgba(0,240,255,0.8)] text-[#00F0FF] animate-pulse'
                  : 'border-[#D4AF37]/80 bg-[#120E05]/80 hover:border-[#FFD700] hover:bg-[#2A200B]/90 text-[#FFD700] hover:shadow-[0_0_20px_rgba(255,215,0,0.6)] backdrop-blur-md'
              }`}
            >
              {/* Mic Icon & Dynamic Soundwave Bars */}
              <div className="relative flex items-center justify-center">
                {isListening ? (
                  <div className="flex items-center gap-0.5 h-3.5">
                    <span className="w-0.5 h-3 bg-[#00F0FF] animate-[pulse_0.4s_ease-in-out_infinite]" />
                    <span className="w-0.5 h-4 bg-[#00F0FF] animate-[pulse_0.5s_ease-in-out_infinite]" />
                    <span className="w-0.5 h-2.5 bg-[#00F0FF] animate-[pulse_0.3s_ease-in-out_infinite]" />
                  </div>
                ) : (
                  <svg
                    className="w-3.5 h-3.5 transition-transform group-hover:scale-110"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                  </svg>
                )}
              </div>
              <span className="whitespace-nowrap tracking-widest text-[11px]">
                {isListening ? 'LISTENING' : 'LISTEN'}
              </span>
            </button>
          )}

          {/* ── TOGGLEABLE VOICE COMMANDS HELP MODAL BUTTON ── */}
          <button
            id="voice-help-toggle-btn"
            type="button"
            onClick={() => {
              playCyberSound('hover');
              setIsHelpModalOpen((prev) => !prev);
            }}
            disabled={isPlayingTransition}
            title="View voice commands list (?)"
            className="flex items-center justify-center rounded-xl border border-[#D4AF37]/50 bg-[#120E05]/80 hover:border-[#FFD700] hover:bg-[#20180A] text-[#FFD700] p-2.5 transition-all shadow-md active:scale-95 cursor-pointer backdrop-blur-md"
          >
            <span className="text-xs font-serif font-bold">❓</span>
          </button>
        </div>

        {/* Keyboard and Voice Command Hint */}
        <div className="flex items-center gap-2 text-[9px] font-mono tracking-widest text-white/50 uppercase drop-shadow">
          <span>[ENTER]</span>
          <span>•</span>
          <span>SAY &quot;OPEN VAULT&quot;</span>
          <span>•</span>
          <span>[?] COMMANDS</span>
        </div>
      </div>

      {/* ── TOGGLEABLE VOICE DIRECTIVES & COMMANDS MODAL ── */}
      <CamelotVoiceHelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        onSelectCommand={handleSelectCommand}
      />

      {/* ── STAGE 2: FULL-SCREEN ROUND TABLE TENANT CAROUSEL SELECT MODAL ── */}
      {isTenantCarouselOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/95">
          <TenantCarouselSelect
            onSelectTenantComplete={() => {
              setIsTenantCarouselOpen(false);
              handleAccessCamelot();
            }}
          />
          {/* Close / Return button */}
          <button
            type="button"
            onClick={() => setIsTenantCarouselOpen(false)}
            className="absolute top-6 left-6 z-50 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-4 py-1.5 font-mono text-[11px] text-white/80 backdrop-blur-md hover:border-[#00F0FF] hover:text-[#00F0FF] transition-all cursor-pointer"
          >
            <span>← RETURN TO PORTAL</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Alias for clean semantic imports
export { CamelotSwordAndStoneBootScreen as CamelotBootScreen };
