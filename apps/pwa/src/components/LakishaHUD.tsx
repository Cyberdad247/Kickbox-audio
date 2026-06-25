'use client';

import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useBifrost } from '../context/BifrostContext';

export function LakishaHUD() {
  const { sendVoiceCommand, connected } = useBifrost();
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const dispatch = useCallback(
    (raw: string) => {
      const cmd = raw.trim();
      if (!cmd) return;
      sendVoiceCommand(cmd);
      setInput('');
    },
    [sendVoiceCommand],
  );

  // Initialize Web Speech API (client-only; degrades gracefully when absent).
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
      if (final) {
        dispatch(final);
      } else {
        setInput(interim);
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    setSupported(true);

    return () => recognition.abort();
  }, [dispatch]);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      setInput('');
      try {
        recognition.start();
        setListening(true);
      } catch {
        // start() throws if already running — ignore.
      }
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    dispatch(input);
  };

  return (
    <form
      onSubmit={submit}
      className={`-translate-x-1/2 fixed bottom-6 left-1/2 z-50 w-[min(92vw,44rem)] border bg-smoke-900/85 px-4 py-3 backdrop-blur-md transition-shadow ${
        listening ? 'animate-pulse-glow border-violet/60' : 'border-gold/40 shadow-gold'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Mic trigger — pulses violet while capturing */}
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
            {listening && (
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

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            listening ? 'Listening…' : 'Speak or type a command… e.g. add transaction 15000'
          }
          className="flex-1 rounded-sm border border-white/10 bg-obsidian px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-violet focus:shadow-glow focus:outline-none"
        />

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
