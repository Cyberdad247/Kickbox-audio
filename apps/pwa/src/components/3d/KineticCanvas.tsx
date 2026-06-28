'use client';

import { Canvas } from '@react-three/fiber';

/**
 * KineticCanvas — the persistent WebGL substrate behind the UI.
 *
 * Per `blueprint.md` §1 Dynamic Substrate: volumetric gold light at Day/Clear,
 * deep obsidian void with Electric Violet `#9D4EDD` particle rain at
 * Night/Rain. Cleveland, OH weather + local time binding is layered in by
 * follow-up PRs; this file is the foundational mount so `next/dynamic(
 * { ssr: false })` keeps FCP < 1.2 s per HELIO_PATCH performance WARN.
 */
export default function KineticCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60 }}
      style={{ background: '#0D0D11' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.4} color="#FFD700" />
    </Canvas>
  );
}
