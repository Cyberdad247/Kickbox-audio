'use client';

// HYBRID_VOICE_ASSISTANT_vMAX · //INGEST
// Ultra-light Voice Activity Detection. A single AnalyserNode computes RMS
// energy off the mic stream — no ML model, negligible CPU — and reports a
// normalized level + a voiced gate for hardware-constrained edge devices.

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseVadOptions {
  /** RMS energy above which audio is considered "voiced" (0..1). */
  threshold?: number;
}

interface Vad {
  supported: boolean;
  level: number;
  voiced: boolean;
  start: () => Promise<void>;
  stop: () => void;
}

export function useVad({ threshold = 0.045 }: UseVadOptions = {}): Vad {
  const [level, setLevel] = useState(0);
  const [voiced, setVoiced] = useState(false);
  const supported =
    typeof window !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.mediaDevices;

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    if (ctxRef.current && ctxRef.current.state !== 'closed') void ctxRef.current.close();
    ctxRef.current = null;
    setLevel(0);
    setVoiced(false);
  }, []);

  const start = useCallback(async () => {
    if (!supported || ctxRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    ctxRef.current = ctx;

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
    source.connect(analyser);

    const buf = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      setLevel(rms);
      setVoiced(rms > threshold);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [supported, threshold]);

  // Always release the mic on unmount.
  useEffect(() => stop, [stop]);

  return { supported, level, voiced, start, stop };
}
