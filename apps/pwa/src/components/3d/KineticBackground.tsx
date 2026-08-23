import React, { Suspense } from 'react';

const KineticCanvas = React.lazy(() => import('./KineticCanvas'));

export function KineticBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
      <Suspense fallback={null}>
        <KineticCanvas />
      </Suspense>
    </div>
  );
}
