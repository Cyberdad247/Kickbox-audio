'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  useActivityLog,
  ActivityCategory,
  ActivitySeverity,
  ActivityLogEntry,
} from '../../context/ActivityLogContext';
import { playSpatialTone, triggerHaptic } from '../../lib/hapticsAndSpatialAudio';

interface ActivityLogDisplayProps {
  embedded?: boolean;
  maxEntries?: number;
  className?: string;
  defaultCategory?: ActivityCategory | 'all';
}

const CATEGORY_CONFIG: Record<
  ActivityCategory | 'all',
  { label: string; icon: string; color: string; bg: string }
> = {
  all: { label: 'All Feeds', icon: '📜', color: 'text-white', bg: 'bg-white/10' },
  voice: { label: 'Voice & HUD', icon: '🎙️', color: 'text-cyan-300', bg: 'bg-cyan-950/40 border-cyan-500/30' },
  macro: { label: 'Macros', icon: '⚡', color: 'text-gold-light', bg: 'bg-gold/10 border-gold/30' },
  cartridge: { label: 'Cartridges', icon: '💾', color: 'text-amber-300', bg: 'bg-amber-950/40 border-amber-500/30' },
  knight: { label: 'Knights & Enclaves', icon: '🛡️', color: 'text-violet-light', bg: 'bg-violet/10 border-violet/30' },
  security: { label: 'Security & Auth', icon: '🔒', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/30' },
  config: { label: 'Configurations', icon: '⚙️', color: 'text-blue-300', bg: 'bg-blue-950/40 border-blue-500/30' },
  telemetry: { label: 'Telemetry & Mesh', icon: '📡', color: 'text-pink-300', bg: 'bg-pink-950/40 border-pink-500/30' },
  system: { label: 'System Kernel', icon: '🧠', color: 'text-purple-300', bg: 'bg-purple-950/40 border-purple-500/30' },
  auth: { label: 'Clearance', icon: '🔑', color: 'text-teal-300', bg: 'bg-teal-950/40 border-teal-500/30' },
  general: { label: 'General', icon: '📋', color: 'text-white/70', bg: 'bg-white/5 border-white/10' },
};

const SEVERITY_CONFIG: Record<
  ActivitySeverity,
  { label: string; color: string; badgeBg: string; border: string; dot: string }
> = {
  info: {
    label: 'INFO',
    color: 'text-cyan-300',
    badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    border: 'border-cyan-500/20',
    dot: 'bg-cyan-400',
  },
  success: {
    label: 'SUCCESS',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
  },
  warn: {
    label: 'WARNING',
    color: 'text-amber-300',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400 animate-pulse',
  },
  error: {
    label: 'ERROR',
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/40',
    border: 'border-rose-500/40',
    dot: 'bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-ping',
  },
};

function formatRelativeTime(isoString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export function ActivityLogDisplay({
  embedded = false,
  maxEntries,
  className = '',
  defaultCategory = 'all',
}: ActivityLogDisplayProps) {
  const { logs, logActivity, deleteLog, clearLogs, exportLogs } = useActivityLog();

  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | 'all'>(defaultCategory);
  const [selectedSeverity, setSelectedSeverity] = useState<ActivitySeverity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [customAction, setCustomAction] = useState('');
  const [customDetails, setCustomDetails] = useState('');
  const [customCategory, setCustomCategory] = useState<ActivityCategory>('general');
  const [customSeverity, setCustomSeverity] = useState<ActivitySeverity>('info');
  const [autoScroll, setAutoScroll] = useState(true);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let result = logs;

    if (selectedCategory !== 'all') {
      result = result.filter(
        (log) =>
          (log.category || 'general') === selectedCategory ||
          (selectedCategory === 'system' && log.category === 'auth'),
      );
    }

    if (selectedSeverity !== 'all') {
      result = result.filter((log) => (log.severity || 'info') === selectedSeverity);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (log) =>
          log.action.toLowerCase().includes(q) ||
          log.details.toLowerCase().includes(q) ||
          (log.actor && log.actor.toLowerCase().includes(q)) ||
          (log.category && log.category.toLowerCase().includes(q)),
      );
    }

    if (maxEntries) {
      result = result.slice(0, maxEntries);
    }

    return result;
  }, [logs, selectedCategory, selectedSeverity, searchQuery, maxEntries]);

  // Telemetry metrics
  const metrics = useMemo(() => {
    const total = logs.length;
    const errors = logs.filter((l) => l.severity === 'error').length;
    const warnings = logs.filter((l) => l.severity === 'warn').length;
    const successes = logs.filter((l) => l.severity === 'success').length;
    const voiceCount = logs.filter((l) => l.category === 'voice' || l.action.includes('VOICE')).length;
    const macroCount = logs.filter((l) => l.category === 'macro' || l.action.includes('MACRO')).length;

    return {
      total,
      errors,
      warnings,
      successes,
      voiceCount,
      macroCount,
      healthPercent: total > 0 ? Math.max(0, Math.round(((total - errors) / total) * 100)) : 100,
    };
  }, [logs]);

  // Handle Export
  const handleExportJSON = async () => {
    try {
      const dataStr = exportLogs();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `camelot-activity-ledger-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      triggerHaptic('consent');
      playSpatialTone(0.5, 880, 100, 'sine');
      logActivity('ACTIVITY_LEDGER_EXPORTED', `Exported ${logs.length} ledger events to JSON`, {
        category: 'security',
        severity: 'success',
      });
    } catch (err) {
      console.error('Failed to export ledger', err);
    }
  };

  // Handle Copy Formatted
  const handleCopyFormatted = async () => {
    try {
      const formatted = filteredLogs
        .map(
          (l) =>
            `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.severity || 'INFO'}] [${(
              l.category || 'GEN'
            ).toUpperCase()}] ${l.action} — ${l.details}`,
        )
        .join('\n');
      await navigator.clipboard.writeText(formatted);
      setCopiedId('ALL');
      setTimeout(() => setCopiedId(null), 2000);
      triggerHaptic('click');
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Simulate or Log manual test activity
  const handleSimulateAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAction.trim()) return;

    logActivity(customAction.trim(), customDetails.trim() || 'Manual test verification trigger', {
      category: customCategory,
      severity: customSeverity,
      actor: 'Sovereign Operator',
    });

    setCustomAction('');
    setCustomDetails('');
    setShowSimulateModal(false);
    triggerHaptic('consent');
    playSpatialTone(0.5, 520, 120, 'triangle');
  };

  return (
    <div
      id="activity-log-display-root"
      className={`flex flex-col border border-gold/20 bg-smoke-900/90 text-white shadow-2xl backdrop-blur-xl ${
        embedded ? 'p-4 rounded-xl' : 'p-6 sm:p-8 rounded-2xl w-full min-h-[650px]'
      } ${className}`}
    >
      {/* ── Top Header Section ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gold/15 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold/40 bg-obsidian font-mono text-sm text-gold-royal shadow-gold">
              📜
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl sm:text-2xl font-bold tracking-minted text-gold-light uppercase">
                  Sovereign Activity Ledger
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-950/40 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Observability
                </span>
              </div>
              <p className="font-mono text-[11px] text-white/40 tracking-wider mt-0.5">
                Cryptographically synchronized user events, voice commands & enclave telemetry
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSimulateModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-950/30 px-3 py-1.5 font-mono text-xs text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/40 transition-all active:scale-95"
            title="Inject simulated event into activity ledger"
          >
            <span>➕</span>
            <span>Record Action</span>
          </button>

          <button
            type="button"
            onClick={handleCopyFormatted}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-xs text-white/70 hover:border-white/30 hover:text-white transition-all disabled:opacity-40"
            title="Copy filtered events to clipboard"
          >
            <span>📋</span>
            <span>{copiedId === 'ALL' ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 font-mono text-xs text-gold-royal hover:bg-gold hover:text-obsidian transition-all shadow-gold disabled:opacity-40"
            title="Download full ledger as formatted JSON"
          >
            <span>⬇️</span>
            <span>Export JSON</span>
          </button>

          {showClearConfirm ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-950/60 p-1">
              <span className="font-mono text-[10px] text-rose-300 px-1">Purge all?</span>
              <button
                type="button"
                onClick={() => {
                  clearLogs();
                  setShowClearConfirm(false);
                  triggerHaptic('consent');
                }}
                className="rounded bg-rose-600 px-2 py-0.5 font-mono text-[10px] font-bold text-white hover:bg-rose-500"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/60 hover:text-white"
              >
                No
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              disabled={logs.length === 0}
              className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-950/20 px-2.5 py-1.5 font-mono text-xs text-rose-400 hover:border-rose-500 hover:bg-rose-950/50 transition-all disabled:opacity-30"
              title="Clear all stored logs from memory"
            >
              <span>🗑️</span>
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Telemetry Row ────────────────────────────────── */}
      {!embedded && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 my-6">
          <div className="border border-gold/20 bg-black/40 p-3.5 rounded-xl">
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">Total Ledger Events</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl text-gold-royal tracking-minted">{metrics.total}</span>
              <span className="font-mono text-[10px] text-gold-light">Active Log</span>
            </div>
          </div>

          <div className="border border-emerald-500/20 bg-emerald-950/15 p-3.5 rounded-xl">
            <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400/70">Nominal / Success</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl text-emerald-400 tracking-minted">{metrics.successes}</span>
              <span className="font-mono text-[10px] text-emerald-300/80">{metrics.healthPercent}% health</span>
            </div>
          </div>

          <div className="border border-cyan-400/20 bg-cyan-950/15 p-3.5 rounded-xl">
            <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400/70">Voice & Macros</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl text-cyan-300 tracking-minted">
                {metrics.voiceCount + metrics.macroCount}
              </span>
              <span className="font-mono text-[10px] text-cyan-400/60">routines</span>
            </div>
          </div>

          <div className="border border-rose-500/20 bg-rose-950/15 p-3.5 rounded-xl">
            <span className="font-mono text-[10px] uppercase tracking-wider text-rose-400/70">Exceptions / Alerts</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-display text-2xl text-rose-400 tracking-minted">{metrics.errors + metrics.warnings}</span>
              <span className="font-mono text-[10px] text-rose-300/60">{metrics.errors} critical</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Search & Filter Controls ─────────────────────────── */}
      <div className="flex flex-col gap-3 py-3">
        {/* Search Bar & Auto-scroll Toggle */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-white/40">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search actions, actors, or details (e.g. 'CONFIG', 'VOICE', 'CARTRIDGE')..."
              className="w-full rounded-xl border border-white/10 bg-black/60 pl-9 pr-8 py-2 font-mono text-xs text-white placeholder-white/30 focus:border-gold focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 border border-white/10 bg-black/40 rounded-xl px-3 py-1.5">
              <span className="font-mono text-[10px] text-white/40 uppercase">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value as any)}
                className="bg-transparent font-mono text-xs text-gold-light focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-[#120D22] text-white">All Severities</option>
                <option value="info" className="bg-[#120D22] text-cyan-300">Info Only</option>
                <option value="success" className="bg-[#120D22] text-emerald-400">Success Only</option>
                <option value="warn" className="bg-[#120D22] text-amber-300">Warnings Only</option>
                <option value="error" className="bg-[#120D22] text-rose-400">Errors Only</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setAutoScroll(!autoScroll)}
              className={`rounded-xl border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-all ${
                autoScroll
                  ? 'border-emerald-400/40 bg-emerald-950/30 text-emerald-300'
                  : 'border-white/10 bg-black/40 text-white/40 hover:text-white'
              }`}
              title="Toggle auto-stream highlight"
            >
              {autoScroll ? '● Live Feed' : '⏸ Stream Frozen'}
            </button>
          </div>
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {(Object.keys(CATEGORY_CONFIG) as (ActivityCategory | 'all')[]).map((catKey) => {
            const config = CATEGORY_CONFIG[catKey];
            const isSelected = selectedCategory === catKey;
            const count =
              catKey === 'all'
                ? logs.length
                : logs.filter((l) => (l.category || 'general') === catKey).length;

            return (
              <button
                key={catKey}
                type="button"
                onClick={() => {
                  setSelectedCategory(catKey);
                  triggerHaptic('click');
                }}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-[11px] whitespace-nowrap transition-all select-none border ${
                  isSelected
                    ? 'border-gold-royal bg-gold/20 text-gold-light shadow-gold font-bold scale-[1.02]'
                    : 'border-white/10 bg-black/40 text-white/50 hover:border-white/20 hover:text-white/80'
                }`}
              >
                <span>{config.icon}</span>
                <span>{config.label}</span>
                <span
                  className={`ml-1 rounded px-1.5 py-0.2 text-[9px] ${
                    isSelected ? 'bg-gold-royal text-obsidian font-bold' : 'bg-white/10 text-white/40'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Real-Time Activity Log Feed ─────────────────────── */}
      <div className="mt-4 flex-1 flex flex-col min-h-[350px]">
        <div className="flex items-center justify-between px-2 pb-2 text-[10px] font-mono uppercase tracking-widest text-white/30 border-b border-white/5">
          <span>Action / Event</span>
          <div className="flex items-center gap-6">
            <span className="hidden sm:inline">Actor & Category</span>
            <span>Timestamp</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[500px] divide-y divide-white/5 custom-scrollbar pr-1 mt-1">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="text-4xl mb-3 opacity-30">📜</span>
              <p className="font-display text-base text-white/60 tracking-wider uppercase">
                No ledger records found
              </p>
              <p className="font-mono text-xs text-white/30 max-w-sm mt-1">
                {searchQuery || selectedCategory !== 'all' || selectedSeverity !== 'all'
                  ? 'No activity matched the current filters. Try resetting search or category.'
                  : 'Interact with the Arthurian Camelot OS (voice, cartridges, macros) to stream live events.'}
              </p>
              {(searchQuery || selectedCategory !== 'all' || selectedSeverity !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedSeverity('all');
                  }}
                  className="mt-4 rounded-lg border border-gold/40 px-3 py-1 font-mono text-xs text-gold-light hover:bg-gold/10"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const cat = entry.category || 'general';
              const catConf = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general;
              const sev = entry.severity || 'info';
              const sevConf = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.info;
              const isExpanded = expandedLogId === entry.id;

              return (
                <div
                  key={entry.id}
                  onClick={() => setExpandedLogId(isExpanded ? null : entry.id)}
                  className={`group relative flex flex-col p-3 transition-all cursor-pointer rounded-lg my-1 ${
                    isExpanded
                      ? 'bg-[#181128] border border-gold/30 shadow-[0_0_15px_rgba(255,215,0,0.15)]'
                      : 'hover:bg-white/[0.03] border border-transparent'
                  }`}
                >
                  {/* Main Event Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      {/* Status indicator dot & category icon */}
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        <span className={`h-2 w-2 rounded-full ${sevConf.dot}`} />
                        <span className="text-sm" title={catConf.label}>
                          {catConf.icon}
                        </span>
                      </div>

                      {/* Action Title & Detail */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white group-hover:text-gold-light tracking-wide truncate">
                            {entry.action}
                          </span>

                          <span
                            className={`rounded border px-1.5 py-0.2 font-mono text-[8px] font-bold uppercase tracking-wider ${sevConf.badgeBg}`}
                          >
                            {sevConf.label}
                          </span>

                          {entry.actor && (
                            <span className="hidden sm:inline font-mono text-[9px] text-white/40 border border-white/10 rounded px-1">
                              👤 {entry.actor}
                            </span>
                          )}
                        </div>

                        <p className="font-mono text-xs text-white/60 mt-1 line-clamp-2 leading-relaxed">
                          {entry.details}
                        </p>
                      </div>
                    </div>

                    {/* Timestamp & Actions */}
                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <span className="font-mono text-[10px] text-gold-light/90">
                        {formatRelativeTime(entry.timestamp)}
                      </span>
                      <span className="font-mono text-[9px] text-white/30">
                        {new Date(entry.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div
                      className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2.5 animate-in fade-in duration-150"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono bg-black/50 p-2.5 rounded-lg border border-white/10">
                        <div>
                          <span className="text-white/40 uppercase">Event ID:</span>{' '}
                          <span className="text-white/80 select-all">{entry.id}</span>
                        </div>
                        <div>
                          <span className="text-white/40 uppercase">ISO Timestamp:</span>{' '}
                          <span className="text-white/80 select-all">{entry.timestamp}</span>
                        </div>
                        <div>
                          <span className="text-white/40 uppercase">Category:</span>{' '}
                          <span className="text-gold-light">{catConf.label}</span>
                        </div>
                        <div>
                          <span className="text-white/40 uppercase">Actor:</span>{' '}
                          <span className="text-cyan-300">{entry.actor || 'System Default'}</span>
                        </div>
                      </div>

                      {entry.metadata && (
                        <div className="bg-black/80 p-2.5 rounded-lg border border-white/10">
                          <span className="font-mono text-[9px] text-white/40 uppercase tracking-widest block mb-1">
                            Extended Metadata Payload:
                          </span>
                          <pre className="font-mono text-[10px] text-emerald-300 overflow-x-auto">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="font-mono text-[9px] text-white/30">
                          Click entry again to collapse
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
                              setCopiedId(entry.id);
                              setTimeout(() => setCopiedId(null), 1500);
                              triggerHaptic('click');
                            }}
                            className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/70 hover:bg-white/10"
                          >
                            {copiedId === entry.id ? '✓ Copied' : 'Copy JSON'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              deleteLog(entry.id);
                              triggerHaptic('click');
                            }}
                            className="rounded border border-rose-500/40 bg-rose-950/30 px-2 py-0.5 font-mono text-[10px] text-rose-300 hover:bg-rose-900/50"
                          >
                            Delete Record
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Record / Simulate Event Modal ────────────────────── */}
      {showSimulateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setShowSimulateModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border-2 border-gold/40 bg-[#0E0C18] p-6 text-white shadow-[0_0_50px_rgba(255,215,0,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl text-gold-royal">✍️</span>
                <h3 className="font-display text-lg font-bold text-gold-light uppercase tracking-wider">
                  Record Ledger Action
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="text-white/40 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimulateAction} className="mt-4 space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">
                  Action Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. USER_CLEARANCE_CHECK, CART_SLOT_MOUNT, VOICE_INTENT"
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 font-mono text-xs text-white placeholder-white/25 focus:border-gold focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">
                  Details & Context
                </label>
                <textarea
                  rows={2}
                  placeholder="Details of the operational state or user command..."
                  value={customDetails}
                  onChange={(e) => setCustomDetails(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-black/60 px-3 py-2 font-mono text-xs text-white placeholder-white/25 focus:border-gold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">
                    Category
                  </label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as any)}
                    className="w-full rounded-lg border border-white/15 bg-black/60 px-2.5 py-2 font-mono text-xs text-gold-light focus:border-gold focus:outline-none"
                  >
                    <option value="general">General</option>
                    <option value="voice">Voice & HUD</option>
                    <option value="macro">Macros</option>
                    <option value="cartridge">Cartridges</option>
                    <option value="knight">Knights & Enclaves</option>
                    <option value="security">Security & Auth</option>
                    <option value="config">Configurations</option>
                    <option value="telemetry">Telemetry</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-white/40 mb-1">
                    Severity Tier
                  </label>
                  <select
                    value={customSeverity}
                    onChange={(e) => setCustomSeverity(e.target.value as any)}
                    className="w-full rounded-lg border border-white/15 bg-black/60 px-2.5 py-2 font-mono text-xs text-gold-light focus:border-gold focus:outline-none"
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowSimulateModal(false)}
                  className="rounded-lg border border-white/15 px-4 py-2 font-mono text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg border border-gold bg-gold/20 px-5 py-2 font-mono text-xs font-bold text-gold-royal hover:bg-gold hover:text-obsidian transition-all shadow-gold"
                >
                  Append to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
