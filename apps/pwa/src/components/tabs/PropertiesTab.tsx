'use client';

import { PROPERTIES, type PropertyUnit } from '../../lib/realm-data';

const money = (n: number) => `$${n.toLocaleString('en-US')}`;

const statusClass: Record<PropertyUnit['status'], string> = {
  Occupied: 'text-violet-light',
  Maintenance: 'text-amber-300',
  Vacant: 'text-white/40',
};

export function PropertiesTab() {
  const occupied = PROPERTIES.filter((p) => p.status === 'Occupied').length;
  const roll = PROPERTIES.filter((p) => p.status === 'Occupied').reduce((n, p) => n + p.rent, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="border border-gold/20 bg-smoke-800/80 p-5 backdrop-blur-sm">
          <p className="text-[11px] text-white/40 uppercase tracking-[0.16em]">Occupancy</p>
          <p className="mt-2 font-display text-3xl text-gold-royal tracking-minted">
            {occupied}/{PROPERTIES.length}
          </p>
        </div>
        <div className="border border-gold/20 bg-smoke-800/80 p-5 backdrop-blur-sm">
          <p className="text-[11px] text-white/40 uppercase tracking-[0.16em]">Monthly Roll</p>
          <p className="mt-2 font-display text-3xl text-gold-royal tracking-minted">
            {money(roll)}
          </p>
        </div>
        <div className="hidden border border-gold/20 bg-smoke-800/80 p-5 backdrop-blur-sm sm:block">
          <p className="text-[11px] text-white/40 uppercase tracking-[0.16em]">Market</p>
          <p className="mt-2 font-display text-3xl text-white tracking-minted">Sandusky</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROPERTIES.map((p) => (
          <div
            key={p.name}
            className="border border-gold/20 bg-smoke-800/80 p-6 backdrop-blur-sm transition-shadow hover:shadow-gold"
          >
            <div className="flex items-start justify-between">
              <p className="font-display text-lg text-white">{p.name}</p>
              <span className={`text-xs uppercase tracking-wider ${statusClass[p.status]}`}>
                {p.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-white/45">
              {p.tenant === '—' ? 'No tenant' : p.tenant}
            </p>
            <p className="mt-1 font-display text-gold-light text-xl tracking-minted">
              {money(p.rent)}/mo
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
