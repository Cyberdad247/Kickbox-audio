export type MacroCategory = 'financial' | 'operations' | 'security' | 'knights' | 'custom';

export type ActionStepType =
  | 'voice_command' // Bifrost command, e.g. "add transaction 25000", "remind CEO"
  | 'kba_routine' // KBA Cartridge routine, e.g. "sync", "audit", "rezero", "forge", "scan"
  | 'knight_dispatch' // Dispatch task packet to a specific Knight (CEO, CAL, MAIL, PROP, MAINT, RENT, STREAM)
  | 'property_dispatch' // Isomorphic action like plumbing or maintenance dispatch
  | 'client_navigation' // UI action: Switch tab (Overview, Knights, Properties, Settings, etc.)
  | 'speak_feedback' // On-device speech synthesis confirmation phrase
  | 'key_combination' // Dispatch keyboard shortcut combination, e.g. "Ctrl+Shift+D", "Alt+M"
  | 'custom_script'; // Custom JavaScript code block executed on utterance

export interface MacroActionStep {
  id: string;
  type: ActionStepType;
  label: string;
  payload: string; // Command string, target tab, hotkey combo, or script code
  knightId?: string; // Optional target knight
  scriptCode?: string; // Optional multiline JS script code
  delayMs: number; // Delay before step in ms (e.g. 0, 200, 500)
}

export interface Macro {
  id: string;
  name: string;
  phrase: string; // Voice trigger phrase, e.g. "morning briefing", "emergency freeze"
  description: string;
  category: MacroCategory;
  enabled: boolean;
  steps: MacroActionStep[];
  safetyTier: 'auto' | 'hitl_confirm'; // If hitl_confirm, prompts Plan Card / user confirmation first
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  executionCount: number;
}

export interface MacroExecutionLog {
  id: string;
  macroId: string;
  macroName: string;
  phrase: string;
  triggeredBy: 'voice' | 'ui_test' | 'shortcut';
  status: 'running' | 'success' | 'failed' | 'hitl_pending';
  stepsTotal: number;
  stepsCompleted: number;
  timestamp: string;
  latencyMs: number;
  details?: string;
}
