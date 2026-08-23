import React, { type ReactNode } from 'react';
import { CamelotTenantGateway } from '../components/gateway/CamelotTenantGateway';
import { AvatarConfigModal } from '../components/hud/AvatarConfigModal';
import { LakeishaVideoHUD } from '../components/hud/LakeishaVideoHUD';
import { MacroManagerModal } from '../components/macro/MacroManagerModal';
import { AvatarConfigProvider } from './AvatarConfigContext';
import { BifrostProvider } from './BifrostContext';
import { MacroProvider } from './MacroContext';
import { TenantProvider } from './TenantContext';

export function KoARealmProvider({ children }: { children: ReactNode }) {
  return (
    <BifrostProvider>
      <TenantProvider>
        <AvatarConfigProvider>
          <MacroProvider>
            <div className="relative min-h-screen bg-[#050507] text-white">
              {/* 2D Luxury Minimalist Cyber-Lattice Backdrop */}
              <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050507]">
                <div className="absolute inset-0 bg-[radial-gradient(#5A2A82_1px,transparent_1px)] [background-size:32px_32px] opacity-15" />
                <div className="absolute -top-40 left-1/4 h-[500px] w-[600px] rounded-full bg-[#7B2CBF]/10 blur-[150px]" />
                <div className="absolute -bottom-40 right-1/4 h-[400px] w-[500px] rounded-full bg-[#FFD700]/8 blur-[130px]" />
              </div>

              {children}

              <LakeishaVideoHUD />
              <AvatarConfigModal />
              <MacroManagerModal />
              <CamelotTenantGateway />
            </div>
          </MacroProvider>
        </AvatarConfigProvider>
      </TenantProvider>
    </BifrostProvider>
  );
}
