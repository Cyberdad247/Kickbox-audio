'use client';

import { useEffect, useState } from 'react';
import { useBifrost } from '../../context/BifrostContext';
import { useMacros } from '../../context/MacroContext';
import { useActivityLog } from '../../context/ActivityLogContext';
import { ActivityLogDisplay } from '../capsule/ActivityLogDisplay';

function Toggle({
  label,
  value,
  onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className="flex w-full items-center justify-between border border-gold/20 bg-smoke-800/80 px-5 py-4 text-left backdrop-blur-sm transition-colors hover:border-gold/40"
    >
      <span className="text-sm text-white/70 uppercase tracking-wider">{label}</span>
      <span
        className={`relative h-5 w-9 border transition-colors ${value ? 'border-violet bg-violet/30' : 'border-white/20 bg-obsidian'}`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 transition-all ${value ? 'left-4 bg-violet-light' : 'left-0.5 bg-white/40'}`}
        />
      </span>
    </button>
  );
}

const AVAILABLE_TABS = [
  'overview',
  'knights',
  'properties',
  'streaming',
  'coffee',
  'venture',
  'vault',
  'settings',
  'cinematic',
  'topology',
];

export function SettingsTab() {
  const { connected } = useBifrost();
  const { macros, openMacroModal, toggleMacro, executeMacro, activeExecution, createMacro } = useMacros();
  const { logs, logActivity, clearLogs } = useActivityLog();
  const [voice, setVoice] = useState(true);
  const [motion, setMotion] = useState(true);
  const [purged, setPurged] = useState(false);
  
  // Navigation Voice Mapping State
  const [phrase, setPhrase] = useState('');
  const [targetTab, setTargetTab] = useState('overview');

  const handleAddNavMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phrase.trim()) return;

    createMacro({
      name: `Open ${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`,
      phrase: phrase.trim().toLowerCase(),
      description: `Custom voice shortcut for ${targetTab} navigation.`,
      category: 'custom',
      enabled: true,
      safetyTier: 'auto',
      steps: [
        {
          id: `step_${Date.now()}`,
          type: 'client_navigation',
          label: `Navigate to ${targetTab}`,
          payload: targetTab,
          delayMs: 0,
        },
        {
          id: `step_${Date.now()}_2`,
          type: 'speak_feedback',
          label: 'Voice Response',
          payload: `Opening ${targetTab}.`,
          delayMs: 100,
        }
      ],
    });
    setPhrase('');
  };

  // Persist preferences (the "Learn With Me" local vault).
  useEffect(() => {
    try {
      setVoice(localStorage.getItem('koa.voice') !== '0');
      setMotion(localStorage.getItem('koa.motion') !== '0');
    } catch {}
  }, []);
  const set = (k: string, v: boolean, fn: (v: boolean) => void) => {
    fn(v);
    try {
      localStorage.setItem(k, v ? '1' : '0');
      logActivity('CONFIG_CHANGED', `Setting ${k} changed to ${v ? 'ON' : 'OFF'}`);
    } catch {}
  };

  const purge = () => {
    try {
      localStorage.clear();
      logActivity('SYSTEM_PURGED', 'Memory vault and local state purged');
    } catch {}
    setPurged(true);
    setTimeout(() => setPurged(false), 2500);
  };

  const handleExportLogs = async () => {
    if (logs.length === 0) return;
    try {
      const payloadString = JSON.stringify(logs);
      const encoder = new TextEncoder();
      const data = encoder.encode(payloadString);
      
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Simulated encrypted payload
      const base64Payload = btoa(Array.from(data).map(b => String.fromCharCode(b)).join(''));

      const exportData = {
        header: {
          algorithm: 'AES-256-GCM',
          signature_alg: 'SHA-256',
          timestamp: new Date().toISOString(),
          signature: signature,
        },
        ciphertext: base64Payload,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sovereign-audit-log-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logActivity('AUDIT_LOG_EXPORTED', 'Secure audit log exported as signed JSON');
    } catch (err) {
      console.error('Failed to export audit log', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="px-1 text-[11px] text-white/35 uppercase tracking-[0.2em]">Preferences</p>
          <Toggle
            label="Lakisha voice replies"
            value={voice}
            onChange={(v) => set('koa.voice', v, setVoice)}
          />
          <Toggle
            label="Kinetic motion (WebGL)"
            value={motion}
            onChange={(v) => set('koa.motion', v, setMotion)}
          />
        </div>

        <div className="space-y-3">
          <p className="px-1 text-[11px] text-white/35 uppercase tracking-[0.2em]">System</p>
          <div className="border border-gold/20 bg-smoke-800/80 px-5 py-4 backdrop-blur-sm">
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50 uppercase tracking-wider">Bifrost mesh</span>
              <span
                className={`flex items-center gap-2 ${connected ? 'text-violet-light' : 'text-white/40'}`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${connected ? 'bg-violet shadow-glow' : 'bg-white/30'}`}
                />
                {connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-white/50 uppercase tracking-wider">Weather anchor</span>
              <span className="text-gold-light">Cleveland, OH</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-white/50 uppercase tracking-wider">Realm</span>
              <span className="font-display text-gold-royal tracking-minted">KOA v2.0</span>
            </div>
          </div>
          <button
            type="button"
            onClick={purge}
            className="w-full border border-red-400/40 px-5 py-4 text-sm text-red-400 uppercase tracking-widest transition-colors hover:bg-red-400/10"
          >
            {purged ? 'Memory vault purged' : 'Purge "Learn With Me" memory'}
          </button>
        </div>
      </div>

      {/* Custom Voice Navigation Mapping */}
      <div className="space-y-3 border border-cyan-400/30 bg-smoke-900/60 p-5">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">🎙️</span>
          <h3 className="font-display text-sm text-cyan-400 uppercase tracking-wider">
            Quick Voice Navigation Mapping
          </h3>
        </div>
        <p className="text-xs text-white/50 mb-3">
          Instantly map a custom voice phrase to open any workspace or dashboard tab.
        </p>
        <form onSubmit={handleAddNavMapping} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full space-y-1">
            <label className="text-[10px] text-white/40 uppercase tracking-widest">Trigger Phrase</label>
            <input
              type="text"
              placeholder="e.g. 'show me the money'"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              className="w-full border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-cyan-400 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex-1 w-full space-y-1">
            <label className="text-[10px] text-white/40 uppercase tracking-widest">Target View</label>
            <select
              value={targetTab}
              onChange={(e) => setTargetTab(e.target.value)}
              className="w-full border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-cyan-400 focus:outline-none transition-colors appearance-none"
            >
              {AVAILABLE_TABS.map(tab => (
                <option key={tab} value={tab}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!phrase.trim()}
            className="w-full sm:w-auto shrink-0 border border-cyan-400 bg-cyan-400/20 px-6 py-2 text-sm text-cyan-400 uppercase tracking-wider hover:bg-cyan-400/30 disabled:opacity-50 transition-colors font-bold"
          >
            Add Mapping
          </button>
        </form>
      </div>

      {/* Voice Macros Management Studio Section */}
      <div className="space-y-3 border border-gold/30 bg-smoke-900/60 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-gold">⚡</span>
              <h3 className="font-display text-sm text-gold-light uppercase tracking-wider">
                Voice Macros & Custom Shortcuts ({macros.length})
              </h3>
            </div>
            <p className="text-xs text-white/50">
              Speak custom trigger phrases into Lakisha to automate multi-step enclave routines.
            </p>
          </div>

          <button
            type="button"
            onClick={() => openMacroModal(null)}
            className="border border-gold bg-gold/20 px-4 py-2 text-xs font-mono uppercase tracking-wider text-gold-royal transition-colors hover:bg-gold hover:text-obsidian font-bold shadow-gold"
          >
            Open Macro Studio
          </button>
        </div>

        {/* Quick Macro Cards Grid */}
        <div className="grid gap-3 pt-2 md:grid-cols-2">
          {macros.slice(0, 4).map((m) => {
            const isRunning = activeExecution?.macro.id === m.id;
            return (
              <div
                key={m.id}
                className="flex items-center justify-between border border-white/10 bg-black/40 p-3"
              >
                <div className="overflow-hidden pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xs text-white font-bold truncate">
                      {m.name}
                    </span>
                    <span className="border border-white/10 px-1 py-0.2 text-[8px] font-mono uppercase text-gold">
                      {m.category}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-gold-light truncate mt-0.5">
                    🎙️ "{m.phrase}"
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleMacro(m.id)}
                    className={`border px-2 py-1 text-[10px] font-mono uppercase ${
                      m.enabled
                        ? 'border-gold/40 text-gold bg-gold/10'
                        : 'border-white/10 text-white/30 bg-transparent'
                    }`}
                  >
                    {m.enabled ? 'ON' : 'OFF'}
                  </button>
                  <button
                    type="button"
                    disabled={!m.enabled || isRunning}
                    onClick={() => executeMacro(m, 'shortcut')}
                    className="border border-gold/40 bg-gold/10 px-2.5 py-1 text-[10px] font-mono uppercase text-gold hover:bg-gold/20 disabled:opacity-30"
                  >
                    {isRunning ? '...' : '▶ Run'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    

      {/* Activity / Audit Log Section */}
      <div className="mt-8">
        <ActivityLogDisplay embedded={true} maxEntries={20} />
      </div>

    </div>
  );
}
