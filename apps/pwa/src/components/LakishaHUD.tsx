'use client';

import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useBifrost } from '../context/BifrostContext';
import { useVad } from '../hooks/useVad';
import { cancelSpeech, speak, speakableResponse, speechSupported } from '../lib/voice';

export function LakishaHUD() {
  const { sendVoiceCommand, connected, state } = useBifrost();
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const { start: vadStart, stop: vadStop, level, voiced } = useVad();

  // Speak only for commands THIS client sent (gate the //IGNITE response).
  const awaitingRef = useRef(false);
  const lastUpdatedRef = useRef<string | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const dispatch = useCallback(
    (raw: string) => {
      const cmd = raw.trim();
      if (!cmd) return;
      awaitingRef.current = true; // //IGNITE on the resulting STATE_UPDATE
      sendVoiceCommand(cmd);
      setInput('');
    },
    [sendVoiceCommand],
  );

  // //INGEST transcript path — Web Speech recognition (client-only).
  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
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
      else setInput(interim);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    setSupported(true);
    return () => recognition.abort();
  }, [dispatch]);

  // Resolve speech-synthesis support after mount (avoids SSR hydration mismatch).
  useEffect(() => setVoiceReady(speechSupported()), []);

  // Run the VAD meter only while listening.
  useEffect(() => {
    if (listening) void vadStart();
    else vadStop();
  }, [listening, vadStart, vadStop]);

  // //IGNITE — speak the response when our command's STATE_UPDATE returns.
  useEffect(() => {
    if (!state) return;
    if (lastUpdatedRef.current === state.updatedAt) return;
    lastUpdatedRef.current = state.updatedAt;
    if (!awaitingRef.current) return;
    awaitingRef.current = false;
    if (mutedRef.current) return;
    // Prefer a remote MCP answer (//ROUTE) over the local confirmation.
    const line = state.lastResponse ?? speakableResponse(state);
    speak(line, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
    });
  }, [state]);

  // Stop any in-flight speech on unmount.
  useEffect(() => () => cancelSpeech(), []);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      setInput('');
      cancelSpeech(); // barge-in: silence Lakisha when the Sovereign speaks
      try {
        recognition.start();
        setListening(true);
      } catch {
        // start() throws if already running — ignore.
      }
    }
  };

  const toggleMute = () => {
    setMuted((m) => {
      if (!m) cancelSpeech();
      return !m;
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    dispatch(input);
  };

  const meter = Math.min(1, level * 6); // normalize RMS for the visual bar

  return (
    <form
      onSubmit={submit}
      className={`-translate-x-1/2 fixed bottom-6 left-1/2 z-50 w-[min(92vw,44rem)] border bg-smoke-900/85 px-4 py-3 backdrop-blur-md transition-shadow ${
        speaking
          ? 'border-gold-royal/70 shadow-gold'
          : listening && voiced
            ? 'animate-pulse-glow border-violet/60'
            : listening
              ? 'border-violet/40'
              : 'border-gold/40 shadow-gold'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Mic trigger — pulses violet on real voice energy (//INGEST) */}
        {supported && (
          <button
            type="button"
            onClick={toggleListening}
            aria-pressed={listening}
            aria-label={listening ? 'Stop listening' : 'Start voice capture'}
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
              listening
                ? 'border-violet bg-violet/20 text-violet-light'
                : 'border-gold/40 text-gold-light hover:bg-white/5'
            }`}
          >
            {listening && voiced && (
              <span className="absolute inset-0 animate-ping rounded-full bg-violet/30" />
            )}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0" strokeLinecap="round" />
              <line x1="12" y1="18" x2="12" y2="21" strokeLinecap="round" />
            </svg>
          </button>
        )}

        <span className="font-display text-gold-light text-sm tracking-minted">Lakisha</span>

        <div className="relative flex-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              speaking
                ? 'Speaking…'
                : listening
                  ? 'Listening…'
                  : 'Speak or type a command… e.g. add transaction 15000'
            }
            className="w-full rounded-sm border border-white/10 bg-obsidian px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet focus:shadow-glow focus:outline-none"
          />
          {/* //INGEST live VAD level meter */}
          {listening && (
            <span
              className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-violet transition-[width] duration-75"
              style={{ width: `${meter * 100}%` }}
            />
          )}
        </div>

        {/* //IGNITE mute toggle */}
        {voiceReady && (
          <button
            type="button"
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? 'Unmute Lakisha' : 'Mute Lakisha'}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
              muted
                ? 'border-white/15 text-white/40'
                : 'border-gold/40 text-gold-light hover:bg-white/5'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="M11 5 6 9H3v6h3l5 4V5z" strokeLinejoin="round" />
              {muted ? (
                <path d="M16 9l5 6M21 9l-5 6" strokeLinecap="round" />
              ) : (
                <path d="M15.5 8.5a5 5 0 0 1 0 7" strokeLinecap="round" />
              )}
            </svg>
          </button>
        )}

        <button
          type="submit"
          disabled={!connected}
          className="rounded-sm bg-violet px-5 py-2.5 text-sm text-white shadow-glow transition-opacity disabled:opacity-40"
        >
          Send
        </button>
      </div>
      {!connected && (
        <p className="mt-2 pl-1 text-[11px] text-white/30">
          Bifrost offline — commands queue once the gateway reconnects.
        </p>
      )}
    </form>
  );
}
