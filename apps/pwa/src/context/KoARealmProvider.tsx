'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';
import { LakeishaVideoHUD } from '../components/hud/LakeishaVideoHUD';
import { LakishaEnclave } from '../components/hud/LakishaEnclave';
import { BifrostProvider } from './BifrostContext';

const SpatialBackground = dynamic(
  () => import('../components/3d/SpatialBackground').then((mod) => mod.SpatialBackground),
  {
    ssr: false,
    loading: () => <div className="pointer-events-none fixed inset-0 -z-10 bg-[#050505]" />,
  },
);

export function KoARealmProvider({ children }: { children: ReactNode }) {
  return (
    <BifrostProvider>
      <div className="relative min-h-screen bg-[#050505] text-white">
        <SpatialBackground />
        {children}
        <LakeishaVideoHUD />
        <LakishaEnclave />
      </div>
    </BifrostProvider>
  );
}
