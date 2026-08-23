// HYBRID_VOICE_ASSISTANT_vMAX · //IGNITE
// On-device speech synthesis and Web Audio API enclaves.
import type { SovereignState } from '../context/BifrostContext';

const isBrowser = () => typeof window !== 'undefined';
const hasSpeechSynthesis = () => isBrowser() && 'speechSynthesis' in window;
const hasWebAudio = () =>
  isBrowser() && ('AudioContext' in window || 'webkitAudioContext' in window);

// Web Audio API Pipeline (Zero-Copy Target)
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let analyser: AnalyserNode | null = null;

export function initAudioEnclave() {
  if (!hasWebAudio() || audioCtx) return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  audioCtx = new AudioContextClass({ sampleRate: 48000 }); // 48kHz RMS Lock

  masterGain = audioCtx.createGain();
  analyser = audioCtx.createAnalyser();

  analyser.fftSize = 2048;
  masterGain.connect(analyser);
  analyser.connect(audioCtx.destination);

  // Resume context if suspended due to browser autoplay policies
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function getAudioAnalyser(): AnalyserNode | null {
  return analyser;
}

const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

// Prefer a crisp en-US voice; fall back to the platform default.
function pickVoice(synth: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = synth.getVoices();
  if (!voices.length) return null;
  return (
    voices.find(
      (v) => /en[-_]US/i.test(v.lang) && /female|samantha|aria|jenny|zira/i.test(v.name),
    ) ??
    voices.find((v) => /en[-_]US/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    voices[0]
  );
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

/**
 * Speak a line immediately. Barge-in semantics: any in-flight utterance is
 * cancelled so the latest signal always wins (//REZERO-friendly).
 */
export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!hasSpeechSynthesis() || !text) return;

  // Initialize Web Audio Context if not ready
  if (!audioCtx) initAudioEnclave();

  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = opts.rate ?? 1.05;
  u.pitch = opts.pitch ?? 1;
  const voice = pickVoice(synth);
  if (voice) u.voice = voice;
  if (opts.onStart) u.onstart = opts.onStart;
  if (opts.onEnd) u.onend = opts.onEnd;
  synth.speak(u);
}

export function cancelSpeech(): void {
  if (hasSpeechSynthesis()) window.speechSynthesis.cancel();
}

export function speechSupported(): boolean {
  return hasSpeechSynthesis();
}

/** Terse spoken confirmation derived from the unified state (pure signal). */
export function speakableResponse(state: SovereignState): string {
  switch (state.lastCommand) {
    case 'add_transaction':
      return `Transaction logged. Portfolio valuation is now ${money(state.portfolioValuation)}.`;
    case 'remind':
      return 'Reminder set, Sovereign.';
    case 'order':
      return 'Order placed.';
    case 'unknown':
      return 'Command not recognized.';
    default:
      return 'Acknowledged.';
  }
}
