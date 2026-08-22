'use client';

import Image from 'next/image';
import type { AvatarRuntimeProfile } from '../../lib/avatarRuntime';

// LaKesha pill avatar — a compact image-first surface that keeps voice, sync,
// and Bifrost state in one reusable control. The executive portrait is
// reliable on every device; the runtime profile still controls presence motion.
export function LakishaAvatar({
  speaking,
  connected,
  onSync,
  runtimeProfile,
}: {
  speaking: boolean;
  connected: boolean;
  onSync: () => void;
  runtimeProfile: AvatarRuntimeProfile;
}) {
  const animatePresence = speaking && runtimeProfile.videoMode === 'full-motion';

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-gold/50 bg-smoke-900/90 p-2 pr-3 shadow-gold backdrop-blur-md"
      style={{ width: runtimeProfile.shellWidth }}
      aria-label="LaKesha KBA executive assistant avatar"
    >
      <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-full border border-gold/40 bg-void-950">
        <Image
          src="/assets/LaKesha.png"
          alt="LaKesha, KBA Services AI executive assistant"
          fill
          priority
          sizes="64px"
          className="object-cover"
          style={{ objectPosition: runtimeProfile.objectPosition }}
        />
        {/* Reactive presence ring; reduced-motion profiles keep it static. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {speaking && (
            <>
              <span
                className={`absolute inset-0 rounded-full border border-violet/50 ${animatePresence ? 'animate-ping' : ''}`}
              />
              <span className="absolute inset-1 rounded-full border border-violet/25" />
            </>
          )}
        </div>
        {/* scanline sheen */}
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(0,0,0,0.18)_4px)] opacity-40" />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate font-display text-sm tracking-minted text-gold-royal">LaKesha</p>
        <p className="truncate text-[9px] uppercase tracking-[0.14em] text-white/40">
          KBA executive assistant
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${speaking ? 'bg-violet shadow-glow' : connected ? 'bg-gold-royal' : 'bg-white/25'}`}
          />
          <span className="truncate text-[8px] uppercase tracking-[0.1em] text-white/45">
            {connected ? 'Online' : 'Bridge offline'} · {runtimeProfile.deviceClass}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onSync}
        aria-label="Sync LaKesha with Bifrost bridge"
        title="Sync LaKesha with Bifrost bridge"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold-light transition-colors hover:border-violet hover:text-violet-light"
      >
        <SyncIcon className="h-3 w-3" />
      </button>
    </div>
  );
}

function SyncIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 20v-5h-5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M4.5 15a8 8 0 0 0 14 3.5M19.5 9a8 8 0 0 0-14-3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
