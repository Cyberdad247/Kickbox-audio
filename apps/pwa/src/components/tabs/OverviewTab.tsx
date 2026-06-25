'use client';

import { useBifrost } from '../../context/BifrostContext';
import { Sparkline } from '../Sparkline';

// Seed baseline (task.md §1.4) — used until Bifrost broadcasts live state.
const BASELINE_VALUATION = 14_200_000;

const compactCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);

const fullCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

// Deterministic demo trend until the gateway streams real series.
const TREND = [11.1, 11.6, 11.4, 12.3, 12.0, 12.9, 13.4, 13.1, 13.8, 14.2];

function KpiCard({
  label,
  value,
  delta,
  trend,
  accent = '#9D4EDD',
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: number[];
  accent?: string;
}) {
  const positive = delta?.startsWith('+');
  return (
    // Rigid 0px corners — Brutalist primary data card (blueprint §2 / directive §3).
    <div className="border border-gold/20 bg-smoke-800/80 p-6 backdrop-blur-sm transition-shadow hover:shadow-gold">
      <p className="text-[11px] text-white/40 uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-3 font-display text-4xl text-gold-royal tracking-minted">{value}</p>
      <div className="mt-4 flex items-end justify-between">
        {delta && (
          <span className={`text-xs ${positive ? 'text-violet-light' : 'text-white/40'}`}>
            {delta}
          </span>
        )}
        {trend && <Sparkline data={trend} stroke={accent} />}
      </div>
    </div>
  );
}

export function OverviewTab() {
  const { state } = useBifrost();

  const valuation = state?.portfolioValuation ?? BASELINE_VALUATION;
  const txns = state?.transactionsCount ?? 0;
  const lastCommand = state?.lastCommand ?? '—';

  return (
    <div className="space-y-4">
      {/* ── Hero valuation — the victory metric ──────────────── */}
      <div className="border border-gold/20 bg-smoke-800/80 p-8 backdrop-blur-sm">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] text-white/40 uppercase tracking-[0.2em]">
              Total Portfolio Valuation
            </p>
            <p className="mt-3 font-display text-7xl text-gold-royal tracking-minted">
              {compactCurrency(valuation)}
            </p>
            <p className="mt-2 text-sm text-white/40">{fullCurrency(valuation)}</p>
          </div>
          <div className="text-right">
            <span className="text-violet-light text-sm">+12.4% QTD</span>
            <Sparkline data={TREND} width={220} height={56} stroke="#e9c349" className="mt-3" />
          </div>
        </div>
      </div>

      {/* ── KPI row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Transactions"
          value={String(txns)}
          delta="+4 today"
          trend={[3, 5, 4, 7, 6, 9, 8, 11]}
        />
        <KpiCard
          label="Active Streaming Nodes"
          value="2 / 3"
          delta="+1 standby"
          trend={[2, 2, 3, 3, 2, 3, 3, 3]}
          accent="#D4AF37"
        />
        <KpiCard
          label="Venture Stakes"
          value="$3.8M"
          delta="+2 rounds"
          trend={[1.9, 2.2, 2.6, 2.9, 3.1, 3.4, 3.6, 3.8]}
        />
      </div>

      {/* ── Last command relay ───────────────────────────────── */}
      <div className="border border-gold/20 bg-smoke-900/60 px-6 py-4 backdrop-blur-sm">
        <span className="text-[11px] text-white/40 uppercase tracking-[0.16em]">
          Last Lakisha Command
        </span>
        <p className="mt-1 font-sans text-sm text-violet-light">{lastCommand}</p>
      </div>
    </div>
  );
}
