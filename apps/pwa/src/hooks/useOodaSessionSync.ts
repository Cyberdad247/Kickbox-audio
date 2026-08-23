'use client';

import { useState, useEffect, useCallback } from 'react';
import type { OodaStageId, DiagnosticEvent, OodaStateTransition } from '../components/dashboard/OODADiagnosticVisualizer';

export interface OodaSessionState {
  selectedStageId: OodaStageId;
  activeRunningStage: OodaStageId;
  isAutoLooping: boolean;
  loopCycleCount: number;
  simulatedMutationLines: number;
  filterType: string;
  isMinimized: boolean;
  events: DiagnosticEvent[];
  transitions: OodaStateTransition[];
}

const STORAGE_KEY = 'koa.ooda_diagnostic_state_v1';

export function useOodaSessionSync(defaultState: {
  selectedStageId: OodaStageId;
  activeRunningStage: OodaStageId;
  isAutoLooping: boolean;
  loopCycleCount: number;
  simulatedMutationLines: number;
  filterType: string;
  isMinimized: boolean;
  events: DiagnosticEvent[];
  transitions?: OodaStateTransition[];
}) {
  const fallbackTransitions = defaultState.transitions || [];

  // Read initial state from sessionStorage or fallback to default
  const [state, setState] = useState<OodaSessionState>(() => {
    if (typeof window === 'undefined') {
      return { ...defaultState, transitions: fallbackTransitions };
    }
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<OodaSessionState>;
        return {
          selectedStageId: parsed.selectedStageId || defaultState.selectedStageId,
          activeRunningStage: parsed.activeRunningStage || defaultState.activeRunningStage,
          isAutoLooping: parsed.isAutoLooping !== undefined ? parsed.isAutoLooping : defaultState.isAutoLooping,
          loopCycleCount: parsed.loopCycleCount || defaultState.loopCycleCount,
          simulatedMutationLines: parsed.simulatedMutationLines || defaultState.simulatedMutationLines,
          filterType: parsed.filterType || defaultState.filterType,
          isMinimized: parsed.isMinimized !== undefined ? parsed.isMinimized : defaultState.isMinimized,
          events: Array.isArray(parsed.events) && parsed.events.length > 0 ? parsed.events : (defaultState.events || []),
          transitions: Array.isArray(parsed.transitions) && parsed.transitions.length > 0 ? parsed.transitions : fallbackTransitions,
        };
      }
    } catch (e) {
      console.warn('[useOodaSessionSync] Failed to read from sessionStorage:', e);
    }
    return { ...defaultState, transitions: fallbackTransitions };
  });

  // Sync state to sessionStorage whenever it updates
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[useOodaSessionSync] Failed to write to sessionStorage:', e);
    }
  }, [state]);

  const updateState = useCallback((patch: Partial<OodaSessionState> | ((prev: OodaSessionState) => OodaSessionState)) => {
    setState((prev) => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      return {
        ...next,
        events: Array.isArray(next.events) ? next.events : (prev.events || defaultState.events || []),
        transitions: Array.isArray(next.transitions) ? next.transitions : (prev.transitions || fallbackTransitions || []),
      };
    });
  }, [defaultState.events, fallbackTransitions]);

  const resetState = useCallback((initialFallback: OodaSessionState) => {
    setState(initialFallback);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  return {
    state,
    updateState,
    resetState,
  };
}
