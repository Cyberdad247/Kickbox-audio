'use client';

import { useState } from 'react';
import { useBifrost } from '../context/BifrostContext';
import { PlanCard } from './PlanCard';
import { CoffeeTab } from './tabs/CoffeeTab';
import { KnightsTab } from './tabs/KnightsTab';
import { OverviewTab } from './tabs/OverviewTab';
import { PropertiesTab } from './tabs/PropertiesTab';
import { SettingsTab } from './tabs/SettingsTab';
import { StreamingTab } from './tabs/StreamingTab';
import { VentureTab } from './tabs/VentureTab';

const TABS = [
  'Overview',
  'Knights',
  'Properties',
  'Streaming',
  'Coffee',
  'Venture',
  'Settings',
] as const;
type Tab = (typeof TABS)[number];

export function Dashboard() {
  const [active, setActive] = useState<Tab>('Overview');
  const { connected } = useBifrost();

  return (
    <div className="flex min-h-screen">
      {/* ── The Navigation Spire ───────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-gold/20 border-r bg-smoke-900/60 backdrop-blur-sm">
        <div className="flex items-center gap-3 px-6 py-7">
          <span className="flex h-9 w-9 items-center justify-center border border-gold/40 bg-obsidian font-display text-gold-royal text-lg shadow-gold">
            K
          </span>
          <div className="leading-tight">
            <p className="font-display text-gold-light text-sm tracking-minted">KBA</p>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.18em]">Services</p>
          </div>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-1 px-3">
          {TABS.map((tab) => {
            const isActive = active === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActive(tab)}
                className={`group relative flex items-center rounded-sm px-4 py-2.5 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-smoke-800 text-gold-light'
                    : 'text-white/45 hover:bg-white/5 hover:text-white/80'
                }`}
              >
                {/* gold active indicator */}
                <span
                  className={`absolute left-0 h-5 w-0.5 rounded-full transition-all ${
                    isActive ? 'bg-gold-royal shadow-gold' : 'bg-transparent'
                  }`}
                />
                {tab}
              </button>
            );
          })}
        </nav>

        <div className="border-gold/10 border-t px-6 py-5">
          <span
            className={`flex items-center gap-2 text-[11px] ${connected ? 'text-violet-light' : 'text-white/40'}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${connected ? 'bg-violet shadow-glow' : 'bg-white/30'}`}
            />
            {connected ? 'Bifrost connected' : 'Disconnected'}
          </span>
        </div>
      </aside>

      {/* ── Workspace ──────────────────────────────────────────── */}
      <div className="ml-60 flex-1 pb-32">
        <header className="flex items-baseline justify-between px-10 py-8">
          <div>
            <p className="text-[11px] text-white/30 uppercase tracking-[0.2em]">{active}</p>
            <h1 className="mt-1 font-display text-3xl text-white tracking-minted">
              Sovereign Executive Intelligence
            </h1>
          </div>
        </header>

        <main className="px-10">
          {active === 'Overview' && <OverviewTab />}
          {active === 'Knights' && <KnightsTab />}
          {active === 'Properties' && <PropertiesTab />}
          {active === 'Streaming' && <StreamingTab />}
          {active === 'Coffee' && <CoffeeTab />}
          {active === 'Venture' && <VentureTab />}
          {active === 'Settings' && <SettingsTab />}
        </main>
      </div>

      <PlanCard />
    </div>
  );
}
