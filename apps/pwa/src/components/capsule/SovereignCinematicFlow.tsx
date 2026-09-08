'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { KnightChoiceAndArmory } from '../capsule/KnightChoiceAndArmory';
import { LivingWorkspaceView } from '../capsule/LivingWorkspaceView';
import { BootSequence } from '../gateway/BootSequence';
import { TenantCarouselSelect } from '../gateway/TenantCarouselSelect';
import { CamelotCitadelView } from './CamelotCitadelView';
import { BiometricCameraAuthOverlay } from '../gateway/BiometricCameraAuthOverlay';
import { cinematicAudio } from '../../lib/cinematicAudio';

export type CinematicStage = 'biometric' | 'boot' | 'tenant_carousel' | 'knight_choice' | 'citadel';

export function SovereignCinematicFlow() {
  const [currentStage, setCurrentStage] = useState<CinematicStage>(() => {
    try {
      const stored = localStorage.getItem('camelot_cinematic_stage');
      if (stored === 'biometric' || stored === 'boot' || stored === 'tenant_carousel' || stored === 'knight_choice' || stored === 'citadel') {
        return stored as CinematicStage;
      }
    } catch {}
    return 'biometric';
  });

  useEffect(() => {
    try {
      localStorage.setItem('camelot_cinematic_stage', currentStage);
    } catch {}
    
    // Sync atmospheric hum with the current stage
    cinematicAudio.setStage(currentStage);
  }, [currentStage]);

  useEffect(() => {
    return () => {
      // If unmounted completely (e.g. bypassing or completing loop), fade out
      cinematicAudio.stop();
    };
  }, []);
  
  const { updateAvatar, activeTenant } = useTenant();

  return (
    <div id="sovereign-cinematic-flow" className="relative h-full w-full bg-void">
      {/* Stage 0: Biometric Authorization Gate */}
      {currentStage === 'biometric' && (
        <div key="stage-biometric" className="h-full w-full animate-cinematic-enter">
          <BiometricCameraAuthOverlay 
            isOpen={true} 
            tenant={activeTenant} 
            onClose={() => {}} 
            onAuthenticated={() => setCurrentStage('boot')} 
          />
        </div>
      )}

      {/* Stage 1: The Boot Up Sequence */}
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

      {/* Stage 3 - 5: Knight Choice, Armory Forge, and Ascension Briefing */}
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

      {/* Stage 6: The Citadel of Camelot */}
      {currentStage === 'citadel' && (
        <div key="stage-citadel" className="h-full w-full animate-cinematic-enter">
          <CamelotCitadelView onEnterWorkspace={() => {
             window.dispatchEvent(new CustomEvent('camelot:navigate-tab', { detail: 'dashboard' }));
          }} />
        </div>
      )}
    </div>
  );
}
