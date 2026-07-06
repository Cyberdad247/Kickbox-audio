'use client';

import { useEffect, useState } from 'react';
import { type AvatarRuntimeProfile, resolveAvatarRuntimeProfile } from '../lib/avatarRuntime';

function readProfile(): AvatarRuntimeProfile {
  if (typeof window === 'undefined') {
    return resolveAvatarRuntimeProfile({ height: 844, width: 390 });
  }

  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  return resolveAvatarRuntimeProfile({
    devicePixelRatio: window.devicePixelRatio,
    hardwareConcurrency: nav.hardwareConcurrency,
    height: window.innerHeight,
    prefersReducedMotion: media?.matches ?? false,
    saveData: nav.connection?.saveData ?? false,
    width: window.innerWidth,
  });
}

export function useAvatarRuntimeProfile(): AvatarRuntimeProfile {
  const [profile, setProfile] = useState<AvatarRuntimeProfile>(() => readProfile());

  useEffect(() => {
    const update = () => setProfile(readProfile());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return profile;
}
