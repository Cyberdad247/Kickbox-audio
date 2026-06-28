'use client';

import { useState } from 'react';
import { KNIGHTS, type Knight } from '../../lib/realm-data';
import { KnightConsole } from '../KnightConsole';

const statusDot: Record<Knight['status'], string> = {
  active: 'bg-violet shadow-glow',
  busy: 'bg-gold-royal shadow-gold',
  idle: 'bg-white/30',
};

function KnightCard({ knight, onOpen }: { knight: Knight; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col border border-gold/20 bg-smoke-800/80 p-5 text-left backdrop-blur-sm transition-shadow hover:border-gold/40 hover:shadow-gold"
    >
      <div className="flex w-full items-start justify-between">
        <div>
          <p className="font-display text-2xl text-gold-royal tracking-minted">{knight.name}</p>
          <p className="mt-0.5 text-[11px] text-white/40 uppercase tracking-[0.16em]">
            {knight.title} · {knight.domain}
          </p>
        </div>
        <span className="mt-1 flex items-center gap-1.5 text-[10px] text-white/45 uppercase tracking-widest">
          <span className={`h-2 w-2 rounded-full ${statusDot[knight.status]}`} />
          {knight.status}
        </span>
      </div>
      <p className="mt-4 flex-1 text-sm text-white/55">{knight.task}</p>
      <span className="mt-4 self-start border border-violet/50 px-3 py-1.5 text-[11px] text-violet-light uppercase tracking-widest transition-colors group-hover:bg-violet/15">
        Open Console
      </span>
    </button>
  );
}

export function KnightsTab() {
  const [selected, setSelected] = useState<Knight | null>(null);
  const active = KNIGHTS.filter((k) => k.status !== 'idle').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border border-gold/20 bg-smoke-900/60 px-6 py-4 backdrop-blur-sm">
        <span className="text-[11px] text-white/40 uppercase tracking-[0.2em]">
          The Swarm Roster
        </span>
        <span className="font-display text-gold-royal text-xl tracking-minted">
          {active}/{KNIGHTS.length} engaged
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {KNIGHTS.map((k) => (
          <KnightCard key={k.id} knight={k} onOpen={() => setSelected(k)} />
        ))}
      </div>
      {selected && <KnightConsole knight={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
