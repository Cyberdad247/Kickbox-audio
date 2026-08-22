import { describe, expect, it } from 'vitest';
import { resolveAvatarRuntimeProfile } from './avatarRuntime';

describe('resolveAvatarRuntimeProfile', () => {
  it('uses compact mobile sizing on narrow screens', () => {
    const profile = resolveAvatarRuntimeProfile({ height: 844, width: 390 });
    expect(profile.deviceClass).toBe('mobile');
    expect(profile.shellWidth).toBeLessThanOrEqual(216);
  });

  it('drops to poster mode when reduced motion is requested', () => {
    const profile = resolveAvatarRuntimeProfile({
      height: 900,
      prefersReducedMotion: true,
      width: 1440,
    });
    expect(profile.videoMode).toBe('poster-only');
  });

  it('uses reduced-motion mode on low-power hardware', () => {
    const profile = resolveAvatarRuntimeProfile({
      hardwareConcurrency: 2,
      height: 844,
      width: 390,
    });
    expect(profile.videoMode).toBe('reduced-motion');
  });

  it('treats save-data tablet clients as reduced-motion devices', () => {
    const profile = resolveAvatarRuntimeProfile({
      height: 900,
      saveData: true,
      width: 820,
    });
    expect(profile.deviceClass).toBe('tablet');
    expect(profile.shellWidth).toBe(232);
    expect(profile.videoMode).toBe('reduced-motion');
  });

  it('keeps desktop clients in full-motion mode when hardware is healthy', () => {
    const profile = resolveAvatarRuntimeProfile({
      devicePixelRatio: 1,
      hardwareConcurrency: 8,
      height: 1080,
      width: 1440,
    });
    expect(profile.deviceClass).toBe('desktop');
    expect(profile.objectPosition).toBe('center 18%');
    expect(profile.videoMode).toBe('full-motion');
  });
});
