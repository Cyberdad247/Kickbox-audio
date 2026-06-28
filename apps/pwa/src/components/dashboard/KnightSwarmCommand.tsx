'use client';

import { useState, useEffect } from 'react';

interface KnightStatus {
  id: string;
  name: string;
  avatarPersona: string;
  role: string;
  northStarGoal: string;
  hermesDaemon: string;
  primaryMetricLabel: string;
  currentMetricValue: string;
  loopPattern: string;
  status: 'IDLE' | 'PROCESSING' | 'PENDING_HITL' | 'STAKED';
}

interface HitlProposal {
  knight: string;
  impactUsd?: number;
  description: string;
  justification: string;
}

export function KnightSwarmCommand() {
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [activeInstruction, setActiveInstruction] = useState('');

  // 1. Swarm Matrix State
  const [knights, setKnights] = useState<KnightStatus[]>([
    {
      id: 'KNIGHT_CEO_001',
      name: 'Malik / Strategy',
      avatarPersona: 'KPI Orchestrator',
      role: 'Daily KPI Synthesis & Strategic Briefing',
      northStarGoal: 'Maximize system operational efficiency and revenue velocity.',
      hermesDaemon: 'hermes-daemon-kpi-sync-1Hz',
      primaryMetricLabel: 'Valuation Tracking Accuracy',
      currentMetricValue: '99.98%',
      loopPattern: 'COLLECT ──► ANALYZE ──► FORECAST',
      status: 'PROCESSING',
    },
    {
      id: 'KNIGHT_CAL_002',
      name: 'Jalen / Chronos',
      avatarPersona: 'Temporal Planner',
      role: 'Sovereign Calendar Scheduler',
      northStarGoal: 'Minimize time settlement conflicts and scheduling overlaps.',
      hermesDaemon: 'hermes-cron-calendar-clean-12h',
      primaryMetricLabel: 'Scheduled Disputes Prevented',
      currentMetricValue: '12',
      loopPattern: 'DECONFLICT ──► SYNC ──► CONFIRM',
      status: 'IDLE',
    },
    {
      id: 'KNIGHT_MAIL_003',
      name: 'Aaliyah / Raven',
      avatarPersona: 'Inbox Dispatcher',
      role: 'Email Triage & Automation Routing',
      northStarGoal: 'Maintain zero unanswered client/tenant inbox items.',
      hermesDaemon: 'hermes-reactive-email-webhook',
      primaryMetricLabel: 'Processed Emails Today',
      currentMetricValue: '142',
      loopPattern: 'INGEST ──► SCORE ──► DRAFT',
      status: 'PROCESSING',
    },
    {
      id: 'KNIGHT_PROP_004',
      name: 'Marcus / Bastion',
      avatarPersona: 'Asset Guard',
      role: 'Property Valuation & Lease Tracker',
      northStarGoal: 'Prevent equity loss and optimize lease yield spreads.',
      hermesDaemon: 'hermes-daemon-lease-checker-daily',
      primaryMetricLabel: 'Lease Compliance Ratio',
      currentMetricValue: '100%',
      loopPattern: 'LEASE_SCAN ──► REVENUE_AUDIT ──► ALERT',
      status: 'IDLE',
    },
    {
      id: 'KNIGHT_MAINT_005',
      name: 'Tyrell / Gavin',
      avatarPersona: 'Job Dispatcher',
      role: 'Sub-2 Hour Vendor Incident Resolution',
      northStarGoal: 'Minimize asset depreciation metrics and physical infrastructure downtime.',
      hermesDaemon: 'hermes-reactive-sms-maintenance-webhook',
      primaryMetricLabel: 'Vendor Response Time',
      currentMetricValue: '42 mins',
      loopPattern: 'EMERGENCY_TRIAGE ──► WARRANTY_CHECK ──► VENDOR_MATCH',
      status: 'PENDING_HITL',
    },
    {
      id: 'KNIGHT_RENT_006',
      name: 'Nia / Sophia',
      avatarPersona: 'Rent Steward',
      role: 'QuickBooks Bookkeeping Reconciliation',
      northStarGoal: 'Achieve zero cash-flow mismatch settlement latency profiles.',
      hermesDaemon: 'hermes-cron-ledger-sync-6h',
      primaryMetricLabel: 'Unmatched Ledger Exceptions',
      currentMetricValue: '0',
      loopPattern: 'BANK_SWEEP ──► MATCH ──► RECORD',
      status: 'IDLE',
    },
    {
      id: 'KNIGHT_STREAM_007',
      name: 'Isaiah / Leo',
      avatarPersona: 'Quality Watch',
      role: 'Sub-100ms Streaming Node Monitor',
      northStarGoal: 'Maintain high packet throughput across core application streams.',
      hermesDaemon: 'hermes-daemon-streaming-telemetry-1Hz',
      primaryMetricLabel: 'Audio Packet Loss Rate',
      currentMetricValue: '0.02%',
      loopPattern: 'PACKET_SCAN ──► LATENCY_CHECK ──► REROUTE',
      status: 'PROCESSING',
    },
    {
      id: 'KNIGHT_BILL_008',
      name: 'Chloe / Tessa',
      avatarPersona: 'Invoice Auditor',
      role: 'Financial Capital Leakage Prevention',
      northStarGoal: 'Validate contract line-item alignment across corporate spending workflows.',
      hermesDaemon: 'hermes-cron-invoice-ingest-daily',
      primaryMetricLabel: 'Audited Invoice Errors Detected',
      currentMetricValue: '4',
      loopPattern: 'SCRAPE ──► STATEMENT_MATCH ──► FRAUD_CHECK',
      status: 'IDLE',
    },
    {
      id: 'KNIGHT_COFFEE_009',
      name: 'Elijah / Barista',
      avatarPersona: 'Inventory Fuel Steward',
      role: 'Logistics Yield Depletion Forecasting',
      northStarGoal: 'Maintain asset readiness buffers ahead of critical trade cycles.',
      hermesDaemon: 'hermes-daemon-inventory-stock-counter',
      primaryMetricLabel: 'Warehouse Days-Of-Supply',
      currentMetricValue: '18 Days',
      loopPattern: 'WEIGHT_MONITOR ──► VELOCITY_CALC ──► TRIGGER',
      status: 'PROCESSING',
    },
    {
      id: 'KNIGHT_GROWTH_010',
      name: 'Elena / Sierra',
      avatarPersona: 'Growth Staking',
      role: 'Grant Acquisition & Market Expansion',
      northStarGoal: 'Identify eligible municipal small-business capital pipelines.',
      hermesDaemon: 'hermes-cron-grant-registry-sweep-weekly',
      primaryMetricLabel: 'Tracked Yield Pipeline',
      currentMetricValue: '$45,000',
      loopPattern: 'REGISTRY_SCAN ──► MATCH_CRITERIA ──► EXTRACT',
      status: 'STAKED',
    },
  ]);

  // 2. HITL Proposal Intercept State
  const [hitlProposal, setHitlProposal] = useState<HitlProposal | null>({
    knight: 'Tyrell / Gavin (Job Dispatcher)',
    impactUsd: 1450.0,
    description:
      'Dispatch local emergency plumbing crew for burst pipe repair at Gold Quarter Unit 4.',
    justification:
      'OpenHuman tenant stress metric spike (Index 85/100) triggered by active property water egress. Warranty check shows no coverage for local main line burst. Emergency contractor match completed with sub-2hr response commitment.',
  });

  // Real-time loop pulse simulation effect
  useEffect(() => {
    const simulationInterval = setInterval(() => {
      setKnights((prev) =>
        prev.map((k) => {
          if (k.status === 'PROCESSING') {
            if (k.id === 'KNIGHT_MAIL_003') {
              const num = parseInt(k.currentMetricValue, 10);
              return { ...k, currentMetricValue: String(isNaN(num) ? 142 : num + 1) };
            }
            if (k.id === 'KNIGHT_STREAM_007') {
              const val = parseFloat(k.currentMetricValue.replace('%', ''));
              const nextVal = Math.max(0.01, val + (Math.random() - 0.5) * 0.005);
              return { ...k, currentMetricValue: `${nextVal.toFixed(3)}%` };
            }
          }
          return k;
        })
      );
    }, 3000);
    return () => clearInterval(simulationInterval);
  }, []);

  const handleExecuteActionOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInstruction.trim()) return;
    console.log('[EXEC]: Injecting Sovereign instruction to Merlin DAG: ', activeInstruction);
    setActiveInstruction('');
  };

  return (
    <div className="w-full flex flex-col gap-6">
      {/* SECTION A: SYSTEM HEADER TERMINAL BAR */}
      <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center border-b border-[#D4AF37]/20 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 bg-[#FFD700] rounded-none animate-ping" />
            <h1 className="text-3xl font-serif text-[#FFD700] tracking-tight uppercase font-bold">
              KOA REALM Swarm Workforce Matrix
            </h1>
          </div>
          <p className="text-[10px] font-mono tracking-[0.25em] text-[#9D4EDD] uppercase mt-1">
            CONCURRENCY ARCHITECTURE v1000 // AUTHORITY: VASHAWN O. HEAD (VIZION)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
          <div className="bg-[#16161E]/80 border border-[#9D4EDD]/30 px-4 py-2">
            <span className="text-gray-400">MEMORY_MODE:</span>{' '}
            <span className="text-[#9D4EDD]">OUROBOROS_LZ4</span>
          </div>
          <div className="bg-[#16161E]/80 border border-emerald-500/30 px-4 py-2">
            <span className="text-gray-400">BIFROST:</span>{' '}
            <span className="text-emerald-400">MUTUAL_mTLS_LOCKED</span>
          </div>
        </div>
      </header>

      {/* SECTION B: SPATIAL WORKSPACE GRID */}
      <div className="grid grid-cols-12 gap-6 items-stretch">
        {/* PORTAL LEFT: REAL-TIME SWARM LEDGER VIEW */}
        <main className="col-span-12 lg:col-span-8 bg-[#16161E]/40 backdrop-blur-xl border border-[#D4AF37]/10 p-6 flex flex-col space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center border-b border-gray-800 pb-3">
            <h3 className="font-serif text-lg text-[#FFD700] tracking-tight uppercase">
              Active Engine Cartridges
            </h3>
            <div className="flex flex-wrap gap-2 text-[10px] font-mono">
              {['all', 'PROCESSING', 'IDLE', 'PENDING_HITL'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedDomain(tab)}
                  className={`px-3 py-1 border uppercase tracking-wider transition-colors ${
                    selectedDomain === tab
                      ? 'border-[#FFD700] text-[#FFD700] bg-[#050507]/60'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {tab === 'all' ? 'Show All' : tab.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Grid mapping out the core loop configurations */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {knights
              .filter((k) => selectedDomain === 'all' || k.status === selectedDomain)
              .map((knight) => (
                <div
                  key={knight.id}
                  className={`p-4 bg-[#050507]/60 border transition-all duration-300 flex flex-col justify-between min-h-[14rem] ${
                    knight.status === 'PENDING_HITL'
                      ? 'border-[#9D4EDD] bg-gradient-to-br from-[#16161E]/50 to-[#9D4EDD]/5'
                      : 'border-gray-800 hover:border-[#D4AF37]/45'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-serif text-base text-[#FFD700] leading-tight font-medium">
                          {knight.name}
                        </h4>
                        <p className="text-[10px] font-mono text-gray-400 uppercase">
                          ({knight.avatarPersona})
                        </p>
                      </div>
                      <span
                        className={`text-[9px] font-mono px-2 py-0.5 border tracking-widest ${
                          knight.status === 'PROCESSING'
                            ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20 animate-pulse'
                            : knight.status === 'PENDING_HITL'
                            ? 'border-[#9D4EDD] text-[#9D4EDD] bg-purple-950/30 font-bold'
                            : knight.status === 'STAKED'
                            ? 'border-amber-500 text-amber-400 bg-amber-950/20'
                            : 'border-gray-700 text-gray-400'
                        }`}
                      >
                        {knight.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-300 font-sans leading-relaxed">
                      {knight.northStarGoal}
                    </p>

                    <div className="p-2 bg-[#16161E]/50 border border-gray-900 font-mono text-[9px] text-[#D4AF37] flex flex-col space-y-1">
                      <div className="truncate">
                        <span className="text-gray-500">LOOP:</span> {knight.loopPattern}
                      </div>
                      <div className="truncate">
                        <span className="text-gray-500">DAEMON:</span> {knight.hermesDaemon}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-900 flex justify-between items-center text-xs font-mono">
                    <span className="text-gray-400 uppercase tracking-wider text-[9px]">
                      {knight.primaryMetricLabel}:
                    </span>
                    <span className="text-[#FFD700] font-bold tracking-tight">
                      {knight.currentMetricValue}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3 pt-2 border-t border-gray-900 font-mono text-[8px] uppercase tracking-widest text-white/40">
                    <div>
                      <span className="text-white/20 block text-[6px]">Perimeter Gate</span>
                      <span className="text-emerald-400">SECURE</span>
                    </div>
                    <div className="text-right">
                      <span className="text-white/20 block text-[6px]">Triage Lane</span>
                      <span className="text-violet-light">RING_0</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </main>

        {/* PORTAL RIGHT: SYSTEM INTERACTIVE ACTIONS & GUARDRAILS */}
        <aside className="col-span-12 lg:col-span-4 flex flex-col justify-between gap-6 h-full">
          {/* CRITICAL HUMAN-IN-THE-LOOP INTERCEPTOR */}
          {hitlProposal ? (
            <div className="bg-gradient-to-b from-[#16161E] to-[#0D0D11] border border-[#9D4EDD] p-5 shadow-[0_0_25px_rgba(157,78,221,0.15)] flex flex-col justify-between gap-5 transition-all duration-300">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 border-b border-gray-800 pb-3">
                  <span className="w-2 h-2 bg-[#9D4EDD] rounded-none animate-pulse" />
                  <h3 className="font-serif text-[#FFD700] text-lg uppercase font-bold tracking-tight">
                    Videneptus Intercept
                  </h3>
                </div>

                <div className="font-mono text-[10px] space-y-1 bg-[#050507]/80 p-3 border border-gray-900 text-gray-400">
                  <div>
                    <span className="text-gray-500">SOURCE NODE:</span> {hitlProposal.knight}
                  </div>
                  {hitlProposal.impactUsd && (
                    <div>
                      <span className="text-gray-500">OUTFLOW BUDGET:</span>{' '}
                      <span className="text-amber-400">${hitlProposal.impactUsd.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs text-gray-400 uppercase font-mono tracking-wider">
                    Proposed Action Pipeline:
                  </h5>
                  <p className="text-sm font-serif text-white font-medium leading-snug bg-[#050507]/40 p-3 border border-gray-800/40">
                    {hitlProposal.description}
                  </p>
                </div>

                <div className="space-y-1">
                  <h5 className="text-[10px] text-gray-500 uppercase font-mono tracking-wider">
                    Automated Justification Graph:
                  </h5>
                  <p className="text-xs text-gray-400 font-sans leading-relaxed italic">
                    "{hitlProposal.justification}"
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setHitlProposal(null)}
                  className="w-full bg-[#9D4EDD] text-white py-3 rounded-none font-bold hover:bg-[#FFD700] hover:text-black transition-all shadow-[0_0_15px_rgba(157,78,221,0.2)]"
                >
                  Authorize Loop
                </button>
                <button
                  onClick={() => setHitlProposal(null)}
                  className="w-full border border-gray-700 text-gray-400 py-3 rounded-none hover:border-red-500 hover:text-red-500 transition-all font-mono text-[10px] uppercase"
                >
                  Reject Payload
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-[#16161E]/20 border border-dashed border-gray-800 p-6 flex flex-col items-center justify-center text-center flex-1 font-mono text-xs text-gray-500 min-h-[12rem]">
              <span>⚡ ALL CONCURRENT SYSTEM WORKFLOWS OPERATING WITHIN SAFE CRITERIA</span>
            </div>
          )}

          {/* DYNAMIC INTENT INJECTION BAR */}
          <div className="bg-[#16161E]/40 backdrop-blur-xl border border-[#D4AF37]/10 p-5 rounded-none flex flex-col space-y-3">
            <div>
              <h4 className="font-serif text-[#FFD700] text-sm uppercase tracking-wide">
                Direct Intent Injection Terminal
              </h4>
              <p className="text-[10px] font-mono text-gray-500 uppercase mt-0.5">
                Route macro directives directly to the Merlin DAG
              </p>
            </div>
            <form onSubmit={handleExecuteActionOverride} className="flex gap-2 font-mono text-xs">
              <input
                type="text"
                value={activeInstruction}
                onChange={(e) => setActiveInstruction(e.target.value)}
                placeholder="Enter system prompt override gesture..."
                className="flex-1 bg-[#050507] border border-gray-800 p-3 font-mono text-xs focus:outline-none focus:border-[#FFD700] text-gray-200 placeholder-gray-600 rounded-none"
              />
              <button
                type="submit"
                className="bg-transparent border border-[#FFD700] text-[#FFD700] px-4 font-bold uppercase tracking-wider hover:bg-[#FFD700] hover:text-black transition-colors rounded-none"
              >
                Inject
              </button>
            </form>
          </div>
        </aside>
      </div>

      {/* SECTION C: SYSTEM IMMUTABLE DEPLOYMENT FOOTER */}
      <footer className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center text-[9px] tracking-widest text-gray-500 font-mono uppercase border-t border-gray-900 pt-4 mt-6">
        <span>© 2026 KOA Realm Monorepo Ecosystem Apps</span>
        <span>LATTICE SYNC ENFORCEMENT: COMPLIANT WITH TOON_V3.2_SPEC</span>
      </footer>
    </div>
  );
}
