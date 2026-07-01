'use client';

// Shared Lakisha voice core with a built-in failsafe chain. Currently consumed
// by the bottom-left LakishaEnclave (the sole input surface — speak or type).
//
//   //INGEST primary : Web Speech recognition (transcript -> command)
//   //INGEST failsafe : VAD-only (getUserMedia + RMS) — mic stays "hot" and the
//                       UI keeps reacting even where SpeechRecognition is absent
//   //IGNITE          : on-device SpeechSynthesis (speaks the STATE_UPDATE reply)
//
// Two interaction models are supported from one core:
//   • persistent-connect: continuous recognition + VAD stay hot after a single
//     connect(). Pass { continuous: true }.
//   • toggle-listen: non-continuous recognition that auto-stops after a
//     phrase; VAD runs only while listening. Drive with startListening()/
//     stopListening()/toggleListening(). This is the default — what
//     LakishaEnclave's speak-or-text bar uses.
//
// Each component calls useLakishaVoice() for its OWN instance, so the
// awaiting-gate (//IGNITE only for commands IT dispatched) stays isolated.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBifrost } from '../context/BifrostContext';
import { cancelSpeech, speak, speakableResponse, speechSupported } from '../lib/voice';
import { useVad } from './useVad';

export type VoiceMode = 'idle' | 'recognition' | 'vad-only';

export interface UseLakishaVoiceOptions {
  /**
   * Persistent-connect model: recognition runs continuous and the mic stays
   * hot after connect() (the Enclave). When false (default), recognition is
   * non-continuous toggle-listen and VAD runs only while listening (the HUD).
   */
  continuous?: boolean;
}

export interface LakishaVoice {
  // Connection / capability
  connected: boolean;
  mode: VoiceMode;
  voiceSupported: boolean; // SpeechSynthesis (//IGNITE) support — drives the mute toggle
  recognitionSupported: boolean; // Web Speech recognition (//INGEST) — drives the mic toggle
  error: string | null;
  // Mic energy (VAD)
  isSpeaking: boolean; // real mic energy (VAD), not a mock — alias: voiced
  voiced: boolean;
  level: number;
  // Listening (toggle-listen model)
  listening: boolean;
  // Transcript / text input (aliased so either surface reads naturally)
  transcript: string;
  setTranscript: (value: string) => void;
  input: string;
  setInput: (value: string) => void;
  // //IGNITE speech output
  speaking: boolean; // SpeechSynthesis is actively speaking
  muted: boolean;
  toggleMute: () => void;
  // Phase-3 telemetry primitives (measured client-side, ms)
  ttfaMs: number | null;
  queryMs: number | null;
  // Controls
  connect: () => Promise<void>;
  disconnect: () => void;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleListening: () => void;
  dispatch: (raw: string) => void;
}

