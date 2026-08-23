'use client';

import { useEffect, useState } from 'react';
import { useBifrost } from '../context/BifrostContext';
import { useTenant } from '../context/TenantContext';
import { useLakishaVoice } from '../hooks/useLakishaVoice';
import { PlanCard } from './PlanCard';
import { FileDriverExplorer } from './capsule/FileDriverExplorer';
import { OodaMgvVisualizer } from './dashboard/OodaMgvVisualizer';
import { GoogleDriveExplorer } from './drive/GoogleDriveExplorer';
import { ActivitiesTab } from './tabs/ActivitiesTab';
import { CoffeeTab } from './tabs/CoffeeTab';
import { KnightsTab } from './tabs/KnightsTab';
import { OverviewTab } from './tabs/OverviewTab';
import { PropertiesTab } from './tabs/PropertiesTab';
import { SettingsTab } from './tabs/SettingsTab';
import { KBASwarmTab } from './tabs/KBASwarmTab';
import { StreamingTab } from './tabs/StreamingTab';
import { VaultTab } from './tabs/VaultTab';
import { VentureTab } from './tabs/VentureTab';

const TABS = [
  'Overview',
  'File Driver',
  'Google Drive',
  'OODA Loop',
  'Knights',
  'Properties',
  'Streaming',
  'Coffee',
  'Venture',
  'Vault',
  'Activities',
  'Settings',
  'KBA Swarm',
] as const;

type Tab = (typeof TABS)[number];

