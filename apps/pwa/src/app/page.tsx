'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { PropertiesTab } from '../components/tabs/PropertiesTab';
import { StreamingTab } from '../components/tabs/StreamingTab';

const SettingsDrawer = dynamic(() => import('../components/SettingsDrawer').then((mod) => mod.SettingsDrawer), {
  ssr: false,
});

const LakishaHUD = dynamic(() => import('../components/LakishaHUD').then((mod) => mod.LakishaHUD), {
  ssr: false,
});

const TABS = ['Property', 'Streaming', 'Coffee'] as const;
type Tab = (typeof TABS)[number];

const coffeeRows = [
  { name: 'Cleveland Roast Reserve', status: 'Inventory stable' },
  { name: 'Gold Label Espresso', status: 'Reorder watch' },
  { name: 'Lakefront Cold Brew', status: 'Ready for dispatch' },
];

export default function Home() {
  const [active, setActive] = useState<Tab>('Property');

  return (
    <main className="min-h-screen px-4 pb-40 pt-6 md:px-8 lg:px-10">
      <section className="mx-auto min-h-[calc(100vh-3rem)] max-w-7xl border border-gold/40 bg-[#16161E]/70 backdrop-blur-xl">
        <header className="flex flex-col gap-6 border-b border-gold/30 px-5 py-6 md:flex-row md:items-end md:justify-between md:px-8">
          <div>
            <h1 className="font-display text-4xl text-gold-royal md:text-6xl">KOA Realm</h1>
            <p className="mt-3 max-w-2xl text-xs uppercase tracking-[0.14em] text-white/45">
              Living brutalism for property, streaming, and coffee operations.
            </p>
          </div>

          <nav className="grid grid-cols-3 border border-gold/30 bg-[#050505]/55">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActive(tab)}
                className={`px-4 py-3 text-xs uppercase tracking-[0.14em] transition-colors ${
                  active === tab
                    ? 'bg-gold-royal text-[#050505] shadow-[0_0_15px_#FFD700]'
                    : 'text-gold-light hover:bg-violet/20 hover:text-violet-light'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </header>

        <div className="px-5 py-6 md:px-8 md:py-8">
          {active === 'Property' && <PropertiesTab />}
          {active === 'Streaming' && <StreamingTab />}
          {active === 'Coffee' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {coffeeRows.map((row) => (
                <article
                  key={row.name}
                  className="border border-gold/20 bg-[#16161E]/70 p-6 backdrop-blur-xl transition-shadow hover:shadow-gold"
                >
                  <p className="font-display text-lg text-white">{row.name}</p>
                  <p className="mt-2 text-sm text-violet-light">{row.status}</p>
                  <span className="mt-6 block h-1 w-full bg-gradient-to-r from-gold-royal via-violet to-transparent" />
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <SettingsDrawer />
    </main>
  );
}
