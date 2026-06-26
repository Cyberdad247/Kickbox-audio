'use client';

import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useBifrost } from '../context/BifrostContext';
import { useVad } from '../hooks/useVad';
import { QUERY_BUDGET_MS, TTFA_BUDGET_MS, budgetStatus, formatMs } from '../lib/telemetry';
import { cancelSpeech, speak, speakableResponse, speechSupported } from '../lib/voice';

// One latency readout with a budget-colored status dot.
function TelemetryMetric({
  label,
  ms,
  budget,
}: { label: string; ms: number | null; budget: number }) {
  const status = budgetStatus(ms, budget);
  const dot =
    status === 'breach'
      ? 'bg-gold-royal/85 shadow-gold'
      : status === 'warn'
        ? 'bg-gold/45'
        : 'bg-violet';
  const value =
    status === 'breach' ? 'text-gold' : status === 'warn' ? 'text-gold-light' : 'text-white/60';
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="text-white/35">{label}</span>
      <span className={value}>{formatMs(ms)}</span>
    </span>
  );
}

export function LakishaHUD() {
  const { sendVoiceCommand, connected, state } = useBifrost();
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voiceReady, setVoiceReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  // vMAX telemetry — measured client-side latencies.
  const [ttfaMs, setTtfaMs] = useState<number | null>(null);  const [queryMs, setQueryMs] = useState<number | null>(null);
  // Browser autoplay policy: AudioContext + getUserMedia block until user gesture.
  // Gate the HUD behind an explicit unlock state so speech-synthesis / VAD wire up.
  const [isUnlocked, setIsUnlocked] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const dispatchAtRef = useRef<number | null>(null);

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
      dispatchAtRef.current = performance.now(); // start the query-latency clock
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

  // Tap-to-connect autoplay-gate: acquires mic permission and resumes AudioContext so
  // downstream speech-synthesis / Web Speech API / VAD can actually initialize. Stream
  // tracks are released immediately after the gesture because the real mic capture is
  // owned by `recognition` and `useVad` afterwards.
  const handleTapToConnect = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtor) await new AudioCtor().resume();
      stream.getTracks().forEach((track) => track.stop());
    } finally {
      setIsUnlocked(true);
    }
  };

  const meter = Math.min(1, level * 6); // normalize RMS for the visual bar

  // Autoplay-gate render block (Gilded). Bottom-right fixed pane before any user
  // gesture; full HUD renders once `isUnlocked` flips true.
  if (!isUnlocked) {
    return (
      <div className="fixed bottom-8 right-8 z-50 border border-gold/40 bg-plate-900/95 px-4 py-3 text-gold-light shadow-gold backdrop-blur-md">
        <button
          type="button"
          onClick={handleTapToConnect}
          className="flex items-center gap-2 font-serif text-sm tracking-executive"
        >
          <span className="flex h-2 w-2 rounded-full bg-violet shadow-glow" />
          Tap to Connect Lakisha
        </button>
      </div>
    );
  }

  // Lane badge from the last route (//ROUTE telemetry).
  const lane = state?.lastLane;
  const laneLabel = state?.lastRezeroed
    ? '//REZERO'
    : lane === 'REMOTE_MCP'
      ? 'REMOTE'
      : lane === 'LOCAL_TOOLS'
        ? 'LOCAL'
        : null;
  const laneClass = state?.lastRezeroed
    ? 'border-gold/30 text-gold-light'
    : lane === 'REMOTE_MCP'
      ? 'border-violet/40 text-violet-light'
      : 'border-gold/30 text-gold-light';
  const showTelemetry = queryMs != null || laneLabel != null;

  return (
    <form
      onSubmit={submit}
      className={`-translate-x-1/2 fixed bottom-6 left-1/2 z-50 w-[min(92vw,44rem)] border bg-smoke-900/85 px-4 py-3 backdrop-blur-md transition-shadow ${
        speaking
          ? 'border-gold-royal/70 shadow-gold'
          : listening && voiced
            ? 'animate-pulse animate-pulse-glow border-violet/60 shadow-[0_0_12px_#9D4EDD]'
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

        <span className="font-serif text-gold-light text-sm tracking-executive">Lakisha</span>

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
      {/* vMAX KINETIC_THROUGHPUT telemetry strip */}
      {showTelemetry && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-1 text-[10px] uppercase tracking-[0.14em]">
          <TelemetryMetric label="TTFA" ms={ttfaMs} budget={TTFA_BUDGET_MS} />
          <TelemetryMetric label="Query" ms={queryMs} budget={QUERY_BUDGET_MS} />
          {laneLabel && (
            <span className={`rounded-sm border px-1.5 py-0.5 ${laneClass}`}>
              {laneLabel}
              {state?.lastLatencyMs != null && (
                <span className="ml-1 text-white/35">· {formatMs(state.lastLatencyMs)}</span>
              )}
            </span>
          )}
        </div>
      )}
      {!connected && (
        <p className="mt-2 pl-1 text-[11px] text-white/30">
          Bifrost offline — commands queue once the gateway reconnects.
        </p>
      )}
    </form>
  );
}
