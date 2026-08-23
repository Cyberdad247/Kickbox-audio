import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  playScanDetectedSound,
  playVaultUnsealSound,
  triggerDetectionFeedback,
  triggerScanHaptic,
} from './feedbackCues';

describe('Feedback Cues (Audio & Haptics)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers haptic vibration safely with fallback', () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis, 'navigator', {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });

    const result = triggerScanHaptic();
    expect(result).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith([15, 30, 20]);
  });

  it('handles environment with missing navigator.vibrate gracefully', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      configurable: true,
      writable: true,
    });

    const result = triggerScanHaptic();
    expect(result).toBe(false);
  });

  it('executes triggerDetectionFeedback with audio and haptic flags', () => {
    const vibrateMock = vi.fn().mockReturnValue(true);
    Object.defineProperty(globalThis, 'navigator', {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });

    const result = triggerDetectionFeedback({ sound: false, haptics: true });
    expect(result.hapticTriggered).toBe(true);
    expect(result.soundTriggered).toBe(false);
  });

  it('does not crash when Web Audio API is unavailable', () => {
    // In node/non-browser test environment
    const soundResult = playScanDetectedSound(0.08);
    const unsealResult = playVaultUnsealSound(0.1);
    expect(typeof soundResult).toBe('boolean');
    expect(typeof unsealResult).toBe('boolean');
  });
});
