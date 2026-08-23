'use client';

import type React from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { KNIGHTS_REGISTRY } from '../../actions/coreRegistry';
import { useBifrost } from '../../context/BifrostContext';
import { useMacros } from '../../context/MacroContext';
import { useTenant } from '../../context/TenantContext';
import { speak } from '../../lib/voice';
import type { ActionStepType, Macro, MacroActionStep, MacroCategory } from '../../types/macro';
import { SovereignEnclaveStandaloneView } from '../hud/SovereignEnclaveStandaloneView';

const CATEGORIES: { id: MacroCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All Routines', icon: '⚡' },
  { id: 'operations', label: 'Operations', icon: '🏢' },
  { id: 'financial', label: 'Financial', icon: '💰' },
  { id: 'security', label: 'Security', icon: '🛡️' },
  { id: 'knights', label: 'Knights Swarm', icon: '⚔️' },
  { id: 'custom', label: 'Custom', icon: '✨' },
];

const STEP_TYPES: { type: ActionStepType; label: string; desc: string; icon: string }[] = [
  {
    type: 'voice_command',
    label: 'Bifrost Voice Command',
    desc: 'Raw voice dispatch to server',
    icon: '⚡',
  },
  {
    type: 'kba_routine',
    label: 'KBA Cartridge Routine',
    desc: 'Sovereign KBA sync/audit/rezero/forge',
    icon: '🛡️',
  },
  {
    type: 'knight_dispatch',
    label: 'Knight Swarm Dispatch',
    desc: 'Route task packet to specific Knight',
    icon: '⚔️',
  },
  {
    type: 'property_dispatch',
    label: 'Property / Tenant Action',
    desc: 'Isomorphic maintenance work order',
    icon: '🏢',
  },
  {
    type: 'client_navigation',
    label: 'Enclave UI Navigation',
    desc: 'Switch active workspace tab',
    icon: '🧭',
  },
  {
    type: 'speak_feedback',
    label: 'Voice Audio Confirmation',
    desc: 'Terse spoken reply via SpeechSynthesis',
    icon: '🎙️',
  },
];

