'use client';

import { useState } from 'react';
import { LearnWithMe } from './LearnWithMe';
import { PortalSettings } from './PortalSettings';

// SettingsDrawer is mounted in `apps/pwa/src/app/page.tsx` top-right.
// Collapsed by default; opens via the toggle button. When open, renders
// PortalSettings (config) + LearnWithMe (memory curator) stacked.
// Does not collide with `-z-10` KineticCanvas or bottom-center LakishaHUD,
// nor with the autoplay-gate pane (which sits at `bottom-8 right-8` pre-unlock).

export function SettingsDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <aside
      className="fixed top-4 right-4 md:right-6 z-40 flex max-h-[calc(100vh-6rem)] w-[min(94vw,28rem)] flex-col items-end"
      aria-label="Lakisha settings"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="settings-drawer-panel"
        aria-label={open ? 'Close settings drawer' : 'Open settings drawer'}
        className="mb-2 inline-flex items-center gap-2 border border-gold/40 bg-plate-900/95 px-3 py-2 font-serif text-sm tracking-executive text-gold-light backdrop-blur-md transition-colors hover:bg-violet/20"
      >
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full transition-colors ${
            open ? 'bg-gold-royal' : 'bg-violet shadow-glow'
          }`}
        />
        {open ? 'Close' : 'Settings'}
      </button>
      {open && (
        <div
          id="settings-drawer-panel"
          className="w-full space-y-4 overflow-y-auto border border-filigree-500/40 bg-plate-900/95 p-4 backdrop-blur-md"
        >
          <PortalSettings />
          <LearnWithMe />
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
            // portal surfaces — see apps/pwa/src/lib/portalBridge.ts
          </p>
        </div>
      )}
    </aside>
  );
}
