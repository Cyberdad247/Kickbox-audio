'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  deleteMemoryEntry,
  loadMemoryEntries,
  type MemoryEntry,
} from '../lib/portalBridge';

// Lakisha "Learn With Me" curator. Reads `audit-kickbox-audio/apps/pwa/public/memory.md`
// (served from `/memory.md` via Next.js public dir), lists each `- [date]` line
// as a card with a [DELETE] action. DELETE is local-state only today; the
// server-side `/api/memory/delete` route is gated for a future change.
//
// Currently UNMOUNTED in `apps/pwa/src/app/page.tsx` per the Lakisha-only
// directive.

type CuratorStatus = 'idle' | 'loading' | 'ready' | 'error';

export function LearnWithMe() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [status, setStatus] = useState<CuratorStatus>('idle');
  const [removing, setRemoving] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    loadMemoryEntries(undefined, controller.signal)
      .then((rows) => {
        setEntries(rows);
        setStatus('ready');
      })
      .catch(() => {
        // Don't flip to error after an unmount-triggered abort.
        if (!controller.signal.aborted) setStatus('error');
      });
    return () => controller.abort();
  }, []);

  const onDelete = useCallback(async (line: number) => {
    setRemoving(line);
    const persisted = await deleteMemoryEntry(line);
    if (!persisted) {
      // Local-state fallback until /api/memory/delete lands.
      setEntries((rows) => rows.filter((r) => r.line !== line));
    }
    setRemoving(null);
  }, []);

  return (
    <section className="border border-filigree-500/40 bg-plate-900/95 p-6 backdrop-blur-plate">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="font-serif text-sm tracking-executive text-gold-royal">Learn With Me</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
          {status} · {entries.length} entries
        </span>
      </header>
      {status === 'loading' && (
        <p className="font-mono text-xs text-white/50">// loading memory.md…</p>
      )}
      {status === 'error' && (
        <p className="font-mono text-xs text-gold-light">
          // /memory.md unreachable; check apps/pwa/public/memory.md
        </p>
      )}
      {status === 'ready' && entries.length === 0 && (
        <p className="font-mono text-xs text-white/50">
          // no learned aspects yet — append to memory.md
        </p>
      )}
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li
            key={entry.line}
            className="flex items-start gap-3 border border-white/5 bg-void-950/85 px-3 py-2 font-mono text-xs text-white/80"
          >
            <span className="shrink-0 text-gold-light">[{entry.line}]</span>
            <span className="flex-1">{entry.text}</span>
            <button
              type="button"
              onClick={() => onDelete(entry.line)}
              disabled={removing === entry.line}
              className="shrink-0 border border-gold/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gold-light transition-colors hover:bg-violet/15 disabled:opacity-40"
            >
              {removing === entry.line ? '…' : 'DELETE'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
