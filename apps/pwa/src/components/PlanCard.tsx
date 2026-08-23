'use client';

import { useBifrost } from '../context/BifrostContext';

const riskClass = {
  low: 'text-white/50',
  medium: 'text-amber-300',
  high: 'text-red-400',
} as const;

export function PlanCard() {
  const { pendingPlan, approvePlan, rejectPlan } = useBifrost();
  if (!pendingPlan) return null;

  return (
    <div className="-translate-x-1/2 fixed bottom-28 left-1/2 z-[70] w-[min(92vw,30rem)] animate-pulse-glow border border-gold-royal/60 bg-smoke-900/95 p-6 shadow-glow-lg backdrop-blur-md">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/40 uppercase tracking-[0.2em]">
          Sovereign Approval Required
        </span>
        <span className={`text-[10px] uppercase tracking-widest ${riskClass[pendingPlan.risk]}`}>
          {pendingPlan.risk} risk
        </span>
      </div>

      <p className="mt-3 font-display text-2xl text-gold-royal tracking-minted">
        {pendingPlan.action}
      </p>
      <p className="mt-2 text-sm text-white/60">{pendingPlan.detail}</p>

      {/* the literal plan, JSON-style */}
      <pre className="mt-4 overflow-x-auto border border-white/10 bg-obsidian p-3 text-[11px] text-violet-light">
        {JSON.stringify(
          {
            command: pendingPlan.raw,
            action: pendingPlan.action,
            amount: pendingPlan.amount,
            risk: pendingPlan.risk,
          },
          null,
          2,
        )}
      </pre>

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={approvePlan}
          className="flex-1 bg-violet px-4 py-2.5 text-sm text-white uppercase tracking-widest shadow-glow transition-opacity hover:opacity-90"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={rejectPlan}
          className="flex-1 border border-white/20 px-4 py-2.5 text-sm text-white/60 uppercase tracking-widest transition-colors hover:bg-white/5"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
