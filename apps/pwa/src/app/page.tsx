'use client';

import dynamic from 'next/dynamic';
import { LakishaHUD } from '../components/LakishaHUD';

const KineticCanvas = dynamic(() => import('@/components/3d/KineticCanvas'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[#050505]" />,
});

export default function Home() {
  return (
    <>
      <KineticCanvas className="fixed inset-0 -z-10" />
      <LakishaHUD />
    </>
  );
}
