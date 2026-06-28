'use client';

import { useState, useEffect, useCallback } from 'react';

interface MemoryEntry {
  line: number;
  text: string;
}

export function MemoryVault() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [adding, setAdding] = useState(false);
  const [deletingLine, setDeletingLine] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/memory');
      if (!res.ok) throw new Error('Failed to fetch memory aspects');
      const data = await res.json() as { entries: MemoryEntry[] };
      setEntries(data.entries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error loading memory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      setAdding(true);
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });
      if (!res.ok) throw new Error('Failed to append aspect');
      setInputText('');
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding aspect');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (line: number) => {
    try {
      setDeletingLine(line);
      const res = await fetch(`/api/memory?line=${line}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete aspect');
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting aspect');
    } finally {
      setDeletingLine(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Memory Ingestion Form ────────────────────────────── */}
      <form
        onSubmit={handleAdd}
        className="border border-gold/20 bg-[#16161E]/70 p-6 backdrop-blur-xl"
      >
        <h2 className="font-serif text-sm uppercase tracking-[0.16em] text-gold-royal">
          Learn With Me · Aspect Ingestion
        </h2>
        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
          Record persistent repository observations directly into memory.md
        </p>

        <div className="mt-4 flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter a new learned aspect (e.g. Lakisha HUD bottom-center positioning)..."
            disabled={adding}
            className="flex-1 border border-gold/20 bg-[#050505] px-4 py-2 font-mono text-xs text-white placeholder-white/20 outline-none focus:border-violet/60"
          />
          <button
            type="submit"
            disabled={adding || !inputText.trim()}
            className="border border-gold/40 bg-[#050505]/75 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-gold-light transition-colors hover:border-violet hover:text-violet-light disabled:opacity-40"
          >
            {adding ? 'Ingesting…' : 'Ingest Aspect'}
          </button>
        </div>
      </form>

      {/* ── Memory Inventory List ────────────────────────────── */}
      <div className="border border-gold/20 bg-[#16161E]/70 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-sm uppercase tracking-[0.16em] text-gold-royal">
            Active Memory Index
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40">
            {entries.length} Aspects Recorded
          </span>
        </div>

        {error && (
          <div className="mt-4 border border-violet/30 bg-violet/5 px-4 py-2 font-mono text-xs text-violet-light">
            // ERROR: {error}
          </div>
        )}

        {loading ? (
          <p className="mt-4 font-mono text-xs text-white/50">// Reading memory.md index…</p>
        ) : entries.length === 0 ? (
          <p className="mt-4 font-mono text-xs text-white/40">// Zero learned aspects recorded.</p>
        ) : (
          <ul className="mt-4 divide-y divide-white/5">
            {entries.map((entry) => (
              <li
                key={entry.line}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-start gap-3 font-mono text-xs">
                  <span className="text-gold-light select-none">[{entry.line}]</span>
                  <span className="text-white/80 leading-relaxed">{entry.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.line)}
                  disabled={deletingLine === entry.line}
                  className="shrink-0 border border-gold/25 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gold-light transition-all hover:border-violet hover:bg-violet/10 hover:text-violet-light disabled:opacity-30"
                >
                  {deletingLine === entry.line ? 'Wiping…' : 'Wipe'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
