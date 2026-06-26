'use client';

import { VENTURES } from '../../lib/realm-data';

const money = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);

export function VentureTab() {
  const total = VENTURES.reduce((n, v) => n + v.value, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border border-gold/20 bg-smoke-900/60 px-6 py-4 backdrop-blur-sm">
        <span className="text-[11px] text-white/40 uppercase tracking-[0.2em]">
          Venture Holdings
        </span>
        <span className="font-display text-gold-royal text-xl tracking-minted">
          {money(total)} deployed
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {VENTURES.map((v) => (
          <div
            key={v.name}
            className="border border-gold/20 bg-smoke-800/80 p-6 backdrop-blur-sm transition-shadow hover:shadow-gold"
          >
            <div className="flex items-start justify-between">
              <p className="font-display text-lg text-white">{v.name}</p>
              <span className="text-violet-light text-xs uppercase tracking-wider">{v.stake}</span>
            </div>
            <p className="mt-3 font-display text-3xl text-gold-royal tracking-minted">
              {money(v.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
