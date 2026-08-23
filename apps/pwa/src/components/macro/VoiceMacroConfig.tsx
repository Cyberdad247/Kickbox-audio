'use client';

import type React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { KNIGHTS_REGISTRY } from '../../actions/coreRegistry';
import { useBifrost } from '../../context/BifrostContext';
import { useMacros } from '../../context/MacroContext';
import { useTenant } from '../../context/TenantContext';
import { useMacroAutoSave } from '../../hooks/useMacroAutoSave';
import { speak } from '../../lib/voice';
import { useCamelotStore } from '../../stores/camelotStore';
import type { ActionStepType, Macro, MacroActionStep, MacroCategory } from '../../types/macro';
import { SovereignEnclaveStandaloneView } from '../hud/SovereignEnclaveStandaloneView';
import { CommandLog } from './CommandLog';

export interface VoiceMacroConfigProps {
  className?: string;
  onClose?: () => void;
  initialCategory?: MacroCategory | 'all';
}

const CATEGORY_TABS: { id: MacroCategory | 'all'; label: string; rune: string }[] = [
  { id: 'all', label: 'All Phrases', rune: '⚡' },
  { id: 'operations', label: 'Operations', rune: '🏢' },
  { id: 'financial', label: 'Financial', rune: '💰' },
  { id: 'security', label: 'Security', rune: '🛡️' },
  { id: 'knights', label: 'Knight Swarm', rune: '⚔️' },
  { id: 'custom', label: 'Custom', rune: '✨' },
];

const STEP_TYPE_OPTIONS: {
  type: ActionStepType;
  label: string;
  desc: string;
  rune: string;
  color: string;
}[] = [
  {
    type: 'voice_command',
    label: 'Bifrost Voice Command',
    desc: 'Raw voice telemetry to server',
    rune: '⚡',
    color: '#00F0FF',
  },
  {
    type: 'kba_routine',
    label: 'KBA Cartridge Routine',
    desc: 'Sovereign ledger sync, audit, rezero, or forge',
    rune: '🛡️',
    color: '#FFD700',
  },
  {
    type: 'knight_dispatch',
    label: 'Knight Swarm Dispatch',
    desc: 'Route task packet to targeted Cyber-Knight',
    rune: '⚔️',
    color: '#FF00FF',
  },
  {
    type: 'property_dispatch',
    label: 'Property / Tenant Action',
    desc: 'Create isomorphic work order / maintenance payload',
    rune: '🏢',
    color: '#38BDF8',
  },
  {
    type: 'client_navigation',
    label: 'Enclave UI Navigation',
    desc: 'Switch active workspace views or sub-dashboards',
    rune: '🧭',
    color: '#A855F7',
  },
  {
    type: 'speak_feedback',
    label: 'Voice Audio Confirmation',
    desc: 'Terse spoken reply via SpeechSynthesis engine',
    rune: '🎙️',
    color: '#10B981',
  },
];

const PRESET_PACKS = [
  {
    id: 'sovereign_executive',
    name: 'Sovereign Executive Pack',
    description: 'CEO briefings, calendar deconfliction, and priority inbox routing.',
    badge: 'EXECUTIVE',
    macros: [
      {
        name: 'Executive Morning Briefing',
        phrase: 'morning briefing',
        description:
          'Syncs ledger, dispatches CEO Malik for priority triage, and announces status.',
        category: 'operations' as MacroCategory,
        enabled: true,
        safetyTier: 'auto' as const,
        steps: [
          {
            id: 's1',
            type: 'kba_routine' as const,
            label: 'Sync KBA Ledger',
            payload: 'sync',
            delayMs: 0,
          },
          {
            id: 's2',
            type: 'knight_dispatch' as const,
            label: 'Dispatch CEO Malik',
            payload: 'prepare daily executive summary',
            knightId: 'CEO_001',
            delayMs: 200,
          },
          {
            id: 's3',
            type: 'speak_feedback' as const,
            label: 'Spoken confirmation',
            payload: 'Good morning Sovereign. Executive briefing dispatched.',
            delayMs: 400,
          },
        ],
      },
      {
        name: 'Calendar & Schedule Deconflict',
        phrase: 'schedule review',
        description:
          'Dispatches Chloe Chronos for schedule verification and client availability indexing.',
        category: 'knights' as MacroCategory,
        enabled: true,
        safetyTier: 'auto' as const,
        steps: [
          {
            id: 's1',
            type: 'knight_dispatch' as const,
            label: 'Dispatch CAL Chloe',
            payload: 'index availability for next 72 hours',
            knightId: 'CAL_002',
            delayMs: 0,
          },
          {
            id: 's2',
            type: 'speak_feedback' as const,
            label: 'Voice audio feedback',
            payload: 'Schedule indexed and verified.',
            delayMs: 300,
          },
        ],
      },
      {
        name: 'Priority Inbox Triage',
        phrase: 'triage inbox',
        description: 'Routes urgent inbound correspondence through Aiden Raven.',
        category: 'operations' as MacroCategory,
        enabled: true,
        safetyTier: 'auto' as const,
        steps: [
          {
            id: 's1',
            type: 'knight_dispatch' as const,
            label: 'Dispatch MAIL Aiden',
            payload: 'filter urgent priority threads',
            knightId: 'MAIL_003',
            delayMs: 0,
          },
          {
            id: 's2',
            type: 'speak_feedback' as const,
            label: 'Spoken reply',
            payload: 'Inbox triaged with high-priority flags.',
            delayMs: 200,
          },
        ],
      },
    ],
  },
  {
    id: 'citadel_security',
    name: 'Citadel Security & Audit Pack',
    description: 'High-assurance zero-trust audits, ChaCha20 rezeroing, and freeze protocols.',
    badge: 'SECURITY',
    macros: [
      {
        name: 'Citadel Perimeter Audit',
        phrase: 'audit citadel',
        description: 'Runs complete crypto-audit and inspects active capability leases.',
        category: 'security' as MacroCategory,
        enabled: true,
        safetyTier: 'auto' as const,
        steps: [
          {
            id: 's1',
            type: 'kba_routine' as const,
            label: 'KBA Security Audit',
            payload: 'audit',
            delayMs: 0,
          },
          {
            id: 's2',
            type: 'knight_dispatch' as const,
            label: 'Dispatch PROP Marcus',
            payload: 'inspect biometric vault boundaries',
            knightId: 'PROP_004',
            delayMs: 250,
          },
          {
            id: 's3',
            type: 'speak_feedback' as const,
            label: 'Spoken confirmation',
            payload: 'Citadel security integrity confirmed.',
            delayMs: 400,
          },
        ],
      },
      {
        name: 'Emergency Sovereign Lockdown',
        phrase: 'emergency freeze',
        description:
          'Freezes active sessions, requires human-in-the-loop confirmation before resumption.',
        category: 'security' as MacroCategory,
        enabled: true,
        safetyTier: 'hitl_confirm' as const,
        steps: [
          {
            id: 's1',
            type: 'kba_routine' as const,
            label: 'Rezero cryptographic registers',
            payload: 'rezero',
            delayMs: 0,
          },
          {
            id: 's2',
            type: 'speak_feedback' as const,
            label: 'Spoken alert',
            payload: 'Emergency lockdown engaged. HITL authorization required.',
            delayMs: 200,
          },
        ],
      },
    ],
  },
];

