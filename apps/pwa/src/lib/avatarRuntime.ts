export interface AvatarRuntimeInput {
  devicePixelRatio?: number;
  hardwareConcurrency?: number;
  height: number;
  prefersReducedMotion?: boolean;
  saveData?: boolean;
  width: number;
}

export interface AvatarRuntimeProfile {
  deviceClass: 'desktop' | 'mobile' | 'tablet';
  objectPosition: string;
  shellWidth: number;
  videoMode: 'full-motion' | 'poster-only' | 'reduced-motion';
}

export function resolveAvatarRuntimeProfile(input: AvatarRuntimeInput): AvatarRuntimeProfile {
  const deviceClass = input.width < 640 ? 'mobile' : input.width < 1024 ? 'tablet' : 'desktop';
  const lowPower =
    (input.hardwareConcurrency ?? 4) <= 4 ||
    !!input.saveData ||
    ((input.devicePixelRatio ?? 1) > 2.25 && input.width < 480);
  const videoMode = input.prefersReducedMotion
    ? 'poster-only'
    : lowPower
      ? 'reduced-motion'
      : 'full-motion';

  const shellWidth =
    deviceClass === 'mobile'
      ? Math.max(184, Math.min(input.width - 32, 216))
      : deviceClass === 'tablet'
        ? 232
        : 256;

  const objectPosition =
    input.height < 760 || deviceClass === 'mobile' ? 'center top' : 'center 18%';

  return {
    deviceClass,
    objectPosition,
    shellWidth,
    videoMode,
  };
}
