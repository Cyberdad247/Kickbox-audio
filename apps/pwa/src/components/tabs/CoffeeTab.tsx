'use client';

import { COFFEE, type CoffeeShipment } from '../../lib/realm-data';

const statusClass: Record<CoffeeShipment['status'], string> = {
  Roasting: 'text-gold-royal',
  'In Transit': 'text-violet-light',
  Customs: 'text-amber-300',
  Delivered: 'text-white/40',
};

export function CoffeeTab() {
  const totalBags = COFFEE.reduce((n, c) => n + c.bags, 0);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border border-gold/20 bg-smoke-900/60 px-6 py-4 backdrop-blur-sm">
        <span className="text-[11px] text-white/40 uppercase tracking-[0.2em]">
          Coffee Logistics
        </span>
        <span className="font-display text-gold-royal text-xl tracking-minted">
          {totalBags} bags in flight
        </span>
      </div>
      <div className="border border-gold/20 bg-smoke-800/80 backdrop-blur-sm">
        <div className="grid grid-cols-[2fr_1fr_auto_1fr_auto] gap-4 border-gold/10 border-b px-6 py-3 text-[10px] text-white/35 uppercase tracking-[0.16em]">
          <span>Origin</span>
          <span>Lot</span>
          <span>Bags</span>
          <span>Status</span>
          <span>ETA</span>
        </div>
        {COFFEE.map((c) => (
          <div
            key={c.lot}
            className="grid grid-cols-[2fr_1fr_auto_1fr_auto] items-center gap-4 border-gold/5 border-b px-6 py-4 text-sm last:border-0"
          >
            <span className="font-display text-white">{c.origin}</span>
            <span className="text-white/45">{c.lot}</span>
            <span className="text-gold-light">{c.bags}</span>
            <span className={`uppercase tracking-wider text-xs ${statusClass[c.status]}`}>
              {c.status}
            </span>
            <span className="text-white/45">{c.eta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
