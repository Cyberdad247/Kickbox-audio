'use client';

import dynamic from 'next/dynamic';

// next/dynamic ssr:false — the DOM paints before WebGL loads (Iron Gate: FCP < 1.2s).
const KineticCanvas = dynamic(() => import('./KineticCanvas'), { ssr: false });

export function KineticBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <KineticCanvas />
    </div>
  );
}
