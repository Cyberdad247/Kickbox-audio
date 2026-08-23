'use client';

import type React from 'react';
import { useMemo, useState } from 'react';
import { useMacros } from '../../context/MacroContext';
import type { MacroExecutionLog } from '../../types/macro';

export interface CommandLogProps {
  className?: string;
  maxHeight?: string;
  showQuickExecute?: boolean;
}

export function CommandLog({
  className = '',
  maxHeight = 'max-h-[500px]',
  showQuickExecute = true,
}: CommandLogProps) {
  const { executionLogs, macros, executeMacro, matchMacro, clearLogs, deleteLogs } = useMacros();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'success' | 'running' | 'failed' | 'hitl_pending'
  >('all');
  const [triggerFilter, setTriggerFilter] = useState<'all' | 'voice' | 'ui_test' | 'shortcut'>(
    'all',
  );

  // Bulk selection state
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());

  // Quick Command input state
  const [quickInput, setQuickInput] = useState('');
  const [quickStatus, setQuickStatus] = useState<string | null>(null);

  // Track re-triggering animation/status per log item
  const [reTriggeringId, setReTriggeringId] = useState<string | null>(null);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return executionLogs.filter((log) => {
      // Status filter
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;

      // Trigger filter
      if (triggerFilter !== 'all' && log.triggeredBy !== triggerFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = log.macroName.toLowerCase().includes(q);
        const matchPhrase = log.phrase.toLowerCase().includes(q);
        const matchDetails = log.details?.toLowerCase().includes(q) ?? false;
        return matchName || matchPhrase || matchDetails;
      }

      return true;
    });
  }, [executionLogs, statusFilter, triggerFilter, searchQuery]);

  // Compute selection state
  const isAllFilteredSelected = useMemo(() => {
    if (filteredLogs.length === 0) return false;
    return filteredLogs.every((log) => selectedLogIds.has(log.id));
  }, [filteredLogs, selectedLogIds]);

  const toggleSelectLog = (id: string) => {
    setSelectedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedLogIds((prev) => {
        const next = new Set(prev);
        filteredLogs.forEach((log) => next.delete(log.id));
        return next;
      });
    } else {
      setSelectedLogIds((prev) => {
        const next = new Set(prev);
        filteredLogs.forEach((log) => next.add(log.id));
        return next;
      });
    }
  };

  const handleDeleteSelected = () => {
    if (selectedLogIds.size === 0) return;
    const count = selectedLogIds.size;
    const idsToDelete = Array.from(selectedLogIds);
    deleteLogs(idsToDelete);
    setSelectedLogIds(new Set());
    setQuickStatus(`✓ Cleared ${count} selected command log ${count === 1 ? 'entry' : 'entries'}`);
  };

  // Compute metrics
  const stats = useMemo(() => {
    const total = executionLogs.length;
    if (total === 0) return { total: 0, successCount: 0, successRate: 0, avgLatency: 0 };
    const successCount = executionLogs.filter((l) => l.status === 'success').length;
    const successRate = Math.round((successCount / total) * 100);
    const sumLatency = executionLogs.reduce((acc, l) => acc + (l.latencyMs || 0), 0);
    const avgLatency = Math.round(sumLatency / total);
    return { total, successCount, successRate, avgLatency };
  }, [executionLogs]);

  // Re-trigger command handler
  const handleReTrigger = async (log: MacroExecutionLog) => {
    setReTriggeringId(log.id);
    setQuickStatus(`⚡ Re-triggering "${log.macroName}"...`);

    try {
      // Try finding macro by macroId or match phrase
      let targetMacro = macros.find((m) => m.id === log.macroId);
      if (!targetMacro && log.phrase) {
        targetMacro = matchMacro(log.phrase) ?? undefined;
      }

      let success = false;
      if (targetMacro) {
        success = await executeMacro(targetMacro, 'ui_test');
      } else if (log.phrase) {
        success = await executeMacro(log.phrase, 'ui_test');
      }

      if (success) {
        setQuickStatus(`✓ Re-triggered "${log.macroName}" successfully!`);
      } else {
        setQuickStatus(
          `⚠ Could not re-trigger command "${log.macroName}". Check if macro is enabled.`,
        );
      }
    } catch (err) {
      setQuickStatus(`⚠ Re-trigger error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTimeout(() => {
        setReTriggeringId(null);
      }, 800);
    }
  };

  // Quick Command Execution
  const handleQuickExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    const phrase = quickInput.trim();
    setQuickStatus(`⚡ Executing command: "${phrase}"...`);

    const matched = matchMacro(phrase);
    if (matched) {
      const ok = await executeMacro(matched, 'ui_test');
      if (ok) {
        setQuickStatus(`✓ Executed "${matched.name}" (${matched.phrase})`);
        setQuickInput('');
      } else {
        setQuickStatus(`⚠ Execution failed for "${matched.name}".`);
      }
    } else {
      // Try executing directly by phrase
      const ok = await executeMacro(phrase, 'ui_test');
      if (ok) {
        setQuickStatus(`✓ Dispatched command phrase: "${phrase}"`);
        setQuickInput('');
      } else {
        setQuickStatus(`⚠ No matching voice macro found for "${phrase}".`);
      }
    }
  };

  return (
    <div
      className={`border border-gold/25 bg-black/85 p-4 rounded-lg shadow-xl space-y-4 font-mono ${className}`}
    >
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/20 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📜</span>
          <div>
            <h3 className="text-sm font-bold text-gold uppercase tracking-wider">
              Command Log & Action Audit Trail
            </h3>
            <p className="text-[10px] text-white/50">
              Scrollable history of executed voice macros, system actions & hotkeys
            </p>
          </div>
        </div>

        {/* METRICS & CLEAR */}
        <div className="flex flex-wrap items-center gap-2">
          {stats.total > 0 && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-2.5 py-1 rounded text-[10px] text-white/70">
              <span>
                Total: <strong className="text-gold-light">{stats.total}</strong>
              </span>
              <span className="text-white/20">|</span>
              <span>
                Success: <strong className="text-emerald-400">{stats.successRate}%</strong>
              </span>
              <span className="text-white/20">|</span>
              <span>
                Avg Latency: <strong className="text-cyan-300">{stats.avgLatency}ms</strong>
              </span>
            </div>
          )}

          {executionLogs.length > 0 && (
            <button
              type="button"
              onClick={clearLogs}
              className="border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[10px] uppercase text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50 transition-colors rounded flex items-center gap-1"
              title="Clear all execution logs"
            >
              <span>🗑️</span>
              <span>Clear Log</span>
            </button>
          )}
        </div>
      </div>

      {/* QUICK COMMAND INPUT BAR */}
      {showQuickExecute && (
        <form onSubmit={handleQuickExecute} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold/70 text-xs">
                ⚡
              </span>
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                placeholder='Type command phrase (e.g. "morning briefing", "emergency freeze")...'
                className="w-full bg-black/60 border border-gold/30 rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </div>
            <button
              type="submit"
              disabled={!quickInput.trim()}
              className="border border-gold/50 bg-gold/20 px-3.5 py-1.5 text-xs font-bold text-gold-royal hover:bg-gold/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded shrink-0 flex items-center gap-1"
            >
              <span>▶</span>
              <span>Execute</span>
            </button>
          </div>

          {quickStatus && (
            <div className="text-[11px] text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded flex items-center justify-between">
              <span>{quickStatus}</span>
              <button
                type="button"
                onClick={() => setQuickStatus(null)}
                className="text-white/40 hover:text-white text-[10px]"
              >
                ✕
              </button>
            </div>
          )}
        </form>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-black/40 border border-white/10 p-2 rounded">
        {/* Select All Checkbox / Toggle */}
        {filteredLogs.length > 0 && (
          <button
            type="button"
            onClick={handleSelectAllFiltered}
            className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1.5 transition-colors ${
              isAllFilteredSelected
                ? 'border-gold bg-gold/20 text-gold-light'
                : 'border-white/20 bg-white/5 text-white/70 hover:bg-white/10'
            }`}
            title={
              isAllFilteredSelected ? 'Deselect all visible entries' : 'Select all visible entries'
            }
          >
            <input
              type="checkbox"
              checked={isAllFilteredSelected}
              onChange={() => {}} // handled by button click
              className="accent-gold rounded h-3 w-3 cursor-pointer"
            />
            <span>Select All ({filteredLogs.length})</span>
          </button>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 text-xs">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search command logs..."
            className="w-full bg-black/50 border border-white/15 rounded pl-7 pr-2 py-1 text-[11px] text-white placeholder-white/30 focus:outline-none focus:border-gold/60"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-[10px]"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-white/40 mr-1">Status:</span>
          {(['all', 'success', 'running', 'failed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2 py-0.5 rounded uppercase transition-colors ${
                statusFilter === st
                  ? 'bg-gold/20 border border-gold text-gold font-bold'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Trigger Filter */}
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-white/40 mr-1">Source:</span>
          {(['all', 'voice', 'ui_test', 'shortcut'] as const).map((tr) => (
            <button
              key={tr}
              type="button"
              onClick={() => setTriggerFilter(tr)}
              className={`px-2 py-0.5 rounded uppercase transition-colors ${
                triggerFilter === tr
                  ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:text-white'
              }`}
            >
              {tr === 'ui_test' ? 'ui' : tr}
            </button>
          ))}
        </div>
      </div>

      {/* BULK SELECTION ACTION BANNER */}
      {selectedLogIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-950/40 border border-amber-500/50 p-2.5 rounded-lg shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold text-xs">☑</span>
            <span className="text-xs text-amber-200 font-semibold">
              {selectedLogIds.size} command log {selectedLogIds.size === 1 ? 'entry' : 'entries'}{' '}
              selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="border border-rose-500/60 bg-rose-500/20 px-3 py-1 text-xs font-bold text-rose-200 hover:bg-rose-500/30 hover:border-rose-400 transition-colors rounded flex items-center gap-1.5 shadow-md"
            >
              <span>🗑️</span>
              <span>Clear Selected ({selectedLogIds.size})</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedLogIds(new Set())}
              className="border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded"
            >
              ✕ Cancel
            </button>
          </div>
        </div>
      )}

      {/* COMMAND LOG HISTORY LIST */}
      <div className={`overflow-y-auto pr-1 space-y-2.5 ${maxHeight}`}>
        {filteredLogs.map((log) => {
          const isReTriggering = reTriggeringId === log.id;
          const isSelected = selectedLogIds.has(log.id);

          return (
            <div
              key={log.id}
              className={`group relative border transition-all p-3 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isSelected
                  ? 'border-gold/70 bg-gold/10 shadow-[0_0_12px_rgba(255,215,0,0.15)]'
                  : log.status === 'success'
                    ? 'border-emerald-500/30 bg-black/70 hover:border-emerald-500/60'
                    : log.status === 'running'
                      ? 'border-amber-400/50 bg-amber-950/20 animate-pulse'
                      : log.status === 'failed'
                        ? 'border-rose-500/40 bg-rose-950/20'
                        : 'border-white/15 bg-black/60'
              }`}
            >
              {/* Left Column: Selection Checkbox & Command Info */}
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {/* Checkbox for bulk select */}
                <div className="pt-0.5 shrink-0 flex items-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectLog(log.id)}
                    className="accent-gold rounded h-4 w-4 cursor-pointer"
                    title={`Select entry for bulk actions`}
                  />
                </div>

                {/* Status indicator icon */}
                <div className="mt-0.5 shrink-0">
                  {log.status === 'success' && (
                    <span className="text-emerald-400 text-sm" title="Execution Succeeded">
                      ✅
                    </span>
                  )}
                  {log.status === 'running' && (
                    <span
                      className="text-amber-400 text-sm animate-spin"
                      title="Executing Steps..."
                    >
                      ⏳
                    </span>
                  )}
                  {log.status === 'failed' && (
                    <span className="text-rose-400 text-sm" title="Execution Failed">
                      ❌
                    </span>
                  )}
                  {log.status === 'hitl_pending' && (
                    <span className="text-amber-300 text-sm" title="HITL Confirmation Required">
                      🔒
                    </span>
                  )}
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-xs text-white group-hover:text-gold-light truncate">
                      {log.macroName}
                    </span>
                    <span className="border border-gold/30 bg-gold/10 px-1.5 py-0.2 text-[9px] text-gold-light rounded uppercase truncate">
                      Trigger: "{log.phrase}"
                    </span>
                    <span className="bg-white/10 text-white/60 px-1.5 py-0.2 text-[8px] rounded uppercase">
                      via {log.triggeredBy}
                    </span>
                  </div>

                  {/* Details / Step Progress */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/50">
                    <span>
                      Steps:{' '}
                      <strong className="text-white/80">
                        {log.stepsCompleted}/{log.stepsTotal}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Latency: <strong className="text-cyan-300">{log.latencyMs}ms</strong>
                    </span>
                    <span>•</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {log.details && (
                    <p className="text-[10px] text-white/60 bg-black/40 p-1.5 rounded border border-white/5 line-clamp-2">
                      {log.details}
                    </p>
                  )}
                </div>
              </div>

              {/* Right Column: Re-trigger Action Button */}
              <div className="shrink-0 flex items-center justify-end sm:justify-start">
                <button
                  type="button"
                  onClick={() => handleReTrigger(log)}
                  disabled={isReTriggering}
                  className={`border px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
                    isReTriggering
                      ? 'border-gold bg-gold text-black animate-pulse'
                      : 'border-gold/40 bg-gold/15 text-gold-light hover:bg-gold/30 hover:border-gold hover:text-white hover:shadow-[0_0_12px_rgba(255,215,0,0.3)]'
                  }`}
                  title={`Re-trigger command "${log.macroName}" immediately`}
                >
                  <span className={isReTriggering ? 'animate-spin' : ''}>
                    {isReTriggering ? '⏳' : '▶'}
                  </span>
                  <span>{isReTriggering ? 'Re-executing...' : 'Re-trigger'}</span>
                </button>
              </div>
            </div>
          );
        })}

        {/* EMPTY STATE */}
        {filteredLogs.length === 0 && (
          <div className="p-8 text-center border border-dashed border-white/15 bg-black/40 rounded-lg space-y-3">
            <span className="text-3xl block opacity-60">📜</span>
            <div className="space-y-1">
              <p className="text-xs font-bold text-white/70 uppercase">No Command Logs Found</p>
              <p className="text-[10px] text-white/40 max-w-sm mx-auto">
                {executionLogs.length === 0
                  ? 'No macro or system actions have been executed in this session. Trigger a voice macro or use the input bar above to run commands.'
                  : 'No logs match your search or filter criteria.'}
              </p>
            </div>

            {/* Quick Sample Commands */}
            <div className="pt-2 flex flex-wrap justify-center gap-2">
              {['morning briefing', 'emergency freeze', 'navigate tab bifrost'].map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => {
                    setQuickInput(cmd);
                  }}
                  className="border border-gold/30 bg-gold/10 px-2 py-1 text-[10px] text-gold-light hover:bg-gold/20 rounded"
                >
                  Try "{cmd}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
