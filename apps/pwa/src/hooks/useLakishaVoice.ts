'use client';

// Shared Lakisha voice core with a built-in failsafe chain, consumed by BOTH
// the bottom-center HUD and the bottom-right Enclave so the surfaces are
// redundant — if one input path fails, the other still drives Lakisha.
//
//   //INGEST primary : Web Speech recognition (transcript -> command)
//   //INGEST failsafe : VAD-only (getUserMedia + RMS) — mic stays "hot" and the
//                       UI keeps reacting even where SpeechRecognition is absent
//   //IGNITE          : on-device SpeechSynthesis (speaks the STATE_UPDATE reply)

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBifrost } from '../context/BifrostContext';
import { cancelSpeech, speak, speakableResponse, speechSupported } from '../lib/voice';
import { useVad } from './useVad';

export type VoiceMode = 'idle' | 'recognition' | 'vad-only';

export interface LakishaVoice {
  connected: boolean;
  mode: VoiceMode;
  isSpeaking: boolean; // real mic energy (VAD), not a mock
  level: number;
  transcript: string;
  error: string | null;
  voiceSupported: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useLakishaVoice(): LakishaVoice {
  const { sendVoiceCommand, state } = useBifrost();
  const { start: vadStart, stop: vadStop, voiced, level } = useVad();

  const [connected, setConnected] = useState(false);
  const [mode, setMode] = useState<VoiceMode>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const awaitingRef = useRef(false);
  const lastUpdatedRef = useRef<string | null>(null);

  const dispatch = useCallback(
    (raw: string) => {
      const cmd = raw.trim();
      if (!cmd) return;
      awaitingRef.current = true; // //IGNITE on the resulting STATE_UPDATE
      sendVoiceCommand(cmd);
      setTranscript('');
    },
    [sendVoiceCommand],
  );

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
    const Ctor =
      typeof window !== 'undefined'
        ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
        : undefined;
    if (!Ctor) {
      setMode('vad-only');
      return;
    }
    try {
      const recognition = new Ctor();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) final += result[0].transcript;
          else interim += result[0].transcript;
        }
        if (final) dispatch(final);
        else setTranscript(interim);
      };
      recognition.onerror = () => setMode('vad-only'); // degrade, keep listening via VAD
      recognition.start();
      recognitionRef.current = recognition;
      setMode('recognition');
    } catch {
      setMode('vad-only');
    }
  }, [vadStart, dispatch]);

  const disconnect = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    vadStop();
    cancelSpeech();
    setConnected(false);
    setMode('idle');
  }, [vadStop]);

  // //IGNITE — speak the reply when our command's STATE_UPDATE returns.
  useEffect(() => {
    if (!state) return;
    if (lastUpdatedRef.current === state.updatedAt) return;
    lastUpdatedRef.current = state.updatedAt;
    if (!awaitingRef.current) return;
    awaitingRef.current = false;
    speak(state.lastResponse ?? speakableResponse(state));
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
    isSpeaking: voiced,
    level,
    transcript,
    error,
    voiceSupported: speechSupported(),
    connect,
    disconnect,
  };
}
