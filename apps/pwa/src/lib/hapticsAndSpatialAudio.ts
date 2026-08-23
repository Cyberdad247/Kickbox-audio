'use client';

export type HapticPattern = 'pill-slot' | 'consent' | 'error' | 'click' | 'ptt' | 'awaken';

export function triggerHaptic(pattern: HapticPattern = 'click') {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;

  try {
    switch (pattern) {
      case 'pill-slot':
        // Mechanical double-click latch feel
        navigator.vibrate([25, 40, 30]);
        break;
      case 'consent':
        // Strong confirmation pulse
        navigator.vibrate([70]);
        break;
      case 'error':
        // Staccato warning
        navigator.vibrate([40, 30, 40, 30, 60]);
        break;
      case 'ptt':
        // Soft touch trigger
        navigator.vibrate([30]);
        break;
      case 'awaken':
        // Resonant ascending pulse
        navigator.vibrate([20, 50, 40, 50, 80]);
        break;
      case 'click':
      default:
        navigator.vibrate(15);
        break;
    }
  } catch {
    // Ignore restricted environments
  }
}

/**
 * Spatial 3D Web Audio Synthesizer
 * Pans audio left/right depending on X position (0 to 1) across the viewport.
 */
export function playSpatialTone(
  xPosPercent = 0.5,
  frequency = 440,
  durationMs = 200,
  type: OscillatorType = 'sine',
) {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const panVal = Math.max(-1, Math.min(1, (xPosPercent - 0.5) * 2));

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Fade in and out
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

    if ('createStereoPanner' in ctx) {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(panVal, ctx.currentTime);
      osc.connect(gain);
      gain.connect(panner);
      panner.connect(ctx.destination);
    } else {
      osc.connect(gain);
      gain.connect(ctx.destination);
    }

    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000 + 0.05);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, durationMs + 200);
  } catch {
    // Autoplay restrictions guard
  }
}
