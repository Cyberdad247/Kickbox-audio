'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { dispatchPlumberAction } from '../actions/propertyActions';
import { DEFAULT_ENCLAVE_MACROS } from '../lib/defaultMacros';
import { speak } from '../lib/voice';
import type { Macro, MacroExecutionLog } from '../types/macro';
import { useBifrost } from './BifrostContext';

const STORAGE_KEY = 'koa.macros.v1';
const LOGS_STORAGE_KEY = 'koa.macro_logs.v1';

interface ActiveExecutionState {
  macro: Macro;
  currentStep: number;
  totalSteps: number;
  isExecuting: boolean;
  currentStepLabel: string;
}

interface MacroContextValue {
  macros: Macro[];
  activeMacros: Macro[];
  activeExecution: ActiveExecutionState | null;
  executionLogs: MacroExecutionLog[];
  isMacroModalOpen: boolean;
  editingMacro: Macro | null;
  setEditingMacro: (macro: Macro | null) => void;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
  // CRUD
  createMacro: (data: Omit<Macro, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'>) => Macro;
  updateMacro: (id: string, updates: Partial<Macro>) => void;
  deleteMacro: (id: string) => void;
  toggleMacro: (id: string) => void;
  duplicateMacro: (id: string) => void;
  resetToDefaults: () => void;
  exportMacros: () => string;
  importMacros: (jsonString: string) => boolean;
  // Execution & Matching
  matchMacro: (transcript: string) => Macro | null;
  executeMacro: (
    macroOrId: Macro | string,
    triggeredBy?: 'voice' | 'ui_test' | 'shortcut',
  ) => Promise<boolean>;
  // UI Controls
  openMacroModal: (macroToEdit?: Macro | null) => void;
  closeMacroModal: () => void;
  toggleMacroModal: () => void;
  clearLogs: () => void;
  deleteLogs: (logIds: string[]) => void;
}

const MacroContext = createContext<MacroContextValue | null>(null);

function dispatchKeyCombination(comboStr: string) {
  if (typeof window === 'undefined' || !comboStr) return;
  const parts = comboStr.split('+').map((p) => p.trim());
  const ctrlKey = parts.some((p) => /^ctrl(ol)?$/i.test(p));
  const altKey = parts.some((p) => /^alt$/i.test(p));
  const shiftKey = parts.some((p) => /^shift$/i.test(p));
  const metaKey = parts.some((p) => /^meta|cmd|command|win$/i.test(p));
  const rawKey = parts.find((p) => !/^(ctrl(ol)?|alt|shift|meta|cmd|command|win)$/i.test(p)) || '';

  const target = document.activeElement || document.body;
  const eventInit: KeyboardEventInit = {
    key: rawKey,
    code: rawKey.length === 1 ? `Key${rawKey.toUpperCase()}` : rawKey,
    ctrlKey,
    altKey,
    shiftKey,
    metaKey,
    bubbles: true,
    cancelable: true,
  };

  target.dispatchEvent(new KeyboardEvent('keydown', eventInit));
  target.dispatchEvent(new KeyboardEvent('keyup', eventInit));

  window.dispatchEvent(
    new CustomEvent('koa:key_combination', {
      detail: { combo: comboStr, ctrlKey, altKey, shiftKey, metaKey, key: rawKey },
    }),
  );
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function MacroProvider({ children }: { children: React.ReactNode }) {
  const { sendVoiceCommand } = useBifrost();
  const [macros, setMacros] = useState<Macro[]>(DEFAULT_ENCLAVE_MACROS);
  const [executionLogs, setExecutionLogs] = useState<MacroExecutionLog[]>([]);
  const [activeExecution, setActiveExecution] = useState<ActiveExecutionState | null>(null);
  const [isMacroModalOpen, setIsMacroModalOpen] = useState(false);
  const [editingMacro, setEditingMacro] = useState<Macro | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const macrosRef = useRef(macros);
  macrosRef.current = macros;

  // Hydrate from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMacros(parsed);
        }
      }
      const savedLogs = localStorage.getItem(LOGS_STORAGE_KEY);
      if (savedLogs) {
        const parsedLogs = JSON.parse(savedLogs);
        if (Array.isArray(parsedLogs)) {
          setExecutionLogs(parsedLogs.slice(0, 50));
        }
      }
    } catch (err) {
      console.warn('Failed to hydrate macros from localStorage', err);
    }
  }, []);

  // Sync to localStorage
  const persistMacros = useCallback((updated: Macro[]) => {
    setMacros(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to persist macros', err);
    }
  }, []);

  const persistLogs = useCallback((updatedLogs: MacroExecutionLog[]) => {
    setExecutionLogs(updatedLogs);
    try {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updatedLogs.slice(0, 50)));
    } catch (err) {
      console.error('Failed to persist macro logs', err);
    }
  }, []);

  const createMacro = useCallback(
    (data: Omit<Macro, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'>): Macro => {
      const now = new Date().toISOString();
      const newMacro: Macro = {
        ...data,
        id: `macro_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: now,
        updatedAt: now,
        executionCount: 0,
      };
      const updated = [newMacro, ...macrosRef.current];
      persistMacros(updated);
      return newMacro;
    },
    [persistMacros],
  );

  const updateMacro = useCallback(
    (id: string, updates: Partial<Macro>) => {
      const updated = macrosRef.current.map((m) =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m,
      );
      persistMacros(updated);
    },
    [persistMacros],
  );

  const deleteMacro = useCallback(
    (id: string) => {
      const updated = macrosRef.current.filter((m) => m.id !== id);
      persistMacros(updated);
    },
    [persistMacros],
  );

  const toggleMacro = useCallback(
    (id: string) => {
      const updated = macrosRef.current.map((m) =>
        m.id === id ? { ...m, enabled: !m.enabled, updatedAt: new Date().toISOString() } : m,
      );
      persistMacros(updated);
    },
    [persistMacros],
  );

  const duplicateMacro = useCallback(
    (id: string) => {
      const source = macrosRef.current.find((m) => m.id === id);
      if (!source) return;
      const now = new Date().toISOString();
      const duplicate: Macro = {
        ...source,
        id: `macro_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: `${source.name} (Copy)`,
        phrase: `${source.phrase} copy`,
        createdAt: now,
        updatedAt: now,
        executionCount: 0,
      };
      const updated = [duplicate, ...macrosRef.current];
      persistMacros(updated);
    },
    [persistMacros],
  );

  const resetToDefaults = useCallback(() => {
    persistMacros(DEFAULT_ENCLAVE_MACROS);
  }, [persistMacros]);

  const exportMacros = useCallback(() => {
    return JSON.stringify(macrosRef.current, null, 2);
  }, []);

  const importMacros = useCallback(
    (jsonString: string): boolean => {
      try {
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].phrase || parsed[0].name)) {
          persistMacros(parsed);
          return true;
        }
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          (parsed.phrase || parsed.name) &&
          Array.isArray(parsed.steps)
        ) {
          const newMacro: Macro = {
            id: parsed.id || `macro_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            name: String(parsed.name || 'Imported Script Macro').trim(),
            phrase: String(parsed.phrase || 'imported script')
              .toLowerCase()
              .trim(),
            description: String(parsed.description || 'Imported custom script').trim(),
            category: (parsed.category as MacroCategory) || 'custom',
            enabled: true,
            safetyTier: parsed.safetyTier === 'hitl_confirm' ? 'hitl_confirm' : 'auto',
            steps: parsed.steps,
            createdAt: parsed.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            executionCount: parsed.executionCount || 0,
          };
          const existingIdx = macrosRef.current.findIndex(
            (m) => m.id === newMacro.id || m.phrase === newMacro.phrase,
          );
          let updated: Macro[];
          if (existingIdx >= 0) {
            updated = macrosRef.current.map((m, idx) => (idx === existingIdx ? newMacro : m));
          } else {
            updated = [newMacro, ...macrosRef.current];
          }
          persistMacros(updated);
          return true;
        }
      } catch {
        // invalid JSON
      }
      return false;
    },
    [persistMacros],
  );

  // Match voice phrase against active macros
  const matchMacro = useCallback((transcript: string): Macro | null => {
    if (!transcript) return null;
    const cleanInput = normalizeText(transcript);
    if (!cleanInput) return null;

    // Search active macros
    const activeMacros = macrosRef.current.filter((m) => m.enabled);

    // 1. Exact normalized phrase match
    const exact = activeMacros.find((m) => normalizeText(m.phrase) === cleanInput);
    if (exact) return exact;

    // 2. Starts with / prefix match ("morning briefing please", "hey lakisha emergency lockdown")
    const prefixOrContains = activeMacros.find((m) => {
      const cleanPhrase = normalizeText(m.phrase);
      if (cleanPhrase.length >= 4 && cleanInput.includes(cleanPhrase)) return true;
      if (cleanInput.length >= 4 && cleanPhrase.includes(cleanInput)) return true;
      return false;
    });

    return prefixOrContains || null;
  }, []);

  // Execute a macro step-by-step
  const executeMacro = useCallback(
    async (
      macroOrId: Macro | string,
      triggeredBy: 'voice' | 'ui_test' | 'shortcut' = 'voice',
    ): Promise<boolean> => {
      const macro =
        typeof macroOrId === 'string'
          ? macrosRef.current.find((m) => m.id === macroOrId)
          : macroOrId;

      if (!macro) return false;

      const startTime = performance.now();
      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newLog: MacroExecutionLog = {
        id: logId,
        macroId: macro.id,
        macroName: macro.name,
        phrase: macro.phrase,
        triggeredBy,
        status: 'running',
        stepsTotal: macro.steps.length,
        stepsCompleted: 0,
        timestamp: new Date().toISOString(),
        latencyMs: 0,
      };

      setExecutionLogs((prev) => [newLog, ...prev.slice(0, 49)]);

      setActiveExecution({
        macro,
        currentStep: 0,
        totalSteps: macro.steps.length,
        isExecuting: true,
        currentStepLabel: 'Initializing sequence...',
      });

      // Update execution count & lastExecutedAt
      setMacros((prev) =>
        prev.map((m) =>
          m.id === macro.id
            ? {
                ...m,
                executionCount: m.executionCount + 1,
                lastExecutedAt: new Date().toISOString(),
              }
            : m,
        ),
      );

      try {
        let completed = 0;
        for (let i = 0; i < macro.steps.length; i++) {
          const step = macro.steps[i];
          setActiveExecution({
            macro,
            currentStep: i + 1,
            totalSteps: macro.steps.length,
            isExecuting: true,
            currentStepLabel: step.label,
          });

          if (step.delayMs > 0) {
            await new Promise((res) => setTimeout(res, step.delayMs));
          }

          // Execute step based on type
          switch (step.type) {
            case 'voice_command':
            case 'kba_routine':
              sendVoiceCommand(step.payload);
              break;

            case 'property_dispatch':
              try {
                let params = {
                  unit: 'Unit 4B',
                  issue: 'Maintenance Work Order',
                  priority: 'HIGH' as const,
                };
                try {
                  params = JSON.parse(step.payload);
                } catch {
                  // use default or raw text
                }
                await dispatchPlumberAction.run(params);
              } catch (err) {
                console.warn('Property action step dispatch warning:', err);
              }
              break;

            case 'knight_dispatch':
              // Dispatch to Knight coordination queue via speech/voice command
              sendVoiceCommand(`remind ${step.knightId || 'CEO'} ${step.payload}`);
              break;

            case 'client_navigation':
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('koa:navigate_tab', { detail: step.payload }));
              }
              break;

            case 'speak_feedback':
              speak(step.payload);
              break;

            case 'key_combination':
              dispatchKeyCombination(step.payload);
              break;

            case 'custom_script': {
              const code = step.scriptCode || step.payload;
              if (code) {
                try {
                  const runner = new Function(
                    'context',
                    'speak',
                    'sendVoiceCommand',
                    'dispatchKey',
                    'navigateTab',
                    `"use strict";\n${code}`,
                  );
                  runner(
                    { macro, step },
                    speak,
                    sendVoiceCommand,
                    (combo: string) => dispatchKeyCombination(combo),
                    (tab: string) =>
                      typeof window !== 'undefined' &&
                      window.dispatchEvent(new CustomEvent('koa:navigate_tab', { detail: tab })),
                  );
                } catch (err) {
                  console.error('Custom Macro Script execution error:', err);
                  speak('Custom script execution error');
                }
              }
              break;
            }
          }

          completed++;
        }

        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        // Update log to success
        setExecutionLogs((prev) =>
          prev.map((l) =>
            l.id === logId
              ? {
                  ...l,
                  status: 'success',
                  stepsCompleted: completed,
                  latencyMs: duration,
                  details: `Executed ${completed}/${macro.steps.length} steps in ${duration}ms`,
                }
              : l,
          ),
        );

        // Clear active execution pill after 2.5 seconds
        setTimeout(() => {
          setActiveExecution(null);
        }, 2500);

        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setExecutionLogs((prev) =>
          prev.map((l) =>
            l.id === logId
              ? {
                  ...l,
                  status: 'failed',
                  details: `Failed at step: ${errorMsg}`,
                }
              : l,
          ),
        );
        setActiveExecution(null);
        return false;
      }
    },
    [sendVoiceCommand],
  );

  const openMacroModal = useCallback((macroToEdit: Macro | null = null) => {
    setEditingMacro(macroToEdit);
    setIsMacroModalOpen(true);
  }, []);

  const closeMacroModal = useCallback(() => {
    setIsMacroModalOpen(false);
    setEditingMacro(null);
  }, []);

  const toggleMacroModal = useCallback(() => {
    setIsMacroModalOpen((prev) => {
      const next = !prev;
      if (!next) {
        setEditingMacro(null);
        speak('Voice Macro popup window minimized to Cartridge Dock.');
      } else {
        speak('Voice Macro popup window activated.');
      }
      return next;
    });
  }, []);

  // Global hotkey listener to toggle voice macro popup window (Ctrl+Shift+M / Cmd+Shift+M / Alt+M / Ctrl+M)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        Boolean(target?.isContentEditable);

      const isCtrlShiftM = (e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm';
      const isAltM = e.altKey && e.key.toLowerCase() === 'm';
      const isCtrlM = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm' && !isInput;

      if (isCtrlShiftM || isAltM || isCtrlM) {
        e.preventDefault();
        toggleMacroModal();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [toggleMacroModal]);

  const clearLogs = useCallback(() => {
    persistLogs([]);
  }, [persistLogs]);

  const deleteLogs = useCallback(
    (logIds: string[]) => {
      if (!logIds || logIds.length === 0) return;
      const idsSet = new Set(logIds);
      setExecutionLogs((prev) => {
        const filtered = prev.filter((log) => !idsSet.has(log.id));
        persistLogs(filtered);
        return filtered;
      });
    },
    [persistLogs],
  );

  const activeMacros = macros.filter((m) => m.enabled);

  return (
    <MacroContext.Provider
      value={{
        macros,
        activeMacros,
        activeExecution,
        executionLogs,
        isMacroModalOpen,
        editingMacro,
        setEditingMacro,
        activeCategory,
        setActiveCategory,
        createMacro,
        updateMacro,
        deleteMacro,
        toggleMacro,
        duplicateMacro,
        resetToDefaults,
        exportMacros,
        importMacros,
        matchMacro,
        executeMacro,
        openMacroModal,
        closeMacroModal,
        toggleMacroModal,
        clearLogs,
        deleteLogs,
      }}
    >
      {children}
    </MacroContext.Provider>
  );
}

export function useMacros(): MacroContextValue {
  const ctx = useContext(MacroContext);
  if (!ctx) throw new Error('useMacros must be used within a MacroProvider');
  return ctx;
}
