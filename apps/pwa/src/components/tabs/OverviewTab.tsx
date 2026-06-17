'use client';

import { useBifrost } from '../../context/BifrostContext';

const currency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gold/20 bg-smoke-800/80 p-6 backdrop-blur-sm">
      <p className="text-white/40 text-xs uppercase tracking-wider">{label}</p>
      <p className="mt-2 font-display text-3xl tracking-tight text-white">{value}</p>
    </div>
  );
}

export function OverviewTab() {
  const { state } = useBifrost();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Metric
        label="Portfolio Valuation"
        value={state ? currency(state.portfolioValuation) : '—'}
      />
      <Metric label="Transactions" value={state ? String(state.transactionsCount) : '—'} />
      <Metric label="Last Command" value={state?.lastCommand ?? '—'} />
    </div>
  );
}
