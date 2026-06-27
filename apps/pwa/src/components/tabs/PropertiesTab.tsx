'use client';

import { useState } from 'react';
import { dispatchPlumberAction, type DispatchPlumberResult } from '../../actions/propertyActions';

// Static baseline units and tenants (demo reference)
const BASELINE_TENANTS = [
  { name: 'Obsidian Tower · Unit 12', status: 'Occupied' },
  { name: 'Gold Quarter · Unit 4', status: 'Maintenance' },
  { name: 'Violet Heights · Unit 8', status: 'Occupied' },
];

export function PropertiesTab() {
  const [tenants] = useState(BASELINE_TENANTS);
  const [tickets, setTickets] = useState<DispatchPlumberResult[]>([
    {
      status: 'RESOLVING',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      ticketId: 'PLUMB-4821',
      unit: 'Gold Quarter · Unit 4',
      issue: 'Burst pipe check',
      priority: 'HIGH',
    },
  ]);

  const [unit, setUnit] = useState('Obsidian Tower · Unit 12');
  const [issue, setIssue] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [dispatching, setDispatching] = useState(false);

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issue.trim()) return;

    try {
      setDispatching(true);
      // Execute the isomorphic action
      const result = await dispatchPlumberAction.run({
        unit,
        issue,
        priority,
      });

      setTickets((prev) => [result, ...prev]);
      setIssue('');
    } catch (err) {
      console.error('Failed to run isomorphic dispatch action:', err);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Isomorphic Action Dispatcher Form ─────────────────── */}
      <form
        onSubmit={handleDispatch}
        className="border border-gold/20 bg-[#16161E]/70 p-6 backdrop-blur-xl"
      >
        <h2 className="font-serif text-sm uppercase tracking-[0.16em] text-gold-royal">
          Isomorphic Dispatch · Plumber Pipeline
        </h2>
        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
          Execute action definition shared between agents and browser UI
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-[9px] uppercase tracking-[0.16em] text-white/40">Target Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="mt-1.5 w-full border border-gold/20 bg-[#050505] px-3 py-2 font-mono text-xs text-white outline-none focus:border-violet/60"
            >
              {tenants.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-[0.16em] text-white/40">Severity / Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')}
              className="mt-1.5 w-full border border-gold/20 bg-[#050505] px-3 py-2 font-mono text-xs text-white outline-none focus:border-violet/60"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <div className="sm:col-span-1">
            <label className="block text-[9px] uppercase tracking-[0.16em] text-white/40">Issue Description</label>
            <input
              type="text"
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="e.g. Master valve leakage..."
              className="mt-1.5 w-full border border-gold/20 bg-[#050505] px-3 py-2 font-mono text-xs text-white placeholder-white/20 outline-none focus:border-violet/60"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={dispatching || !issue.trim()}
            className="border border-gold/40 bg-[#050505]/75 px-5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-gold-light transition-colors hover:border-violet hover:text-violet-light disabled:opacity-40"
          >
            {dispatching ? 'Executing Action…' : 'Execute Dispatch'}
          </button>
        </div>
      </form>

      {/* ── Active Visual Plan UI Cards ───────────────────────── */}
      <div className="space-y-4">
        <h3 className="font-serif text-sm uppercase tracking-[0.16em] text-gold-royal">
          Visual Dispatch Plans
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((t) => (
            <article
              key={t.ticketId}
              className="group relative border border-gold/20 bg-[#16161E]/70 p-6 backdrop-blur-xl transition-shadow hover:shadow-[0_0_12px_rgba(157,78,221,0.22)]"
            >
              {/* Electric Violet active glow for critical tickets */}
              {t.priority === 'CRITICAL' && (
                <div className="absolute inset-0 -z-10 bg-violet/5 opacity-0 blur-md transition-opacity group-hover:opacity-100" />
              )}

              <header className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
                    {t.ticketId}
                  </span>
                  <h4 className="font-display text-lg text-white mt-1">{t.unit}</h4>
                </div>
                <span
                  className={`border px-2 py-0.5 font-mono text-[9px] ${
                    t.priority === 'CRITICAL'
                      ? 'border-violet text-violet-light bg-violet/10'
                      : t.priority === 'HIGH'
                      ? 'border-gold/60 text-gold-light bg-gold/5'
                      : 'border-white/20 text-white/60'
                  }`}
                >
                  {t.priority}
                </span>
              </header>

              <p className="mt-3 font-mono text-xs text-white/70 leading-relaxed">
                {t.issue}
              </p>

              {/* Visual Plan Progress Steps */}
              <div className="mt-6 space-y-3 border-t border-white/5 pt-4">
                <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider">
                  <span className="text-white/40">Current Step:</span>
                  <span className="text-gold-light">{t.status}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-1">
                  <div className="h-1 bg-gold-royal" title="Created" />
                  <div
                    className={`h-1 ${
                      t.status === 'RESOLVING' || t.status === 'DISPATCHED'
                        ? 'bg-gold-light'
                        : 'bg-white/10'
                    }`}
                    title="Dispatched"
                  />
                  <div
                    className={`h-1 ${t.status === 'RESOLVING' ? 'bg-violet' : 'bg-white/10'}`}
                    title="Resolving"
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
