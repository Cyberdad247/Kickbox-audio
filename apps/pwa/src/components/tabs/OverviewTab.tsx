'use client';

import { useState } from 'react';
import { useBifrost } from '../../context/BifrostContext';
import { useLakishaVoice } from '../../hooks/useLakishaVoice';
import { Sparkline } from '../Sparkline';
import { LakeishaVideoHUD } from '../hud/LakeishaVideoHUD';

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

function BrutalistMetricCard({
  label,
  value,
  delta,
  trend,
  accent = '#9D4EDD',
  className = '',
}: {
  label: string;
  value: string;
  delta?: string;
  trend?: number[];
  accent?: string;
  className?: string;
}) {
  const positive = delta?.startsWith('+');
  return (
    // Rigid 0px corners — Brutalist primary data card (blueprint §2 / directive §3).
    <div
      className={`border border-white/10 bg-black/40 p-6 backdrop-blur-md transition-all hover:border-gold/40 hover:bg-black/60 ${className}`}
    >
      <p className="text-[11px] text-white/40 uppercase tracking-[0.2em]">{label}</p>
      <p className="mt-4 font-display text-4xl text-white tracking-minted">{value}</p>
      <div className="mt-6 flex items-end justify-between">
        {delta && (
          <span
            className={`text-[10px] uppercase font-bold tracking-wider ${positive ? 'text-emerald-400' : 'text-white/40'}`}
          >
            {delta}
          </span>
        )}
        {trend && (
          <div className="h-8 w-24">
            <Sparkline data={trend} stroke={accent} />
          </div>
        )}
      </div>
    </div>
  );
}

