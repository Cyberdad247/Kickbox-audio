'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type TranscriptSpeaker = 'user' | 'assistant' | 'macro' | 'system';

export interface VoiceTranscriptItem {
  id: string;
  timestamp: string;
  timeFormatted: string;
  speaker: TranscriptSpeaker;
  speakerLabel: string;
  text: string;
  isInterim?: boolean;
  confidence?: number;
  latencyMs?: number;
  audioLevel?: number;
  metadata?: {
    macroName?: string;
    deviceId?: string;
    rawCommand?: string;
    bifrostLane?: string;
  };
}

interface VoiceTranscriptContextValue {
  transcripts: VoiceTranscriptItem[];
  activeInterim: string;
  isListening: boolean;
  isVoiced: boolean;
  currentAudioLevel: number;
  isSpeaking: boolean;
  isPanelOpen: boolean;
  panelMode: 'docked' | 'floating' | 'full';
  searchQuery: string;
  filterType: 'all' | TranscriptSpeaker;
  autoScroll: boolean;
  selectedMicLabel: string;

  // Actions
  addEntry: (entry: Omit<VoiceTranscriptItem, 'id' | 'timestamp' | 'timeFormatted'> & { timestamp?: string }) => void;
  clearTranscripts: () => void;
  exportTranscripts: (format: 'json' | 'txt') => void;
  copyAllTranscripts: () => Promise<boolean>;
  copySingleTranscript: (text: string) => Promise<boolean>;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
  setPanelMode: (mode: 'docked' | 'floating' | 'full') => void;
  setFilterType: (filter: 'all' | TranscriptSpeaker) => void;
  setSearchQuery: (q: string) => void;
  setAutoScroll: (enabled: boolean) => void;
  deleteEntry: (id: string) => void;
}

const STORAGE_KEY = 'camelot_voice_transcripts_v1';
const VoiceTranscriptContext = createContext<VoiceTranscriptContextValue | null>(null);

