'use client';

import { useEffect } from 'react';
import { shouldDownscaleOnMemoryPressure } from '../../lib/portalBridge';

type KineticCanvasProps = {
  className?: string;
};

export default function KineticCanvas({ className = '' }: KineticCanvasProps) {
  useEffect(() => {
    // Forward-compatibility hook: once a Three.js Gaussian-splat loader lands,
    // gate its upload path on this. Today the canvas is a CSS gradient shell;
    // the probe runs once on mount and emits a no-op debug line so future
    // loaders can LOD-downscale on memory pressure.
    if (shouldDownscaleOnMemoryPressure()) {
      // eslint-disable-next-line no-console
      console.debug('[kinetic] memory pressure detected — future loader would LOD-downscale here');
    }
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`${className} pointer-events-none bg-[radial-gradient(circle_at_50%_10%,rgba(157,78,221,0.18),transparent_24%),radial-gradient(circle_at_80%_80%,rgba(212,175,55,0.12),transparent_28%),linear-gradient(180deg,#0D0D11_0%,#050505_100%)]`}
    />
  );
}
