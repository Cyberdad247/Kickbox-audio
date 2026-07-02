'use client';

// Shared Lakisha voice core with a built-in failsafe chain. Currently consumed
// by the bottom-left LakishaEnclave (the sole input surface — speak or type).
//
//   //INGEST primary  : Web Speech recognition (transcript -> command). Needs
//                       browser support AND, in most implementations, a live
//                       network connection to a cloud speech service.
//   //INGEST fallback : local-asr — Moonshine (MIT, Useful Sensors), run in a
//                       sidecar Worker (public/voice-engine/asr-worker.mjs)
//                       loading Transformers.js from a CDN at runtime. Never
//                       touches webpack — see that file's header comment for
//                       why (Phase 3's first attempt tried npm-bundling these
//                       libraries directly and broke `next build`). Engages
//                       when recognition is unsupported or the device is
//                       offline.
//   //INGEST failsafe : VAD-only (getUserMedia + RMS) — mic stays "hot" with
//                       no real transcription, last resort of last resorts.
//   //IGNITE primary  : browser SpeechSynthesis (on-device already, but the
//                       API itself may not exist on the platform).
//   //IGNITE fallback : local-tts — Kokoro-82M, same sidecar-Worker pattern
//                       (public/voice-engine/tts-worker.mjs), engages when
//                       SpeechSynthesis is unsupported.
//
// Two interaction models are supported from one core:
//   • persistent-connect: continuous recognition + VAD stay hot after a single
//     connect(). Pass { continuous: true }. (Currently unused by any mounted
//     component — the online/offline ASR fallback below only applies to the
//     toggle-listen model.)
//   • toggle-listen: non-continuous, online-recognition-or-local-ASR per
//     listen session, auto-stops after a phrase. Drive with startListening()/
//     stopListening()/toggleListening(). This is the default — what
//     LakishaEnclave's speak-or-text bar uses.
//
// Each component calls useLakishaVoice() for its OWN instance, so the
// awaiting-gate (//IGNITE only for commands IT dispatched) stays isolated.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBifrost } from '../context/BifrostContext';
import { type AudioRecorder, startRecording } from '../lib/audioCapture';
import { cancelSpeech, speak, speakableResponse, speechSupported } from '../lib/voice';
import { cancelLocalSpeech, speakLocally, transcribeLocally } from '../lib/voiceWorkerClient';
import { useVad } from './useVad';

export type VoiceMode = 'idle' | 'recognition' | 'local-asr' | 'vad-only';

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
  recognitionSupported: boolean; // Web Speech recognition (//INGEST) — online path only
  voiceInputSupported: boolean; // recognitionSupported OR mic-capable for local-asr fallback — drives the mic button
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
  const [micCapable, setMicCapable] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const localRecorderRef = useRef<AudioRecorder | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
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

  // Toggle-listen model: online Web Speech recognition when supported + the
  // device is online; otherwise falls back to VAD-gated local recording,
  // transcribed locally via the Moonshine sidecar Worker on stopListening().
  const startListening = useCallback(async () => {
    setError(null);
    setTranscript('');
    cancelSpeech(); // barge-in: silence Lakisha when the Sovereign speaks
    cancelLocalSpeech();

    const online = typeof navigator === 'undefined' || navigator.onLine;
    if (recognitionSupported && online) {
      let recognition = recognitionRef.current;
      if (!recognition) {
        recognition = buildRecognition();
        recognitionRef.current = recognition;
      }
      if (recognition) {
        try {
          recognition.start();
          setMode('recognition');
          setListening(true);
          return;
        } catch {
          // start() throws if already running, or recognition genuinely
          // failed to launch — fall through to the local-asr fallback below.
        }
      }
    }

    // Offline / unsupported / launch-failed fallback: record raw mic audio,
    // transcribe the whole utterance locally when the client stops listening.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      localRecorderRef.current = startRecording(stream);
      setMode('local-asr');
      setListening(true);
    } catch {
      setError('MIC DENIED');
    }
  }, [recognitionSupported, buildRecognition]);

  const stopListening = useCallback(() => {
    if (mode === 'local-asr' && localRecorderRef.current) {
      const recorder = localRecorderRef.current;
      localRecorderRef.current = null;
      setListening(false);
      void recorder
        .stop()
        .then(async (audio) => {
          for (const track of localStreamRef.current?.getTracks() ?? []) track.stop();
          localStreamRef.current = null;
          try {
            const text = await transcribeLocally(audio);
            if (text) dispatch(text);
          } catch {
            setError('LOCAL_ASR_FAILED');
          } finally {
            setMode('idle');
          }
        })
        .catch(() => setError('LOCAL_ASR_FAILED'));
      return;
    }
    recognitionRef.current?.stop();
    setListening(false);
  }, [mode, dispatch]);

  const toggleListening = useCallback(() => {
    if (listening) stopListening();
    else void startListening();
  }, [listening, startListening, stopListening]);

  // Drive the VAD meter from `listening` in the toggle model, online-
  // recognition sub-mode only — the local-asr fallback manages its own mic
  // stream via audioCapture.ts and doesn't need a second concurrent one.
  useEffect(() => {
    if (continuous || mode === 'local-asr') return;
    if (listening) void vadStart();
    else vadStop();
  }, [continuous, listening, mode, vadStart, vadStop]);

  // Resolve //IGNITE (synthesis) + //INGEST (recognition + mic) support
  // post-mount (avoids SSR hydration mismatch).
  useEffect(() => {
    setSynthSupported(speechSupported());
    const Ctor =
      typeof window !== 'undefined'
        ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
        : undefined;
    setRecognitionSupported(!!Ctor);
    setMicCapable(typeof navigator !== 'undefined' && !!navigator.mediaDevices);
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
    const onIgniteStart = () => {
      setTtfaMs(performance.now() - speakAt); // time-to-first-audio
      setSpeaking(true);
    };
    const onIgniteEnd = () => setSpeaking(false);
    if (synthSupported) {
      speak(line, { onStart: onIgniteStart, onEnd: onIgniteEnd });
    } else {
      // Browser SpeechSynthesis API doesn't exist on this platform — fall
      // back to the fully-local Kokoro sidecar Worker.
      void speakLocally(line, { onStart: onIgniteStart, onEnd: onIgniteEnd }).catch(() =>
        setSpeaking(false),
      );
    }
  }, [state, synthSupported]);

  // Release mic + speech on unmount.
  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      for (const track of localStreamRef.current?.getTracks() ?? []) track.stop();
      vadStop();
      cancelSpeech();
      cancelLocalSpeech();
    },
    [vadStop],
  );

  return {
    connected,
    mode,
    voiceSupported: synthSupported,
    recognitionSupported,
    voiceInputSupported: recognitionSupported || micCapable,
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