export function OverviewTab() {
  const { state, connected } = useBifrost();
  const { listening, speaking, toggleListening } = useLakishaVoice();
  const [avatarActive, setAvatarActive] = useState(false);

  const valuation = state?.portfolioValuation ?? BASELINE_VALUATION;
  const txns = state?.transactionsCount ?? 0;
  const lastCommand = state?.lastCommand ?? '—';

  return (
    <div className="w-full">
      {/* 12-Column Grid Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* ── HERO METRIC BLOCK (Spans 8 columns) ──────────────── */}
        <div className="col-span-12 xl:col-span-8 border border-white/10 bg-gradient-to-br from-black/80 to-smoke-900/40 p-8 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(212,175,55,0.05),transparent_50%)] pointer-events-none" />

          <div className="flex flex-col h-full justify-between">
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-[0.25em] font-mono">
                Total Portfolio Valuation // Real-Time
              </p>
              <div className="mt-4 flex items-baseline gap-4">
                <h2 className="font-display text-7xl md:text-8xl text-white tracking-tighter">
                  {compactCurrency(valuation)}
                </h2>
                <span className="text-emerald-400 text-sm font-mono tracking-widest">
                  +12.4% QTD
                </span>
              </div>
              <p className="mt-2 font-mono text-[10px] text-white/30 uppercase tracking-widest">
                {fullCurrency(valuation)} USD
              </p>
            </div>

            <div className="mt-12 h-16 w-full max-w-lg opacity-80 group-hover:opacity-100 transition-opacity">
              <Sparkline data={TREND} stroke="#D4AF37" />
            </div>
          </div>
        </div>

        {/* ── AVATAR / SPEECH GATEWAY (Spans 4 columns) ──────────────── */}
        <div className="col-span-12 xl:col-span-4 border border-white/10 bg-black/60 p-1 backdrop-blur-md relative flex flex-col justify-between">
          <div className="absolute top-4 left-4 z-10">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-amber-500'}`}
              />
              <span className="font-mono text-[9px] uppercase tracking-widest text-white/60">
                {connected ? 'Bifrost Sync Active' : 'Awaiting Connection'}
              </span>
            </div>
          </div>

          <div className="relative aspect-square sm:aspect-video xl:aspect-auto xl:h-full w-full overflow-hidden bg-[#050505] border border-white/5 group">
            {avatarActive ? (
              <>
                <video
                  className="h-full w-full object-cover opacity-80"
                  src="/assets/lakisha_avatar.mp4"
                  muted={!listening && !speaking}
                  autoPlay
                  loop
                  playsInline
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 pointer-events-none" />
              </>
            ) : (
              <div className="h-full w-full flex items-center justify-center relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.05),transparent_60%)]" />
                <div className="text-center z-10">
                  <div className="h-16 w-16 rounded-full border border-white/10 flex items-center justify-center mx-auto mb-4 bg-white/5 backdrop-blur-sm">
                    <span className="text-xl">👤</span>
                  </div>
                  <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest">
                    Sovereign Avatar Offline
                  </p>
                </div>
              </div>
            )}

            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <div className="flex flex-col gap-1">
                {avatarActive && (
                  <span
                    className={`text-[10px] font-mono tracking-widest uppercase ${speaking ? 'text-purple-400' : listening ? 'text-cyan-400' : 'text-white/40'}`}
                  >
                    {speaking ? 'Transmitting...' : listening ? 'Listening...' : 'Standing By'}
                  </span>
                )}
              </div>

              <button
                onClick={() => setAvatarActive(!avatarActive)}
                className={`border px-4 py-2 text-[10px] font-mono uppercase tracking-widest transition-all ${
                  avatarActive
                    ? 'border-rose-500/50 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20'
                    : 'border-gold/40 text-gold bg-gold/10 hover:bg-gold/20 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                }`}
              >
                {avatarActive ? 'Deactivate' : 'Initialize Avatar'}
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI METRICS (4 columns each) ──────────────── */}
        <BrutalistMetricCard
          className="col-span-12 md:col-span-4"
          label="Transactions"
          value={String(txns)}
          delta="+4 today"
          trend={[3, 5, 4, 7, 6, 9, 8, 11]}
          accent="#06b6d4"
        />
        <BrutalistMetricCard
          className="col-span-12 md:col-span-4"
          label="Active Nodes"
          value="2 / 3"
          delta="1 standby"
          trend={[2, 2, 3, 3, 2, 3, 3, 3]}
          accent="#D4AF37"
        />
        <BrutalistMetricCard
          className="col-span-12 md:col-span-4"
          label="Venture Stakes"
          value="$3.8M"
          delta="+2 rounds"
          trend={[1.9, 2.2, 2.6, 2.9, 3.1, 3.4, 3.6, 3.8]}
          accent="#a855f7"
        />

        {/* ── OODA-MGV CYBERNETIC LOOP (Spans 12 columns) ──────────────── */}
        <div className="col-span-12 border border-white/10 bg-black/40 p-8 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center border border-gold/40 bg-gold/5 text-gold text-lg font-display">
                Ω
              </span>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-gold/60">
                  Sovereign Cybernetics
                </span>
                <h3 className="font-display text-xl text-white tracking-wide mt-1">
                  OODA-MGV Loop Live Status
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 border border-emerald-500/20 bg-emerald-950/20 px-4 py-2 font-mono text-[10px] text-emerald-400 uppercase tracking-widest">
                <span className="h-1.5 w-1.5 bg-emerald-400 shadow-[0_0_5px_#10b981]" />
                138ms Cycle Latency
              </span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-5 gap-0 border border-white/10 divide-y sm:divide-y-0 sm:divide-x divide-white/10 bg-black/20">
            {[
              {
                num: '1',
                title: 'Observe',
                data: 'VFS & 48kHz RMS',
                stat: 'Merkle 100% Valid',
                color: 'cyan',
              },
              {
                num: '2',
                title: 'Orient',
                data: 'MFOE Intent',
                stat: '99.7% Accuracy',
                color: 'purple',
              },
              {
                num: '3',
                title: 'Decide',
                data: 'Merlin_Ω DAG',
                stat: '4 Nodes Acyclic',
                color: 'gold',
              },
              {
                num: '4',
                title: 'Act',
                data: 'SmolVM Zone-0',
                stat: 'AST Tree-sitter',
                color: 'sky',
              },
              {
                num: '5',
                title: 'Verify',
                data: 'Z3 SAT Solver',
                stat: 'Firewall PASS',
                color: 'emerald',
              },
            ].map((stage, i) => (
              <div
                key={i}
                className="p-5 flex flex-col justify-between h-32 group hover:bg-white/5 transition-colors"
              >
                <span
                  className={`font-mono text-[9px] uppercase tracking-[0.2em] text-${stage.color}-400/60`}
                >
                  {stage.num}. {stage.title}
                </span>
                <div>
                  <span className={`block font-mono text-xs text-${stage.color}-400 mt-2`}>
                    {stage.data}
                  </span>
                  <span className="block text-[10px] text-white/40 font-mono tracking-widest mt-1">
                    {stage.stat}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── COMMAND RELAY (Spans 12 columns) ──────────────── */}
        <div className="col-span-12 border border-white/10 bg-black/40 px-8 py-6 backdrop-blur-md flex items-center justify-between">
          <div>
            <span className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono">
              Last Executed Command
            </span>
            <p className="mt-2 font-mono text-sm text-gold-light">{lastCommand}</p>
          </div>
          <div className="h-2 w-2 rounded-full bg-gold-royal shadow-[0_0_8px_#D4AF37] animate-pulse" />
        </div>
      </div>
    </div>
  );
}
