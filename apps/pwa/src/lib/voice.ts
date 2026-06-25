// HYBRID_VOICE_ASSISTANT_vMAX · //IGNITE
// On-device speech synthesis (browser SpeechSynthesis API). Local-first, zero
// network, sub-500ms time-to-first-audio. Responses are renormalized to pure
// semantic signal — terse, no conversational fluff.

import type { SovereignState } from '../context/BifrostContext';

const isBrowser = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

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
  if (!isBrowser() || !text) return;
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
  if (isBrowser()) window.speechSynthesis.cancel();
}

export function speechSupported(): boolean {
  return isBrowser();
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
