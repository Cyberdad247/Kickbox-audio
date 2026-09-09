'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { cinematicAudio } from '../../lib/cinematicAudio';
import { KnightChoiceAndArmory } from '../capsule/KnightChoiceAndArmory';
import { BiometricAuthorizationGate } from '../gateway/BiometricAuthorizationGate';
import { BootSequence } from '../gateway/BootSequence';
import { TenantCarouselSelect } from '../gateway/TenantCarouselSelect';
import { CamelotCitadelView } from './CamelotCitadelView';

export type CinematicStage = 'boot' | 'tenant_carousel' | 'knight_choice' | 'citadel' | 'biometric';

export function SovereignCinematicFlow() {
  const [currentStage, setCurrentStage] = useState<CinematicStage>(() => {
    try {
      const stored = localStorage.getItem('camelot_cinematic_stage');
      if (
        stored === 'boot' ||
        stored === 'tenant_carousel' ||
        stored === 'knight_choice' ||
        stored === 'citadel'
      ) {
        return stored as CinematicStage;
      }
    } catch {}
    return 'boot';
  });

  useEffect(() => {
    try {
      localStorage.setItem('camelot_cinematic_stage', currentStage);
    } catch {}

    // Sync atmospheric hum with the current stage
    cinematicAudio.setStage(currentStage);
  }, [currentStage]);

  useEffect(() => {
    const handleReplay = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (
        customEvent?.detail &&
        ['boot', 'tenant_carousel', 'knight_choice', 'citadel'].includes(customEvent.detail)
      ) {
        setCurrentStage(customEvent.detail as CinematicStage);
      } else {
        setCurrentStage('boot');
      }
    };
    window.addEventListener('camelot:replay-excalibur', handleReplay);
    window.addEventListener('camelot:set-cinematic-stage', handleReplay);
    return () => {
      window.removeEventListener('camelot:replay-excalibur', handleReplay);
      window.removeEventListener('camelot:set-cinematic-stage', handleReplay);
    };
  }, []);

  useEffect(() => {
    return () => {
      // If unmounted completely (e.g. bypassing or completing loop), fade out
      cinematicAudio.stop();
    };
  }, []);

  const { updateAvatar, activeTenant } = useTenant();

  return (
    <div id="sovereign-cinematic-flow" className="relative h-full w-full bg-void">
      {/* ── STAGE NAVIGATION DOCK (Persistent quick access to Excalibur transition) ── */}
      <nav
        aria-label="Cinematic stages navigation"
        className="absolute top-4 left-4 z-40 hidden sm:flex items-center gap-1.5 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-md shadow-lg"
      >
        <button
          type="button"
          onClick={() => setCurrentStage('boot')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
            currentStage === 'boot'
              ? 'border border-[#FFD700] bg-[#FFD700]/20 text-[#FFD700] font-bold shadow-[0_0_10px_rgba(255,215,0,0.4)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Excalibur 3D Sword in Stone & Video Transition"
        >
          <span>🗡️</span>
          <span>Excalibur</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentStage('tenant_carousel')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
            currentStage === 'tenant_carousel'
              ? 'border border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF] font-bold shadow-[0_0_10px_rgba(0,240,255,0.4)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Round Table Knight Selector"
        >
          <span>🛡️</span>
          <span>Round Table</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentStage('knight_choice')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
            currentStage === 'knight_choice'
              ? 'border border-[#10B981] bg-[#10B981]/20 text-[#10B981] font-bold shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Knight Armory & Forge"
        >
          <span>⚔️</span>
          <span>Armory</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentStage('citadel')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
            currentStage === 'citadel'
              ? 'border border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37] font-bold shadow-[0_0_10px_rgba(212,175,55,0.4)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Citadel Gateway"
        >
          <span>🏰</span>
          <span>Citadel</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentStage('biometric')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
            currentStage === 'biometric'
              ? 'border border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF] font-bold shadow-[0_0_10px_rgba(0,240,255,0.4)]'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
          title="Biometric Camera Facial Recognition Gate"
        >
          <span>👁️</span>
          <span>Face Gate</span>
        </button>

        <span className="h-3 w-px bg-white/20 mx-1" />

        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('camelot:navigate-tab', { detail: 'dashboard' }));
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] uppercase tracking-wider text-cyan-300 hover:text-white hover:bg-cyan-900/30 transition-all cursor-pointer"
          title="Jump to Main Dashboard Workspace"
        >
          <span>Workspace</span>
          <span>➔</span>
        </button>
      </nav>

      {/* Stage 1: Excalibur 3D Sword and Stone Boot Screen & Video Transition Sequence */}
      {currentStage === 'boot' && (
        <div key="stage-boot" className="h-full w-full animate-cinematic-enter">
          <BootSequence onComplete={() => setCurrentStage('tenant_carousel')} />
        </div>
      )}

      {/* Stage 2: The Tenant Carousel Selection */}
      {currentStage === 'tenant_carousel' && (
        <div key="stage-tenant" className="h-full w-full animate-cinematic-enter">
          <TenantCarouselSelect
            onSelectTenantComplete={() => setCurrentStage('knight_choice')}
            onOpenArmoryCustomizer={() => setCurrentStage('knight_choice')}
          />
        </div>
      )}

      {/* Stage 3: Knight Choice, Armory Forge, and Ascension Briefing */}
      {currentStage === 'knight_choice' && (
        <div key="stage-knight" className="h-full w-full animate-cinematic-enter">
          <KnightChoiceAndArmory
            onKnightBestowed={(knight) => {
              updateAvatar(knight.avatar);
              setCurrentStage('citadel');
            }}
          />
        </div>
      )}

      {/* Stage 4: The Citadel of Camelot */}
      {currentStage === 'citadel' && (
        <div key="stage-citadel" className="h-full w-full animate-cinematic-enter">
          <CamelotCitadelView
            onEnterWorkspace={() => {
              window.dispatchEvent(
                new CustomEvent('camelot:navigate-tab', { detail: 'dashboard' }),
              );
            }}
            onReplayBoot={() => setCurrentStage('boot')}
          />
        </div>
      )}

      {/* Biometric Camera Facial Recognition Authorization Gate */}
      {currentStage === 'biometric' && (
        <div key="stage-biometric" className="h-full w-full animate-cinematic-enter">
          <BiometricAuthorizationGate
            isOpen={true}
            tenant={activeTenant}
            onClose={() => setCurrentStage('boot')}
            onAuthenticated={() => {
              window.dispatchEvent(
                new CustomEvent('camelot:navigate-tab', { detail: 'dashboard' })
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
