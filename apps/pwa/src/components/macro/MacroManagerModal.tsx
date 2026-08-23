'use client';

import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { KNIGHTS_REGISTRY } from '../../actions/coreRegistry';
import { useMacros } from '../../context/MacroContext';
import { useMacroAutoSave } from '../../hooks/useMacroAutoSave';
import { speak } from '../../lib/voice';
import type { ActionStepType, Macro, MacroActionStep, MacroCategory } from '../../types/macro';
import { SovereignEnclaveStandaloneView } from '../hud/SovereignEnclaveStandaloneView';
import { CommandLog } from './CommandLog';
import { HighlightedMacroEditor } from './HighlightedMacroEditor';

const CATEGORIES: { id: MacroCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All Routines' },
  { id: 'operations', label: 'Operations' },
  { id: 'financial', label: 'Financial' },
  { id: 'security', label: 'Security' },
  { id: 'knights', label: 'Knights Swarm' },
  { id: 'custom', label: 'Custom' },
];

const STEP_TYPES: { type: ActionStepType; label: string; desc: string; icon: string }[] = [
  {
    type: 'voice_command',
    label: 'Bifrost Voice Command',
    desc: 'Raw voice dispatch to backend',
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
  {
    type: 'key_combination',
    label: 'Key Combination / Hotkey',
    desc: 'Dispatch key shortcut combo (e.g. Ctrl+Alt+S)',
    icon: '⌨️',
  },
  {
    type: 'custom_script',
    label: 'Custom JS Script',
    desc: 'Execute inline JavaScript code on utterance',
    icon: '📜',
  },
];

export function MacroManagerModal() {
  const {
    macros,
    activeExecution,
    executionLogs,
    isMacroModalOpen,
    editingMacro,
    setEditingMacro,
    closeMacroModal,
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

  const [activeTab, setActiveTab] = useState<
    'macros' | 'builder' | 'script_editor' | 'logs' | 'presets' | 'enclave'
  >('macros');
  const [isEnclavePopupOpen, setIsEnclavePopupOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<MacroCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Builder Form State
  const [builderId, setBuilderId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phrase, setPhrase] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MacroCategory>('custom');
  const [safetyTier, setSafetyTier] = useState<'auto' | 'hitl_confirm'>('auto');
  const [steps, setSteps] = useState<MacroActionStep[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Key Combination Recording state
  const [recordingHotkeyStepIdx, setRecordingHotkeyStepIdx] = useState<number | null>(null);

  // Text-Based Script Editor State
  const [selectedScriptMacroId, setSelectedScriptMacroId] = useState<string | 'new'>('new');
  const [macroScriptCode, setMacroScriptCode] = useState<string>(
    JSON.stringify(
      {
        name: 'Custom Voice Utterance Script',
        phrase: 'run debug routine',
        category: 'custom',
        safetyTier: 'auto',
        description: 'Binds custom script execution & hotkey combinations to voice utterance',
        steps: [
          {
            type: 'key_combination',
            label: 'Dispatch Shortcut',
            payload: 'Ctrl+Shift+D',
            delayMs: 0,
          },
          {
            type: 'custom_script',
            label: 'Execute JS Script',
            payload:
              "console.log('Utterance script triggered!');\nspeak('Script execution complete.');\ndispatchKey('Ctrl+Alt+S');",
            scriptCode:
              "console.log('Utterance script triggered!');\nspeak('Script execution complete.');\ndispatchKey('Ctrl+Alt+S');",
            delayMs: 150,
          },
        ],
      },
      null,
      2,
    ),
  );
  const [scriptCompileStatus, setScriptCompileStatus] = useState<string | null>(null);

  // Live Speech Ingest / Phrase Tester State
  const [isListeningTest, setIsListeningTest] = useState(false);
  const [testTranscript, setTestTranscript] = useState('');
  const [testMatchResult, setTestMatchResult] = useState<Macro | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // JSON Import/Export State
  const scriptFileInputRef = useRef<HTMLInputElement>(null);
  const [jsonText, setJsonText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Template Library State
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<string>('All');
  const [isDraggingOverEditor, setIsDraggingOverEditor] = useState<boolean>(false);
  const [previewingTemplateId, setPreviewingTemplateId] = useState<string | null>(null);

  // Auto-Save Mechanism via useMacroAutoSave hook effect & periodic middleware
  const { autoSaveStatus, lastAutoSaveTime, clearAutoSaveDraft, saveNow } = useMacroAutoSave(
    macroScriptCode,
    { macroId: selectedScriptMacroId, macroTitle: 'Custom Macro DSL' },
    {
      storageKey: 'camelot_macro_editor_autosave_code',
      metaKey: 'camelot_macro_editor_autosave_meta',
      debounceMs: 750,
      periodicIntervalMs: 10000,
      onRestore: (restoredCode, meta) => {
        setMacroScriptCode(restoredCode);
        if (meta?.macroId) {
          setSelectedScriptMacroId(meta.macroId);
        }
        setScriptCompileStatus('✓ Restored draft from local auto-save');
      },
    },
  );

  // Clear auto-saved draft helper
  const handleClearAutoSaveDraft = () => {
    clearAutoSaveDraft();
    setScriptCompileStatus('✓ Cleared auto-saved draft from localStorage');
  };

  // Animation states
  const [isRendered, setIsRendered] = useState(isMacroModalOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isMacroModalOpen) {
      setIsRendered(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    } else {
      setIsVisible(false);
      timeout = setTimeout(() => setIsRendered(false), 250);
      return () => clearTimeout(timeout);
    }
  }, [isMacroModalOpen]);

  // Load editing macro into form
  useEffect(() => {
    if (editingMacro) {
      setBuilderId(editingMacro.id);
      setName(editingMacro.name);
      setPhrase(editingMacro.phrase);
      setDescription(editingMacro.description);
      setCategory(editingMacro.category);
      setSafetyTier(editingMacro.safetyTier);
      setSteps(editingMacro.steps);
      setActiveTab('builder');
    } else {
      setBuilderId(null);
      setName('');
      setPhrase('');
      setDescription('');
      setCategory('custom');
      setSafetyTier('auto');
      setSteps([
        {
          id: `step_${Date.now()}`,
          type: 'voice_command',
          label: 'Primary Command',
          payload: 'remind CEO check status',
          delayMs: 0,
        },
      ]);
    }
  }, [editingMacro]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMacroModalOpen) {
        closeMacroModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMacroModalOpen, closeMacroModal]);

  // Key combination recorder listener
  useEffect(() => {
    if (recordingHotkeyStepIdx === null) return;

    const handleHotkeyPress = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Meta');

      let keyName = e.key.toUpperCase();
      if (keyName === ' ') keyName = 'Space';
      parts.push(keyName);

      const comboStr = parts.join('+');
      setSteps((prevSteps) =>
        prevSteps.map((s, idx) =>
          idx === recordingHotkeyStepIdx
            ? { ...s, payload: comboStr, label: `Hotkey: ${comboStr}` }
            : s,
        ),
      );
      setRecordingHotkeyStepIdx(null);
    };

    window.addEventListener('keydown', handleHotkeyPress, true);
    return () => window.removeEventListener('keydown', handleHotkeyPress, true);
  }, [recordingHotkeyStepIdx]);

  // Load Macro into Text Script Editor
  const handleLoadScriptMacro = (macroId: string | 'new') => {
    setSelectedScriptMacroId(macroId);
    setScriptCompileStatus(null);
    if (macroId === 'new') {
      setMacroScriptCode(
        JSON.stringify(
          {
            name: 'Custom Voice Utterance Script',
            phrase: 'run debug routine',
            category: 'custom',
            safetyTier: 'auto',
            description: 'Binds custom script execution & hotkey combinations to voice utterance',
            steps: [
              {
                type: 'key_combination',
                label: 'Dispatch Shortcut',
                payload: 'Ctrl+Shift+D',
                delayMs: 0,
              },
              {
                type: 'custom_script',
                label: 'Execute JS Script',
                payload:
                  "console.log('Utterance script triggered!');\nspeak('Script execution complete.');\ndispatchKey('Ctrl+Alt+S');",
                scriptCode:
                  "console.log('Utterance script triggered!');\nspeak('Script execution complete.');\ndispatchKey('Ctrl+Alt+S');",
                delayMs: 150,
              },
            ],
          },
          null,
          2,
        ),
      );
    } else {
      const target = macros.find((m) => m.id === macroId);
      if (target) {
        setMacroScriptCode(
          JSON.stringify(
            {
              name: target.name,
              phrase: target.phrase,
              category: target.category,
              safetyTier: target.safetyTier,
              description: target.description,
              steps: target.steps.map((s) => ({
                type: s.type,
                label: s.label,
                payload: s.payload,
                scriptCode: s.scriptCode,
                knightId: s.knightId,
                delayMs: s.delayMs,
              })),
            },
            null,
            2,
          ),
        );
      }
    }
  };

  // Compile & Apply Text-Based Macro Script
  const handleCompileScript = () => {
    try {
      const parsed = JSON.parse(macroScriptCode);
      if (!parsed.name || !parsed.phrase || !Array.isArray(parsed.steps)) {
        setScriptCompileStatus('⚠ Missing required macro fields: name, phrase, or steps array.');
        return;
      }

      const compiledSteps: MacroActionStep[] = parsed.steps.map((s: any, idx: number) => ({
        id: s.id || `step_${Date.now()}_${idx}`,
        type: s.type || 'voice_command',
        label: s.label || `Action Step ${idx + 1}`,
        payload: s.payload || s.scriptCode || '',
        scriptCode: s.scriptCode || (s.type === 'custom_script' ? s.payload : undefined),
        knightId: s.knightId,
        delayMs: typeof s.delayMs === 'number' ? s.delayMs : 0,
      }));

      if (selectedScriptMacroId === 'new') {
        const created = createMacro({
          name: String(parsed.name).trim(),
          phrase: String(parsed.phrase).toLowerCase().trim(),
          description: String(parsed.description || 'Compiled via Text Script Editor').trim(),
          category: (parsed.category as MacroCategory) || 'custom',
          enabled: true,
          safetyTier: parsed.safetyTier === 'hitl_confirm' ? 'hitl_confirm' : 'auto',
          steps: compiledSteps,
        });
        setSelectedScriptMacroId(created.id);
        setScriptCompileStatus(`✓ Successfully compiled & created macro "${created.name}"!`);
      } else {
        updateMacro(selectedScriptMacroId, {
          name: String(parsed.name).trim(),
          phrase: String(parsed.phrase).toLowerCase().trim(),
          description: String(parsed.description || 'Updated via Text Script Editor').trim(),
          category: (parsed.category as MacroCategory) || 'custom',
          safetyTier: parsed.safetyTier === 'hitl_confirm' ? 'hitl_confirm' : 'auto',
          steps: compiledSteps,
        });
        setScriptCompileStatus(`✓ Successfully updated macro "${parsed.name}"!`);
      }
    } catch (err) {
      setScriptCompileStatus(
        `⚠ Script syntax compilation error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  // Export current active script as JSON file
  const handleExportCurrentScript = () => {
    try {
      let fileName = 'custom_macro_script';
      try {
        const parsed = JSON.parse(macroScriptCode);
        if (parsed.name) {
          fileName = `macro_${String(parsed.name)
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')}`;
        }
      } catch {
        // Fallback name
      }
      const blob = new Blob([macroScriptCode], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setScriptCompileStatus(`✓ Exported script as JSON file download (${link.download})`);
    } catch (err) {
      setScriptCompileStatus(`⚠ Export error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Export all custom macros as full backup JSON file
  const handleExportAllBackup = () => {
    try {
      const jsonStr = exportMacros();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `camelot_macros_backup_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setScriptCompileStatus(
        `✓ Exported complete macro backup (${macros.length} scripts) to JSON file download`,
      );
    } catch (err) {
      setScriptCompileStatus(`⚠ Export error: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Import JSON Script / Backup file handler
  const handleScriptFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        if (!content) return;
        const parsed = JSON.parse(content);

        if (Array.isArray(parsed)) {
          const ok = importMacros(content);
          if (ok) {
            setScriptCompileStatus(
              `✓ Successfully restored ${parsed.length} custom macro scripts from JSON backup file!`,
            );
            if (parsed.length > 0) {
              setMacroScriptCode(JSON.stringify(parsed[0], null, 2));
            }
          } else {
            setScriptCompileStatus('⚠ Invalid macro array backup format in JSON file.');
          }
        } else if (typeof parsed === 'object' && parsed !== null) {
          const formattedStr = JSON.stringify(parsed, null, 2);
          setMacroScriptCode(formattedStr);
          const ok = importMacros(content);
          if (ok) {
            setScriptCompileStatus(
              `✓ Successfully imported script "${parsed.name || 'Custom Script'}" from JSON file!`,
            );
          } else {
            setScriptCompileStatus(
              `✓ Loaded script "${parsed.name || 'Custom Script'}" into text editor. Click "Compile & Apply Script" to compile.`,
            );
          }
        } else {
          setScriptCompileStatus('⚠ Unrecognized JSON structure in imported script file.');
        }
      } catch (err) {
        setScriptCompileStatus(
          `⚠ JSON file import error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Template Library Items definition
  const TEMPLATES = [
    {
      id: 'app_launch_bifrost',
      title: 'App Launch — Bifrost Bridge',
      category: 'App Launch',
      icon: '🚀',
      badge: 'App Launch',
      description: 'Launches and navigates the main stage to the WebRTC Bifrost Bridge',
      payloadObj: {
        type: 'custom_script',
        label: 'Navigate to Bifrost Bridge',
        payload: "speak('Navigating to Bifrost Bridge');\nnavigateTab('bifrost');",
        scriptCode: "speak('Navigating to Bifrost Bridge');\nnavigateTab('bifrost');",
        delayMs: 0,
      },
    },
    {
      id: 'app_launch_kernel',
      title: 'App Launch — Anya Kernel',
      category: 'App Launch',
      icon: '🧠',
      badge: 'App Launch',
      description: 'Opens Anya AI Kernel stage and triggers voice status readout',
      payloadObj: {
        type: 'custom_script',
        label: 'Launch Anya AI Kernel',
        payload: "speak('Anya Kernel engaged');\nnavigateTab('kernel');",
        scriptCode: "speak('Anya Kernel engaged');\nnavigateTab('kernel');",
        delayMs: 0,
      },
    },
    {
      id: 'sys_cmd_debug',
      title: 'System Command — Hotkey Dispatch',
      category: 'System Command',
      icon: '💻',
      badge: 'System Command',
      description: 'Dispatches hotkey combination (Ctrl+Shift+D) to trigger debug panel',
      payloadObj: {
        type: 'key_combination',
        label: 'Dispatch Debug Shortcut',
        payload: 'Ctrl+Shift+D',
        delayMs: 150,
      },
    },
    {
      id: 'sys_cmd_hud_toggle',
      title: 'System Command — HUD Toggle',
      category: 'System Command',
      icon: '🛡️',
      badge: 'System Command',
      description: 'Toggles Lakisha Voice HUD overlay in Governed Dock',
      payloadObj: {
        type: 'custom_script',
        label: 'Toggle Lakisha HUD',
        payload: "window.dispatchEvent(new CustomEvent('camelot:toggle-lakisha-hud'));",
        scriptCode: "window.dispatchEvent(new CustomEvent('camelot:toggle-lakisha-hud'));",
        delayMs: 100,
      },
    },
    {
      id: 'voice_announcement_status',
      title: 'Voice Announcement — System Report',
      category: 'Voice & Audio',
      icon: '🎙️',
      badge: 'Voice & Audio',
      description: 'Synthesizes TTS spoken announcement for status verification',
      payloadObj: {
        type: 'voice_announcement',
        label: 'System Status Announcement',
        payload: 'System status verified. All operational parameters optimal.',
        delayMs: 0,
      },
    },
    {
      id: 'multi_step_diagnostic',
      title: 'Multi-Step App & System Diagnostic',
      category: 'Multi-Step',
      icon: '⚡',
      badge: 'Multi-Step Macro',
      isFullMacro: true,
      description:
        'Complete multi-step macro combining voice greeting, tab navigation, and hotkey toggle',
      payloadObj: {
        name: 'App Launch & Diagnostic Macro',
        phrase: 'launch diagnostic app',
        category: 'operations',
        safetyTier: 'auto',
        description: 'Launches the app stage and executes system diagnostic voice announcements',
        steps: [
          {
            type: 'voice_announcement',
            label: 'Initial Voice Greeting',
            payload: 'Initiating Lakisha diagnostic sequence...',
            delayMs: 0,
          },
          {
            type: 'custom_script',
            label: 'Navigate to Stage',
            payload: "navigateTab('kernel');",
            scriptCode: "navigateTab('kernel');",
            delayMs: 300,
          },
          {
            type: 'key_combination',
            label: 'Toggle System HUD',
            payload: 'Alt+M',
            delayMs: 200,
          },
        ],
      },
    },
    {
      id: 'security_governed_lockdown',
      title: 'Governed Security Lockdown',
      category: 'Security & HITL',
      icon: '🔒',
      badge: 'HITL Security',
      isFullMacro: true,
      description: 'Enforces Human-In-The-Loop confirmation before executing lockdown routine',
      payloadObj: {
        name: 'Governed System Lockdown',
        phrase: 'lockdown system',
        category: 'security',
        safetyTier: 'hitl_confirm',
        description: 'Requires Human-In-The-Loop confirmation before executing system isolation',
        steps: [
          {
            type: 'voice_announcement',
            label: 'Security Warning',
            payload: 'Alert: System lockdown requested. Confirming credentials.',
            delayMs: 0,
          },
          {
            type: 'custom_script',
            label: 'Lockdown Dispatch',
            payload:
              "speak('System isolation engaged.');\nwindow.dispatchEvent(new CustomEvent('camelot:toggle-lakisha-hud', { detail: { expand: false } }));",
            scriptCode:
              "speak('System isolation engaged.');\nwindow.dispatchEvent(new CustomEvent('camelot:toggle-lakisha-hud', { detail: { expand: false } }));",
            delayMs: 500,
          },
        ],
      },
    },
  ];

  // Helper to insert or append snippet into current editor script
  const handleInsertTemplateSnippet = (snippetObj: any, mode: 'append' | 'replace' = 'append') => {
    try {
      if (mode === 'replace' || !macroScriptCode.trim()) {
        const codeStr =
          typeof snippetObj === 'string' ? snippetObj : JSON.stringify(snippetObj, null, 2);
        setMacroScriptCode(codeStr);
        setScriptCompileStatus('✓ Loaded template script into code editor');
        return;
      }

      // Try to parse existing editor content
      let existingJson: any = null;
      try {
        existingJson = JSON.parse(macroScriptCode);
      } catch {
        existingJson = null;
      }

      if (existingJson && typeof existingJson === 'object') {
        // If dropping a step into a macro object with a steps array
        if (snippetObj.type && Array.isArray(existingJson.steps)) {
          existingJson.steps.push(snippetObj);
          setMacroScriptCode(JSON.stringify(existingJson, null, 2));
          setScriptCompileStatus(
            `✓ Appended step "${snippetObj.label || snippetObj.type}" to current macro script!`,
          );
          return;
        }
        // If dropping a full macro step list or merging
        if (Array.isArray(snippetObj.steps) && Array.isArray(existingJson.steps)) {
          existingJson.steps = [...existingJson.steps, ...snippetObj.steps];
          setMacroScriptCode(JSON.stringify(existingJson, null, 2));
          setScriptCompileStatus(
            `✓ Merged ${snippetObj.steps.length} steps into current macro script!`,
          );
          return;
        }
      }

      // Fallback: Append raw formatted snippet text
      const textToInsert =
        typeof snippetObj === 'string' ? snippetObj : JSON.stringify(snippetObj, null, 2);
      setMacroScriptCode((prev) => `${prev.trim()}\n\n// Added Template Snippet:\n${textToInsert}`);
      setScriptCompileStatus('✓ Appended template snippet text to current editor session');
    } catch (err) {
      setScriptCompileStatus(
        `⚠ Error inserting template snippet: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  // Speech Recognition tester
  const startPhraseTester = () => {
    const Ctor =
      typeof window !== 'undefined'
        ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
        : null;
    if (!Ctor) {
      setTestTranscript('Web Speech recognition not supported on this browser.');
      return;
    }
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => {
      setIsListeningTest(true);
      setTestTranscript('Listening for trigger phrase...');
      setTestMatchResult(null);
    };
    rec.onresult = (e) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        final += e.results[i][0].transcript;
      }
      setTestTranscript(final);
      const match = matchMacro(final);
      setTestMatchResult(match);
      if (match) {
        speak(`Match detected: ${match.name}`);
      }
    };
    rec.onerror = () => setIsListeningTest(false);
    rec.onend = () => setIsListeningTest(false);
    rec.start();
    recognitionRef.current = rec;
  };

  const stopPhraseTester = () => {
    recognitionRef.current?.stop();
    setIsListeningTest(false);
  };

  // Add step to form
  const addStep = () => {
    const newStep: MacroActionStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      type: 'voice_command',
      label: 'New Action Step',
      payload: '',
      delayMs: 200,
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (index: number, updates: Partial<MacroActionStep>) => {
    setSteps(steps.map((s, idx) => (idx === index ? { ...s, ...updates } : s)));
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, idx) => idx !== index));
  };

  const handleSaveMacro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Macro name is required.');
      return;
    }
    if (!phrase.trim()) {
      setFormError('Voice trigger phrase is required.');
      return;
    }
    if (steps.length === 0) {
      setFormError('At least one action step is required.');
      return;
    }
    setFormError(null);

    if (builderId) {
      updateMacro(builderId, {
        name: name.trim(),
        phrase: phrase.trim().toLowerCase(),
        description: description.trim(),
        category,
        safetyTier,
        steps,
      });
    } else {
      createMacro({
        name: name.trim(),
        phrase: phrase.trim().toLowerCase(),
        description: description.trim(),
        category,
        enabled: true,
        safetyTier,
        steps,
      });
    }
    setActiveTab('macros');
  };

  const filteredMacros = macros.filter((m) => {
    const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phrase.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (!isRendered) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={closeMacroModal}
      />

      {/* Modal Window (Luxury Minimalist Brutalism) */}
      <div
        className={`relative flex flex-col w-full max-w-5xl h-[88vh] border border-gold/30 bg-[#0a0a0f] text-white shadow-2xl transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        {/* Top Metallic Border Line */}
        <div className="h-1 w-full bg-gradient-to-r from-gold-dark via-gold-royal to-gold-light" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gold/20 bg-smoke-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center border border-gold/40 bg-obsidian font-display text-gold-royal text-lg shadow-gold">
              ⚡
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base text-gold-light tracking-minted uppercase">
                  Macro Management Studio
                </h2>
                <span className="border border-gold/30 bg-gold/10 px-2 py-0.5 font-mono text-[9px] text-gold uppercase tracking-widest">
                  vMAX //SHORTCUTS
                </span>
              </div>
              <p className="text-[11px] text-white/40 tracking-wider">
                Define on-device custom voice phrases & multi-step execution pipelines
              </p>
            </div>
          </div>

          {/* Active execution readout if running */}
          {activeExecution && (
            <div className="flex items-center gap-2 border border-gold/40 bg-gold/10 px-3 py-1.5 font-mono text-[11px] text-gold animate-pulse">
              <span className="h-2 w-2 rounded-full bg-gold-royal animate-ping" />
              <span>
                RUNNING: {activeExecution.macro.name} ({activeExecution.currentStep}/
                {activeExecution.totalSteps})
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeMacroModal}
              className="flex h-8 items-center gap-1.5 rounded border border-cyan-400/40 bg-cyan-400/10 px-3 text-[10px] font-mono uppercase tracking-wider text-cyan-300 transition-all hover:border-cyan-400 hover:bg-cyan-400/25"
              title="Minimize window to Cartridge Dock (Ctrl+Shift+M / Alt+M)"
            >
              <span>➖</span>
              <span className="hidden sm:inline">Minimize to Dock</span>
            </button>

            <button
              type="button"
              onClick={closeMacroModal}
              className="flex h-8 w-8 items-center justify-center border border-white/10 text-white/50 transition-colors hover:border-gold/40 hover:bg-white/5 hover:text-white"
              title="Close Macro Studio (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-6 py-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('macros')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
                activeTab === 'macros'
                  ? 'border-b-2 border-gold text-gold-light bg-white/5'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              <span>📋</span> Directory ({macros.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingMacro(null);
                setActiveTab('builder');
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
                activeTab === 'builder'
                  ? 'border-b-2 border-gold text-gold-light bg-white/5'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              <span>⚡</span> {builderId ? 'Edit Macro' : '+ Macro Builder'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('script_editor')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
                activeTab === 'script_editor'
                  ? 'border-b-2 border-gold text-gold-light bg-white/5'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              <span>📜</span> Text Script Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
                activeTab === 'logs'
                  ? 'border-b-2 border-gold text-gold-light bg-white/5'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              <span>📊</span> Telemetry Logs ({executionLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
                activeTab === 'presets'
                  ? 'border-b-2 border-gold text-gold-light bg-white/5'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              <span>💾</span> Cartridges & Backup
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('enclave');
                setIsEnclavePopupOpen(true);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-wider transition-colors ${
                activeTab === 'enclave'
                  ? 'border-b-2 border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/10'
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              <span>🏰</span> Sovereign Enclave
              <span className="ml-1 rounded border border-[#00F0FF]/40 bg-[#00F0FF]/20 px-1 py-0.2 text-[8px] font-bold text-[#00F0FF]">
                STANDALONE
              </span>
            </button>
          </div>

          {/* Quick Voice Phrase Testing Trigger */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={isListeningTest ? stopPhraseTester : startPhraseTester}
              className={`flex items-center gap-2 border px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider transition-all ${
                isListeningTest
                  ? 'border-red-500 bg-red-500/20 text-red-300 animate-pulse'
                  : 'border-violet/40 bg-violet/10 text-violet-light hover:border-violet'
              }`}
            >
              <span>{isListeningTest ? '⏹ Stop Mic' : '🎙️ Test Voice Match'}</span>
            </button>
          </div>
        </div>

        {/* Live Speech Recognition Test Banner (if active) */}
        {isListeningTest && (
          <div className="flex items-center justify-between border-b border-violet/30 bg-violet/10 px-6 py-2.5">
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-violet animate-ping" />
              <span className="font-mono text-xs text-white/70">
                Spoken Input:{' '}
                <strong className="text-violet-light font-bold">"{testTranscript}"</strong>
              </span>
            </div>
            {testMatchResult ? (
              <span className="flex items-center gap-1.5 border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-mono text-emerald-400 uppercase tracking-widest">
                ✓ Matched: {testMatchResult.name} (phrase: "{testMatchResult.phrase}")
              </span>
            ) : (
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
                Say any configured phrase...
              </span>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: MACROS DIRECTORY */}
          {activeTab === 'macros' && (
            <div className="space-y-6">
              {/* Filter & Search Bar */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`border px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider transition-colors ${
                        selectedCategory === cat.id
                          ? 'border-gold bg-gold/20 text-gold-light'
                          : 'border-white/10 bg-white/5 text-white/50 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name, voice phrase..."
                    className="w-64 border border-white/20 bg-black/60 px-3 py-1.5 text-xs text-white placeholder-white/30 focus:border-gold focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1.5 text-xs text-white/40 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Macro Cards Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {filteredMacros.map((macro) => {
                  const isRunning = activeExecution?.macro.id === macro.id;
                  return (
                    <div
                      key={macro.id}
                      className={`relative flex flex-col justify-between border bg-smoke-900/60 p-5 transition-all ${
                        isRunning
                          ? 'border-gold shadow-gold-lg bg-gold/5'
                          : macro.enabled
                            ? 'border-white/15 hover:border-gold/50'
                            : 'border-white/5 opacity-50 bg-black/30'
                      }`}
                    >
                      <div>
                        {/* Card Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-display text-sm text-white tracking-wide">
                                {macro.name}
                              </h3>
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest border ${
                                  macro.category === 'financial'
                                    ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                                    : macro.category === 'security'
                                      ? 'border-red-500/40 text-red-300 bg-red-500/10'
                                      : macro.category === 'knights'
                                        ? 'border-violet/40 text-violet-light bg-violet/10'
                                        : 'border-gold/40 text-gold-light bg-gold/10'
                                }`}
                              >
                                {macro.category}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-white/50 leading-relaxed">
                              {macro.description}
                            </p>
                          </div>

                          {/* Toggle Active Button */}
                          <button
                            type="button"
                            onClick={() => toggleMacro(macro.id)}
                            title={macro.enabled ? 'Pause Macro' : 'Enable Macro'}
                            className={`flex h-6 w-11 items-center rounded-none border p-0.5 transition-colors ${
                              macro.enabled ? 'border-gold bg-gold/20' : 'border-white/20 bg-black'
                            }`}
                          >
                            <span
                              className={`h-4 w-4 bg-white transition-transform ${
                                macro.enabled
                                  ? 'translate-x-5 bg-gold-royal'
                                  : 'translate-x-0 bg-white/40'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Spoken Voice Trigger Badge */}
                        <div className="mt-4 flex items-center gap-2 border border-gold/20 bg-black/40 px-3 py-2">
                          <span className="text-gold text-xs">🎙️ Voice Phrase:</span>
                          <code className="font-mono text-xs text-gold-light tracking-wider font-bold">
                            "{macro.phrase}"
                          </code>
                        </div>

                        {/* Steps Breakdown */}
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-mono text-white/40 uppercase tracking-wider">
                            <span>Pipeline Steps ({macro.steps.length})</span>
                            <span>
                              {macro.safetyTier === 'hitl_confirm' ? '🛡️ Guarded' : '⚡ Auto-Run'}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {macro.steps.map((step, sIdx) => (
                              <div
                                key={step.id || sIdx}
                                className="flex items-center gap-2 border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-mono text-white/70"
                              >
                                <span className="text-[10px] text-white/40">{sIdx + 1}.</span>
                                <span className="text-gold/80">
                                  {step.type === 'voice_command' && '⚡'}
                                  {step.type === 'kba_routine' && '🛡️'}
                                  {step.type === 'knight_dispatch' && '⚔️'}
                                  {step.type === 'property_dispatch' && '🏢'}
                                  {step.type === 'client_navigation' && '🧭'}
                                  {step.type === 'speak_feedback' && '🎙️'}
                                </span>
                                <span className="flex-1 truncate">{step.label}</span>
                                {step.delayMs > 0 && (
                                  <span className="text-[9px] text-white/30">
                                    +{step.delayMs}ms
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-3">
                        <div className="text-[10px] font-mono text-white/40">
                          Runs: <strong className="text-white/70">{macro.executionCount}</strong>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => duplicateMacro(macro.id)}
                            className="border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-white/60 hover:text-white hover:border-white/30"
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMacro(macro);
                              setActiveTab('builder');
                            }}
                            className="border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-gold-light hover:border-gold"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMacro(macro.id)}
                            className="border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-red-400 hover:border-red-400 hover:bg-red-400/10"
                          >
                            ✕
                          </button>
                          <button
                            type="button"
                            disabled={!macro.enabled || isRunning}
                            onClick={() => executeMacro(macro, 'ui_test')}
                            className="flex items-center gap-1.5 border border-gold bg-gold/20 px-3.5 py-1 text-[11px] font-mono uppercase tracking-wider text-gold-royal transition-all hover:bg-gold hover:text-obsidian disabled:opacity-30 disabled:pointer-events-none"
                          >
                            <span>▶</span>
                            <span>{isRunning ? 'Running...' : 'Execute'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredMacros.length === 0 && (
                <div className="flex flex-col items-center justify-center border border-white/10 bg-smoke-900/40 p-12 text-center">
                  <span className="text-3xl">🔍</span>
                  <p className="mt-2 text-sm text-white/60">No macros found matching criteria.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('all');
                      setSearchQuery('');
                    }}
                    className="mt-3 border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-mono text-gold-light"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MACRO BUILDER & EDITOR */}
          {activeTab === 'builder' && (
            <form onSubmit={handleSaveMacro} className="max-w-3xl space-y-6">
              <div className="border border-gold/20 bg-smoke-900/60 p-6 space-y-5">
                <h3 className="font-display text-sm text-gold-light uppercase tracking-wider">
                  {builderId ? 'Edit Voice Macro' : 'Build New Voice Macro'}
                </h3>

                {formError && (
                  <div className="border border-red-500 bg-red-500/10 p-3 text-xs text-red-300 font-mono">
                    ⚠ {formError}
                  </div>
                )}

                {/* Macro Name & Category */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1.5">
                      Macro Label / Identifier *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Morning Briefing & Sync"
                      className="w-full border border-white/20 bg-black/60 px-3 py-2 text-sm text-white focus:border-gold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1.5">
                      Domain Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as MacroCategory)}
                      className="w-full border border-white/20 bg-black/60 px-3 py-2 text-sm text-white focus:border-gold focus:outline-none"
                    >
                      <option value="operations">Operations</option>
                      <option value="financial">Financial</option>
                      <option value="security">Security</option>
                      <option value="knights">Knights Swarm</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                {/* Voice Trigger Phrase */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-mono text-gold uppercase tracking-widest">
                      🎙️ Spoken Trigger Phrase *
                    </label>
                    <span className="text-[10px] text-white/40">
                      Spoken into microphone to activate this macro
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={phrase}
                      onChange={(e) => setPhrase(e.target.value)}
                      placeholder="e.g. morning briefing, emergency lockdown, dispatch plumber"
                      className="flex-1 border border-gold/40 bg-black/80 px-3 py-2 font-mono text-sm text-gold-light focus:border-gold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const Ctor =
                          typeof window !== 'undefined'
                            ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
                            : null;
                        if (!Ctor) return;
                        const rec = new Ctor();
                        rec.lang = 'en-US';
                        rec.onresult = (e) => {
                          const spoken = e.results[0][0].transcript;
                          setPhrase(spoken.toLowerCase().trim());
                        };
                        rec.start();
                      }}
                      className="border border-gold/40 bg-gold/10 px-4 py-2 font-mono text-xs text-gold uppercase hover:bg-gold/20"
                    >
                      Speak Phrase
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1.5">
                    Intention & Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Describe what this macro accomplishes in the enclave..."
                    className="w-full border border-white/20 bg-black/60 px-3 py-2 text-xs text-white focus:border-gold focus:outline-none"
                  />
                </div>

                {/* Safety Tier Selector */}
                <div>
                  <label className="block text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1.5">
                    Safety Governance Tier
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex items-center gap-3 border p-3 cursor-pointer transition-colors ${
                        safetyTier === 'auto'
                          ? 'border-gold bg-gold/10 text-gold-light'
                          : 'border-white/10 bg-black/40 text-white/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="safety"
                        value="auto"
                        checked={safetyTier === 'auto'}
                        onChange={() => setSafetyTier('auto')}
                        className="hidden"
                      />
                      <span className="text-base">⚡</span>
                      <div>
                        <p className="text-xs font-mono font-bold uppercase">Auto-Execute</p>
                        <p className="text-[10px] text-white/40">
                          Runs sequence instantly on phrase match
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex items-center gap-3 border p-3 cursor-pointer transition-colors ${
                        safetyTier === 'hitl_confirm'
                          ? 'border-gold bg-gold/10 text-gold-light'
                          : 'border-white/10 bg-black/40 text-white/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="safety"
                        value="hitl_confirm"
                        checked={safetyTier === 'hitl_confirm'}
                        onChange={() => setSafetyTier('hitl_confirm')}
                        className="hidden"
                      />
                      <span className="text-base">🛡️</span>
                      <div>
                        <p className="text-xs font-mono font-bold uppercase">HITL Guarded</p>
                        <p className="text-[10px] text-white/40">
                          Requires Plan Card approval confirmation
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Pipeline Steps Builder */}
                <div className="border-t border-white/10 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-mono text-gold-light uppercase tracking-wider">
                      Execution Action Pipeline ({steps.length} steps)
                    </h4>
                    <button
                      type="button"
                      onClick={addStep}
                      className="border border-gold/40 bg-gold/10 px-3 py-1 text-[11px] font-mono text-gold uppercase hover:bg-gold/20"
                    >
                      + Add Action Step
                    </button>
                  </div>

                  <div className="space-y-3">
                    {steps.map((step, index) => (
                      <div
                        key={step.id || index}
                        className="border border-white/15 bg-black/50 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center border border-gold/40 bg-gold/10 font-mono text-[10px] text-gold">
                              {index + 1}
                            </span>
                            <input
                              type="text"
                              value={step.label}
                              onChange={(e) => updateStep(index, { label: e.target.value })}
                              placeholder="Step label..."
                              className="border border-white/10 bg-black/40 px-2 py-1 text-xs text-white font-mono"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-white/40">Delay:</span>
                            <input
                              type="number"
                              value={step.delayMs}
                              step={50}
                              min={0}
                              onChange={(e) =>
                                updateStep(index, { delayMs: Number(e.target.value) })
                              }
                              className="w-16 border border-white/10 bg-black/40 px-1.5 py-0.5 text-xs text-white font-mono text-right"
                            />
                            <span className="text-[10px] font-mono text-white/30">ms</span>
                            <button
                              type="button"
                              onClick={() => removeStep(index)}
                              className="ml-2 text-xs text-red-400 hover:text-red-300"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Step Type Selector */}
                        <div className="grid gap-2 sm:grid-cols-3">
                          {STEP_TYPES.map((st) => (
                            <button
                              key={st.type}
                              type="button"
                              onClick={() => updateStep(index, { type: st.type })}
                              className={`flex items-center gap-2 border p-2 text-left transition-colors ${
                                step.type === st.type
                                  ? 'border-gold bg-gold/15 text-gold-light'
                                  : 'border-white/5 bg-white/[0.02] text-white/50 hover:border-white/20'
                              }`}
                            >
                              <span>{st.icon}</span>
                              <div className="overflow-hidden">
                                <p className="text-[11px] font-mono font-bold truncate">
                                  {st.label}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Payload Input */}
                        <div>
                          <label className="block text-[9px] font-mono text-white/40 uppercase tracking-wider mb-1">
                            Action Payload / Command String
                          </label>
                          {step.type === 'knight_dispatch' ? (
                            <div className="grid grid-cols-3 gap-2">
                              <select
                                value={step.knightId || 'CEO_001'}
                                onChange={(e) => updateStep(index, { knightId: e.target.value })}
                                className="border border-white/20 bg-black px-2 py-1.5 text-xs text-white font-mono"
                              >
                                {KNIGHTS_REGISTRY.map((k) => (
                                  <option key={k.id} value={k.id}>
                                    {k.name} ({k.role})
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={step.payload}
                                onChange={(e) => updateStep(index, { payload: e.target.value })}
                                placeholder="Task directive packet..."
                                className="col-span-2 border border-white/20 bg-black px-3 py-1.5 text-xs text-white font-mono"
                              />
                            </div>
                          ) : step.type === 'client_navigation' ? (
                            <select
                              value={step.payload}
                              onChange={(e) => updateStep(index, { payload: e.target.value })}
                              className="w-full border border-white/20 bg-black px-3 py-1.5 text-xs text-white font-mono"
                            >
                              <option value="Overview">Overview Tab</option>
                              <option value="Knights">Knights Tab</option>
                              <option value="Properties">Properties Tab</option>
                              <option value="Streaming">Streaming Tab</option>
                              <option value="Coffee">Coffee Tab</option>
                              <option value="Venture">Venture Tab</option>
                              <option value="Settings">Settings Tab</option>
                            </select>
                          ) : step.type === 'key_combination' ? (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={step.payload}
                                  onChange={(e) =>
                                    updateStep(index, {
                                      payload: e.target.value,
                                      label: `Hotkey: ${e.target.value}`,
                                    })
                                  }
                                  placeholder="e.g. Ctrl+Shift+D, Alt+M, Ctrl+K"
                                  className="flex-1 border border-white/20 bg-black px-3 py-1.5 text-xs text-white font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRecordingHotkeyStepIdx(
                                      recordingHotkeyStepIdx === index ? null : index,
                                    )
                                  }
                                  className={`border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                                    recordingHotkeyStepIdx === index
                                      ? 'border-red-500 bg-red-500/20 text-red-300 animate-pulse'
                                      : 'border-gold/40 bg-gold/10 text-gold-light hover:bg-gold/20'
                                  }`}
                                >
                                  {recordingHotkeyStepIdx === index
                                    ? 'Listening... Press Key Combo'
                                    : '🎹 Record Shortcut'}
                                </button>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono text-white/50">
                                <span>Presets:</span>
                                {['Ctrl+Shift+D', 'Alt+M', 'Ctrl+Shift+K', 'Ctrl+Alt+S'].map(
                                  (combo) => (
                                    <button
                                      key={combo}
                                      type="button"
                                      onClick={() =>
                                        updateStep(index, {
                                          payload: combo,
                                          label: `Hotkey: ${combo}`,
                                        })
                                      }
                                      className="border border-white/10 bg-white/5 px-2 py-0.5 text-white/70 hover:border-gold hover:text-gold-light"
                                    >
                                      {combo}
                                    </button>
                                  ),
                                )}
                              </div>
                            </div>
                          ) : step.type === 'custom_script' ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono text-gold-light">
                                  📜 Inline JavaScript Code (Scope: speak, sendVoiceCommand,
                                  dispatchKey, navigateTab)
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = step.scriptCode || step.payload || '';
                                      const updated =
                                        current +
                                        (current ? '\n' : '') +
                                        'speak("Task completed successfully.");';
                                      updateStep(index, { scriptCode: updated, payload: updated });
                                    }}
                                    className="border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-mono text-gold-light hover:border-gold"
                                  >
                                    + speak()
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = step.scriptCode || step.payload || '';
                                      const updated =
                                        current +
                                        (current ? '\n' : '') +
                                        'dispatchKey("Ctrl+Shift+D");';
                                      updateStep(index, { scriptCode: updated, payload: updated });
                                    }}
                                    className="border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-mono text-gold-light hover:border-gold"
                                  >
                                    + dispatchKey()
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = step.scriptCode || step.payload || '';
                                      const updated =
                                        current +
                                        (current ? '\n' : '') +
                                        'sendVoiceCommand("remind CEO status");';
                                      updateStep(index, { scriptCode: updated, payload: updated });
                                    }}
                                    className="border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-mono text-gold-light hover:border-gold"
                                  >
                                    + sendVoiceCommand()
                                  </button>
                                </div>
                              </div>
                              <textarea
                                rows={4}
                                value={step.scriptCode || step.payload}
                                onChange={(e) =>
                                  updateStep(index, {
                                    scriptCode: e.target.value,
                                    payload: e.target.value,
                                  })
                                }
                                placeholder={`// Custom JS script block\nconsole.log("Utterance script triggered!");\nspeak("Executing voice macro script");\ndispatchKey("Ctrl+Shift+D");`}
                                className="w-full border border-gold/30 bg-black/90 p-3 font-mono text-xs text-gold-light focus:border-gold focus:outline-none"
                              />
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={step.payload}
                              onChange={(e) => updateStep(index, { payload: e.target.value })}
                              placeholder={
                                step.type === 'voice_command'
                                  ? 'e.g. add transaction 50000, remind Andre review packet'
                                  : step.type === 'kba_routine'
                                    ? 'e.g. kba kba_sync_dawn, kba kba_rezero_master'
                                    : step.type === 'speak_feedback'
                                      ? 'e.g. Sovereign macro complete. Two actions resolved.'
                                      : 'e.g. {"unit":"Unit 4B","issue":"plumbing"}'
                              }
                              className="w-full border border-white/20 bg-black px-3 py-1.5 text-xs text-white font-mono"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setActiveTab('macros')}
                    className="border border-white/20 bg-transparent px-5 py-2.5 text-xs font-mono uppercase tracking-wider text-white/70 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="border border-gold bg-gold/20 px-6 py-2.5 text-xs font-mono uppercase tracking-widest text-gold-royal transition-colors hover:bg-gold hover:text-obsidian font-bold shadow-gold"
                  >
                    {builderId ? 'Save Macro Modifications' : 'Compile & Save Macro'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB: TEXT-BASED SCRIPT EDITOR */}
          {activeTab === 'script_editor' && (
            <div className="space-y-6 max-w-4xl">
              <div className="border border-gold/30 bg-smoke-900/80 p-6 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gold/20 pb-4">
                  <div>
                    <h3 className="font-display text-base text-gold-light uppercase tracking-wider flex items-center gap-2">
                      <span>📜</span> Text-Based Macro Script Code Studio
                    </h3>
                    <p className="text-xs text-white/50 mt-1">
                      Edit and compile raw macro scripts, key combinations, and inline JS blocks
                      bound to voice triggers.
                    </p>
                  </div>

                  {/* Macro Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white/50 uppercase">
                      Select Target:
                    </span>
                    <select
                      value={selectedScriptMacroId}
                      onChange={(e) => handleLoadScriptMacro(e.target.value)}
                      className="border border-gold/40 bg-black/80 px-3 py-1.5 font-mono text-xs text-gold-light focus:border-gold focus:outline-none"
                    >
                      <option value="new">+ Create New Script Macro</option>
                      {macros.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ("{m.phrase}")
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Compiler status readout */}
                {scriptCompileStatus && (
                  <div
                    className={`border p-3 text-xs font-mono ${
                      scriptCompileStatus.startsWith('✓')
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                        : 'border-red-500 bg-red-500/10 text-red-300'
                    }`}
                  >
                    {scriptCompileStatus}
                  </div>
                )}

                {/* Hidden File Input for JSON Script Import */}
                <input
                  type="file"
                  ref={scriptFileInputRef}
                  accept=".json,application/json"
                  onChange={handleScriptFileImport}
                  className="hidden"
                />

                {/* Script Backup & File Import/Export Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border border-gold/20 bg-black/50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-gold text-[10px] font-mono font-bold uppercase tracking-wider">
                      💾 File Backup & Restore:
                    </span>
                    <button
                      type="button"
                      onClick={() => scriptFileInputRef.current?.click()}
                      className="border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 font-mono text-xs text-emerald-300 hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5"
                      title="Import custom macro script JSON file from computer"
                    >
                      <span>📤</span>
                      <span>Import JSON Script File</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportCurrentScript}
                      className="border border-cyan-400/40 bg-cyan-400/15 px-3 py-1.5 font-mono text-xs text-cyan-300 hover:bg-cyan-400/30 transition-colors flex items-center gap-1.5"
                      title="Export active script shown in editor as JSON file"
                    >
                      <span>📥</span>
                      <span>Export Active Script (.json)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportAllBackup}
                      className="border border-gold/40 bg-gold/15 px-3 py-1.5 font-mono text-xs text-gold-light hover:bg-gold/30 transition-colors flex items-center gap-1.5"
                      title="Export complete macro backup JSON file"
                    >
                      <span>📦</span>
                      <span>Export All Backup (.json)</span>
                    </button>
                  </div>
                </div>

                {/* Snippet / Insert Helpers bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border border-white/10 bg-black/60 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-white/60">
                    <span className="text-gold uppercase text-[10px] font-bold">
                      Quick Snippets:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        handleLoadScriptMacro('new');
                        setMacroScriptCode(
                          JSON.stringify(
                            {
                              name: 'Hotkey Dispatch Routine',
                              phrase: 'trigger shortcuts',
                              category: 'operations',
                              safetyTier: 'auto',
                              description: 'Sequences keyboard shortcuts for UI operation',
                              steps: [
                                {
                                  type: 'key_combination',
                                  label: 'Open Debug Panel',
                                  payload: 'Ctrl+Shift+D',
                                  delayMs: 0,
                                },
                                {
                                  type: 'key_combination',
                                  label: 'Minimize Window',
                                  payload: 'Alt+M',
                                  delayMs: 200,
                                },
                              ],
                            },
                            null,
                            2,
                          ),
                        );
                      }}
                      className="border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/80 hover:border-gold hover:text-gold-light"
                    >
                      ⌨️ Hotkey Combo Template
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleLoadScriptMacro('new');
                        setMacroScriptCode(
                          JSON.stringify(
                            {
                              name: 'Custom JS Audio & Utility Script',
                              phrase: 'execute custom code',
                              category: 'custom',
                              safetyTier: 'auto',
                              description: 'Runs custom inline JavaScript on spoken utterance',
                              steps: [
                                {
                                  type: 'custom_script',
                                  label: 'Run JS Audio & Hotkey Logic',
                                  payload:
                                    "speak('Executing custom utterance script');\ndispatchKey('Ctrl+Shift+D');\nconsole.log('Script execution complete!');",
                                  scriptCode:
                                    "speak('Executing custom utterance script');\ndispatchKey('Ctrl+Shift+D');\nconsole.log('Script execution complete!');",
                                  delayMs: 0,
                                },
                              ],
                            },
                            null,
                            2,
                          ),
                        );
                      }}
                      className="border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/80 hover:border-gold hover:text-gold-light"
                    >
                      📜 Custom JS Script Template
                    </button>
                  </div>

                  <span className="text-[10px] font-mono text-white/40 uppercase">
                    JSON / Script DSL
                  </span>
                </div>

                {/* PRE-BUILT TEMPLATE LIBRARY SECTION */}
                <div className="border border-gold/30 bg-black/60 p-4 space-y-3 rounded-lg shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/20 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📚</span>
                      <div>
                        <h4 className="font-mono text-xs font-bold text-gold uppercase tracking-wider">
                          Pre-Built Script Template Library
                        </h4>
                        <p className="font-mono text-[10px] text-white/50">
                          Drag any snippet card directly onto the editor below, or click [+ Append]
                          / [Load]
                        </p>
                      </div>
                    </div>
                    <span className="rounded bg-gold/10 border border-gold/30 px-2 py-0.5 font-mono text-[9px] text-gold-light uppercase">
                      Drag & Drop Ready
                    </span>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      'All',
                      'App Launch',
                      'System Command',
                      'Voice & Audio',
                      'Multi-Step',
                      'Security & HITL',
                    ].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedTemplateCategory(cat)}
                        className={`rounded px-2.5 py-1 font-mono text-[10px] uppercase transition-all ${
                          selectedTemplateCategory === cat
                            ? 'border border-gold bg-gold/20 text-gold-royal font-bold shadow-[0_0_8px_rgba(255,215,0,0.3)]'
                            : 'border border-white/10 bg-black/40 text-white/60 hover:border-gold/40 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Template Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                    {TEMPLATES.filter(
                      (t) =>
                        selectedTemplateCategory === 'All' ||
                        t.category === selectedTemplateCategory,
                    ).map((tmpl) => (
                      <div
                        key={tmpl.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData(
                            'application/json',
                            JSON.stringify(tmpl.payloadObj),
                          );
                          e.dataTransfer.setData(
                            'text/plain',
                            JSON.stringify(tmpl.payloadObj, null, 2),
                          );
                        }}
                        className="group relative border border-white/15 bg-black/80 hover:border-gold/60 p-3 rounded flex flex-col justify-between gap-2.5 transition-all hover:shadow-[0_0_12px_rgba(255,215,0,0.15)] cursor-grab active:cursor-grabbing select-none"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-sm shrink-0">{tmpl.icon}</span>
                              <span className="font-mono text-xs font-bold text-white group-hover:text-gold-light truncate">
                                {tmpl.title}
                              </span>
                            </div>
                            <span
                              className="shrink-0 text-[10px] font-mono text-white/30 group-hover:text-gold cursor-grab"
                              title="Drag to editor below"
                            >
                              ⠿
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-white/10 px-1.5 py-0.2 font-mono text-[8px] text-white/70 uppercase">
                              {tmpl.badge}
                            </span>
                            {tmpl.isFullMacro && (
                              <span className="rounded bg-cyan-400/20 text-cyan-300 px-1.5 py-0.2 font-mono text-[8px] uppercase">
                                Full Macro
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[10px] text-white/60 leading-normal line-clamp-2">
                            {tmpl.description}
                          </p>
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewingTemplateId(
                                previewingTemplateId === tmpl.id ? null : tmpl.id,
                              )
                            }
                            className="font-mono text-[9px] text-white/40 hover:text-white underline"
                          >
                            {previewingTemplateId === tmpl.id ? 'Close Code' : 'View Code'}
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleInsertTemplateSnippet(tmpl.payloadObj, 'append')}
                              className="border border-gold/40 bg-gold/10 px-2 py-1 font-mono text-[10px] text-gold-light hover:bg-gold/30 transition-colors rounded"
                              title="Append this snippet or step into current editor code"
                            >
                              + Append
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleLoadScriptMacro('new');
                                handleInsertTemplateSnippet(tmpl.payloadObj, 'replace');
                              }}
                              className="border border-white/20 bg-white/10 px-2 py-1 font-mono text-[10px] text-white hover:bg-white/20 transition-colors rounded"
                              title="Replace editor content with this template script"
                            >
                              Load
                            </button>
                          </div>
                        </div>

                        {/* JSON Code Preview Drawer */}
                        {previewingTemplateId === tmpl.id && (
                          <div className="mt-2 border border-gold/30 bg-black/95 p-2 rounded text-[9px] font-mono text-gold-light overflow-x-auto max-h-32">
                            <pre>{JSON.stringify(tmpl.payloadObj, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auto-Save & Live Persistence Banner */}
                <div className="flex flex-wrap items-center justify-between border border-gold/30 bg-black/80 px-3.5 py-2 font-mono text-xs rounded-t">
                  <div className="flex items-center gap-2">
                    <span className="text-gold font-bold uppercase tracking-wider text-[11px]">
                      💾 Live Auto-Save:
                    </span>
                    {autoSaveStatus === 'saving' && (
                      <span className="text-cyan-300 animate-pulse flex items-center gap-1.5 text-[11px]">
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                        <span>Saving draft changes...</span>
                      </span>
                    )}
                    {autoSaveStatus === 'saved' && (
                      <span className="text-emerald-400 flex items-center gap-1.5 text-[11px]">
                        <span>✓ Auto-saved to localStorage</span>
                        {lastAutoSaveTime && (
                          <span className="text-white/40">({lastAutoSaveTime})</span>
                        )}
                      </span>
                    )}
                    {autoSaveStatus === 'restored' && (
                      <span className="text-amber-300 flex items-center gap-1.5 text-[11px]">
                        <span>⚡ Restored draft from localStorage</span>
                        {lastAutoSaveTime && (
                          <span className="text-white/40">({lastAutoSaveTime})</span>
                        )}
                      </span>
                    )}
                    {!autoSaveStatus && (
                      <span className="text-white/40 text-[11px]">Draft auto-persists locally</span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-white/30 hidden sm:inline">
                      Persisted key:{' '}
                      <code className="text-gold/60">camelot_macro_editor_autosave_code</code>
                    </span>
                    {(autoSaveStatus === 'saved' ||
                      autoSaveStatus === 'restored' ||
                      (typeof window !== 'undefined' &&
                        localStorage.getItem('camelot_macro_editor_autosave_code'))) && (
                      <button
                        type="button"
                        onClick={handleClearAutoSaveDraft}
                        className="text-[11px] text-rose-300/80 hover:text-rose-300 hover:underline transition-colors flex items-center gap-1"
                        title="Discard auto-saved draft and clear from localStorage"
                      >
                        <span>🗑️</span>
                        <span>Discard Draft</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Code Editor Area with Drag-and-Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingOverEditor(true);
                  }}
                  onDragLeave={() => setIsDraggingOverEditor(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOverEditor(false);
                    const dataStr =
                      e.dataTransfer.getData('application/json') ||
                      e.dataTransfer.getData('text/plain');
                    if (dataStr) {
                      try {
                        const parsedObj = JSON.parse(dataStr);
                        handleInsertTemplateSnippet(parsedObj, 'append');
                      } catch {
                        handleInsertTemplateSnippet(dataStr, 'append');
                      }
                    }
                  }}
                  className={`relative transition-all duration-300 ${
                    isDraggingOverEditor
                      ? 'ring-2 ring-gold border-gold bg-gold/10 shadow-[0_0_20px_rgba(255,215,0,0.3)]'
                      : ''
                  }`}
                >
                  {isDraggingOverEditor && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none border-2 border-dashed border-gold text-gold font-mono text-sm font-bold uppercase tracking-widest animate-pulse">
                      ✨ Drop snippet card to insert into script!
                    </div>
                  )}
                  <HighlightedMacroEditor
                    rows={16}
                    value={macroScriptCode}
                    onChange={setMacroScriptCode}
                  />
                </div>

                {/* Bottom Action Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div className="text-[11px] font-mono text-white/40">
                    Scope Bindings: <code className="text-gold-light">speak()</code>,{' '}
                    <code className="text-gold-light">sendVoiceCommand()</code>,{' '}
                    <code className="text-gold-light">dispatchKey()</code>,{' '}
                    <code className="text-gold-light">navigateTab()</code>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedScriptMacroId !== 'new') {
                          const target = macros.find((m) => m.id === selectedScriptMacroId);
                          if (target) executeMacro(target, 'ui_test');
                        }
                      }}
                      disabled={selectedScriptMacroId === 'new'}
                      className="border border-white/20 bg-white/5 px-4 py-2 font-mono text-xs text-white uppercase hover:border-gold hover:text-gold-light disabled:opacity-30 disabled:pointer-events-none"
                    >
                      ▶ Test Run Target Macro
                    </button>
                    <button
                      type="button"
                      onClick={handleCompileScript}
                      className="border border-gold bg-gold/20 px-6 py-2.5 font-mono text-xs text-gold-royal uppercase font-bold tracking-widest hover:bg-gold hover:text-obsidian shadow-gold transition-colors"
                    >
                      ⚡ Compile & Apply Script
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TELEMETRY & COMMAND LOG */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <CommandLog maxHeight="max-h-[550px]" showQuickExecute={true} />
            </div>
          )}

          {/* TAB 4: CARTRIDGES & BACKUP */}
          {activeTab === 'presets' && (
            <div className="max-w-2xl space-y-6">
              <div className="border border-gold/20 bg-smoke-900/60 p-6 space-y-4">
                <h3 className="font-display text-sm text-gold-light uppercase tracking-wider">
                  Sovereign Enclave Presets & JSON Synchronizer
                </h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  Export, import, or reinitialize default Sovereign macro cartridges for the
                  Enclave.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const json = exportMacros();
                      setJsonText(json);
                      navigator.clipboard?.writeText(json);
                      setImportStatus('Exported JSON copied to clipboard.');
                    }}
                    className="border border-gold/40 bg-gold/10 px-4 py-2 text-xs font-mono uppercase text-gold hover:bg-gold/20"
                  >
                    Export All Macros to JSON
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm('Reset all macros to default Sovereign Enclave preset routines?')
                      ) {
                        resetToDefaults();
                        setImportStatus('Macros reset to defaults.');
                      }
                    }}
                    className="border border-red-400/40 bg-red-400/10 px-4 py-2 text-xs font-mono uppercase text-red-300 hover:bg-red-400/20"
                  >
                    Reset to Default Enclave Macros
                  </button>
                </div>

                <div className="pt-3">
                  <label className="block text-[10px] font-mono text-white/50 uppercase tracking-widest mb-1.5">
                    JSON Macro Payload (Paste or Inspect)
                  </label>
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    rows={8}
                    placeholder="Paste exported macro JSON payload here to import..."
                    className="w-full border border-white/20 bg-black/80 p-3 font-mono text-xs text-gold-light focus:border-gold focus:outline-none"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        if (!jsonText.trim()) return;
                        const ok = importMacros(jsonText);
                        if (ok) {
                          setImportStatus('Successfully imported macros!');
                          setActiveTab('macros');
                        } else {
                          setImportStatus('Failed to import: Invalid JSON structure.');
                        }
                      }}
                      className="border border-emerald-500/40 bg-emerald-500/20 px-4 py-2 text-xs font-mono uppercase text-emerald-300 hover:bg-emerald-500/30"
                    >
                      Import JSON to Enclave
                    </button>
                    {importStatus && (
                      <span className="text-xs font-mono text-gold">{importStatus}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 5: SOVEREIGN ENCLAVE STANDALONE VIEW ── */}
          {activeTab === 'enclave' && (
            <div className="p-6 overflow-y-auto">
              <SovereignEnclaveStandaloneView
                isPopup={false}
                onLaunchPopup={() => setIsEnclavePopupOpen(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── STANDALONE ENCLAVE POP-UP OVERLAY WINDOW ── */}
      {isEnclavePopupOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 sm:p-8 animate-in fade-in duration-200">
          <SovereignEnclaveStandaloneView
            isPopup={true}
            onMinimize={() => setIsEnclavePopupOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
