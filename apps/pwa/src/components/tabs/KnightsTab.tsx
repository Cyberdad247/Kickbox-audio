'use client';

import { useBifrost } from '../../context/BifrostContext';
import { KNIGHTS, type Knight } from '../../lib/realm-data';

const statusDot: Record<Knight['status'], string> = {
  active: 'bg-violet shadow-glow',
  busy: 'bg-gold-royal shadow-gold',
  idle: 'bg-white/30',
};

function KnightCard({ knight }: { knight: Knight }) {
  const { sendVoiceCommand, connected } = useBifrost();
  return (
    <div className="flex flex-col border border-gold/20 bg-smoke-800/80 p-5 backdrop-blur-sm transition-shadow hover:shadow-gold">
      <div className="flex items-start justify-between">
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
      <button
        type="button"
        disabled={!connected}
        onClick={() => sendVoiceCommand(`dispatch ${knight.id}`)}
        className="mt-4 self-start border border-violet/50 px-3 py-1.5 text-[11px] text-violet-light uppercase tracking-widest transition-colors hover:bg-violet/15 disabled:opacity-40"
      >
        Dispatch
      </button>
    </div>
  );
}

export function KnightsTab() {
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
          <KnightCard key={k.id} knight={k} />
        ))}
      </div>
    </div>
  );
}
