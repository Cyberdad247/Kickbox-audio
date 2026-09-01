'use client';

import React from 'react';
import { useTenant } from '../../context/TenantContext';
import { TenantWarpTransition } from './TenantWarpTransition';
import { CamelotSwordAndStoneBootScreen } from './CamelotSwordAndStoneBootScreen';

export function CamelotTenantGateway() {
  const {
    isGatewayOpen,
    warpStage,
    targetTenant,
    isAuthenticated,
    closeGateway,
  } = useTenant();

  if (!isGatewayOpen && warpStage === 'idle') return null;

  return (
    <div className="relative">
      <CamelotSwordAndStoneBootScreen
        onComplete={closeGateway}
        isInitialBoot={!isAuthenticated}
      />

      {/* Shield Expand Warp Gate Animation Overlay */}
      <TenantWarpTransition stage={warpStage} targetTenant={targetTenant} />
    </div>
  );
}
