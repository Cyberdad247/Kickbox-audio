'use client';

import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { KnightChoiceAndArmory } from '../capsule/KnightChoiceAndArmory';
import { LivingWorkspaceView } from '../capsule/LivingWorkspaceView';
import { BootSequence } from '../gateway/BootSequence';
import { TenantCarouselSelect } from '../gateway/TenantCarouselSelect';

export type CinematicStage = 'boot' | 'tenant_carousel' | 'knight_choice' | 'workspace';

export function SovereignCinematicFlow() {
  const [currentStage, setCurrentStage] = useState<CinematicStage>('workspace');
  const { updateAvatar } = useTenant();

  return (
    <div id="sovereign-cinematic-flow" className="relative h-full w-full">
      {/* Stage Navigation Quick-Switcher for Debugging & Demonstrations */}
      <div className="absolute top-2 right-4 z-40 flex items-center gap-1 rounded-full border border-white/20 bg-black/80 px-2.5 py-1 font-mono text-[9px] text-white/60 shadow-lg backdrop-blur-md">
        <span className="text-white/40 uppercase">Cinematic Stage:</span>
        <button
          type="button"
          onClick={() => setCurrentStage('boot')}
          className={`rounded px-1.5 py-0.5 transition-all ${
            currentStage === 'boot' ? 'bg-[#FFD700] font-bold text-black' : 'hover:text-white'
          }`}
        >
          1. Boot
        </button>
        <span>·</span>
        <button
          type="button"
          onClick={() => setCurrentStage('tenant_carousel')}
          className={`rounded px-1.5 py-0.5 transition-all ${
            currentStage === 'tenant_carousel'
              ? 'bg-[#00F0FF] font-bold text-black'
              : 'hover:text-white'
          }`}
        >
          2. Tenant
        </button>
        <span>·</span>
        <button
          type="button"
          onClick={() => setCurrentStage('knight_choice')}
          className={`rounded px-1.5 py-0.5 transition-all ${
            currentStage === 'knight_choice'
              ? 'bg-[#9D4EDD] font-bold text-white'
              : 'hover:text-white'
          }`}
        >
          3-5. Knight/Armory
        </button>
        <span>·</span>
        <button
          type="button"
          onClick={() => setCurrentStage('workspace')}
          className={`rounded px-1.5 py-0.5 transition-all ${
            currentStage === 'workspace'
              ? 'bg-emerald-400 font-bold text-black'
              : 'hover:text-white'
          }`}
        >
          6. Living Workspace
        </button>
      </div>

      {/* Stage 1: The Boot Up Sequence */}
      {currentStage === 'boot' && (
        <BootSequence onComplete={() => setCurrentStage('tenant_carousel')} />
      )}

      {/* Stage 2: The Tenant Carousel Selection */}
      {currentStage === 'tenant_carousel' && (
        <TenantCarouselSelect
          onSelectTenantComplete={() => setCurrentStage('knight_choice')}
          onOpenArmoryCustomizer={() => setCurrentStage('knight_choice')}
        />
      )}

      {/* Stage 3 - 5: Knight Choice, Armory Forge, and Ascension Briefing */}
      {currentStage === 'knight_choice' && (
        <KnightChoiceAndArmory
          onKnightBestowed={(knight) => {
            updateAvatar(knight.avatar);
            setCurrentStage('workspace');
          }}
        />
      )}

      {/* Stage 6: The Living, Weather-Synced Workspace */}
      {currentStage === 'workspace' && <LivingWorkspaceView />}
    </div>
  );
}
