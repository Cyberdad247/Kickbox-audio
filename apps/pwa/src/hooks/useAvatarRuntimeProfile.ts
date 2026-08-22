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
  // SSR-stable seed; corrected on mount (avoids SSR hydration mismatch — see
  // the same pattern in useClevelandWeather + the comment block on
  // useLakishaVoice's capability flags). On client-initial-render, readProfile()
  // would otherwise read window.devicePixelRatio / window.innerWidth /
  // navigator.hardwareConcurrency — none of which exist during SSR — producing
  // different runtimeProfile values that propagate into LakishaEnclave's JSX
  // (style={{ width: runtimeProfile.shellWidth }} on the avatar frame + form
  // + telemetry + error footer, plus the videoMode/objectPosition/deviceClass
  // text) and triggering React #425/#418/#423 on the prod build.
  const [profile, setProfile] = useState<AvatarRuntimeProfile>(() =>
    resolveAvatarRuntimeProfile({ height: 844, width: 390 }),
  );

  useEffect(() => {
    const update = () => setProfile(readProfile());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return profile;
}
