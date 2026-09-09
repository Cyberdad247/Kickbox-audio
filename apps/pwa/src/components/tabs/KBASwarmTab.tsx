import React, { useState } from 'react';
import { KBASwarmCommand } from '../kba/KBASwarmCommand';
import { BioKineticSwarmWorkbench } from '../capsule/BioKineticSwarmWorkbench';

export function KBASwarmTab() {
  const [viewMode, setViewMode] = useState<'nanobot' | 'cartridge'>('nanobot');

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Mode Switcher */}
      <div className="flex items-center justify-between border-b border-gold/20 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('nanobot')}
            className={`px-4 py-1.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'nanobot'
                ? 'bg-gold/20 text-gold border border-gold font-bold shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                : 'text-white/50 hover:text-white border border-white/10'
            }`}
          >
            🤖 Bio-Kinetic Nanobot Swarm
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cartridge')}
            className={`px-4 py-1.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'cartridge'
                ? 'bg-gold/20 text-gold border border-gold font-bold shadow-[0_0_12px_rgba(212,175,55,0.3)]'
                : 'text-white/50 hover:text-white border border-white/10'
            }`}
          >
            💼 KBA Cartridge v1000
          </button>
        </div>
      </div>

      {viewMode === 'nanobot' ? (
        <BioKineticSwarmWorkbench />
      ) : (
        <>
          <div className="border border-gold/20 bg-black/40 backdrop-blur-md rounded-none p-6 shadow-[0_0_40px_rgba(212,175,55,0.05)]">
            <h2 className="text-2xl font-display text-white tracking-widest uppercase mb-2">
              KBA Cartridge v1000
            </h2>
            <p className="text-sm font-mono text-white/50 leading-relaxed mb-6">
              SaaS Modular Integration active. Zero-entropy marketing & 3D UI actuation matrix online.
              Use the command bridge below to route requests to the worldtree MCP.
            </p>

            <KBASwarmCommand />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-white/10 bg-black/40 backdrop-blur-md p-6">
              <h3 className="text-gold font-mono text-sm font-bold uppercase tracking-widest mb-4">
                Digital Marketing Crucible
              </h3>
              <p className="text-xs text-white/50 font-mono mb-4 leading-relaxed">
                Execute high-fidelity market simulations, funnel generation, and multi-channel asset
                compilation.
              </p>
              <div className="flex gap-3">
                <button className="px-4 py-2 border border-cyan-500/50 bg-cyan-500/10 text-cyan-400 font-mono text-xs uppercase hover:bg-cyan-500/20 transition-colors">
                  Deploy Campaign
                </button>
                <button className="px-4 py-2 border border-white/20 bg-transparent text-white/70 font-mono text-xs uppercase hover:bg-white/10 transition-colors">
                  Audit Metrics
                </button>
              </div>
            </div>

            <div className="border border-white/10 bg-black/40 backdrop-blur-md p-6">
              <h3 className="text-gold font-mono text-sm font-bold uppercase tracking-widest mb-4">
                3D-UI Generation Matrix
              </h3>
              <p className="text-xs text-white/50 font-mono mb-4 leading-relaxed">
                Procedurally architect spatial layouts and kinetic WebGL canvases via pure Symbolect
                ingestion.
              </p>
              <div className="flex gap-3">
                <button className="px-4 py-2 border border-purple-500/50 bg-purple-500/10 text-purple-400 font-mono text-xs uppercase hover:bg-purple-500/20 transition-colors">
                  Generate Canvas
                </button>
                <button className="px-4 py-2 border border-white/20 bg-transparent text-white/70 font-mono text-xs uppercase hover:bg-white/10 transition-colors">
                  Inject Shaders
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