export function Dashboard() {
  const [active, setActive] = useState<Tab>('Overview');
  const { connected, isReconnecting, reconnectNow } = useBifrost();
  const { listening, speaking, voiced, recognitionSupported, toggleListening } = useLakishaVoice();
  const { setShowAvatarKnightScreen } = useTenant();

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const target = customEvent.detail;
      const tabStr = target.charAt(0).toUpperCase() + target.slice(1);
      if (TABS.includes(tabStr as Tab)) {
        setActive(tabStr as Tab);
      }
    };
    window.addEventListener('koa:navigate_tab', handleNavigate);
    return () => window.removeEventListener('koa:navigate_tab', handleNavigate);
  }, []);

  return (
    <div className="flex h-full w-full">
      {/* ── The Navigation Spire ───────────────────────────────── */}
      <aside className="flex w-60 shrink-0 flex-col border-gold/20 border-r bg-smoke-900/60 backdrop-blur-sm">
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

        <div className="px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={() => setShowAvatarKnightScreen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#00E5FF]/40 bg-[#00E5FF]/10 py-2.5 text-[11px] font-bold uppercase tracking-wider text-[#00E5FF] transition-all hover:bg-[#00E5FF]/20 hover:scale-105"
          >
            <span>←</span>
            <span>Avatar Sandbox</span>
          </button>
        </div>

        <div className="border-gold/10 border-t px-6 py-5">
          <div className="flex w-full items-center justify-between text-[11px] text-left">
            <span
              className={`flex items-center gap-2 ${
                connected
                  ? 'text-emerald-400 font-bold'
                  : isReconnecting
                    ? 'text-amber-300'
                    : 'text-amber-400/80'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  connected
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : isReconnecting
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
                }`}
              />
              {connected
                ? 'Bifrost connected'
                : isReconnecting
                  ? 'Reconnecting...'
                  : 'Bifrost offline'}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Workspace ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-32">
        <header className="flex flex-wrap items-center justify-between gap-4 px-10 py-8 border-b border-gold/10 bg-black/20 backdrop-blur-md">
          <div>
            <p className="text-[11px] text-white/30 uppercase tracking-[0.2em]">{active}</p>
            <h1 className="mt-1 font-display text-3xl text-white tracking-minted">
              Sovereign Executive Intelligence
            </h1>
          </div>

          {/* Status Icons & Connectivity Indicators */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 1. Bifrost WebSocket Connectivity Status Icon */}
            <div
              title={
                connected
                  ? 'Bifrost WebSocket Active & Connected'
                  : isReconnecting
                    ? 'Bifrost WebSocket Reconnecting...'
                    : 'Bifrost WebSocket Offline'
              }
              className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 font-mono text-xs shadow-md transition-all ${
                connected
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                  : isReconnecting
                    ? 'border-amber-400/50 bg-amber-950/30 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)] animate-pulse'
                    : 'border-rose-500/40 bg-rose-950/30 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span className="text-sm">⚡</span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ${
                    connected
                      ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                      : isReconnecting
                        ? 'bg-amber-400 animate-ping'
                        : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
                  }`}
                />
              </div>

              <div className="flex flex-col text-[10px] leading-tight">
                <span className="font-bold uppercase tracking-wider">Bifrost WS</span>
                <span className="text-[9px] opacity-80">
                  {connected ? 'Connected' : isReconnecting ? 'Reconnecting...' : 'Offline'}
                </span>
              </div>

              {!connected && (
                <button
                  type="button"
                  onClick={() => reconnectNow()}
                  className="ml-1 rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-white hover:bg-white/20 transition-all"
                  title="Force WebSocket Reconnect"
                >
                  🔄
                </button>
              )}
            </div>

            {/* 2. Microphone Readiness Status Icon */}
            <button
              type="button"
              onClick={() => toggleListening()}
              title={
                listening
                  ? 'Microphone Active & Listening (Click to Pause)'
                  : recognitionSupported
                    ? 'Microphone Ready (Click to Start Listening)'
                    : 'Microphone WebSpeech Unsupported'
              }
              className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 font-mono text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02] ${
                listening
                  ? 'border-cyan-400/60 bg-cyan-950/40 text-cyan-200 shadow-[0_0_16px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/40'
                  : speaking
                    ? 'border-purple-400/60 bg-purple-950/40 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                    : recognitionSupported
                      ? 'border-emerald-500/30 bg-black/60 text-emerald-300/90 hover:border-emerald-400 hover:text-emerald-200'
                      : 'border-amber-500/30 bg-amber-950/20 text-amber-300/70'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <span className={`text-sm ${listening ? 'animate-bounce' : ''}`}>
                  {speaking ? '🔊' : listening ? '🎙️' : '🎤'}
                </span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ${
                    listening
                      ? 'bg-cyan-400 shadow-[0_0_8px_#06b6d4] animate-ping'
                      : speaking
                        ? 'bg-purple-400 shadow-[0_0_8px_#a855f7]'
                        : recognitionSupported
                          ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]'
                          : 'bg-amber-400'
                  }`}
                />
              </div>

              <div className="flex flex-col text-[10px] leading-tight text-left">
                <span className="font-bold uppercase tracking-wider flex items-center gap-1">
                  <span>Mic Status</span>
                  {voiced && <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-ping" />}
                </span>
                <span className="text-[9px] opacity-80">
                  {speaking
                    ? 'Speaking...'
                    : listening
                      ? 'Listening...'
                      : recognitionSupported
                        ? 'Mic Ready'
                        : 'Unsupported'}
                </span>
              </div>
            </button>
          </div>
        </header>

        <main className="px-10">
          {active === 'Overview' && <OverviewTab />}
          {active === 'File Driver' && <FileDriverExplorer />}
          {active === 'Google Drive' && <GoogleDriveExplorer />}
          {active === 'OODA Loop' && <OodaMgvVisualizer />}
          {active === 'Knights' && <KnightsTab />}
          {active === 'Properties' && <PropertiesTab />}
          {active === 'Streaming' && <StreamingTab />}
          {active === 'Coffee' && <CoffeeTab />}
          {active === 'Venture' && <VentureTab />}
          {active === 'Vault' && <VaultTab />}
          {active === 'Activities' && <ActivitiesTab />}
          {active === 'Settings' && <SettingsTab />}
          {active === 'KBA Swarm' && <KBASwarmTab />}
        </main>
      </div>

      <PlanCard />
    </div>
  );
}
