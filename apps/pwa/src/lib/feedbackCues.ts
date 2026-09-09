/**
 * Subtle, non-intrusive haptic and synthesized Web Audio feedback cues
 * for optical QR and biometric recognition events.
 */

let audioCtx: AudioContext | null = null;

/**
 * Explicit user-gesture unlock for Mobile Safari and Android 16 (S26 Ultra).
 * Call this on any pointerdown / touchstart / click event.
 */
export async function unlockAudioContext(): Promise<AudioContext | null> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      // Handled silently
    }
  }
  return ctx;
}

export function getAudioContext(): AudioContext | null {
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

/**
 * Synthesizes a subtle, cinematic system-boot sound effect for Camelot OS startup.
 * Combines a resonant sub-bass surge, harmonic major-9th power chord, and cybernetic shimmer sweep.
 */
export function playSystemBootSound(volume = 0.12): boolean {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    const now = ctx.currentTime;
    const vol = Math.max(0.01, Math.min(volume, 0.3));

    // ── 1. Sub-Bass Initialization Surge ──
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55, now); // A1
    subOsc.frequency.exponentialRampToValueAtTime(110, now + 1.2); // Ramp to A2

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.exponentialRampToValueAtTime(vol * 0.9, now + 0.15);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 1.85);

    // ── 2. Harmonic Crystalline Power Chord (Dmaj9: D4, A4, E5, F#5, A5, C#6) ──
    const bootFrequencies = [293.66, 440.0, 659.25, 739.99, 880.0, 1108.73];
    bootFrequencies.forEach((freq, idx) => {
      const noteDelay = idx * 0.035;
      const noteStart = now + noteDelay;

      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.015, noteStart + 1.5);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, noteStart);
      filter.frequency.exponentialRampToValueAtTime(4500, noteStart + 0.6);

      noteGain.gain.setValueAtTime(0.0001, noteStart);
      noteGain.gain.exponentialRampToValueAtTime(vol * (0.55 - idx * 0.05), noteStart + 0.06);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 1.6 - noteDelay);

      osc.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + 1.65);
    });

    // ── 3. High-Frequency Cyber Shimmer Sweep ──
    const sweepOsc = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweepOsc.type = 'sine';
    sweepOsc.frequency.setValueAtTime(1400, now + 0.1);
    sweepOsc.frequency.exponentialRampToValueAtTime(3200, now + 0.9);

    sweepGain.gain.setValueAtTime(0.0001, now + 0.1);
    sweepGain.gain.exponentialRampToValueAtTime(vol * 0.25, now + 0.35);
    sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

    sweepOsc.connect(sweepGain);
    sweepGain.connect(ctx.destination);
    sweepOsc.start(now + 0.1);
    sweepOsc.stop(now + 1.15);

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
