/**
 * Subtle, non-intrusive haptic and synthesized Web Audio feedback cues
 * for optical QR and biometric recognition events.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const globalScope = typeof window !== 'undefined' ? window : globalThis;
    const AudioContextClass =
      (globalScope as any).AudioContext || (globalScope as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {
        // Autoplay policy may suspend until user gesture
      });
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Triggers subtle, non-intrusive micro-haptic vibration pulses.
 */
export function triggerScanHaptic(): boolean {
  try {
    const globalNav = typeof navigator !== 'undefined' ? navigator : (globalThis as any).navigator;
    if (globalNav && 'vibrate' in globalNav && typeof globalNav.vibrate === 'function') {
      // Light dual-tap pattern: 15ms pulse, 30ms pause, 20ms pulse
      return Boolean(globalNav.vibrate([15, 30, 20]));
    }
  } catch {
    // Ignore environments where vibration is restricted
  }
  return false;
}

/**
 * Synthesizes a soft, pleasant cybernetic harmonic chime using Web Audio API.
 * Frequency: 1046.5Hz (C6) -> 1318.5Hz (E6), gently filtered, ~180ms duration.
 */
export function playScanDetectedSound(volume = 0.08): boolean {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    const now = ctx.currentTime;

    // Master Gain & Soft Envelope
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(
      Math.max(0.01, Math.min(volume, 0.2)),
      now + 0.015,
    );
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    // Warm Lowpass Filter to soften the high frequencies
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.Q.setValueAtTime(1, now);

    // Oscillator 1: Primary Tone
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now); // C6
    osc1.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08); // E6

    // Oscillator 2: Subtle Upper Harmonic (Subtle sparkle)
    const osc2 = ctx.createOscillator();
    const osc2Gain = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1567.98, now); // G6
    osc2Gain.gain.setValueAtTime(0.2, now);

    // Connect audio graph
    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);

    osc1.stop(now + 0.2);
    osc2.stop(now + 0.2);

    return true;
  } catch {
    return false;
  }
}

/**
 * Synthesizes a soft triumphal 3-note ascending chord for successful vault unsealing.
 */
export function playVaultUnsealSound(volume = 0.1): boolean {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    const now = ctx.currentTime;
    const notes = [1046.5, 1318.51, 1567.98, 2093.0]; // C6, E6, G6, C7

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.04;
      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0.0001, startTime);
      noteGain.gain.exponentialRampToValueAtTime(volume * (1 - idx * 0.15), startTime + 0.01);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.25);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      osc.connect(noteGain);
      noteGain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.28);
    });

    return true;
  } catch {
    return false;
  }
}

export interface FeedbackOptions {
  sound?: boolean;
  haptics?: boolean;
  volume?: number;
}

/**
 * Unified feedback cue for QR/Biometric detection.
 */
export function triggerDetectionFeedback(options: FeedbackOptions = {}): {
  hapticTriggered: boolean;
  soundTriggered: boolean;
} {
  const { sound = true, haptics = true, volume = 0.08 } = options;

  let hapticTriggered = false;
  let soundTriggered = false;

  if (haptics) {
    hapticTriggered = triggerScanHaptic();
  }

  if (sound) {
    soundTriggered = playScanDetectedSound(volume);
  }

  return { hapticTriggered, soundTriggered };
}