const PRESET_PACKS: {
  id: string;
  name: string;
  description: string;
  count: number;
  macros: Omit<Macro, 'id' | 'createdAt' | 'updatedAt' | 'executionCount'>[];
}[] = [
  {
    id: 'sovereign_executive',
    name: 'Sovereign Executive Pack',
    description: 'CEO briefings, calendar deconfliction, and priority mail dispatch.',
    count: 3,
    macros: [
      {
        name: 'Executive Morning Briefing',
        phrase: 'morning briefing',
        description:
          'Syncs ledger, dispatches CEO Malik for priority triage, and announces status.',
        category: 'operations',
        enabled: true,
        safetyTier: 'auto',
        steps: [
          { id: 's1', type: 'kba_routine', label: 'Sync KBA Ledger', payload: 'sync', delayMs: 0 },
          {
            id: 's2',
            type: 'knight_dispatch',
            label: 'Dispatch CEO Malik',
            payload: 'prepare daily executive summary',
            knightId: 'CEO_001',
            delayMs: 200,
          },
          {
            id: 's3',
            type: 'speak_feedback',
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
        category: 'knights',
        enabled: true,
        safetyTier: 'auto',
        steps: [
          {
            id: 's1',
            type: 'knight_dispatch',
            label: 'Dispatch CAL Chloe',
            payload: 'index availability for next 72 hours',
            knightId: 'CAL_002',
            delayMs: 0,
          },
          {
            id: 's2',
            type: 'speak_feedback',
            label: 'Voice audio feedback',
            payload: 'Schedule indexed and verified.',
            delayMs: 300,
          },
        ],
      },
      {
        name: 'Emergency Priority Mail Filter',
        phrase: 'triage inbox',
        description: 'Routes urgent inbound correspondence through Aiden Raven.',
        category: 'operations',
        enabled: true,
        safetyTier: 'auto',
        steps: [
          {
            id: 's1',
            type: 'knight_dispatch',
            label: 'Dispatch MAIL Aiden',
            payload: 'filter urgent priority threads',
            knightId: 'MAIL_003',
            delayMs: 0,
          },
          {
            id: 's2',
            type: 'speak_feedback',
            label: 'Spoken reply',
            payload: 'Inbox triaged with high-priority flags.',
            delayMs: 200,
          },
        ],
      },
    ],
  },
  {
    id: 'security_citadel',
    name: 'Citadel Security Pack',
    description: 'High-security zero-trust audits, ChaCha20 rezeroing, and freeze protocols.',
    count: 2,
    macros: [
      {
        name: 'Citadel Perimeter Audit',
        phrase: 'audit citadel',
        description: 'Runs complete crypto-audit and inspects active capability leases.',
        category: 'security',
        enabled: true,
        safetyTier: 'auto',
        steps: [
          {
            id: 's1',
            type: 'kba_routine',
            label: 'KBA Security Audit',
            payload: 'audit',
            delayMs: 0,
          },
          {
            id: 's2',
            type: 'knight_dispatch',
            label: 'Dispatch PROP Marcus',
            payload: 'inspect biometric vault boundaries',
            knightId: 'PROP_004',
            delayMs: 250,
          },
          {
            id: 's3',
            type: 'speak_feedback',
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
        category: 'security',
        enabled: true,
        safetyTier: 'hitl_confirm',
        steps: [
          {
            id: 's1',
            type: 'kba_routine',
            label: 'Rezero cryptographic registers',
            payload: 'rezero',
            delayMs: 0,
          },
          {
            id: 's2',
            type: 'speak_feedback',
            label: 'Spoken alert',
            payload: 'Emergency lockdown engaged. HITL authorization required.',
            delayMs: 200,
          },
        ],
      },
    ],
  },
];

export function VoiceMacroConfigPanel() {
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
  const { sendVoiceCommand } = useBifrost();

  const [activeTab, setActiveTab] = useState<
    'mappings' | 'builder' | 'tester' | 'presets' | 'logs' | 'enclave'
  >('mappings');
  const [isEnclavePopupOpen, setIsEnclavePopupOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MacroCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inline editing of voice phrases
  const [editingPhraseId, setEditingPhraseId] = useState<string | null>(null);
  const [tempPhraseValue, setTempPhraseValue] = useState<string>('');
  const [phraseConflictWarning, setPhraseConflictWarning] = useState<string | null>(null);

  // Live Tester state
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<{
    matched: Macro | null;
    normalizedInput: string;
    isExecuting: boolean;
  }>({
    matched: null,
    normalizedInput: '',
    isExecuting: false,
  });

  // Builder Form State
  const [builderId, setBuilderId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phrase, setPhrase] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MacroCategory>('custom');
  const [safetyTier, setSafetyTier] = useState<'auto' | 'hitl_confirm'>('auto');
  const [steps, setSteps] = useState<MacroActionStep[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [jsonImportString, setJsonImportString] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const importFileRef = useRef<HTMLInputElement>(null);

  // Filtered macros
  const filteredMacros = useMemo(() => {
    return macros.filter((m) => {
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      const matchSearch =
        searchQuery.trim() === '' ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phrase.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [macros, selectedCategory, searchQuery]);

  // Total stats
  const stats = useMemo(() => {
    const total = macros.length;
    const enabled = macros.filter((m) => m.enabled).length;
    const hitl = macros.filter((m) => m.safetyTier === 'hitl_confirm').length;
    const totalExecutions = macros.reduce((acc, m) => acc + (m.executionCount || 0), 0);
    return { total, enabled, hitl, totalExecutions };
  }, [macros]);

  // Start editing a macro in builder
  const startEditMacro = (macro: Macro) => {
    setBuilderId(macro.id);
    setName(macro.name);
    setPhrase(macro.phrase);
    setDescription(macro.description);
    setCategory(macro.category);
    setSafetyTier(macro.safetyTier);
    setSteps([...macro.steps]);
    setFormError(null);
    setActiveTab('builder');
  };

  const startNewMacro = () => {
    setBuilderId(null);
    setName('');
    setPhrase('');
    setDescription('');
    setCategory('custom');
    setSafetyTier('auto');
    setSteps([
      {
        id: `step_${Date.now()}_1`,
        type: 'voice_command',
        label: 'Initial Command',
        payload: 'sync',
        delayMs: 0,
      },
    ]);
    setFormError(null);
    setActiveTab('builder');
  };

  // Add step to builder
  const addStep = (type: ActionStepType = 'voice_command') => {
    const newStep: MacroActionStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      label: `New ${type.replace('_', ' ')}`,
      payload: type === 'kba_routine' ? 'sync' : type === 'speak_feedback' ? 'Acknowledged' : '',
      knightId: type === 'knight_dispatch' ? 'CEO_001' : undefined,
      delayMs: 200,
    };
    setSteps((prev) => [...prev, newStep]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, updates: Partial<MacroActionStep>) => {
    setSteps((prev) => prev.map((step, i) => (i === index ? { ...step, ...updates } : step)));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    setSteps((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  // Save builder form
  const handleSaveMacro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please provide a name for this macro.');
      return;
    }
    if (!phrase.trim()) {
      setFormError('Please provide a voice trigger phrase (e.g. "morning briefing").');
      return;
    }
    if (steps.length === 0) {
      setFormError('Please add at least one execution step.');
      return;
    }

    const cleanPhrase = phrase.trim().toLowerCase();

    // Check for duplicate phrase in other macros
    const duplicate = macros.find(
      (m) => m.id !== builderId && m.phrase.trim().toLowerCase() === cleanPhrase,
    );
    if (duplicate) {
      setFormError(`Trigger phrase "${cleanPhrase}" is already mapped to "${duplicate.name}".`);
      return;
    }

    if (builderId) {
      updateMacro(builderId, {
        name: name.trim(),
        phrase: cleanPhrase,
        description: description.trim(),
        category,
        safetyTier,
        steps,
      });
    } else {
      createMacro({
        name: name.trim(),
        phrase: cleanPhrase,
        description: description.trim(),
        category,
        enabled: true,
        safetyTier,
        steps,
      });
    }

    setFormError(null);
    setActiveTab('mappings');
  };

  // Handle inline phrase edit
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
      setPhraseConflictWarning(`"${clean}" conflicts with "${conflict.name}"`);
      return;
    }
    updateMacro(macroId, { phrase: clean });
    setEditingPhraseId(null);
    setPhraseConflictWarning(null);
  };

  // Live phrase testing
  const handleTestPhraseChange = (val: string) => {
    setTestInput(val);
    if (!val.trim()) {
      setTestResult({ matched: null, normalizedInput: '', isExecuting: false });
      return;
    }
    const matched = matchMacro(val);
    setTestResult({
      matched,
      normalizedInput: val
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .trim(),
      isExecuting: false,
    });
  };

  const handleExecuteTest = async () => {
    if (!testResult.matched) return;
    setTestResult((prev) => ({ ...prev, isExecuting: true }));
    await executeMacro(testResult.matched, 'voice');
    setTestResult((prev) => ({ ...prev, isExecuting: false }));
  };

  // Preset Pack install
  const handleInstallPreset = (preset: (typeof PRESET_PACKS)[0]) => {
    let installed = 0;
    preset.macros.forEach((m) => {
      // check if exists
      const existing = macros.find((ex) => ex.phrase.toLowerCase() === m.phrase.toLowerCase());
      if (!existing) {
        createMacro(m);
        installed++;
      }
    });
    speak(`${preset.name} installed. ${installed} new voice phrases mapped.`);
    setActiveTab('mappings');
  };

  // Export JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(exportMacros());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `camelot_voice_macros_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON from textarea
  const handleImportText = () => {
    if (!jsonImportString.trim()) return;
    const success = importMacros(jsonImportString);
    if (success) {
      setImportStatus('Voice macros imported successfully.');
      setJsonImportString('');
      setTimeout(() => setImportStatus(null), 3000);
      setActiveTab('mappings');
    } else {
      setImportStatus('Failed to parse JSON. Please verify the format.');
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#0A0714]/95 p-6 text-white backdrop-blur-2xl shadow-[0_0_50px_rgba(0,240,255,0.15)]">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-cyan-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-[#FFD700]/10 blur-[100px]" />

      {/* ── HEADER & SUMMARY STATS ── */}
      <div className="relative z-10 mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-2xl shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <span>🎙️</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-lg font-bold uppercase tracking-wider text-white">
                Voice Command & Macro Config
              </h1>
              <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 font-mono text-[9px] font-bold text-cyan-300">
                CAPSULE_ZONE_0
              </span>
            </div>
            <p className="mt-0.5 text-xs text-white/50">
              Map spoken acoustic phrases to multi-step sovereign system macros & Knight swarm
              routines.
            </p>
          </div>
        </div>

        {/* Global Stats Badges */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5">
            <span className="text-cyan-400">●</span>
            <span className="text-white/60">ACTIVE PHRASES:</span>
            <strong className="text-white">
              {stats.enabled}/{stats.total}
            </strong>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5">
            <span className="text-amber-400">🛡️</span>
            <span className="text-white/60">HITL GATED:</span>
            <strong className="text-amber-300">{stats.hitl}</strong>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5">
            <span className="text-emerald-400">⚡</span>
            <span className="text-white/60">TOTAL RUNS:</span>
            <strong className="text-emerald-300">{stats.totalExecutions}</strong>
          </div>
        </div>
      </div>

      {/* ── EXECUTION PROGRESS PILL IF ACTIVE ── */}
      {activeExecution && (
        <div className="relative z-10 mb-4 flex items-center justify-between rounded-xl border border-cyan-400/50 bg-cyan-950/60 p-3 font-mono text-xs text-cyan-200 shadow-[0_0_20px_rgba(0,240,255,0.2)] animate-pulse">
          <div className="flex items-center gap-3">
            <span className="text-lg">⚡</span>
            <div>
              <span className="font-bold uppercase tracking-wider text-cyan-300">
                EXECUTING MACRO: {activeExecution.macro.name}
              </span>
              <div className="text-[11px] text-white/70">
                Step {activeExecution.currentStep}/{activeExecution.totalSteps}:{' '}
                <span className="text-white font-semibold">{activeExecution.currentStepLabel}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-black/50">
              <div
                className="h-full bg-cyan-400 transition-all duration-300"
                style={{
                  width: `${(activeExecution.currentStep / activeExecution.totalSteps) * 100}%`,
                }}
              />
            </div>
            <span className="text-[10px] text-cyan-300">
              {Math.round((activeExecution.currentStep / activeExecution.totalSteps) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* ── NAVIGATION TABS ── */}
      <div className="relative z-10 mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('mappings')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'mappings'
                ? 'border border-cyan-400 bg-cyan-400/20 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
                : 'border border-white/5 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>📜</span>
            <span>Phrase Mappings</span>
            <span className="ml-1 rounded bg-black/40 px-1.5 py-0.2 text-[10px] text-cyan-400">
              {macros.length}
            </span>
          </button>

          <button
            type="button"
            onClick={startNewMacro}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'builder'
                ? 'border border-[#FFD700] bg-[#FFD700]/20 text-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.2)]'
                : 'border border-white/5 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>➕</span>
            <span>{builderId ? 'Edit Macro' : 'Create Macro'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tester')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'tester'
                ? 'border border-emerald-400 bg-emerald-400/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'border border-white/5 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>🎯</span>
            <span>Voice Simulator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'presets'
                ? 'border border-[#9D4EDD] bg-[#9D4EDD]/20 text-purple-300 shadow-[0_0_15px_rgba(157,78,221,0.2)]'
                : 'border border-white/5 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>📦</span>
            <span>Preset Packs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'logs'
                ? 'border border-amber-400 bg-amber-400/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'border border-white/5 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
            }`}
          >
            <span>📋</span>
            <span>Execution Logs</span>
            {executionLogs.length > 0 && (
              <span className="ml-1 rounded bg-black/40 px-1.5 py-0.2 text-[10px] text-amber-400">
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
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === 'enclave'
                ? 'border border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.2)]'
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

        {/* Global Toolbar buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportJson}
            title="Export all macros as JSON"
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 font-mono text-[11px] text-white/70 hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:text-cyan-300 transition-all"
          >
            <span>⬇️</span>
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={resetToDefaults}
            title="Reset all macros to Sovereign Defaults"
            className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-950/20 px-2.5 py-1.5 font-mono text-[11px] text-red-300 hover:border-red-400/50 hover:bg-red-900/30 transition-all"
          >
            <span>↺</span>
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: PHRASE MAPPINGS TABLE & DIRECTORY ── */}
      {activeTab === 'mappings' && (
        <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
          {/* Filter & Search Bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-[11px] transition-all whitespace-nowrap ${
                      isSelected
                        ? 'border border-cyan-400/60 bg-cyan-400/15 text-cyan-300 font-bold'
                        : 'border border-white/5 bg-black/40 text-white/50 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/40">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search phrase, routine name..."
                className="w-full rounded-xl border border-white/10 bg-black/50 py-1.5 pl-8 pr-3 font-mono text-xs text-white placeholder-white/30 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
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

          {/* Conflict Warning banner if any */}
          {phraseConflictWarning && (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-500/50 bg-amber-950/60 px-3 py-2 text-xs text-amber-200">
              <span>⚠️ Warning: {phraseConflictWarning}</span>
              <button
                type="button"
                onClick={() => setPhraseConflictWarning(null)}
                className="text-[10px] text-amber-400 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Macros List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            {filteredMacros.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/30 p-6 text-center">
                <span className="text-3xl mb-2">🎙️</span>
                <p className="font-mono text-xs text-white/60">
                  No voice-mapped macros match your filter.
                </p>
                <button
                  type="button"
                  onClick={startNewMacro}
                  className="mt-3 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 font-mono text-xs text-cyan-300 hover:bg-cyan-400/20"
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
                        ? 'border-white/10 bg-black/40 hover:border-cyan-500/40 hover:bg-black/60 shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
                        : 'border-white/5 bg-black/20 opacity-60'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      {/* Left: Phrase Trigger & Name */}
                      <div className="flex flex-1 flex-col gap-1.5 min-w-[280px]">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* Acoustic Trigger Phrase Badge / Inline Editor */}
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
                                className="rounded-lg border border-cyan-400 bg-black/80 px-2 py-0.5 font-mono text-xs font-bold text-cyan-300 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveInlinePhrase(macro.id)}
                                className="rounded bg-cyan-400/20 px-2 py-0.5 font-mono text-[10px] text-cyan-300 hover:bg-cyan-400/40"
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
                              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-950/40 px-2.5 py-1 font-mono text-xs font-bold text-cyan-300 hover:border-cyan-300 hover:bg-cyan-900/50 shadow-[0_0_10px_rgba(0,240,255,0.15)] transition-all"
                            >
                              <span className="animate-pulse">🎙️</span>
                              <span>&quot;{macro.phrase}&quot;</span>
                              <span className="text-[10px] text-cyan-400/50 group-hover:text-cyan-300">
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

                      {/* Right: Actions (Test, Edit, Toggle, Duplicate, Delete) */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => executeMacro(macro, 'ui_test')}
                          title="Execute Macro Sequence"
                          className="flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-400/15 px-3 py-1.5 font-mono text-xs font-bold text-cyan-300 hover:bg-cyan-400/30 shadow-[0_0_12px_rgba(0,240,255,0.2)] transition-all"
                        >
                          <span>▶</span>
                          <span>Test Trigger</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => startEditMacro(macro)}
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
                          <span className="text-cyan-400 font-bold">{idx + 1}.</span>
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

      {/* ── TAB 2: STEP BUILDER / MACRO CREATOR ── */}
      {activeTab === 'builder' && (
        <form
          onSubmit={handleSaveMacro}
          className="relative z-10 flex flex-1 flex-col overflow-y-auto pr-2 space-y-5"
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

          {/* Main Attributes Row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Voice Trigger Phrase (Primary) */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-950/20 p-4 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
              <div className="flex items-center justify-between">
                <label className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300">
                  🎙️ Spoken Voice Trigger Phrase
                </label>
                <span className="text-[10px] text-white/40 font-mono">Case-insensitive</span>
              </div>
              <input
                type="text"
                required
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder="e.g. morning briefing, emergency freeze, audit citadel"
                className="rounded-xl border border-cyan-400/50 bg-black/70 px-3.5 py-2 font-mono text-sm font-bold text-cyan-200 placeholder-white/30 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-300"
              />
              <p className="text-[11px] text-white/50">
                Spoken acoustic prompt that triggers this automated macro sequence.
              </p>
            </div>

            {/* Macro Name */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/40 p-4">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Macro Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Executive Morning Briefing"
                className="rounded-xl border border-white/15 bg-black/70 px-3.5 py-2 font-mono text-sm text-white placeholder-white/30 focus:border-cyan-400 focus:outline-none"
              />
              <p className="text-[11px] text-white/50">
                Descriptive title shown in logs and system dashboards.
              </p>
            </div>
          </div>

          {/* Description & Category & Safety */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Description */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/40 p-4 md:col-span-1">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of what this sequence executes..."
                className="rounded-xl border border-white/15 bg-black/70 p-2.5 font-mono text-xs text-white placeholder-white/30 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/40 p-4">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MacroCategory)}
                className="rounded-xl border border-white/15 bg-black/70 p-2.5 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
              >
                <option value="operations">🏢 Operations</option>
                <option value="financial">💰 Financial</option>
                <option value="security">🛡️ Security</option>
                <option value="knights">⚔️ Knights Swarm</option>
                <option value="custom">✨ Custom</option>
              </select>
            </div>

            {/* Safety Tier */}
            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-black/40 p-4">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Governance Safety Tier
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSafetyTier('auto')}
                  className={`flex-1 rounded-lg border py-2 text-center font-mono text-[11px] font-bold uppercase tracking-wider transition-all ${
                    safetyTier === 'auto'
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'border-white/10 bg-black/40 text-white/40 hover:text-white'
                  }`}
                >
                  ⚡ Auto-Run
                </button>
                <button
                  type="button"
                  onClick={() => setSafetyTier('hitl_confirm')}
                  className={`flex-1 rounded-lg border py-2 text-center font-mono text-[11px] font-bold uppercase tracking-wider transition-all ${
                    safetyTier === 'hitl_confirm'
                      ? 'border-amber-500 bg-amber-500/20 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                      : 'border-white/10 bg-black/40 text-white/40 hover:text-white'
                  }`}
                >
                  🛡️ HITL Confirm
                </button>
              </div>
            </div>
          </div>

          {/* ── STEP PIPELINE BUILDER ── */}
          <div className="rounded-xl border border-white/10 bg-black/50 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  Execution Step Sequence ({steps.length} Steps)
                </h3>
                <span className="text-[10px] text-white/40 font-mono">
                  Executed sequentially with custom delay
                </span>
              </div>

              {/* Add Step Quick Buttons */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {STEP_TYPES.map((st) => (
                  <button
                    key={st.type}
                    type="button"
                    onClick={() => addStep(st.type)}
                    className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] text-white/70 hover:border-cyan-400/50 hover:bg-cyan-400/10 hover:text-cyan-300 transition-all"
                  >
                    <span>{st.icon}</span>
                    <span>+ {st.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Steps Container */}
            <div className="space-y-3">
              {steps.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-white/40 border border-dashed border-white/10 rounded-lg">
                  No steps in pipeline. Click any &quot;+ Step&quot; button above to begin.
                </div>
              ) : (
                steps.map((step, idx) => (
                  <div
                    key={step.id || idx}
                    className="flex flex-col rounded-xl border border-white/10 bg-[#120D22]/80 p-4 transition-all space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-400/20 font-mono text-xs font-bold text-cyan-300">
                          {idx + 1}
                        </span>
                        <select
                          value={step.type}
                          onChange={(e) =>
                            updateStep(idx, { type: e.target.value as ActionStepType })
                          }
                          className="rounded-lg border border-white/15 bg-black/80 px-2 py-1 font-mono text-xs text-cyan-300 focus:outline-none"
                        >
                          {STEP_TYPES.map((st) => (
                            <option key={st.type} value={st.type}>
                              {st.icon} {st.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveStep(idx, 'up')}
                          className="rounded p-1 text-xs text-white/50 hover:text-white disabled:opacity-20"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === steps.length - 1}
                          onClick={() => moveStep(idx, 'down')}
                          className="rounded p-1 text-xs text-white/50 hover:text-white disabled:opacity-20"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStep(idx)}
                          className="rounded p-1 text-xs text-red-400 hover:bg-red-900/30"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      {/* Step Label */}
                      <div className="flex flex-col gap-1">
                        <label className="font-mono text-[10px] uppercase text-white/50">
                          Step Label
                        </label>
                        <input
                          type="text"
                          value={step.label}
                          onChange={(e) => updateStep(idx, { label: e.target.value })}
                          placeholder="e.g. Sync KBA Ledger"
                          className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                        />
                      </div>

                      {/* Payload input based on type */}
                      <div className="flex flex-col gap-1 md:col-span-1">
                        <label className="font-mono text-[10px] uppercase text-white/50">
                          {step.type === 'knight_dispatch'
                            ? 'Target Knight & Task'
                            : step.type === 'kba_routine'
                              ? 'Routine Action (sync/audit/rezero/forge)'
                              : step.type === 'speak_feedback'
                                ? 'Spoken Voice Reply'
                                : 'Payload / Command'}
                        </label>

                        {step.type === 'kba_routine' ? (
                          <select
                            value={step.payload}
                            onChange={(e) => updateStep(idx, { payload: e.target.value })}
                            className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                          >
                            <option value="sync">sync — Synchronize Ledger</option>
                            <option value="audit">audit — Run Citadel Audit</option>
                            <option value="rezero">rezero — Rezero Registers</option>
                            <option value="forge">forge — Sovereign Forge</option>
                            <option value="scan">scan — Topological Scan</option>
                          </select>
                        ) : step.type === 'knight_dispatch' ? (
                          <div className="flex gap-2">
                            <select
                              value={step.knightId || 'CEO_001'}
                              onChange={(e) => updateStep(idx, { knightId: e.target.value })}
                              className="rounded-lg border border-white/10 bg-black/60 px-2 py-1.5 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                            >
                              {KNIGHTS_REGISTRY.map((k) => (
                                <option key={k.id} value={k.id}>
                                  {k.name} ({k.id})
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={step.payload}
                              onChange={(e) => updateStep(idx, { payload: e.target.value })}
                              placeholder="Task packet..."
                              className="flex-1 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={step.payload}
                            onChange={(e) => updateStep(idx, { payload: e.target.value })}
                            placeholder={
                              step.type === 'speak_feedback'
                                ? 'Spoken confirmation sentence...'
                                : 'Command payload string...'
                            }
                            className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                          />
                        )}
                      </div>

                      {/* Delay (ms) */}
                      <div className="flex flex-col gap-1">
                        <label className="font-mono text-[10px] uppercase text-white/50">
                          Pre-Step Delay (ms)
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={step.delayMs}
                          onChange={(e) =>
                            updateStep(idx, { delayMs: Number.parseInt(e.target.value, 10) || 0 })
                          }
                          className="rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setActiveTab('mappings')}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs text-white/70 hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl border border-cyan-400 bg-cyan-400/20 px-6 py-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/30 shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all"
            >
              <span>💾</span>
              <span>{builderId ? 'Save Changes' : 'Create Voice Command'}</span>
            </button>
          </div>
        </form>
      )}

      {/* ── TAB 3: VOICE SIMULATOR & MATCH TESTER ── */}
      {activeTab === 'tester' && (
        <div className="relative z-10 flex flex-1 flex-col space-y-5 overflow-y-auto pr-1">
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-950/20 p-5 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300 mb-2">
              🎯 Real-Time Voice Matching Simulator
            </h3>
            <p className="text-xs text-white/60 mb-4">
              Type or speak a voice phrase to inspect the fuzzy/exact keyword matching logic, view
              the target macro pipeline, and trigger test execution.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => handleTestPhraseChange(e.target.value)}
                placeholder="Try saying: 'morning briefing', 'emergency freeze', 'audit citadel'..."
                className="flex-1 rounded-xl border border-cyan-400/50 bg-black/80 px-4 py-3 font-mono text-sm text-cyan-200 placeholder-white/30 focus:border-cyan-300 focus:outline-none"
              />
              <button
                type="button"
                disabled={!testResult.matched || testResult.isExecuting}
                onClick={handleExecuteTest}
                className="flex items-center gap-2 rounded-xl border border-cyan-400 bg-cyan-400/20 px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/30 disabled:opacity-40 shadow-[0_0_15px_rgba(0,240,255,0.25)] transition-all"
              >
                <span>{testResult.isExecuting ? '⏳' : '⚡'}</span>
                <span>{testResult.isExecuting ? 'Running...' : 'Execute Macro'}</span>
              </button>
            </div>
          </div>

          {/* Matching Result Card */}
          {testInput.trim() && (
            <div
              className={`rounded-xl border p-5 transition-all ${
                testResult.matched
                  ? 'border-emerald-500/50 bg-emerald-950/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'border-amber-500/40 bg-amber-950/30'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{testResult.matched ? '✅' : '❌'}</span>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                    {testResult.matched ? 'MATCH SUCCESSFUL' : 'NO EXACT OR PREFIX MATCH FOUND'}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-white/50">
                  Normalized: &quot;{testResult.normalizedInput}&quot;
                </span>
              </div>

              {testResult.matched ? (
                <div className="space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">Target Macro:</span>
                    <strong className="text-emerald-300">{testResult.matched.name}</strong>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">Trigger Phrase:</span>
                    <span className="text-cyan-300">&quot;{testResult.matched.phrase}&quot;</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-white/60">Safety Tier:</span>
                    <span
                      className={
                        testResult.matched.safetyTier === 'hitl_confirm'
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                      }
                    >
                      {testResult.matched.safetyTier === 'hitl_confirm'
                        ? '🛡️ HITL REQUIRED'
                        : '⚡ AUTO-EXECUTE'}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/60 block mb-1.5">
                      Action Pipeline ({testResult.matched.steps.length} steps):
                    </span>
                    <div className="space-y-1 pl-2">
                      {testResult.matched.steps.map((st, i) => (
                        <div key={st.id || i} className="flex items-center gap-2 text-white/80">
                          <span className="text-emerald-400">{i + 1}.</span>
                          <span>{st.label}</span>
                          <span className="text-white/40">
                            ({st.type}: {st.payload})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-white/60 font-mono">
                  No registered macro has the phrase &quot;{testInput}&quot;. You can create a new
                  macro with this trigger phrase in the Step Builder.
                </p>
              )}
            </div>
          )}

          {/* Quick Voice Phrase Test Chips */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-4">
            <span className="font-mono text-[11px] uppercase tracking-wider text-white/50 block mb-2">
              Quick Test Phrase Chips (Click to evaluate):
            </span>
            <div className="flex flex-wrap gap-2">
              {macros.slice(0, 8).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleTestPhraseChange(m.phrase)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-white/70 hover:border-cyan-400 hover:text-cyan-300"
                >
                  🎙️ &quot;{m.phrase}&quot;
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: PRESET PACKS & IMPORT/EXPORT ── */}
      {activeTab === 'presets' && (
        <div className="relative z-10 flex flex-1 flex-col space-y-6 overflow-y-auto pr-1">
          {importStatus && (
            <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/70 p-3 font-mono text-xs text-emerald-200">
              {importStatus}
            </div>
          )}

          {/* Preset Bundles */}
          <div className="space-y-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
              📦 Sovereign Voice Preset Packs
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {PRESET_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className="flex flex-col justify-between rounded-xl border border-white/10 bg-black/40 p-5 hover:border-purple-400/40 hover:bg-black/60 transition-all space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-mono text-sm font-bold text-purple-300">{pack.name}</h4>
                      <span className="rounded bg-purple-900/40 px-2 py-0.5 font-mono text-[10px] text-purple-200">
                        {pack.count} Routines
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-white/60">{pack.description}</p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {pack.macros.map((m, idx) => (
                        <span
                          key={idx}
                          className="rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] text-white/70"
                        >
                          🎙️ &quot;{m.phrase}&quot;
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInstallPreset(pack)}
                    className="w-full rounded-xl border border-purple-400/40 bg-purple-400/10 py-2 font-mono text-xs font-bold uppercase tracking-wider text-purple-300 hover:bg-purple-400/20 shadow-[0_0_15px_rgba(157,78,221,0.2)] transition-all"
                  >
                    Install {pack.name}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Import JSON Section */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-5 space-y-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
              📥 Import Custom Voice Macro JSON
            </h3>
            <p className="text-xs text-white/50">
              Paste exported macro JSON payload or load an external configuration file.
            </p>
            <textarea
              rows={4}
              value={jsonImportString}
              onChange={(e) => setJsonImportString(e.target.value)}
              placeholder="Paste JSON array of macro objects here..."
              className="w-full rounded-xl border border-white/10 bg-black/70 p-3 font-mono text-xs text-white placeholder-white/30 focus:border-cyan-400 focus:outline-none"
            />
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleImportText}
                disabled={!jsonImportString.trim()}
                className="rounded-xl border border-cyan-400/40 bg-cyan-400/15 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-cyan-300 hover:bg-cyan-400/30 disabled:opacity-40"
              >
                Import Macros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: EXECUTION LOGS ── */}
      {activeTab === 'logs' && (
        <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
              📋 Live Voice Command Execution History
            </h3>
            {executionLogs.length > 0 && (
              <button
                type="button"
                onClick={clearLogs}
                className="rounded border border-red-500/20 bg-red-950/20 px-2.5 py-1 font-mono text-[10px] text-red-300 hover:bg-red-900/30"
              >
                Clear History
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {executionLogs.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-black/30 text-center font-mono text-xs text-white/40">
                No macro executions recorded in this session.
              </div>
            ) : (
              executionLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        log.status === 'success'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : log.status === 'running'
                            ? 'bg-cyan-500/20 text-cyan-300 animate-spin'
                            : 'bg-red-500/20 text-red-300'
                      }`}
                    >
                      {log.status === 'success' ? '✓' : log.status === 'running' ? '⟳' : '✕'}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-white">{log.macroName}</strong>
                        <span className="rounded bg-cyan-950/60 px-1.5 py-0.5 text-[9px] text-cyan-300">
                          &quot;{log.phrase}&quot;
                        </span>
                        <span className="text-[9px] text-white/40 uppercase">
                          [{log.triggeredBy}]
                        </span>
                      </div>
                      <div className="text-[10px] text-white/50">
                        {log.details || `Completed ${log.stepsCompleted}/${log.stepsTotal} steps`} ·{' '}
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white/70">
                      {log.latencyMs}ms
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase ${
                        log.status === 'success'
                          ? 'text-emerald-400'
                          : log.status === 'running'
                            ? 'text-cyan-400'
                            : 'text-red-400'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
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

export default VoiceMacroConfigPanel;