export function VoiceMacroConfig({
  className = '',
  onClose,
  initialCategory = 'all',
}: VoiceMacroConfigProps) {
  const {
    macros,
    activeExecution,
    executionLogs,
    createMacro,
    updateMacro,
    deleteMacro,
    toggleMacro,
    duplicateMacro,
    resetToDefaults,
    exportMacros,
    importMacros,
    executeMacro,
    matchMacro,
    clearLogs,
  } = useMacros();

  const { activeTenant } = useTenant();
  const highContrast = useCamelotStore((s) => s.highContrast);

  const [activeTab, setActiveTab] = useState<
    'mappings' | 'builder' | 'simulator' | 'packs' | 'logs' | 'enclave'
  >('mappings');
  const [isEnclavePopupOpen, setIsEnclavePopupOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MacroCategory | 'all'>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');

  // Inline Phrase Editing State
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null);
  const [tempPhraseValue, setTempPhraseValue] = useState<string>('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Live Acoustic Simulator State
  const [testPhrase, setTestPhrase] = useState('');
  const [simMatch, setSimMatch] = useState<Macro | null>(null);
  const [simExecuting, setSimExecuting] = useState(false);

  // Macro Step Builder State
  const [builderId, setBuilderId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhrase, setFormPhrase] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<MacroCategory>('custom');
  const [formSafetyTier, setFormSafetyTier] = useState<'auto' | 'hitl_confirm'>('auto');
  const [formSteps, setFormSteps] = useState<MacroActionStep[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-Save Middleware / Effect for Macro Builder Draft Form
  const builderSerializedDraft = useMemo(() => {
    if (!formName && !formPhrase && formSteps.length === 0) return '';
    return JSON.stringify({
      builderId,
      formName,
      formPhrase,
      formDescription,
      formCategory,
      formSafetyTier,
      formSteps,
    });
  }, [builderId, formName, formPhrase, formDescription, formCategory, formSafetyTier, formSteps]);

  const {
    autoSaveStatus: builderAutoSaveStatus,
    lastAutoSaveTime: builderLastAutoSaveTime,
    clearAutoSaveDraft: clearBuilderAutoSaveDraft,
  } = useMacroAutoSave(
    builderSerializedDraft,
    { macroId: builderId, macroTitle: formName || 'Macro Builder Draft' },
    {
      storageKey: 'camelot_macro_builder_autosave_data',
      metaKey: 'camelot_macro_builder_autosave_meta',
      debounceMs: 800,
      periodicIntervalMs: 10000,
      onRestore: (restoredJson) => {
        try {
          const parsed = JSON.parse(restoredJson);
          if (parsed && typeof parsed === 'object') {
            if (parsed.builderId) setBuilderId(parsed.builderId);
            if (parsed.formName) setFormName(parsed.formName);
            if (parsed.formPhrase) setFormPhrase(parsed.formPhrase);
            if (parsed.formDescription) setFormDescription(parsed.formDescription);
            if (parsed.formCategory) setFormCategory(parsed.formCategory);
            if (parsed.formSafetyTier) setFormSafetyTier(parsed.formSafetyTier);
            if (Array.isArray(parsed.formSteps)) setFormSteps(parsed.formSteps);
          }
        } catch {
          // Ignore invalid JSON draft
        }
      },
    },
  );

  // Filtered Macros
  const filteredMacros = useMemo(() => {
    return macros.filter((m) => {
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      const matchQuery =
        searchQuery.trim() === '' ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phrase.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [macros, selectedCategory, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = macros.length;
    const enabled = macros.filter((m) => m.enabled).length;
    const hitl = macros.filter((m) => m.safetyTier === 'hitl_confirm').length;
    const totalRuns = macros.reduce((acc, m) => acc + (m.executionCount || 0), 0);
    return { total, enabled, hitl, totalRuns };
  }, [macros]);

  // Initialize Builder for New Macro
  const handleOpenNewBuilder = () => {
    setBuilderId(null);
    setFormName('');
    setFormPhrase('');
    setFormDescription('');
    setFormCategory('custom');
    setFormSafetyTier('auto');
    setFormSteps([
      {
        id: `step_${Date.now()}_1`,
        type: 'voice_command',
        label: 'Initial Bifrost Command',
        payload: 'sync',
        delayMs: 0,
      },
    ]);
    setFormError(null);
    setActiveTab('builder');
  };

  // Initialize Builder for Existing Macro
  const handleEditMacro = (macro: Macro) => {
    setBuilderId(macro.id);
    setFormName(macro.name);
    setFormPhrase(macro.phrase);
    setFormDescription(macro.description);
    setFormCategory(macro.category);
    setFormSafetyTier(macro.safetyTier);
    setFormSteps([...macro.steps]);
    setFormError(null);
    setActiveTab('builder');
  };

  // Step Operations in Builder
  const handleAddStep = (type: ActionStepType = 'voice_command') => {
    const newStep: MacroActionStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      label: `New ${type.replace('_', ' ')}`,
      payload: type === 'kba_routine' ? 'sync' : type === 'speak_feedback' ? 'Acknowledged.' : '',
      knightId: type === 'knight_dispatch' ? 'CEO_001' : undefined,
      delayMs: 200,
    };
    setFormSteps((prev) => [...prev, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    setFormSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateStep = (index: number, updates: Partial<MacroActionStep>) => {
    setFormSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...updates } : step)));
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formSteps.length - 1) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    setFormSteps((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;
      return copy;
    });
  };

  // Save Macro Builder Form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Please provide a descriptive name for this macro.');
      return;
    }
    if (!formPhrase.trim()) {
      setFormError('Please define a spoken voice trigger phrase.');
      return;
    }
    if (formSteps.length === 0) {
      setFormError('A macro must contain at least one sequential execution step.');
      return;
    }

    const cleanPhrase = formPhrase.trim().toLowerCase();
    const conflict = macros.find(
      (m) => m.id !== builderId && m.phrase.trim().toLowerCase() === cleanPhrase,
    );
    if (conflict) {
      setFormError(`Voice trigger "${cleanPhrase}" is already mapped to "${conflict.name}".`);
      return;
    }

    if (builderId) {
      updateMacro(builderId, {
        name: formName.trim(),
        phrase: cleanPhrase,
        description: formDescription.trim(),
        category: formCategory,
        safetyTier: formSafetyTier,
        steps: formSteps,
      });
    } else {
      createMacro({
        name: formName.trim(),
        phrase: cleanPhrase,
        description: formDescription.trim(),
        category: formCategory,
        enabled: true,
        safetyTier: formSafetyTier,
        steps: formSteps,
      });
    }

    setFormError(null);
    clearBuilderAutoSaveDraft();
    setActiveTab('mappings');
  };

  // Quick Save Inline Spoken Phrase
  const handleSaveInlinePhrase = (macroId: string) => {
    if (!tempPhraseValue.trim()) {
      setEditingPhraseId(null);
      return;
    }
    const clean = tempPhraseValue.trim().toLowerCase();
    const conflict = macros.find(
      (m) => m.id !== macroId && m.phrase.trim().toLowerCase() === clean,
    );
    if (conflict) {
      setConflictWarning(
        `Trigger phrase "${clean}" conflicts with existing macro "${conflict.name}"`,
      );
      return;
    }
    updateMacro(macroId, { phrase: clean });
    setEditingPhraseId(null);
    setConflictWarning(null);
  };

  // Simulator phrase test
  const handleSimulatePhraseChange = (val: string) => {
    setTestPhrase(val);
    if (!val.trim()) {
      setSimMatch(null);
      return;
    }
    const matched = matchMacro(val);
    setSimMatch(matched);
  };

  const handleExecuteSimulation = async () => {
    if (!simMatch) return;
    setSimExecuting(true);
    await executeMacro(simMatch, 'voice');
    setSimExecuting(false);
  };

  // Install Preset Pack
  const handleInstallPack = (pack: (typeof PRESET_PACKS)[0]) => {
    let installed = 0;
    pack.macros.forEach((m) => {
      const exists = macros.find((ex) => ex.phrase.toLowerCase() === m.phrase.toLowerCase());
      if (!exists) {
        createMacro(m);
        installed++;
      }
    });
    speak(`${pack.name} applied. ${installed} voice phrases added to registry.`);
    setActiveTab('mappings');
  };

  // JSON Export / Download
  const handleExportJson = () => {
    const blob = new Blob([exportMacros()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `camelot_voice_macros_${activeTenant?.handle || 'sovereign'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="voice-macro-config-root"
      className={`relative flex h-full w-full flex-col overflow-hidden rounded-2xl border backdrop-blur-[24px] select-none text-white shadow-[0_0_50px_rgba(0,240,255,0.12)] ${className}`}
      style={{
        borderColor: highContrast ? '#FFFFFF' : '#00F0FF',
        borderWidth: '1px',
        backgroundColor: highContrast ? '#050505' : 'rgba(10, 10, 10, 0.92)',
      }}
      aria-label="Voice Macro Configuration Studio"
    >
      {/* Background Arthurian Luminescence */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-[#00F0FF]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#FFD700]/10 blur-[120px]" />

      {/* ── TOP HEADER & METRIC SUMMARY ── */}
      <div
        className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b p-5"
        style={{ borderColor: highContrast ? '#FFFFFF' : 'rgba(0, 240, 255, 0.15)' }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl border text-xl shadow-[0_0_20px_rgba(0,240,255,0.25)]"
            style={{
              borderColor: '#00F0FF',
              backgroundColor: 'rgba(0, 240, 255, 0.12)',
            }}
          >
            <span>🎙️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-base font-bold uppercase tracking-wider text-white">
                Voice Macro Configuration
              </h1>
              <span className="rounded border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-2 py-0.5 font-mono text-[9px] font-bold text-[#00F0FF]">
                ACOUSTIC_GATE_V4
              </span>
            </div>
            <p className="mt-0.5 text-xs text-white/50">
              Map spoken acoustic phrases to multi-step Arthurian system routines & Knight Swarm
              dispatches.
            </p>
          </div>
        </div>

        {/* Aggregate Counters */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5">
            <span className="text-[#00F0FF]">●</span>
            <span className="text-white/50">PHRASES:</span>
            <strong className="text-white">
              {metrics.enabled}/{metrics.total}
            </strong>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5">
            <span className="text-[#FFD700]">🛡️</span>
            <span className="text-white/50">HITL GATED:</span>
            <strong className="text-[#FFD700]">{metrics.hitl}</strong>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5">
            <span className="text-emerald-400">⚡</span>
            <span className="text-white/50">EXECUTIONS:</span>
            <strong className="text-emerald-300">{metrics.totalRuns}</strong>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-2 rounded-lg border border-white/10 bg-white/5 p-1.5 text-white/60 hover:border-white/30 hover:text-white"
              title="Close Voice Macro Config"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── ACTIVE MACRO EXECUTION BANNER ── */}
      {activeExecution && (
        <div className="relative z-10 flex items-center justify-between border-b border-[#00F0FF]/30 bg-[#00F0FF]/10 px-5 py-2.5 font-mono text-xs text-[#00F0FF] animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-base">⚡</span>
            <div>
              <span className="font-bold uppercase tracking-wider">
                EXECUTING ROUTINE: {activeExecution.macro.name}
              </span>
              <div className="text-[11px] text-white/70">
                Step {activeExecution.currentStep} of {activeExecution.totalSteps}:{' '}
                <span className="text-white font-semibold">{activeExecution.currentStepLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-black/60 border border-[#00F0FF]/30">
              <div
                className="h-full bg-[#00F0FF] transition-all duration-300"
                style={{
                  width: `${(activeExecution.currentStep / activeExecution.totalSteps) * 100}%`,
                }}
              />
            </div>
            <span className="text-[10px] font-bold">
              {Math.round((activeExecution.currentStep / activeExecution.totalSteps) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* ── SUB-NAVIGATION TABS ── */}
      <div
        className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3"
        style={{ borderColor: highContrast ? '#FFFFFF' : 'rgba(255, 255, 255, 0.08)' }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('mappings')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'mappings'
                ? 'border border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                : 'border border-white/5 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>📜</span>
            <span>Phrase Directory</span>
            <span className="ml-1 rounded bg-black/50 px-1.5 py-0.2 text-[10px] text-[#00F0FF]">
              {macros.length}
            </span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewBuilder}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'builder'
                ? 'border border-[#FFD700] bg-[#FFD700]/20 text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.25)]'
                : 'border border-white/5 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>➕</span>
            <span>{builderId ? 'Edit Macro' : 'Create Routine'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'simulator'
                ? 'border border-emerald-400 bg-emerald-400/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                : 'border border-white/5 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>🎯</span>
            <span>Acoustic Simulator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('packs')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'packs'
                ? 'border border-[#FF00FF] bg-[#FF00FF]/20 text-[#FF00FF] shadow-[0_0_15px_rgba(255,0,255,0.25)]'
                : 'border border-white/5 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>📦</span>
            <span>Preset Bundles</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'logs'
                ? 'border border-amber-400 bg-amber-400/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                : 'border border-white/5 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>📋</span>
            <span>Audit Logs</span>
            {executionLogs.length > 0 && (
              <span className="ml-1 rounded bg-black/50 px-1.5 py-0.2 text-[10px] text-amber-400">
                {executionLogs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('enclave');
              setIsEnclavePopupOpen(true);
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'enclave'
                ? 'border border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.25)]'
                : 'border border-white/5 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>🏰</span>
            <span>Sovereign Enclave</span>
            <span className="ml-1 rounded bg-[#00F0FF]/20 border border-[#00F0FF]/40 px-1.5 py-0.2 text-[9px] text-[#00F0FF] font-bold">
              STANDALONE
            </span>
          </button>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            title="Download full macro config JSON"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[11px] text-white/70 hover:border-[#00F0FF]/40 hover:bg-[#00F0FF]/10 hover:text-[#00F0FF] transition-all"
          >
            <span>⬇️</span>
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={resetToDefaults}
            title="Revert macros to Arthurian default state"
            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/20 px-2.5 py-1.5 font-mono text-[11px] text-red-300 hover:border-red-500/60 hover:bg-red-900/40 transition-all"
          >
            <span>↺</span>
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: PHRASE DIRECTORY & MAPPINGS ── */}
      {activeTab === 'mappings' && (
        <div className="relative z-10 flex flex-1 flex-col overflow-hidden p-5">
          {/* Filter Bar & Search */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {CATEGORY_TABS.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[11px] transition-all whitespace-nowrap ${
                      isSelected
                        ? 'border border-[#00F0FF] bg-[#00F0FF]/15 text-[#00F0FF] font-bold shadow-[0_0_10px_rgba(0,240,255,0.2)]'
                        : 'border border-white/5 bg-black/40 text-white/50 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span>{cat.rune}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[260px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/40">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by trigger phrase, macro name..."
                className="w-full rounded-xl border border-white/10 bg-black/50 py-1.5 pl-8 pr-3 font-mono text-xs text-white placeholder-white/30 focus:border-[#00F0FF] focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/40 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Conflict Warning */}
          {conflictWarning && (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-500/50 bg-amber-950/60 px-3 py-2 text-xs text-amber-200">
              <span>⚠️ {conflictWarning}</span>
              <button
                type="button"
                onClick={() => setConflictWarning(null)}
                className="text-[10px] text-amber-400 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Macro Cards List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {filteredMacros.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/30 p-6 text-center">
                <span className="text-3xl mb-2">🎙️</span>
                <p className="font-mono text-xs text-white/60">
                  No voice phrases match your filter criteria.
                </p>
                <button
                  type="button"
                  onClick={handleOpenNewBuilder}
                  className="mt-3 rounded-lg border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-3 py-1.5 font-mono text-xs text-[#00F0FF] hover:bg-[#00F0FF]/20"
                >
                  ➕ Create First Voice Macro
                </button>
              </div>
            ) : (
              filteredMacros.map((macro) => {
                const isEditingPhrase = editingPhraseId === macro.id;

                return (
                  <div
                    key={macro.id}
                    className={`group relative flex flex-col rounded-xl border p-4 transition-all duration-200 ${
                      macro.enabled
                        ? 'border-white/10 bg-black/40 hover:border-[#00F0FF]/40 hover:bg-black/60 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
                        : 'border-white/5 bg-black/20 opacity-60'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      {/* Left: Trigger & Identity */}
                      <div className="flex flex-1 flex-col gap-1.5 min-w-[280px]">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* Spoken Voice Trigger Pill / Inline Editor */}
                          {isEditingPhrase ? (
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                autoFocus
                                value={tempPhraseValue}
                                onChange={(e) => setTempPhraseValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlinePhrase(macro.id);
                                  if (e.key === 'Escape') setEditingPhraseId(null);
                                }}
                                className="rounded-lg border border-[#00F0FF] bg-black/80 px-2 py-0.5 font-mono text-xs font-bold text-[#00F0FF] focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlinePhrase(macro.id)}
                                className="rounded bg-[#00F0FF]/20 px-2 py-0.5 font-mono text-[10px] text-[#00F0FF] hover:bg-[#00F0FF]/40"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPhraseId(null)}
                                className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/50 hover:bg-white/20"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingPhraseId(macro.id);
                                setTempPhraseValue(macro.phrase);
                              }}
                              title="Click to edit spoken voice trigger phrase"
                              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#00F0FF]/40 bg-[#00F0FF]/10 px-2.5 py-1 font-mono text-xs font-bold text-[#00F0FF] hover:border-[#00F0FF] hover:bg-[#00F0FF]/20 shadow-[0_0_12px_rgba(0,240,255,0.15)] transition-all"
                            >
                              <span className="animate-pulse">🎙️</span>
                              <span>&quot;{macro.phrase}&quot;</span>
                              <span className="text-[10px] text-[#00F0FF]/50 group-hover:text-[#00F0FF]">
                                ✎
                              </span>
                            </div>
                          )}

                          <span className="font-mono text-xs font-bold text-white tracking-wide">
                            {macro.name}
                          </span>

                          <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/50">
                            {macro.category}
                          </span>

                          {macro.safetyTier === 'hitl_confirm' ? (
                            <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-amber-300">
                              🛡️ HITL REQUIRED
                            </span>
                          ) : (
                            <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-300">
                              ⚡ AUTO-EXECUTE
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-white/60 leading-relaxed">{macro.description}</p>
                      </div>

                      {/* Right: Quick Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => executeMacro(macro, 'ui_test')}
                          title="Execute Macro Sequence"
                          className="flex items-center gap-1 rounded-lg border border-[#00F0FF]/40 bg-[#00F0FF]/15 px-3 py-1.5 font-mono text-xs font-bold text-[#00F0FF] hover:bg-[#00F0FF]/30 shadow-[0_0_12px_rgba(0,240,255,0.2)] transition-all"
                        >
                          <span>▶</span>
                          <span>Test Run</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditMacro(macro)}
                          title="Edit in Step Builder"
                          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-xs text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white"
                        >
                          ✏️
                        </button>

                        <button
                          type="button"
                          onClick={() => duplicateMacro(macro.id)}
                          title="Duplicate Macro"
                          className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-xs text-white/70 hover:border-white/30 hover:bg-white/10 hover:text-white"
                        >
                          📋
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleMacro(macro.id)}
                          title={macro.enabled ? 'Disable Voice Trigger' : 'Enable Voice Trigger'}
                          className={`rounded-lg border p-1.5 font-mono text-xs transition-all ${
                            macro.enabled
                              ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                              : 'border-white/10 bg-white/5 text-white/40'
                          }`}
                        >
                          {macro.enabled ? 'ON' : 'OFF'}
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteMacro(macro.id)}
                          title="Delete Macro"
                          className="rounded-lg border border-red-500/20 bg-red-950/20 p-1.5 text-xs text-red-400 hover:border-red-500/50 hover:bg-red-900/30"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Step Pipeline Visualization */}
                    <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                        PIPELINE ({macro.steps.length} STEPS):
                      </span>
                      {macro.steps.map((step, idx) => (
                        <div
                          key={step.id || idx}
                          className="flex items-center gap-1 rounded-md border border-white/10 bg-black/60 px-2 py-1 font-mono text-[10px] text-white/70"
                        >
                          <span className="text-[#00F0FF] font-bold">{idx + 1}.</span>
                          <span>
                            {step.type === 'voice_command'
                              ? '⚡'
                              : step.type === 'kba_routine'
                                ? '🛡️'
                                : step.type === 'knight_dispatch'
                                  ? '⚔️'
                                  : step.type === 'property_dispatch'
                                    ? '🏢'
                                    : step.type === 'client_navigation'
                                      ? '🧭'
                                      : '🎙️'}
                          </span>
                          <span className="text-white font-medium">{step.label}</span>
                          {step.delayMs > 0 && (
                            <span className="text-[9px] text-white/40">+{step.delayMs}ms</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: STEP BUILDER / MACRO COMPOSER ── */}
      {activeTab === 'builder' && (
        <form
          onSubmit={handleSaveForm}
          className="relative z-10 flex flex-1 flex-col overflow-y-auto p-5 space-y-5"
        >
          {formError && (
            <div className="flex items-center justify-between rounded-xl border border-red-500/50 bg-red-950/70 p-3 font-mono text-xs text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <span>⚠️ {formError}</span>
              <button
                type="button"
                onClick={() => setFormError(null)}
                className="text-[10px] text-red-300 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Main Attributes */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Spoken Voice Trigger Phrase */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/5 p-4 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#00F0FF]">
                  🎙️ Spoken Voice Trigger Phrase
                </label>
                <span className="text-[10px] text-white/40 font-mono">Case-insensitive</span>
              </div>
              <input
                type="text"
                required
                value={formPhrase}
                onChange={(e) => setFormPhrase(e.target.value)}
                placeholder="e.g. morning briefing, audit citadel, emergency freeze"
                className="rounded-xl border border-[#00F0FF]/50 bg-black/70 px-3.5 py-2 font-mono text-sm font-bold text-[#00F0FF] placeholder-white/30 focus:border-[#00F0FF] focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
              />
              <p className="text-[11px] text-white/50">
                Spoken acoustic prompt that triggers this automated macro sequence.
              </p>
            </div>

            {/* Macro Title */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/40 p-4">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Macro Name
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Sovereign Morning Briefing"
                className="rounded-xl border border-white/15 bg-black/70 px-3.5 py-2 font-mono text-sm text-white placeholder-white/30 focus:border-[#00F0FF] focus:outline-none"
              />
              <p className="text-[11px] text-white/50">
                Descriptive title shown in logs and system dashboards.
              </p>
            </div>
          </div>

          {/* Description & Category & Governance */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/40 p-4 md:col-span-1">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Description
              </label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Details of what this sequence executes..."
                className="rounded-xl border border-white/15 bg-black/70 p-2.5 font-mono text-xs text-white placeholder-white/30 focus:border-[#00F0FF] focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/40 p-4">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as MacroCategory)}
                className="rounded-xl border border-white/15 bg-black/70 p-2.5 font-mono text-xs text-white focus:border-[#00F0FF] focus:outline-none"
              >
                <option value="operations">🏢 Operations</option>
                <option value="financial">💰 Financial</option>
                <option value="security">🛡️ Security</option>
                <option value="knights">⚔️ Knight Swarm</option>
                <option value="custom">✨ Custom</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/40 p-4">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Governance Safety Tier
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormSafetyTier('auto')}
                  className={`flex-1 rounded-lg border py-2 text-center font-mono text-[11px] font-bold uppercase tracking-wider transition-all ${
                    formSafetyTier === 'auto'
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'border-white/10 bg-black/40 text-white/40 hover:text-white'
                  }`}
                >
                  ⚡ Auto-Run
                </button>
                <button
                  type="button"
                  onClick={() => setFormSafetyTier('hitl_confirm')}
                  className={`flex-1 rounded-lg border py-2 text-center font-mono text-[11px] font-bold uppercase tracking-wider transition-all ${
                    formSafetyTier === 'hitl_confirm'
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                      : 'border-white/10 bg-black/40 text-white/40 hover:text-white'
                  }`}
                >
                  🛡️ HITL Confirm
                </button>
              </div>
            </div>
          </div>

          {/* Step Pipeline Builder */}
          <div className="rounded-xl border border-white/10 bg-black/50 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  Execution Step Sequence ({formSteps.length} Steps)
                </h3>
                <span className="text-[10px] text-white/40 font-mono">
                  Executed sequentially with custom delay
                </span>
              </div>

              {/* Add Step Quick Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {STEP_TYPE_OPTIONS.map((st) => (
                  <button
                    key={st.type}
                    type="button"
                    onClick={() => handleAddStep(st.type)}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-white/70 hover:border-[#00F0FF]/50 hover:bg-[#00F0FF]/10 hover:text-[#00F0FF] transition-all"
                  >
                    <span>{st.rune}</span>
                    <span>+ {st.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {formSteps.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-white/40 border border-dashed border-white/10 rounded-lg">
                  No steps configured. Click any &quot;+ Step&quot; button above to begin.
                </div>
              ) : (
                formSteps.map((step, idx) => (
                  <div
                    key={step.id || idx}
                    className="flex flex-col rounded-xl border border-white/10 bg-black/70 p-4 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#00F0FF]/20 font-mono text-xs font-bold text-[#00F0FF]">
                          {idx + 1}
                        </span>
                        <select
                          value={step.type}
                          onChange={(e) =>
                            handleUpdateStep(idx, { type: e.target.value as ActionStepType })
                          }
                          className="rounded-lg border border-white/15 bg-black/80 px-2 py-1 font-mono text-xs text-[#00F0FF] focus:outline-none"
                        >
                          {STEP_TYPE_OPTIONS.map((st) => (
                            <option key={st.type} value={st.type}>
                              {st.rune} {st.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStep(idx, 'up')}
                          className="rounded p-1 text-xs text-white/50 hover:text-white disabled:opacity-20"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === formSteps.length - 1}
                          onClick={() => handleMoveStep(idx, 'down')}
                          className="rounded p-1 text-xs text-white/50 hover:text-white disabled:opacity-20"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="rounded p-1 text-xs text-red-400 hover:bg-red-900/30"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="flex flex-col gap-1">
                        <label className="font-mono text-[10px] uppercase text-white/50">
                          Step Label
                        </label>
                        <input
                          type="text"
                          value={step.label}
                          onChange={(e) => handleUpdateStep(idx, { label: e.target.value })}
                          placeholder="e.g. Sync KBA Ledger"
                          className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 font-mono text-xs text-white focus:border-[#00F0FF] focus:outline-none"
                        />
                      </div>

                      <div className="flex flex-col gap-1 md:col-span-1">
                        <label className="font-mono text-[10px] uppercase text-white/50">
                          {step.type === 'knight_dispatch'
                            ? 'Target Knight & Directive'
                            : step.type === 'kba_routine'
                              ? 'Routine Action (sync/audit/rezero/forge)'
                              : step.type === 'speak_feedback'
                                ? 'Spoken Voice Audio Reply'
                                : 'Payload / Directive'}
                        </label>

                        {step.type === 'kba_routine' ? (
                          <select
                            value={step.payload}
                            onChange={(e) => handleUpdateStep(idx, { payload: e.target.value })}
                            className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 font-mono text-xs text-[#FFD700] focus:border-[#00F0FF] focus:outline-none"
                          >
                            <option value="sync">🛡️ sync — Biometric Ledger Sync</option>
                            <option value="audit">🔍 audit — Zero-Trust Security Audit</option>
                            <option value="rezero">⚡ rezero — Cryptographic Rezero</option>
                            <option value="forge">⚔️ forge — Instant Code Injection</option>
                          </select>
                        ) : step.type === 'knight_dispatch' ? (
                          <div className="flex gap-2">
                            <select
                              value={step.knightId || 'CEO_001'}
                              onChange={(e) => handleUpdateStep(idx, { knightId: e.target.value })}
                              className="w-1/2 rounded-lg border border-white/10 bg-black/60 px-2 py-1.5 font-mono text-[11px] text-[#FF00FF] focus:border-[#00F0FF] focus:outline-none"
                            >
                              {KNIGHTS_REGISTRY.map((k) => (
                                <option key={k.id} value={k.id}>
                                  {k.role} {k.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={step.payload}
                              onChange={(e) => handleUpdateStep(idx, { payload: e.target.value })}
                              placeholder="Task directive..."
                              className="w-1/2 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 font-mono text-xs text-white focus:border-[#00F0FF] focus:outline-none"
                            />
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={step.payload}
                            onChange={(e) => handleUpdateStep(idx, { payload: e.target.value })}
                            placeholder={
                              step.type === 'speak_feedback'
                                ? 'Spoken confirmation sentence...'
                                : 'Command payload string...'
                            }
                            className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 font-mono text-xs text-white focus:border-[#00F0FF] focus:outline-none"
                          />
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="font-mono text-[10px] uppercase text-white/50">
                          Delay Offset (ms)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={5000}
                          step={50}
                          value={step.delayMs}
                          onChange={(e) =>
                            handleUpdateStep(idx, { delayMs: Number(e.target.value) || 0 })
                          }
                          className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 font-mono text-xs text-white focus:border-[#00F0FF] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('mappings')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs text-white/70 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl border border-[#00F0FF] bg-[#00F0FF]/20 px-6 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[#00F0FF] shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:bg-[#00F0FF]/30 transition-all"
            >
              <span>💾</span>
              <span>{builderId ? 'Save Macro Changes' : 'Create Voice Macro'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ── TAB 3: ACOUSTIC SIMULATOR / TESTER ── */}
      {activeTab === 'simulator' && (
        <div className="relative z-10 flex flex-1 flex-col overflow-y-auto p-6 space-y-6">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-2">
              <span>🎯</span> Acoustic Voice Simulator & Match Tester
            </h2>
            <p className="mt-1 text-xs text-white/60">
              Type or speak test phrases to simulate client acoustic recognition against the active
              macro index.
            </p>

            <div className="mt-4 flex gap-3">
              <input
                type="text"
                value={testPhrase}
                onChange={(e) => handleSimulatePhraseChange(e.target.value)}
                placeholder="Type a spoken phrase, e.g. 'morning briefing', 'freeze citadel'..."
                className="flex-1 rounded-xl border border-emerald-500/40 bg-black/70 px-4 py-2.5 font-mono text-sm text-emerald-200 placeholder-white/30 focus:border-emerald-300 focus:outline-none"
              />
              <button
                type="button"
                disabled={!simMatch || simExecuting}
                onClick={handleExecuteSimulation}
                className="flex items-center gap-2 rounded-xl border border-emerald-400 bg-emerald-500/30 px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-emerald-200 hover:bg-emerald-500/50 disabled:opacity-30 transition-all"
              >
                <span>{simExecuting ? '⏳' : '⚡'}</span>
                <span>{simExecuting ? 'Running...' : 'Execute Match'}</span>
              </button>
            </div>
          </div>

          {/* Simulation Match Card */}
          {testPhrase.trim() && (
            <div className="rounded-xl border border-white/10 bg-black/60 p-5">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white/50 mb-3">
                MATCH EVALUATION:
              </h3>
              {simMatch ? (
                <div className="flex flex-col gap-3 rounded-lg border border-emerald-500/40 bg-emerald-950/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✅</span>
                      <span className="font-mono text-sm font-bold text-emerald-300">
                        MATCHED: &quot;{simMatch.phrase}&quot; → {simMatch.name}
                      </span>
                    </div>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                      CONFIDENCE: 100%
                    </span>
                  </div>

                  <p className="text-xs text-white/70">{simMatch.description}</p>

                  <div className="flex items-center gap-2 font-mono text-xs text-white/50 pt-2 border-t border-emerald-500/20">
                    <span>STEPS: {simMatch.steps.length}</span>
                    <span>•</span>
                    <span>SAFETY: {simMatch.safetyTier.toUpperCase()}</span>
                    <span>•</span>
                    <span>CATEGORY: {simMatch.category}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/30 p-4 text-xs font-mono text-amber-200">
                  <span>⚠️</span>
                  <span>No exact or fuzzy voice macro matched for &quot;{testPhrase}&quot;.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 4: PRESET BUNDLES ── */}
      {activeTab === 'packs' && (
        <div className="relative z-10 flex flex-1 flex-col overflow-y-auto p-6 space-y-4">
          <div className="border-b border-white/10 pb-3">
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-white">
              Sovereign Preset Macro Packs
            </h2>
            <p className="text-xs text-white/50">
              Install curated bundles of voice-mapped workflows for executive operations, defense,
              and swarm control.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {PRESET_PACKS.map((pack) => (
              <div
                key={pack.id}
                className="flex flex-col justify-between rounded-xl border border-[#FF00FF]/30 bg-black/60 p-5 shadow-[0_0_25px_rgba(255,0,255,0.1)] space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-[#FF00FF]/20 px-2 py-0.5 font-mono text-[9px] font-bold text-[#FF00FF]">
                      {pack.badge}
                    </span>
                    <span className="font-mono text-xs text-white/50">
                      {pack.macros.length} Macros
                    </span>
                  </div>
                  <h3 className="mt-2 font-mono text-base font-bold text-white">{pack.name}</h3>
                  <p className="mt-1 text-xs text-white/60">{pack.description}</p>
                </div>

                <div className="space-y-1.5 border-t border-white/10 pt-3">
                  {pack.macros.map((m) => (
                    <div
                      key={m.phrase}
                      className="flex items-center justify-between font-mono text-[11px]"
                    >
                      <span className="text-[#00F0FF]">&quot;{m.phrase}&quot;</span>
                      <span className="text-white/40 truncate max-w-[180px]">{m.name}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleInstallPack(pack)}
                  className="w-full rounded-xl border border-[#FF00FF] bg-[#FF00FF]/20 py-2 text-center font-mono text-xs font-bold uppercase tracking-wider text-[#FF00FF] hover:bg-[#FF00FF]/30 transition-all"
                >
                  ⚡ Install {pack.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 5: COMMAND LOG & AUDIT ── */}
      {activeTab === 'logs' && (
        <div className="relative z-10 flex flex-1 flex-col overflow-y-auto p-5">
          <CommandLog maxHeight="max-h-[600px]" showQuickExecute={true} />
        </div>
      )}

      {/* ── TAB 6: SOVEREIGN ENCLAVE STANDALONE TAB ── */}
      {activeTab === 'enclave' && (
        <div className="relative z-10 flex flex-1 flex-col overflow-y-auto">
          <SovereignEnclaveStandaloneView
            isPopup={false}
            onLaunchPopup={() => setIsEnclavePopupOpen(true)}
          />
        </div>
      )}

      {/* ── STANDALONE POP-UP OVERLAY WINDOW ── */}
      {isEnclavePopupOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 sm:p-8 animate-in fade-in duration-200">
          <SovereignEnclaveStandaloneView
            isPopup={true}
            onMinimize={() => setIsEnclavePopupOpen(false)}
          />
        </div>
      )}
    </div>
  );
}

export default VoiceMacroConfig;
