'use client';

import { useState } from 'react';
import { useBifrost } from '../context/BifrostContext';
import { LakishaHUD } from './LakishaHUD';
import { OverviewTab } from './tabs/OverviewTab';
import { PropertiesTab } from './tabs/PropertiesTab';
import { StreamingTab } from './tabs/StreamingTab';
import { VentureTab } from './tabs/VentureTab';

const TABS = ['Overview', 'Properties', 'Streaming', 'Venture'] as const;
type Tab = (typeof TABS)[number];

export function Dashboard() {
  const [active, setActive] = useState<Tab>('Overview');
  const { connected } = useBifrost();

  return (
    <div className="min-h-screen pb-28">
      <header className="flex items-center justify-between border-gold/20 border-b px-8 py-6">
        <h1 className="font-display text-2xl tracking-tight text-gold-light">Sovereign</h1>
        <span
          className={`flex items-center gap-2 text-xs ${connected ? 'text-violet-light' : 'text-white/40'}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${connected ? 'bg-violet shadow-glow' : 'bg-white/30'}`}
          />
          {connected ? 'Bifrost connected' : 'Disconnected'}
        </span>
      </header>

      <nav className="flex gap-1 px-8 pt-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`rounded-t-lg px-5 py-2.5 text-sm transition-colors ${
              active === tab
                ? 'bg-smoke-800 text-gold-light shadow-glow'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main className="px-8 py-6">
        {active === 'Overview' && <OverviewTab />}
        {active === 'Properties' && <PropertiesTab />}
        {active === 'Streaming' && <StreamingTab />}
        {active === 'Venture' && <VentureTab />}
      </main>

      <LakishaHUD />
    </div>
  );
}
