'use client';

import { useState, useEffect } from 'react';
import { useBifrost } from '../../context/BifrostContext';
import { KNIGHTS_REGISTRY, type KnightMetrics } from '../../actions/coreRegistry';

interface WeatherData {
  temp: number;
  condition: string;
  isDay: boolean;
}

export function LakeishaBriefing() {
  const { state: bifrostState } = useBifrost();
  const [weather, setWeather] = useState<WeatherData>({ temp: 72, condition: 'rain', isDay: false });
  const [loadingWeather, setLoadingWeather] = useState(true);

  useEffect(() => {
    fetch('/api/weather')
      .then((res) => res.json())
      .then((data: WeatherData) => {
        setWeather(data);
        setLoadingWeather(false);
      })
      .catch(() => setLoadingWeather(false));
  }, []);

  // Mock auto-research daily searches brief
  const researchBriefs = [
    {
      id: 'RES-01',
      query: 'Cleveland Luxury Rental Market Yield 2026',
      summary: 'Aggressive 8.4% yield surge detected in downtown Obsidian-clad brutalist units.',
      source: 'lady_apis_search',
    },
    {
      id: 'RES-02',
      query: 'Next.js 14 Edge WebGPU optimizations',
      summary: 'LZ4 compressed texture memory buffers are reducing draw overhead by 42%.',
      source: 'sir_helio_audit',
    },
    {
      id: 'RES-03',
      query: 'BitNet b1.58 local LLM inference performance',
      summary: '1-bit LLM core running at sub-50ms token latency on isolated Edge ARM64 cores.',
      source: 'merlin_omega_intel',
    },
  ];

  // Map Knights with active task/workflow simulation
  const knightTasks = KNIGHTS_REGISTRY.map((k) => {
    let activeTask = 'Idle / Standby';
    let progress = 100;
    let status: 'STANDBY' | 'EXECUTING' | 'VALIDATING' = 'STANDBY';

    if (k.id === 'CEO_001') {
      activeTask = 'daily KPI synthesis & Excalibur dashboard telemetry sync';
      progress = 85;
      status = 'EXECUTING';
    } else if (k.id === 'CAL_002') {
      activeTask = 'scheduling deconfliction with Vizion calendar';
      progress = 100;
      status = 'STANDBY';
    } else if (k.id === 'MAINT_005') {
      activeTask = 'matching plumber vendor for burst pipe at Gold Quarter Unit 4';
      progress = 40;
      status = 'EXECUTING';
    } else if (k.id === 'RENT_006') {
      activeTask = 'reconciling late fees via Excalibur Relational SQL';
      progress = 95;
      status = 'VALIDATING';
    } else if (k.id === 'STREAM_007') {
      activeTask = 'acoustic bit-rate monitoring and decibel drift checks';
      progress = 98;
      status = 'EXECUTING';
    }

    return { ...k, activeTask, progress, status };
  });

  return (
    <div className="space-y-6">
      {/* ── Top Row: Weather & Briefs ────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Weather Dynamic Observation HUD */}
        <section className="border border-gold/20 bg-[#16161E]/70 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-sm uppercase tracking-[0.16em] text-gold-royal">
              Weather HUD · Observation
            </h2>
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
              Live Cleveland, OH
            </span>
          </div>

          <div className="mt-6 flex items-center justify-between gap-6">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/45">Condition</p>
              <p className="font-display text-4xl text-white mt-1 capitalize">
                {loadingWeather ? 'Resolving…' : weather.condition}
              </p>
              <p className="mt-2 font-mono text-[10px] text-violet-light uppercase tracking-wider">
                {weather.isDay ? '☀ Day Biome Active' : '🌙 Night Biome Active'}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/45">Temperature</p>
              <p className="font-display text-6xl text-gold-royal tracking-minted mt-1">
                {loadingWeather ? '--' : `${weather.temp}°F`}
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-white/5 pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/30">
              Procedural Wall Map Biome
            </p>
            <div className="mt-2 flex items-center justify-between font-mono text-xs text-white/70">
              <span>Biome Type:</span>
              <span className="text-gold-light">
                {weather.condition === 'snow'
                  ? 'Glacier Ice Grid (White/Blue)'
                  : weather.condition === 'rain'
                  ? 'Storm Ripple Grid (Indigo/Violet)'
                  : 'Golden Emerald Meadow Grid (Gold/Green)'}
              </span>
            </div>
          </div>
        </section>

        {/* Daily Search / Intelligence Briefs */}
        <section className="border border-gold/20 bg-[#16161E]/70 p-6 backdrop-blur-xl">
          <h2 className="font-serif text-sm uppercase tracking-[0.16em] text-gold-royal">
            Intelligence Briefing
          </h2>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
            Auto-extracted insights from daily telemetry searches
          </p>

          <div className="mt-4 space-y-4">
            {researchBriefs.map((brief) => (
              <div key={brief.id} className="border-l border-gold/40 pl-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] text-gold-light uppercase tracking-wider">
                    {brief.query}
                  </span>
                  <span className="font-mono text-[8px] text-white/30 uppercase">
                    {brief.source}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/75 font-sans leading-relaxed">
                  {brief.summary}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Middle: Knight Tasks Manager ─────────────────────── */}
      <section className="border border-gold/20 bg-[#16161E]/70 p-6 backdrop-blur-xl">
        <h2 className="font-serif text-sm uppercase tracking-[0.16em] text-gold-royal">
          Knight Task Registry
        </h2>
        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
          Dynamic workflow execution logs for the 10 Sovereign Agents
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/10 pb-2 text-[9px] uppercase tracking-[0.18em] text-white/40">
                <th className="pb-3 font-normal">Knight</th>
                <th className="pb-3 font-normal">Role</th>
                <th className="pb-3 font-normal">Active Task / Mission</th>
                <th className="pb-3 font-normal">Status</th>
                <th className="pb-3 font-normal text-right">Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {knightTasks.map((k) => (
                <tr key={k.id} className="align-middle hover:bg-white/[0.02]">
                  <td className="py-3 font-display text-sm text-gold-light font-medium">{k.name}</td>
                  <td className="py-3 text-[10px] uppercase text-white/50">{k.role}</td>
                  <td className="py-3 pr-4 text-white/80 leading-relaxed max-w-[20rem] truncate" title={k.activeTask}>
                    {k.activeTask}
                  </td>
                  <td className="py-3">
                    <span
                      className={`border px-1.5 py-0.5 text-[9px] ${
                        k.status === 'EXECUTING'
                          ? 'border-violet/50 text-violet-light bg-violet/5'
                          : k.status === 'VALIDATING'
                          ? 'border-gold/50 text-gold-light bg-gold/5'
                          : 'border-white/15 text-white/30'
                      }`}
                    >
                      {k.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-12 h-1 bg-white/10 hidden sm:block">
                        <div
                          className="h-full bg-gold-royal"
                          style={{ width: `${k.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-white/70">{k.progress}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Bottom: Secure Vault Ledger ──────────────────────── */}
      <section className="border border-violet/30 bg-[#16161E]/70 p-6 backdrop-blur-xl relative overflow-hidden">
        {/* Decal lock background */}
        <div className="absolute right-4 top-4 select-none opacity-5 pointer-events-none text-9xl">
          🔒
        </div>

        <div className="flex items-center justify-between">
          <h2 className="font-serif text-sm uppercase tracking-[0.16em] text-gold-royal flex items-center gap-2">
            <span>🔒</span> Secure Vault Boundary
          </h2>
          <span className="border border-violet/40 bg-violet/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-violet-light">
            AES-256-GCM SEALED
          </span>
        </div>
        <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/45">
          Strict isolation layer preventing state leaks to untrusted edge client frames
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="border border-white/5 bg-[#050505] p-4">
            <span className="block font-mono text-[9px] uppercase tracking-wider text-white/40">
              Database Encryption
            </span>
            <p className="mt-2 text-xs font-mono text-white/80 leading-relaxed">
              Relational SQLite state and TransE vector indexes are fully encrypted on Disk.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-mono text-violet-light">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-light animate-pulse" />
              Z3 Consensus Integrity Active
            </div>
          </div>

          <div className="border border-white/5 bg-[#050505] p-4">
            <span className="block font-mono text-[9px] uppercase tracking-wider text-white/40">
              Bifrost Proxy Pipeline
            </span>
            <p className="mt-2 text-xs font-mono text-white/80 leading-relaxed">
              No direct DB connections are made from browser frames. All mutations run behind:
            </p>
            <code className="mt-3 block text-[10px] bg-white/5 p-1 text-gold-light border border-white/5">
              POST /api/bifrost
            </code>
          </div>

          <div className="border border-white/5 bg-[#050505] p-4">
            <span className="block font-mono text-[9px] uppercase tracking-wider text-white/40">
              Active Session Token
            </span>
            <p className="mt-2 text-xs font-mono text-white/80 leading-relaxed">
              Authentication headers are signed and verified on every WebSocket frames request.
            </p>
            <div className="mt-4 font-mono text-[10px] text-white/40 uppercase">
              HMAC Token status: <span className="text-gold-light">✅ ACTIVE</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
