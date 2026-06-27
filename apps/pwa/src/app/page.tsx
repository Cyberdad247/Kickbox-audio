'use client';

import dynamic from 'next/dynamic';
import { Dashboard } from '../components/Dashboard';

// KineticCanvas is gated behind `next/dynamic({ ssr: false })` per
// `audit-kickbox-audio/AGENTS.md` Project Roster entry and HELIO_PATCH.json
// performance_conformance WARN — keeping FCP < 1.2 s on Vercel Edge.
const KineticCanvas = dynamic(
  () => import('../components/3d/KineticCanvas'),
  { ssr: false, loading: () => null },
);

export default function Home() {
  return (
    <>
      <KineticCanvas />
      <Dashboard />
    </>
  );
}
