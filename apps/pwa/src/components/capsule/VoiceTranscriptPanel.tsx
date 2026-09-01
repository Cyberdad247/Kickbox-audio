'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  useVoiceTranscript,
  type TranscriptSpeaker,
  type VoiceTranscriptItem,
} from '../../context/VoiceTranscriptContext';
import { useLakishaVoice } from '../../hooks/useLakishaVoice';
import { speak } from '../../lib/voice';

export interface VoiceTranscriptPanelProps {
  mode?: 'docked' | 'floating' | 'full';
  onClose?: () => void;
  className?: string;
}

export function VoiceTranscriptPanel({
  mode: propMode,
  onClose,
  className = '',
}: VoiceTranscriptPanelProps) {
  const {
    transcripts,
    activeInterim,
    isListening: ctxListening,
    isVoiced,
    currentAudioLevel,
    isSpeaking,
    isPanelOpen,
    panelMode: ctxMode,
    searchQuery,
    filterType,
    autoScroll,
    selectedMicLabel,
    clearTranscripts,
    exportTranscripts,
    copyAllTranscripts,
    copySingleTranscript,
    setPanelMode,
    setFilterType,
    setSearchQuery,
    setAutoScroll,
    deleteEntry,
    addEntry,
  } = useVoiceTranscript();

  const {
    listening,
    startListening,
    stopListening,
    toggleListening,
    voiced,
    level,
    connected,
  } = useLakishaVoice();

  const effectiveMode = propMode || ctxMode;
  const listBottomRef = useRef<HTMLDivElement | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [replayingId, setReplayingId] = useState<string | null>(null);

  // Auto-scroll to bottom on new transcripts if enabled
  useEffect(() => {
    if (autoScroll && listBottomRef.current) {
      listBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, activeInterim, autoScroll]);

  // Filtered transcript items
  const filteredItems = useMemo(() => {
    return transcripts.filter((item) => {
      // Filter by speaker
      if (filterType !== 'all' && item.speaker !== filterType) {
        return false;
      }
      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesText = item.text.toLowerCase().includes(q);
        const matchesSpeaker = item.speakerLabel.toLowerCase().includes(q);
        const matchesTime = item.timeFormatted.toLowerCase().includes(q);
        return matchesText || matchesSpeaker || matchesTime;
      }
      return true;
    });
  }, [transcripts, filterType, searchQuery]);

  // Counts for filter chips
  const counts = useMemo(() => {
    const total = transcripts.length;
    const userCount = transcripts.filter((t) => t.speaker === 'user').length;
    const assistantCount = transcripts.filter((t) => t.speaker === 'assistant').length;
    const macroCount = transcripts.filter((t) => t.speaker === 'macro').length;
    const systemCount = transcripts.filter((t) => t.speaker === 'system').length;
    return { total, userCount, assistantCount, macroCount, systemCount };
  }, [transcripts]);

  // Copy handler
  const handleCopySingle = async (item: VoiceTranscriptItem) => {
    const ok = await copySingleTranscript(`[${item.timeFormatted}] [${item.speakerLabel}]: ${item.text}`);
    if (ok) {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyAll = async () => {
    const ok = await copyAllTranscripts();
    if (ok) {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  // Replay speech audio
  const handleReplaySpeech = (item: VoiceTranscriptItem) => {
    setReplayingId(item.id);
    speak(item.text, {
      onEnd: () => setReplayingId(null),
    });
  };

  // Handle manual command test dispatch
  const handleSendManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    addEntry({
      speaker: 'user',
      speakerLabel: 'Sovereign (Manual Test)',
      text: manualText.trim(),
    });
    setManualText('');
  };

  const isActuallyListening = listening || ctxListening;
  const isActuallyVoiced = voiced || isVoiced;
  const currentDbLevel = Math.round((level || currentAudioLevel) * 100);

  // Base styling for different modes
  const containerClasses = useMemo(() => {
    if (effectiveMode === 'full') {
      return 'w-full h-full flex flex-col bg-[#08080E]/95 border border-white/10 rounded-2xl backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)]';
    }
    if (effectiveMode === 'floating') {
      return 'fixed inset-4 sm:inset-10 z-50 flex flex-col bg-[#090615]/95 border border-[#00F0FF]/30 rounded-2xl backdrop-blur-2xl shadow-[0_25px_80px_rgba(0,0,0,0.95),0_0_40px_rgba(0,240,255,0.15)] animate-snap-in';
    }
    // Docked slide-over / bottom drawer
    return 'fixed bottom-4 right-4 z-40 w-[95vw] sm:w-[540px] max-h-[85vh] h-[650px] flex flex-col bg-[#070511]/95 border border-[#00F0FF]/40 rounded-2xl backdrop-blur-3xl shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_30px_rgba(0,240,255,0.2)] animate-snap-in';
  }, [effectiveMode]);

  return (
    <div
      id="voice-transcript-panel-root"
      className={`${containerClasses} ${className} select-text overflow-hidden`}
    >
      {/* ── Top Header Bar ── */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-black/50 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/10 text-base shadow-[0_0_15px_rgba(0,240,255,0.25)]">
            <span>🎙️</span>
            {isActuallyListening && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00F0FF] opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#00F0FF]" />
              </span>
            )}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xs font-bold uppercase tracking-[0.15em] text-white truncate">
                Voice Ingest Transcript
              </h2>
              {/* Real-time Status Badge */}
              <span
                id="voice-engine-status-badge"
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                  isSpeaking
                    ? 'border border-[#FFD700]/50 bg-[#FFD700]/15 text-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.3)] animate-pulse'
                    : isActuallyVoiced
                      ? 'border border-[#00FF66]/50 bg-[#00FF66]/15 text-[#00FF66] shadow-[0_0_10px_rgba(0,255,102,0.3)] animate-pulse'
                      : isActuallyListening
                        ? 'border border-[#00F0FF]/50 bg-[#00F0FF]/15 text-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                        : 'border border-white/10 bg-white/5 text-white/50'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isSpeaking
                      ? 'bg-[#FFD700]'
                      : isActuallyVoiced
                        ? 'bg-[#00FF66]'
                        : isActuallyListening
                          ? 'bg-[#00F0FF]'
                          : 'bg-white/40'
                  }`}
                />
                <span>
                  {isSpeaking
                    ? 'Lakisha Speaking'
                    : isActuallyVoiced
                      ? 'Voice Active'
                      : isActuallyListening
                        ? 'Listening...'
                        : 'Engine Standby'}
                </span>
              </span>
            </div>

            <span className="font-mono text-[9px] text-white/40 truncate max-w-[240px] sm:max-w-[320px]">
              Hardware: <strong className="text-white/70">{selectedMicLabel}</strong>
            </span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Mode Switchers */}
          {effectiveMode !== 'full' && (
            <div className="hidden sm:flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setPanelMode('docked')}
                className={`px-2 py-0.5 rounded transition-all ${
                  effectiveMode === 'docked'
                    ? 'bg-[#00F0FF]/20 text-[#00F0FF] font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
                title="Docked View"
              >
                Dock
              </button>
              <button
                type="button"
                onClick={() => setPanelMode('floating')}
                className={`px-2 py-0.5 rounded transition-all ${
                  effectiveMode === 'floating'
                    ? 'bg-[#00F0FF]/20 text-[#00F0FF] font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
                title="Expanded View"
              >
                Expand
              </button>
            </div>
          )}

          {/* Export Dropdown Trigger */}
          <div className="relative">
            <button
              type="button"
              id="export-transcript-btn"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/70 hover:border-[#00F0FF] hover:text-[#00F0FF] transition-all"
              title="Export transcripts to file"
            >
              <span>💾</span>
              <span className="hidden sm:inline">Export</span>
            </button>

            {isExportMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-50 w-36 rounded-xl border border-white/15 bg-[#0D091A] p-1.5 shadow-2xl backdrop-blur-2xl"
                onMouseLeave={() => setIsExportMenuOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => {
                    exportTranscripts('txt');
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-left font-mono text-[10px] text-white/80 hover:bg-white/10 hover:text-[#00F0FF] transition-all"
                >
                  📄 Plain Text (.txt)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportTranscripts('json');
                    setIsExportMenuOpen(false);
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-left font-mono text-[10px] text-white/80 hover:bg-white/10 hover:text-[#00F0FF] transition-all"
                >
                  📊 Structured (.json)
                </button>
              </div>
            )}
          </div>

          {/* Copy All Button */}
          <button
            type="button"
            id="copy-all-transcript-btn"
            onClick={handleCopyAll}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[10px] transition-all ${
              copiedAll
                ? 'border-[#00FF66]/50 bg-[#00FF66]/15 text-[#00FF66]'
                : 'border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white'
            }`}
            title="Copy all transcript lines"
          >
            <span>{copiedAll ? '✓' : '📋'}</span>
            <span className="hidden sm:inline">{copiedAll ? 'Copied!' : 'Copy'}</span>
          </button>

          {/* Clear Button */}
          <button
            type="button"
            id="clear-transcript-btn"
            onClick={clearTranscripts}
            className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2 py-1 font-mono text-[10px] text-white/50 hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 transition-all"
            title="Clear transcript log"
          >
            <span>🗑️</span>
          </button>

          {/* Close Panel Button */}
          {onClose && (
            <button
              type="button"
              id="close-transcript-panel-btn"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-xs text-white/60 hover:border-white/30 hover:text-white transition-all ml-1"
              title="Close Transcript Panel"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Toolbar: Search & Filter Chips ── */}
      <div className="flex flex-col gap-2 border-b border-white/10 bg-black/30 px-4 py-2.5 sm:px-5">
        {/* Search Bar */}
        <div className="relative flex items-center">
          <span className="absolute left-3 text-xs text-white/30">🔍</span>
          <input
            type="text"
            id="transcript-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcripts by speech, keyword, or timestamp..."
            className="w-full rounded-xl border border-white/10 bg-black/40 py-1.5 pl-8 pr-8 font-mono text-[11px] text-white placeholder-white/30 focus:border-[#00F0FF]/60 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-[#00F0FF]/30 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-xs text-white/40 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto hide-scrollbar pt-0.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`rounded-lg px-2.5 py-1 font-mono text-[10px] transition-all whitespace-nowrap ${
                filterType === 'all'
                  ? 'border border-[#00F0FF]/50 bg-[#00F0FF]/15 text-[#00F0FF] font-bold shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'border border-white/10 bg-white/5 text-white/50 hover:text-white'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('user')}
              className={`rounded-lg px-2.5 py-1 font-mono text-[10px] transition-all whitespace-nowrap ${
                filterType === 'user'
                  ? 'border border-[#00F0FF]/50 bg-[#00F0FF]/15 text-[#00F0FF] font-bold shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                  : 'border border-white/10 bg-white/5 text-white/50 hover:text-white'
              }`}
            >
              👤 Voice Input ({counts.userCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('assistant')}
              className={`rounded-lg px-2.5 py-1 font-mono text-[10px] transition-all whitespace-nowrap ${
                filterType === 'assistant'
                  ? 'border border-[#FFD700]/50 bg-[#FFD700]/15 text-[#FFD700] font-bold shadow-[0_0_10px_rgba(255,215,0,0.2)]'
                  : 'border border-white/10 bg-white/5 text-white/50 hover:text-white'
              }`}
            >
              👑 Lakisha OS ({counts.assistantCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('macro')}
              className={`rounded-lg px-2.5 py-1 font-mono text-[10px] transition-all whitespace-nowrap ${
                filterType === 'macro'
                  ? 'border border-[#FF00FF]/50 bg-[#FF00FF]/15 text-[#FF00FF] font-bold shadow-[0_0_10px_rgba(255,0,255,0.2)]'
                  : 'border border-white/10 bg-white/5 text-white/50 hover:text-white'
              }`}
            >
              ⚡ Macros ({counts.macroCount})
            </button>
          </div>

          {/* Auto-Scroll Toggle */}
          <button
            type="button"
            id="toggle-autoscroll-btn"
            onClick={() => setAutoScroll(!autoScroll)}
            className={`shrink-0 flex items-center gap-1 rounded-lg border px-2 py-0.5 font-mono text-[9px] transition-all ${
              autoScroll
                ? 'border-[#00F0FF]/40 bg-[#00F0FF]/10 text-[#00F0FF]'
                : 'border-white/10 bg-white/5 text-white/40 hover:text-white'
            }`}
            title="Toggle Auto-Scroll to newest utterance"
          >
            <span>{autoScroll ? '⬇️ Lock' : '⏸️ Paused'}</span>
          </button>
        </div>
      </div>

      {/* ── Active Real-Time Live Streaming Ingest Card ── */}
      {(activeInterim || isActuallyListening) && (
        <div className="shrink-0 border-b border-[#00F0FF]/30 bg-gradient-to-r from-[#00F0FF]/10 via-[#0D091A] to-[#FF00FF]/10 px-4 py-2.5 sm:px-5">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F0FF] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F0FF]" />
              </span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#00F0FF]">
                Live Speech Ingest Stream
              </span>
            </div>

            {/* Audio RMS Level Bar */}
            <div className="flex items-center gap-1.5 font-mono text-[9px] text-white/60">
              <span>MIC ENERGY:</span>
              <div className="h-1.5 w-16 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#00F0FF] to-[#00FF66] transition-all duration-75"
                  style={{ width: `${Math.min(100, currentDbLevel * 2)}%` }}
                />
              </div>
              <span className="text-[#00F0FF]">{currentDbLevel}%</span>
            </div>
          </div>

          <div
            id="live-interim-text"
            className="font-mono text-xs sm:text-sm text-white/95 bg-black/40 rounded-xl p-2.5 border border-[#00F0FF]/25 shadow-[inset_0_0_15px_rgba(0,240,255,0.05)]"
          >
            {activeInterim ? (
              <span className="flex items-center">
                <span className="text-[#00F0FF] mr-2">»</span>
                <span>{activeInterim}</span>
                <span className="inline-block h-3.5 w-1.5 ml-1.5 bg-[#00F0FF] animate-pulse" />
              </span>
            ) : (
              <span className="text-white/40 italic flex items-center gap-2">
                <span>Listening for sovereign voice commands...</span>
                <span className="inline-block h-2 w-2 rounded-full bg-[#00F0FF] animate-ping" />
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Chronological Transcript Feed List ── */}
      <div
        id="transcript-stream-container"
        className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      >
        {filteredItems.length === 0 ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center p-6">
            <span className="text-3xl mb-2">📜</span>
            <span className="font-mono text-xs text-white/70 font-semibold mb-1">
              No Transcripts Found
            </span>
            <p className="font-mono text-[10px] text-white/40 max-w-xs">
              {searchQuery
                ? `No utterance matches filter "${searchQuery}".`
                : 'Speak into your microphone or trigger a voice macro to capture live speech transcriptions.'}
            </p>
          </div>
        ) : (
          filteredItems.map((item, index) => {
            const isUser = item.speaker === 'user';
            const isAssistant = item.speaker === 'assistant';
            const isMacro = item.speaker === 'macro';
            const isSystem = item.speaker === 'system';

            return (
              <div
                key={item.id}
                id={`transcript-entry-${item.id}`}
                className={`group relative flex flex-col rounded-2xl border p-3 sm:p-3.5 transition-all duration-150 ${
                  isUser
                    ? 'border-[#00F0FF]/30 bg-[#00F0FF]/5 hover:border-[#00F0FF]/50 hover:bg-[#00F0FF]/10'
                    : isAssistant
                      ? 'border-[#FFD700]/30 bg-[#FFD700]/5 hover:border-[#FFD700]/50 hover:bg-[#FFD700]/10'
                      : isMacro
                        ? 'border-[#FF00FF]/30 bg-[#FF00FF]/5 hover:border-[#FF00FF]/50 hover:bg-[#FF00FF]/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {/* Entry Header: Speaker + Timestamp + Metadata */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">
                      {isUser ? '👤' : isAssistant ? '👑' : isMacro ? '⚡' : '⚙️'}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                        isUser
                          ? 'text-[#00F0FF]'
                          : isAssistant
                            ? 'text-[#FFD700]'
                            : isMacro
                              ? 'text-[#FF00FF]'
                              : 'text-white/60'
                      }`}
                    >
                      {item.speakerLabel}
                    </span>

                    {/* Metadata tags */}
                    {item.metadata?.macroName && (
                      <span className="rounded bg-[#FF00FF]/20 px-1.5 py-0.2 font-mono text-[8px] text-[#FF00FF] border border-[#FF00FF]/30">
                        {item.metadata.macroName}
                      </span>
                    )}

                    {item.latencyMs !== undefined && (
                      <span className="font-mono text-[8px] text-white/40">
                        {Math.round(item.latencyMs)}ms latency
                      </span>
                    )}
                  </div>

                  {/* Timestamp & Copy/Replay Quick Actions */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] text-white/40">
                      {item.timeFormatted}
                    </span>

                    {/* Action buttons revealed on hover */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      {isAssistant && (
                        <button
                          type="button"
                          onClick={() => handleReplaySpeech(item)}
                          disabled={replayingId === item.id}
                          className="rounded p-1 text-[10px] text-white/60 hover:bg-white/10 hover:text-[#FFD700]"
                          title="Replay with voice synthesis"
                        >
                          {replayingId === item.id ? '🔊' : '🗣️'}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopySingle(item)}
                        className="rounded p-1 text-[10px] text-white/60 hover:bg-white/10 hover:text-[#00F0FF]"
                        title="Copy text"
                      >
                        {copiedId === item.id ? '✓' : '📋'}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteEntry(item.id)}
                        className="rounded p-1 text-[10px] text-white/40 hover:bg-red-500/20 hover:text-red-400"
                        title="Delete entry"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>

                {/* Entry Body Text */}
                <p className="font-mono text-xs sm:text-[13px] text-white/90 leading-relaxed break-words pl-0.5">
                  {item.text}
                </p>
              </div>
            );
          })
        )}
        <div ref={listBottomRef} />
      </div>

      {/* ── Footer: Live Voice Toggle & Input Tester ── */}
      <div className="shrink-0 border-t border-white/10 bg-black/60 p-3 sm:p-4">
        <form onSubmit={handleSendManual} className="flex items-center gap-2">
          {/* Mic Toggle Button */}
          <button
            type="button"
            id="transcript-mic-toggle-btn"
            onClick={toggleListening}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-all duration-200 shrink-0 ${
              isActuallyListening
                ? 'border border-[#00F0FF] bg-[#00F0FF] text-black shadow-[0_0_20px_rgba(0,240,255,0.6)] animate-pulse'
                : 'border border-[#00F0FF]/50 bg-[#00F0FF]/15 text-[#00F0FF] hover:bg-[#00F0FF]/25'
            }`}
            title="Toggle Microphone Speech Input"
          >
            <span>{isActuallyListening ? '🛑' : '🎙️'}</span>
            <span>{isActuallyListening ? 'Stop' : 'Speak'}</span>
          </button>

          {/* Quick manual text tester */}
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="Type speech command simulation or note..."
            className="flex-1 rounded-xl border border-white/10 bg-black/50 px-3 py-2 font-mono text-xs text-white placeholder-white/30 focus:border-[#00F0FF]/50 focus:outline-none focus:ring-1 focus:ring-[#00F0FF]/30 transition-all"
          />

          <button
            type="submit"
            disabled={!manualText.trim()}
            className="rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 font-mono text-xs text-white/80 hover:border-[#00F0FF] hover:text-[#00F0FF] disabled:opacity-40 disabled:hover:border-white/15 disabled:hover:text-white/80 transition-all"
          >
            Send
          </button>
        </form>

        {/* Footer Metrics */}
        <div className="mt-2.5 flex items-center justify-between text-[9px] font-mono text-white/40 px-1">
          <div className="flex items-center gap-2">
            <span>Total Captured: <strong className="text-white/70">{transcripts.length}</strong></span>
            <span>•</span>
            <span>Live Feed: <strong className="text-[#00F0FF]">Active (Web Speech + VAD)</strong></span>
          </div>
          <span className="hidden sm:inline">Hotkey: Cmd+Shift+T</span>
        </div>
      </div>
    </div>
  );
}

export default VoiceTranscriptPanel;
