'use client';

import React, { useState, useRef, useEffect } from 'react';
import { type AvatarTab, useAvatarConfig } from '../../context/AvatarConfigContext';

export function AvatarConfigModal() {
  const { isConfigOpen, closeConfig, activeTab, setActiveTab, settings, updateSetting } =
    useAvatarConfig();

  // Chat State
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([
    {
      role: 'model',
      content:
        'Avatar configuration active. Settings are saved to local storage and persist across sessions.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Media Analysis State
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaAnalysis, setMediaAnalysis] = useState('');
  const [isAnalyzingMedia, setIsAnalyzingMedia] = useState(false);

  // Audio Transcription State
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Live WebSocket Audio State
  const [liveActive, setLiveActive] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);

  // Animation state for smooth slide-in & fade transition from the HUD
  const [isRendered, setIsRendered] = useState(isConfigOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isConfigOpen) {
      setIsRendered(true);
      const frame = requestAnimationFrame(() => {
        // Second frame ensures browser has painted initial translate state
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setIsVisible(false);
      timeout = setTimeout(() => {
        setIsRendered(false);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [isConfigOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isConfigOpen) {
        closeConfig();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConfigOpen, closeConfig]);

  if (!isRendered) return null;

  const handleChat = async () => {
    if (!inputText.trim() || isSending) return;
    const userMsg = { role: 'user', content: inputText.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          useSearch: settings.useSearch,
          useMaps: settings.useMaps,
          highThinking: settings.highThinking,
          lowLatency: settings.lowLatency,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages((prev) => [...prev, { role: 'model', content: data.text || 'No response.' }]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [...prev, { role: 'model', content: `Error: ${errorMsg}` }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleAnalyzeMedia = async () => {
    if (!mediaFile || isAnalyzingMedia) return;
    setIsAnalyzingMedia(true);
    setMediaAnalysis('');
    try {
      const formData = new FormData();
      formData.append('media', mediaFile);
      formData.append('prompt', inputText || 'Describe and analyze this media in detail.');

      const res = await fetch('/api/analyze-media', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMediaAnalysis(data.text);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setMediaAnalysis(`Error: ${errorMsg}`);
    } finally {
      setIsAnalyzingMedia(false);
    }
  };

  const handleTranscribe = async () => {
    if (!audioFile || isTranscribing) return;
    setIsTranscribing(true);
    setTranscription('');
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);

      const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTranscription(data.text);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setTranscription(`Error: ${errorMsg}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleLive = async () => {
    if (liveActive) {
      wsRef.current?.close();
      inputAudioCtxRef.current?.close().catch(() => undefined);
      outputAudioCtxRef.current?.close().catch(() => undefined);
      setLiveActive(false);
      return;
    }

    try {
      const wsUrl =
        window.location.protocol === 'https:'
          ? `wss://${window.location.host}/live`
          : `ws://${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setLiveActive(true);
        const inputCtx = new AudioContext({ sampleRate: 16000 });
        inputAudioCtxRef.current = inputCtx;
        const outputCtx = new AudioContext({ sampleRate: 24000 });
        outputAudioCtxRef.current = outputCtx;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const floatData = e.inputBuffer.getChannelData(0);
            const pcm16 = new Int16Array(floatData.length);
            for (let i = 0; i < floatData.length; i++) {
              pcm16[i] = Math.max(-1, Math.min(1, floatData[i])) * 0x7fff;
            }
            const buffer = new ArrayBuffer(pcm16.length * 2);
            const view = new DataView(buffer);
            for (let i = 0; i < pcm16.length; i++) {
              view.setInt16(i * 2, pcm16[i], true);
            }
            let binary = '';
            const bytes = new Uint8Array(buffer);
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            const base64 = btoa(binary);
            ws.send(JSON.stringify({ audio: base64 }));
          }
        };

        let nextStartTime = 0;
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.audio) {
              const binary = atob(msg.audio);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const buffer = new Int16Array(bytes.buffer);
              const floatData = new Float32Array(buffer.length);
              for (let i = 0; i < buffer.length; i++) floatData[i] = buffer[i] / 0x7fff;

              const audioBuffer = outputCtx.createBuffer(1, floatData.length, 24000);
              audioBuffer.copyToChannel(floatData, 0);
              const sourceNode = outputCtx.createBufferSource();
              sourceNode.buffer = audioBuffer;
              sourceNode.connect(outputCtx.destination);

              if (nextStartTime < outputCtx.currentTime) {
                nextStartTime = outputCtx.currentTime;
              }
              sourceNode.start(nextStartTime);
              nextStartTime += audioBuffer.duration;
            }
          } catch (e) {
            console.error('Error handling live message:', e);
          }
        };
      };

      ws.onclose = () => {
        setLiveActive(false);
      };
      ws.onerror = (e) => {
        console.error('Live Audio Socket Error:', e);
        setLiveActive(false);
      };
    } catch (err) {
      console.error('Live Audio Error:', err);
      setLiveActive(false);
    }
  };

  const tabs: Array<{ id: AvatarTab; label: string; icon: string }> = [
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'live', label: 'Live Stream', icon: '🎙️' },
    { id: 'media', label: 'Media', icon: '👁️' },
    { id: 'transcribe', label: 'Transcribe', icon: '📜' },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 ${
        isVisible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        onClick={closeConfig}
        className={`fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ease-out ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Modal Container: Slide-in and expand from the HUD bottom-right */}
      <div
        className={`relative flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border border-gold/40 bg-smoke-900 shadow-[0_0_40px_rgba(212,175,55,0.35)] backdrop-blur-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform origin-bottom-right ${
          isVisible
            ? 'opacity-100 translate-y-0 translate-x-0 scale-100'
            : 'opacity-0 translate-y-16 sm:translate-y-24 sm:translate-x-12 scale-90'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gold/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-gold/40 bg-gold/15 text-gold">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-xs uppercase tracking-[0.2em] text-gold-light">
                Avatar Configuration
              </h2>
              <p className="text-[10px] uppercase tracking-widest text-white/40">
                Persistent Settings (localStorage synced)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block rounded border border-green-500/30 bg-green-950/40 px-2.5 py-0.5 text-[9px] uppercase tracking-widest text-green-300">
              Synced
            </span>
            <button
              type="button"
              onClick={closeConfig}
              aria-label="Close configuration"
              className="flex h-8 w-8 items-center justify-center rounded border border-white/15 bg-smoke-800 text-white/70 transition-colors hover:border-gold hover:text-gold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Selection Bar */}
        <div className="flex border-b border-white/10 px-6 pt-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'border-gold text-gold font-medium bg-gold/5'
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* CHAT TAB */}
          {activeTab === 'chat' && (
            <div className="flex flex-col gap-4">
              {/* Grounding & Thinking Toggles (Auto-persisted to localStorage) */}
              <div className="flex flex-wrap items-center gap-4 rounded border border-white/10 bg-obsidian/70 p-3.5">
                <span className="text-[10px] uppercase tracking-widest text-gold-light font-medium">
                  Config Preferences:
                </span>

                <label className="flex cursor-pointer items-center gap-2 text-xs text-white/80 select-none">
                  <input
                    type="checkbox"
                    checked={settings.useSearch}
                    onChange={(e) => updateSetting('useSearch', e.target.checked)}
                    className="accent-amber-400"
                  />
                  <span>Search Grounding</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-xs text-white/80 select-none">
                  <input
                    type="checkbox"
                    checked={settings.useMaps}
                    onChange={(e) => updateSetting('useMaps', e.target.checked)}
                    className="accent-amber-400"
                  />
                  <span>Maps Grounding</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-xs text-white/80 select-none">
                  <input
                    type="checkbox"
                    checked={settings.highThinking}
                    onChange={(e) => {
                      updateSetting('highThinking', e.target.checked);
                      if (e.target.checked) updateSetting('lowLatency', false);
                    }}
                    className="accent-purple-400"
                  />
                  <span>High Thinking (Pro)</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2 text-xs text-white/80 select-none">
                  <input
                    type="checkbox"
                    checked={settings.lowLatency}
                    onChange={(e) => {
                      updateSetting('lowLatency', e.target.checked);
                      if (e.target.checked) updateSetting('highThinking', false);
                    }}
                    className="accent-emerald-400"
                  />
                  <span>Low Latency (Lite)</span>
                </label>
              </div>

              {/* Chat Stream */}
              <div className="flex min-h-[220px] max-h-[320px] flex-col gap-3 overflow-y-auto rounded border border-white/10 bg-obsidian/90 p-4">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded p-3 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'ml-auto border border-gold/30 bg-gold/15 text-gold-light'
                        : 'mr-auto border border-white/10 bg-smoke-800 text-white/90'
                    }`}
                  >
                    <div className="mb-1 text-[9px] uppercase tracking-widest text-white/40">
                      {m.role === 'user' ? 'User' : 'Avatar Core'}
                    </div>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                ))}
                {isSending && (
                  <div className="mr-auto flex items-center gap-2 rounded border border-white/10 bg-smoke-800 p-3 text-xs text-white/60">
                    <span className="h-2 w-2 animate-ping rounded-full bg-gold" />
                    <span>Processing response...</span>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChat()}
                  placeholder="Type a message or prompt..."
                  className="flex-1 rounded border border-white/15 bg-obsidian px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-gold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleChat}
                  disabled={isSending || !inputText.trim()}
                  className="rounded border border-gold/50 bg-gold/20 px-5 py-2.5 text-xs uppercase tracking-widest text-gold-light shadow-gold transition-colors hover:bg-gold/30 disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* LIVE STREAM TAB */}
          {activeTab === 'live' && (
            <div className="flex flex-col items-center justify-center gap-6 rounded border border-white/10 bg-obsidian/70 p-8 text-center">
              <div className="relative flex items-center justify-center">
                <div
                  className={`flex h-28 w-28 items-center justify-center rounded-full border transition-all duration-300 ${
                    liveActive
                      ? 'border-gold bg-gold/20 shadow-[0_0_25px_rgba(212,175,55,0.6)] animate-pulse'
                      : 'border-white/20 bg-smoke-800'
                  }`}
                >
                  <span className="text-4xl">{liveActive ? '🎙️' : '🤫'}</span>
                </div>
              </div>

              <div>
                <h3 className="font-display text-sm uppercase tracking-[0.2em] text-white">
                  {liveActive ? 'Live Audio Stream Connected' : 'Live Audio Stream Ready'}
                </h3>
                <p className="mt-1 max-w-sm text-xs text-white/50">
                  {liveActive
                    ? 'Transmitting microphone audio PCM at 16kHz with 24kHz return stream.'
                    : 'Start real-time bidirectional conversation with the Avatar.'}
                </p>
              </div>

              <button
                type="button"
                onClick={toggleLive}
                className={`rounded-full px-8 py-2.5 text-xs uppercase tracking-widest font-medium transition-all ${
                  liveActive
                    ? 'border border-red-500/50 bg-red-950/80 text-red-300 hover:bg-red-900'
                    : 'border border-gold/50 bg-gold/25 text-gold-light shadow-gold hover:bg-gold/35'
                }`}
              >
                {liveActive ? 'Stop Live Stream' : 'Start Live Stream'}
              </button>
            </div>
          )}

          {/* MEDIA TAB */}
          {activeTab === 'media' && (
            <div className="flex flex-col gap-4">
              <div className="rounded border border-dashed border-white/20 bg-obsidian/60 p-4">
                <label className="mb-2 block text-xs uppercase tracking-widest text-gold-light">
                  Upload Image or Video
                </label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-white/70 file:mr-4 file:rounded file:border file:border-gold/30 file:bg-smoke-800 file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-widest file:text-gold-light"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs uppercase tracking-widest text-white/60">
                  Analysis Question / Instruction
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Describe this image, extract text, or analyze actions..."
                  rows={2}
                  className="w-full rounded border border-white/15 bg-obsidian p-3 text-sm text-white placeholder:text-white/30 focus:border-gold focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAnalyzeMedia}
                disabled={!mediaFile || isAnalyzingMedia}
                className="w-fit rounded border border-gold/50 bg-gold/20 px-6 py-2 text-xs uppercase tracking-widest text-gold-light shadow-gold transition-colors hover:bg-gold/30 disabled:opacity-40"
              >
                {isAnalyzingMedia ? 'Analyzing...' : 'Analyze Media'}
              </button>

              {mediaAnalysis && (
                <div className="max-h-48 overflow-y-auto rounded border border-gold/20 bg-smoke-800/80 p-4">
                  <span className="mb-1 block text-[10px] uppercase tracking-widest text-gold">
                    Analysis Result
                  </span>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">
                    {mediaAnalysis}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TRANSCRIBE TAB */}
          {activeTab === 'transcribe' && (
            <div className="flex flex-col gap-4">
              <div className="rounded border border-dashed border-white/20 bg-obsidian/60 p-4">
                <label className="mb-2 block text-xs uppercase tracking-widest text-gold-light">
                  Upload Audio File
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-white/70 file:mr-4 file:rounded file:border file:border-gold/30 file:bg-smoke-800 file:px-4 file:py-2 file:text-xs file:uppercase file:tracking-widest file:text-gold-light"
                />
              </div>

              <button
                type="button"
                onClick={handleTranscribe}
                disabled={!audioFile || isTranscribing}
                className="w-fit rounded border border-gold/50 bg-gold/20 px-6 py-2 text-xs uppercase tracking-widest text-gold-light shadow-gold transition-colors hover:bg-gold/30 disabled:opacity-40"
              >
                {isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}
              </button>

              {transcription && (
                <div className="max-h-48 overflow-y-auto rounded border border-gold/20 bg-smoke-800/80 p-4">
                  <span className="mb-1 block text-[10px] uppercase tracking-widest text-gold">
                    Transcript
                  </span>
                  <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/90">
                    {transcription}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 px-6 py-3 text-[10px] uppercase tracking-widest text-white/30">
          <span>Settings automatically saved to browser storage</span>
          <button type="button" onClick={closeConfig} className="text-gold hover:underline">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