export function useLakishaVoice(options: UseLakishaVoiceOptions = {}): LakishaVoice {
  const { continuous = false } = options;
  const { sendVoiceCommand, state } = useBifrost();
  const { start: vadStart, stop: vadStop, voiced, level } = useVad();

  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState<VoiceMode>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  // vMAX telemetry — measured client-side latencies.
  const [ttfaMs, setTtfaMs] = useState<number | null>(null);
  const [queryMs, setQueryMs] = useState<number | null>(null);
  // Resolve capability flags after mount (avoids SSR hydration mismatch) so the
  // HUD's conditionally-rendered mic/mute buttons match server + client output.
  const [synthSupported, setSynthSupported] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const awaitingRef = useRef(false);
  const lastUpdatedRef = useRef<string | null>(null);
  const dispatchAtRef = useRef<number | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const dispatch = useCallback(
    (raw: string) => {
      const cmd = raw.trim();
      if (!cmd) return;
      awaitingRef.current = true; // //IGNITE on the resulting STATE_UPDATE
      dispatchAtRef.current = performance.now(); // start the query-latency clock
      sendVoiceCommand(cmd);
      setTranscript('');
    },
    [sendVoiceCommand],
  );

  // Build a SpeechRecognition instance wired to dispatch + transcript. Returns
  // null when the platform lacks Web Speech (caller falls back to VAD-only).
  const buildRecognition = useCallback((): SpeechRecognition | null => {
    const Ctor =
      typeof window !== 'undefined'
        ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
        : undefined;
    if (!Ctor) return null;
    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) final += text;
        else interim += text;
      }
      if (final) dispatch(final);
      else setTranscript(interim);
    };
    if (continuous) {
      // Persistent model: any recognition error degrades to VAD-only (mic stays hot).
      recognition.onerror = () => setMode('vad-only');
    } else {
      // Toggle model: recognition auto-stops after a phrase; clear the listening flag.
      recognition.onend = () => setListening(false);
      recognition.onerror = () => setListening(false);
    }
    return recognition;
  }, [continuous, dispatch]);

  // Persistent-connect model (Enclave): VAD always hot + continuous recognition,
  // with a recognition -> VAD-only failsafe.
  const connect = useCallback(async () => {
    setError(null);
    // Failsafe substrate: VAD via getUserMedia always runs where the mic is granted.
    try {
      await vadStart();
    } catch {
      setError('MIC DENIED');
      return;
    }
    setConnected(true);

    // Primary //INGEST: Web Speech recognition. Any failure -> VAD-only failsafe.
    const recognition = buildRecognition();
    if (!recognition) {
      setMode('vad-only');
      return;
    }
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setMode('recognition');
    } catch {
      setMode('vad-only');
    }
  }, [vadStart, buildRecognition]);

  const disconnect = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    vadStop();
    cancelSpeech();
    setConnected(false);
    setListening(false);
    setMode('idle');
  }, [vadStop]);

  // Toggle-listen model (HUD): start a one-shot recognition + VAD meter.
  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    cancelSpeech(); // barge-in: silence Lakisha when the Sovereign speaks
    let recognition = recognitionRef.current;
    if (!recognition) {
      recognition = buildRecognition();
      recognitionRef.current = recognition;
    }
    if (!recognition) return;
    try {
      recognition.start();
      setListening(true);
    } catch {
      // start() throws if already running — ignore.
    }
  }, [buildRecognition]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (listening) stopListening();
    else void startListening();
  }, [listening, startListening, stopListening]);

  // Drive the VAD meter from `listening` in the toggle model only. The
  // persistent model keeps VAD hot via connect()/disconnect() instead.
  useEffect(() => {
    if (continuous) return;
    if (listening) void vadStart();
    else vadStop();
  }, [continuous, listening, vadStart, vadStop]);

  // Resolve //IGNITE (synthesis) + //INGEST (recognition) support post-mount.
  useEffect(() => {
    setSynthSupported(speechSupported());
    const Ctor =
      typeof window !== 'undefined'
        ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
        : undefined;
    setRecognitionSupported(!!Ctor);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (!m) cancelSpeech();
      return !m;
    });
  }, []);

  // //IGNITE — speak the reply when our command's STATE_UPDATE returns.
  useEffect(() => {
    if (!state) return;
    if (lastUpdatedRef.current === state.updatedAt) return;
    lastUpdatedRef.current = state.updatedAt;
    if (!awaitingRef.current) return;
    awaitingRef.current = false;

    // Round-trip query latency (dispatch -> STATE_UPDATE).
    if (dispatchAtRef.current != null) {
      setQueryMs(performance.now() - dispatchAtRef.current);
      dispatchAtRef.current = null;
    }

    if (mutedRef.current) {
      setTtfaMs(null);
      return;
    }
    // Prefer a remote MCP answer (//ROUTE) over the local confirmation.
    const line = state.lastResponse ?? speakableResponse(state);
    const speakAt = performance.now();
    speak(line, {
      onStart: () => {
        setTtfaMs(performance.now() - speakAt); // time-to-first-audio
        setSpeaking(true);
      },
      onEnd: () => setSpeaking(false),
    });
  }, [state]);

  // Release mic + speech on unmount.
  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      vadStop();
      cancelSpeech();
    },
    [vadStop],
  );

  return {
    connected,
    mode,
    voiceSupported: synthSupported,
    recognitionSupported,
    error,
    isSpeaking: voiced,
    voiced,
    level,
    listening,
    transcript,
    setTranscript,
    input: transcript,
    setInput: setTranscript,
    speaking,
    muted,
    toggleMute,
    ttfaMs,
    queryMs,
    connect,
    disconnect,
    startListening,
    stopListening,
    toggleListening,
    dispatch,
  };
}
