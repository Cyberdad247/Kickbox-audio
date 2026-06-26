'use client';

import { useEffect, useState } from 'react';
import { useBifrost } from '../../context/BifrostContext';

function Toggle({
  label,
  value,
  onChange,
}: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className="flex w-full items-center justify-between border border-gold/20 bg-smoke-800/80 px-5 py-4 text-left backdrop-blur-sm transition-colors hover:border-gold/40"
    >
      <span className="text-sm text-white/70 uppercase tracking-wider">{label}</span>
      <span
        className={`relative h-5 w-9 border transition-colors ${value ? 'border-violet bg-violet/30' : 'border-white/20 bg-obsidian'}`}
      >
        <span
          className={`absolute top-0.5 h-3.5 w-3.5 transition-all ${value ? 'left-4 bg-violet-light' : 'left-0.5 bg-white/40'}`}
        />
      </span>
    </button>
  );
}

export function SettingsTab() {
  const { connected } = useBifrost();
  const [voice, setVoice] = useState(true);
  const [motion, setMotion] = useState(true);
  const [purged, setPurged] = useState(false);

  // Persist preferences (the "Learn With Me" local vault).
  useEffect(() => {
    try {
      setVoice(localStorage.getItem('koa.voice') !== '0');
      setMotion(localStorage.getItem('koa.motion') !== '0');
    } catch {}
  }, []);
  const set = (k: string, v: boolean, fn: (v: boolean) => void) => {
    fn(v);
    try {
      localStorage.setItem(k, v ? '1' : '0');
    } catch {}
  };

  const purge = () => {
    try {
      localStorage.clear();
    } catch {}
    setPurged(true);
    setTimeout(() => setPurged(false), 2500);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <p className="px-1 text-[11px] text-white/35 uppercase tracking-[0.2em]">Preferences</p>
        <Toggle
          label="Lakisha voice replies"
          value={voice}
          onChange={(v) => set('koa.voice', v, setVoice)}
        />
        <Toggle
          label="Kinetic motion (WebGL)"
          value={motion}
          onChange={(v) => set('koa.motion', v, setMotion)}
        />
      </div>

      <div className="space-y-3">
        <p className="px-1 text-[11px] text-white/35 uppercase tracking-[0.2em]">System</p>
        <div className="border border-gold/20 bg-smoke-800/80 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50 uppercase tracking-wider">Bifrost mesh</span>
            <span
              className={`flex items-center gap-2 ${connected ? 'text-violet-light' : 'text-white/40'}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${connected ? 'bg-violet shadow-glow' : 'bg-white/30'}`}
              />
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-white/50 uppercase tracking-wider">Weather anchor</span>
            <span className="text-gold-light">Cleveland, OH</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-white/50 uppercase tracking-wider">Realm</span>
            <span className="font-display text-gold-royal tracking-minted">KOA v2.0</span>
          </div>
        </div>
        <button
          type="button"
          onClick={purge}
          className="w-full border border-red-400/40 px-5 py-4 text-sm text-red-400 uppercase tracking-widest transition-colors hover:bg-red-400/10"
        >
          {purged ? 'Memory vault purged' : 'Purge "Learn With Me" memory'}
        </button>
      </div>
    </div>
  );
}
