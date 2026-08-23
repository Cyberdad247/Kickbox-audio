'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AutoSaveMeta {
  macroId?: string | null;
  macroTitle?: string;
  timestamp?: string;
  checksum?: number;
}

export interface UseMacroAutoSaveOptions {
  storageKey?: string;
  metaKey?: string;
  debounceMs?: number;
  periodicIntervalMs?: number;
  enabled?: boolean;
  onRestore?: (restoredCode: string, meta: AutoSaveMeta | null) => void;
}

export interface UseMacroAutoSaveReturn {
  autoSaveStatus: 'idle' | 'saving' | 'saved' | 'restored';
  lastAutoSaveTime: string | null;
  hasSavedDraft: boolean;
  saveNow: (content: string, meta?: AutoSaveMeta) => void;
  clearAutoSaveDraft: () => void;
  getRestoredDraft: () => { code: string; meta: AutoSaveMeta | null } | null;
}

const DEFAULT_STORAGE_KEY = 'camelot_macro_editor_autosave_code';
const DEFAULT_META_KEY = 'camelot_macro_editor_autosave_meta';

/**
 * Custom auto-save hook / middleware effect that periodically and reactively
 * serializes macro editor content to browser localStorage to prevent data loss.
 */
export function useMacroAutoSave(
  currentContent: string,
  macroMeta?: AutoSaveMeta,
  options: UseMacroAutoSaveOptions = {},
): UseMacroAutoSaveReturn {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    metaKey = DEFAULT_META_KEY,
    debounceMs = 750,
    periodicIntervalMs = 10000,
    enabled = true,
    onRestore,
  } = options;

  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'restored'>(
    'idle',
  );
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [hasSavedDraft, setHasSavedDraft] = useState<boolean>(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const periodicTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMountRef = useRef<boolean>(true);
  const lastSavedContentRef = useRef<string>('');

  // Helper to read saved draft safely
  const getRestoredDraft = useCallback(() => {
    try {
      const code = localStorage.getItem(storageKey);
      const metaRaw = localStorage.getItem(metaKey);
      if (code && code.trim().length > 0) {
        let meta: AutoSaveMeta | null = null;
        if (metaRaw) {
          try {
            meta = JSON.parse(metaRaw);
          } catch {
            meta = null;
          }
        }
        return { code, meta };
      }
    } catch (err) {
      console.warn('[MacroAutoSave] Failed reading localStorage draft:', err);
    }
    return null;
  }, [storageKey, metaKey]);

  // Helper to save immediately
  const saveNow = useCallback(
    (contentToSave: string, metaToSave?: AutoSaveMeta) => {
      if (!enabled || typeof window === 'undefined') return;
      if (!contentToSave || contentToSave.trim().length === 0) return;

      try {
        localStorage.setItem(storageKey, contentToSave);
        const meta: AutoSaveMeta = {
          macroId: metaToSave?.macroId ?? macroMeta?.macroId ?? null,
          macroTitle: metaToSave?.macroTitle ?? macroMeta?.macroTitle ?? 'Untitled Macro',
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(metaKey, JSON.stringify(meta));

        const timeStr = new Date().toLocaleTimeString();
        setLastAutoSaveTime(timeStr);
        setAutoSaveStatus('saved');
        setHasSavedDraft(true);
        lastSavedContentRef.current = contentToSave;
      } catch (err) {
        console.error('[MacroAutoSave] Error saving macro draft:', err);
      }
    },
    [enabled, storageKey, metaKey, macroMeta],
  );

  // Helper to clear auto-saved draft
  const clearAutoSaveDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(metaKey);
      setAutoSaveStatus('idle');
      setLastAutoSaveTime(null);
      setHasSavedDraft(false);
      lastSavedContentRef.current = '';
    } catch (err) {
      console.warn('[MacroAutoSave] Error clearing draft:', err);
    }
  }, [storageKey, metaKey]);

  // Initial restoration on mount
  useEffect(() => {
    if (!enabled) return;

    const restored = getRestoredDraft();
    if (restored) {
      setHasSavedDraft(true);
      if (restored.meta?.timestamp) {
        setLastAutoSaveTime(new Date(restored.meta.timestamp).toLocaleTimeString());
      }
      setAutoSaveStatus('restored');
      lastSavedContentRef.current = restored.code;

      if (onRestore) {
        onRestore(restored.code, restored.meta);
      }
    }
  }, [enabled, getRestoredDraft, onRestore]);

  // Debounced auto-save effect on content / meta change
  useEffect(() => {
    if (!enabled) return;

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (!currentContent || currentContent.trim().length === 0) {
      return;
    }

    // Skip if content has not changed from last saved content
    if (currentContent === lastSavedContentRef.current) {
      return;
    }

    setAutoSaveStatus('saving');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveNow(currentContent, macroMeta);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentContent, enabled, debounceMs, saveNow, macroMeta]);

  // Periodic interval auto-save background middleware effect
  useEffect(() => {
    if (!enabled || periodicIntervalMs <= 0) return;

    periodicTimerRef.current = setInterval(() => {
      if (
        currentContent &&
        currentContent.trim().length > 0 &&
        currentContent !== lastSavedContentRef.current
      ) {
        saveNow(currentContent, macroMeta);
      }
    }, periodicIntervalMs);

    return () => {
      if (periodicTimerRef.current) {
        clearInterval(periodicTimerRef.current);
      }
    };
  }, [enabled, periodicIntervalMs, currentContent, saveNow, macroMeta]);

  return {
    autoSaveStatus,
    lastAutoSaveTime,
    hasSavedDraft,
    saveNow,
    clearAutoSaveDraft,
    getRestoredDraft,
  };
}