function formatTime(d: Date = new Date()): string {
  return d.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const INITIAL_TRANSCRIPTS: VoiceTranscriptItem[] = [
  {
    id: 'init-1',
    timestamp: new Date().toISOString(),
    timeFormatted: formatTime(),
    speaker: 'system',
    speakerLabel: 'Voice OS Core',
    text: 'Lakisha Voice Processing Engine instantiated. Speech recognition & VAD real-time streaming backplane online.',
  },
];

export function VoiceTranscriptProvider({ children }: { children: React.ReactNode }) {
  const [transcripts, setTranscripts] = useState<VoiceTranscriptItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_TRANSCRIPTS;
  });

  const [activeInterim, setActiveInterim] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isVoiced, setIsVoiced] = useState<boolean>(false);
  const [currentAudioLevel, setCurrentAudioLevel] = useState<number>(0);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [panelMode, setPanelMode] = useState<'docked' | 'floating' | 'full'>('docked');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | TranscriptSpeaker>('all');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [selectedMicLabel, setSelectedMicLabel] = useState<string>('Default Microphone');

  // Save transcripts to localStorage with cap of 200 items
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const capped = transcripts.slice(-200);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
      } catch {
        // ignore storage errors
      }
    }
  }, [transcripts]);

  const addEntry = useCallback(
    (entry: Omit<VoiceTranscriptItem, 'id' | 'timestamp' | 'timeFormatted'> & { timestamp?: string }) => {
      const now = new Date();
      const newItem: VoiceTranscriptItem = {
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: entry.timestamp || now.toISOString(),
        timeFormatted: formatTime(now),
        speaker: entry.speaker,
        speakerLabel: entry.speakerLabel,
        text: entry.text.trim(),
        isInterim: entry.isInterim,
        confidence: entry.confidence,
        latencyMs: entry.latencyMs,
        audioLevel: entry.audioLevel,
        metadata: entry.metadata,
      };

      if (!newItem.text) return;

      setTranscripts((prev) => [...prev, newItem]);
    },
    [],
  );

  const clearTranscripts = useCallback(() => {
    const clearedItem: VoiceTranscriptItem = {
      id: `sys-${Date.now()}`,
      timestamp: new Date().toISOString(),
      timeFormatted: formatTime(),
      speaker: 'system',
      speakerLabel: 'Voice Engine',
      text: 'Transcript history cleared by user.',
    };
    setTranscripts([clearedItem]);
    setActiveInterim('');
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setTranscripts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const exportTranscripts = useCallback(
    (format: 'json' | 'txt') => {
      if (typeof window === 'undefined') return;

      let content = '';
      let mimeType = 'text/plain';
      let filename = `camelot_voice_transcript_${Date.now()}`;

      if (format === 'json') {
        content = JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            totalEntries: transcripts.length,
            audioDevice: selectedMicLabel,
            transcripts,
          },
          null,
          2,
        );
        mimeType = 'application/json';
        filename += '.json';
      } else {
        filename += '.txt';
        const lines = transcripts.map(
          (t) => `[${t.timeFormatted}] [${t.speakerLabel.toUpperCase()}]: ${t.text}`,
        );
        content = `--- CAMELOT SOVEREIGN VOICE ENGINE TRANSCRIPT ---\nExported: ${new Date().toLocaleString()}\nMicrophone: ${selectedMicLabel}\n\n` +
          lines.join('\n\n');
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [transcripts, selectedMicLabel],
  );

  const copyAllTranscripts = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
    const lines = transcripts.map(
      (t) => `[${t.timeFormatted}] [${t.speakerLabel}]: ${t.text}`,
    );
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      return true;
    } catch {
      return false;
    }
  }, [transcripts]);

  const copySingleTranscript = useCallback(async (text: string) => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  const togglePanel = useCallback(() => {
    setIsPanelOpen((prev) => !prev);
  }, []);

  // Global listeners for Voice Engine events
  useEffect(() => {
    // 1. Listening State (Mic energy, VAD, Synthesizer speaking)
    const handleVoiceState = (e: Event) => {
      const customEvent = e as CustomEvent<{
        listening?: boolean;
        voiced?: boolean;
        level?: number;
        speaking?: boolean;
        interim?: string;
      }>;
      if (customEvent.detail) {
        if (typeof customEvent.detail.listening === 'boolean') {
          setIsListening(customEvent.detail.listening);
        }
        if (typeof customEvent.detail.voiced === 'boolean') {
          setIsVoiced(customEvent.detail.voiced);
        }
        if (typeof customEvent.detail.level === 'number') {
          setCurrentAudioLevel(customEvent.detail.level);
        }
        if (typeof customEvent.detail.speaking === 'boolean') {
          setIsSpeaking(customEvent.detail.speaking);
        }
        if (typeof customEvent.detail.interim === 'string') {
          setActiveInterim(customEvent.detail.interim);
        }
      }
    };

    // 2. Custom transcript additions from speech hooks or Bifrost gateway
    const handleAddTranscript = (e: Event) => {
      const customEvent = e as CustomEvent<{
        speaker: TranscriptSpeaker;
        speakerLabel?: string;
        text: string;
        confidence?: number;
        latencyMs?: number;
        audioLevel?: number;
        metadata?: any;
      }>;
      if (customEvent.detail && customEvent.detail.text) {
        const d = customEvent.detail;
        const speaker = d.speaker || 'user';
        let defaultLabel = 'Sovereign (Voice)';
        if (speaker === 'assistant') defaultLabel = 'Lakisha Voice OS';
        else if (speaker === 'macro') defaultLabel = 'Voice Macro Engine';
        else if (speaker === 'system') defaultLabel = 'System Audio';

        addEntry({
          speaker,
          speakerLabel: d.speakerLabel || defaultLabel,
          text: d.text,
          confidence: d.confidence,
          latencyMs: d.latencyMs,
          audioLevel: d.audioLevel,
          metadata: d.metadata,
        });

        // Clear interim text on finalized entry
        if (speaker === 'user') {
          setActiveInterim('');
        }
      }
    };

    // 3. Audio Device changed listener
    const handleDeviceChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ label?: string; deviceId?: string }>;
      if (customEvent.detail?.label) {
        setSelectedMicLabel(customEvent.detail.label);
        addEntry({
          speaker: 'system',
          speakerLabel: 'Hardware Switch',
          text: `Microphone input changed to: "${customEvent.detail.label}"`,
          metadata: { deviceId: customEvent.detail.deviceId },
        });
      }
    };

    // 4. Toggle panel event from shortcut or buttons
    const handleTogglePanel = () => {
      setIsPanelOpen((prev) => !prev);
    };

    window.addEventListener('camelot:lakisha-listening-state', handleVoiceState);
    window.addEventListener('camelot:voice-transcript-entry', handleAddTranscript);
    window.addEventListener('camelot:audio-device-changed', handleDeviceChanged);
    window.addEventListener('camelot:toggle-transcript-panel', handleTogglePanel);

    return () => {
      window.removeEventListener('camelot:lakisha-listening-state', handleVoiceState);
      window.removeEventListener('camelot:voice-transcript-entry', handleAddTranscript);
      window.removeEventListener('camelot:audio-device-changed', handleDeviceChanged);
      window.removeEventListener('camelot:toggle-transcript-panel', handleTogglePanel);
    };
  }, [addEntry]);

  return (
    <VoiceTranscriptContext.Provider
      value={{
        transcripts,
        activeInterim,
        isListening,
        isVoiced,
        currentAudioLevel,
        isSpeaking,
        isPanelOpen,
        panelMode,
        searchQuery,
        filterType,
        autoScroll,
        selectedMicLabel,
        addEntry,
        clearTranscripts,
        exportTranscripts,
        copyAllTranscripts,
        copySingleTranscript,
        togglePanel,
        setPanelOpen: setIsPanelOpen,
        setPanelMode,
        setFilterType,
        setSearchQuery,
        setAutoScroll,
        deleteEntry,
      }}
    >
      {children}
    </VoiceTranscriptContext.Provider>
  );
}

export function useVoiceTranscript() {
  const context = useContext(VoiceTranscriptContext);
  if (!context) {
    throw new Error('useVoiceTranscript must be used within a VoiceTranscriptProvider');
  }
  return context;
}
