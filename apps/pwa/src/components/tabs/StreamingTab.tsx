'use client';

import { STREAM_NODES } from '../../lib/realm-data';

export function StreamingTab() {
  const liveViewers = STREAM_NODES.reduce((n, s) => n + s.viewers, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border border-gold/20 bg-smoke-900/60 px-6 py-4 backdrop-blur-sm">
        <span className="text-[11px] text-white/40 uppercase tracking-[0.2em]">
          KBA Streaming · Live
        </span>
        <span className="font-display text-gold-royal text-xl tracking-minted">
          {liveViewers.toLocaleString('en-US')} viewers
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STREAM_NODES.map((s) => (
          <div
            key={s.region}
            className="border border-gold/20 bg-smoke-800/80 p-6 backdrop-blur-sm transition-shadow hover:shadow-gold"
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-lg text-white">Edge · {s.region}</p>
              <span
                className={`text-xs uppercase tracking-wider ${s.status === 'Live' ? 'text-violet-light' : 'text-white/40'}`}
              >
                {s.status}
              </span>
            </div>
            <p className="mt-3 font-display text-2xl text-gold-light tracking-minted">
              {s.viewers.toLocaleString('en-US')}
            </p>
            <p className="text-[11px] text-white/35 uppercase tracking-wider">live viewers</p>
            {/* load bar */}
            <div className="mt-4 h-1 w-full bg-white/10">
              <div className="h-1 bg-violet" style={{ width: `${Math.round(s.load * 100)}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-white/30 uppercase tracking-wider">
              {Math.round(s.load * 100)}% load
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
