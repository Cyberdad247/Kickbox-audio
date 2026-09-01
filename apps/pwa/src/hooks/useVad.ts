'use client';

// High-Performance Audio Worklet Node for sub-10ms Voice Activity Detection (VAD)
// Fallbacks gracefully to AnalyserNode if AudioWorklet is not permitted.

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseVadOptions {
  threshold?: number;
  deviceId?: string;
}

interface Vad {
  supported: boolean;
  level: number;
  voiced: boolean;
  isWorkletActive: boolean;
  start: (customDeviceId?: string) => Promise<void>;
  stop: () => void;
}

export function useVad({ threshold = 0.045, deviceId }: UseVadOptions = {}): Vad {
  const [level, setLevel] = useState(0);
  const [voiced, setVoiced] = useState(false);
  const [isWorkletActive, setIsWorkletActive] = useState(false);
  const supported =
    typeof window !== 'undefined' && typeof navigator !== 'undefined' && !!navigator.mediaDevices;

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const isRunningRef = useRef<boolean>(false);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (ctxRef.current && ctxRef.current.state !== 'closed') void ctxRef.current.close();
    ctxRef.current = null;
    setLevel(0);
    setVoiced(false);
    setIsWorkletActive(false);
  }, []);

  const start = useCallback(async (customDeviceId?: string) => {
    if (!supported) return;
    if (ctxRef.current) {
      stop();
    }
    isRunningRef.current = true;
    try {
      const preferredId =
        customDeviceId ||
        deviceId ||
        (typeof window !== 'undefined' && typeof localStorage !== 'undefined'
          ? localStorage.getItem('camelot_preferred_audio_device')
          : null);

      const audioConstraints: MediaTrackConstraints | boolean =
        preferredId && preferredId !== 'default'
          ? { deviceId: { exact: preferredId } }
          : true;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      streamRef.current = stream;

      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      ctxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);

      // Attempt to load inline VAD AudioWorklet processor for zero-latency detection
      let workletLoaded = false;
      if (ctx.audioWorklet) {
        try {
          const workletCode = `
            class VadProcessor extends AudioWorkletProcessor {
              process(inputs, outputs, parameters) {
                const input = inputs[0];
                if (input && input[0]) {
                  const channel = input[0];
                  let sum = 0;
                  for (let i = 0; i < channel.length; i++) {
                    sum += channel[i] * channel[i];
                  }
                  const rms = Math.sqrt(sum / channel.length);
                  this.port.postMessage({ rms });
                }
                return true;
              }
            }
            registerProcessor('vad-processor', VadProcessor);
          `;
          const blob = new Blob([workletCode], { type: 'application/javascript' });
          const url = URL.createObjectURL(blob);
          await ctx.audioWorklet.addModule(url);
          URL.revokeObjectURL(url);

          const workletNode = new AudioWorkletNode(ctx, 'vad-processor');
          workletNodeRef.current = workletNode;
          workletNode.port.onmessage = (event) => {
            const rms = event.data.rms;
            setLevel(rms);
            setVoiced(rms > threshold);
          };

          source.connect(workletNode);
          setIsWorkletActive(true);
          workletLoaded = true;
        } catch {
          workletLoaded = false;
        }
      }

      // Standard Analyser fallback if AudioWorklet isn't available
      if (!workletLoaded) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);

        const buf = new Uint8Array(analyser.fftSize);
        const tick = () => {
          if (!isRunningRef.current) return;
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
      }
    } catch {
      stop();
    }
  }, [supported, deviceId, threshold, stop]);

  // Listen for device changes across components
  useEffect(() => {
    const handleDeviceChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ deviceId?: string }>;
      if (isRunningRef.current && customEvent.detail?.deviceId) {
        void start(customEvent.detail.deviceId);
      }
    };

    window.addEventListener('camelot:audio-device-changed', handleDeviceChange);
    return () => {
      window.removeEventListener('camelot:audio-device-changed', handleDeviceChange);
    };
  }, [start]);

  useEffect(() => stop, [stop]);

  return { supported, level, voiced, isWorkletActive, start, stop };
}
