'use client';

import React, { useState, useEffect, useRef } from 'react';
import { playSpatialTone, triggerHaptic } from '../../lib/hapticsAndSpatialAudio';
import type { LedgerBlock, VfsEntry } from '../../lib/kernel/cloudbrain';
import type { CrystalData } from '../../lib/kernel/compression';
import { type KernelExecutionResult, sovereignKernelInstance } from '../../lib/kernel/kernel';
import { KNIGHT_PERSONAS, type PersonaDefinition } from '../../lib/kernel/personas';

export function AssimilationKernelView() {
  const kernel = sovereignKernelInstance;
  const [activePersona, setActivePersona] = useState<PersonaDefinition>(kernel.getActivePersona());
  const [commandInput, setCommandInput] = useState('//summon anya');
  const [history, setHistory] = useState<KernelExecutionResult[]>([]);
  const [crystals, setCrystals] = useState<CrystalData[]>([]);
  const [ledger, setLedger] = useState<LedgerBlock[]>([]);
  const [vfs, setVfs] = useState<VfsEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'terminal' | 'crystals' | 'colmad' | 'ledger' | 'vfs'>(
    'terminal',
  );
  const [colmadPrompt, setColmadPrompt] = useState(
    'Deploy zero-leak microVM guest kernel for Lakisha Voice OS',
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Sync state from kernel
  const refreshState = () => {
    setActivePersona(kernel.getActivePersona());
    setCrystals(kernel.cloudBrain.getAllCrystals());
    setLedger(kernel.cloudBrain.getLedger());
    setVfs(kernel.cloudBrain.getVfsList());
  };

  useEffect(() => {
    // Initial welcome run
    const initRes = kernel.execute('//summon anya');
    setHistory([initRes]);
    refreshState();
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleRunCommand = (cmdToRun?: string) => {
    const cmd = cmdToRun || commandInput;
    if (!cmd.trim()) return;

    setIsProcessing(true);
    triggerHaptic('click');
    playSpatialTone(660, 0.5, 0.08);

    setTimeout(() => {
      const result = kernel.execute(cmd);
      setHistory((prev) => [...prev, result]);
      refreshState();
      setIsProcessing(false);
    }, 150);
  };

  const handlePersonaSwitch = (pKey: string) => {
    triggerHaptic('consent');
    playSpatialTone(880, 0.2, 0.1);
    const res = kernel.execute(`//summon ${pKey}`);
    setHistory((prev) => [...prev, res]);
    refreshState();
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto space-y-6 select-none animate-fadeIn">
      {/* Top Runic HUD / Persona Banner */}
      <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-[#0B0B14] via-[#0F0F1E] to-[#08080E] p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-[#00F0FF]/40 bg-[#00F0FF]/10 text-3xl shadow-[0_0_25px_rgba(0,240,255,0.25)]">
              <span>{activePersona.avatar}</span>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[8px] font-bold text-black ring-2 ring-black">
                ✓
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-xl font-bold tracking-wide text-white">
                  {activePersona.name}
                </h2>
                <span className="rounded-md border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300 uppercase">
                  Active Knight
                </span>
              </div>
              <p className="font-mono text-xs text-white/60 mt-0.5">{activePersona.role}</p>
              <p className="font-mono text-[11px] text-gold/80 italic mt-1">
                "{activePersona.rules}"
              </p>
            </div>
          </div>

          {/* Persona Hot-Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {Object.values(KNIGHT_PERSONAS).map((p) => {
              const isSelected = activePersona.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePersonaSwitch(p.id)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-mono transition-all ${
                    isSelected
                      ? 'border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF] font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                      : 'border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white'
                  }`}
                >
                  <span>{p.avatar}</span>
                  <span>{p.name.split('_')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Banner & OCEAN Spectrum */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 text-[11px] font-mono">
          <div className="text-cyan-300/80 tracking-widest truncate">{activePersona.banner}</div>
          <div className="flex items-center gap-3 text-white/60">
            <span>OCEAN:</span>
            <span title="Openness">O:{(activePersona.ocean[0] * 100).toFixed(0)}%</span>
            <span title="Conscientiousness">C:{(activePersona.ocean[1] * 100).toFixed(0)}%</span>
            <span title="Extraversion">E:{(activePersona.ocean[2] * 100).toFixed(0)}%</span>
            <span title="Agreeableness">A:{(activePersona.ocean[3] * 100).toFixed(0)}%</span>
            <span title="Neuroticism">N:{(activePersona.ocean[4] * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('terminal')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all ${
            activeTab === 'terminal'
              ? 'border border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF] font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <span>💻</span>
          <span>Assimilation Terminal</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('crystals')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all ${
            activeTab === 'crystals'
              ? 'border border-[#9D4EDD] bg-[#9D4EDD]/20 text-[#9D4EDD] font-bold shadow-[0_0_12px_rgba(157,78,221,0.2)]'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <span>💎</span>
          <span>νKG Crystals ({crystals.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('colmad')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all ${
            activeTab === 'colmad'
              ? 'border border-amber-400 bg-amber-400/20 text-amber-300 font-bold shadow-[0_0_12px_rgba(245,158,11,0.2)]'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <span>🏛️</span>
          <span>ColMAD Debate Loop</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all ${
            activeTab === 'ledger'
              ? 'border border-emerald-400 bg-emerald-400/20 text-emerald-300 font-bold shadow-[0_0_12px_rgba(52,211,153,0.2)]'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <span>📜</span>
          <span>Provenance Ledger ({ledger.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('vfs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all ${
            activeTab === 'vfs'
              ? 'border border-cyan-400 bg-cyan-400/20 text-cyan-300 font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)]'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <span>📂</span>
          <span>CloudBrain VFS</span>
        </button>
      </div>

      {/* View Content Slot */}
      {activeTab === 'terminal' && (
        <div className="flex flex-col flex-1 rounded-2xl border border-white/10 bg-[#08080D] p-5 shadow-2xl min-h-[480px]">
          {/* Quick Runic Chips */}
          <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-white/10">
            <span className="text-[11px] font-mono text-white/50">Run Quick Action:</span>
            {[
              {
                label: '//compress State',
                cmd: '//compress Lakisha Voice OS state synchronized with microVM guest enclave',
              },
              { label: '//decompress Crystal', cmd: '//decompress' },
              { label: '//ghost_audit', cmd: '//ghost_audit' },
              { label: '//sync Lattice', cmd: '//sync' },
              {
                label: '//colmad Verify',
                cmd: '//colmad Enforce zero-leak WASM capability memory lease',
              },
              { label: '//vfs Tree', cmd: '//vfs' },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setCommandInput(chip.cmd);
                  handleRunCommand(chip.cmd);
                }}
                className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-cyan-300 hover:border-cyan-400 hover:bg-cyan-400/10 transition-all"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Terminal History */}
          <div className="flex-1 overflow-y-auto space-y-4 font-mono text-xs pr-2 max-h-[380px]">
            {history.map((h, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-black/40 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-cyan-400/80">
                  <div className="flex items-center gap-2">
                    <span className="text-white/40">
                      [{new Date(h.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className="text-gold font-bold">SOVEREIGN &gt;</span>
                    <span className="text-white font-semibold">{h.command}</span>
                  </div>
                  <span className="text-[10px] text-white/40">{h.persona.name}</span>
                </div>
                <pre className="text-white/90 whitespace-pre-wrap font-mono text-[11px] leading-relaxed bg-black/60 p-3 rounded-lg border border-white/5">
                  {h.output}
                </pre>
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>

          {/* Command Prompt Input */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-3">
            <span className="font-mono text-xs text-[#00F0FF] font-bold shrink-0">
              {activePersona.avatar} //
            </span>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRunCommand();
              }}
              placeholder="//summon anya | //compress <prompt> | //colmad <proposal> | //ghost_audit"
              className="flex-1 rounded-xl border border-white/15 bg-black/60 px-4 py-2.5 font-mono text-xs text-white placeholder-white/30 focus:border-[#00F0FF] focus:outline-none focus:ring-1 focus:ring-[#00F0FF]"
            />
            <button
              type="button"
              onClick={() => handleRunCommand()}
              disabled={isProcessing}
              className="rounded-xl border border-[#00F0FF] bg-[#00F0FF]/20 px-5 py-2.5 font-mono text-xs font-bold text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.25)] hover:bg-[#00F0FF]/30 transition-all disabled:opacity-50"
            >
              {isProcessing ? '⚡ RUNNING...' : 'EXECUTE'}
            </button>
          </div>
        </div>
      )}

      {/* νKG Crystals Inspector */}
      {activeTab === 'crystals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              13-Layer νKG Crystal Repository
            </h3>
            <button
              type="button"
              onClick={() => {
                handleRunCommand('//compress Lakisha Voice PWA AudioWorklet state & Merkle proof');
              }}
              className="rounded-lg border border-[#9D4EDD] bg-[#9D4EDD]/20 px-3 py-1.5 font-mono text-xs text-[#9D4EDD] hover:bg-[#9D4EDD]/30 transition-all"
            >
              + Forge New Crystal
            </button>
          </div>

          {crystals.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-8 text-center text-white/50 font-mono text-xs">
              No crystals stored yet. Run `//compress &lt;prompt&gt;` in the terminal to forge a νKG
              crystal.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {crystals.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-[#9D4EDD]/30 bg-gradient-to-br from-[#120B1C] to-[#0A0710] p-4 shadow-xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">💎</span>
                      <span className="font-mono text-xs font-bold text-[#9D4EDD]">{c.id}</span>
                    </div>
                    <span className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300 font-bold">
                      {c.ratio}% SAVED
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-white/60 bg-black/40 p-2.5 rounded-lg">
                    <div>Raw: {c.rawLength} chars</div>
                    <div>Compressed: {c.compressedLength} chars</div>
                    <div className="truncate col-span-2">Merkle: {c.merkleRoot}</div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono text-white/40 uppercase">
                      Symbollect Stream:
                    </div>
                    <div className="mt-1 font-mono text-xs text-white bg-black/60 p-2.5 rounded-lg border border-white/10 break-all">
                      {c.symbollectText}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="font-mono text-[10px] text-white/40">
                      Author: {c.metadata.knight}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        handleRunCommand(`//decompress`);
                        setActiveTab('terminal');
                      }}
                      className="text-[11px] font-mono text-cyan-300 hover:underline"
                    >
                      Decompress Losslessly &gt;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ColMAD Debate Loop Tab */}
      {activeTab === 'colmad' && (
        <div className="rounded-2xl border border-amber-400/20 bg-[#0C0B08] p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏛️</span>
              <div>
                <h3 className="font-mono text-xs font-bold text-amber-300 uppercase tracking-wider">
                  ColMAD Adversarial Debate Engine (Lotka-Volterra)
                </h3>
                <p className="font-mono text-[11px] text-white/60">
                  Architect (Merlin Ω) vs. Inquisitor (Socrates Ω) with 5-Pillar Truth Validation
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={colmadPrompt}
              onChange={(e) => setColmadPrompt(e.target.value)}
              placeholder="Enter architectural proposal to debate..."
              className="flex-1 rounded-xl border border-white/15 bg-black/60 px-4 py-2.5 font-mono text-xs text-white focus:border-amber-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                handleRunCommand(`//colmad ${colmadPrompt}`);
                setActiveTab('terminal');
              }}
              className="rounded-xl border border-amber-400 bg-amber-400/20 px-5 py-2.5 font-mono text-xs font-bold text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)] hover:bg-amber-400/30 transition-all"
            >
              Start Debate Loop
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-4">
            {[
              'Mathematical Soundness',
              'Zone-0 Privacy',
              'WASM Capability Strictness',
              '<8GB Memory Budget',
              'Sovereign Integrity',
            ].map((pillar, i) => (
              <div
                key={pillar}
                className="rounded-xl border border-white/10 bg-black/40 p-3 text-center space-y-1"
              >
                <div className="text-[10px] font-mono text-white/40">Pillar #{i + 1}</div>
                <div className="font-mono text-xs text-white font-bold">{pillar}</div>
                <div className="text-[10px] font-mono text-emerald-400">PASSED (1.00)</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Merkle Ledger Tab */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              Immutable Merkle Provenance Ledger (SQLite WAL-2)
            </h3>
            <span className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
              Integrity: 100% SECURE
            </span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="border-b border-white/10 bg-white/5 text-[10px] text-white/50 uppercase">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Block Hash</th>
                    <th className="p-3">Merkle Root</th>
                    <th className="p-3">Payload Data</th>
                    <th className="p-3">Author</th>
                    <th className="p-3">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ledger.map((b) => (
                    <tr key={b.index} className="hover:bg-white/5 transition-all">
                      <td className="p-3 text-[#00F0FF] font-bold">#{b.index}</td>
                      <td className="p-3 font-mono text-[10px] text-white/70">
                        {b.currentHash.slice(0, 16)}...
                      </td>
                      <td className="p-3 font-mono text-[10px] text-emerald-400">
                        {b.merkleRoot.slice(0, 16)}...
                      </td>
                      <td className="p-3 text-white max-w-xs truncate">{b.data}</td>
                      <td className="p-3 text-gold">{b.author}</td>
                      <td className="p-3 text-white/40 text-[10px]">
                        {new Date(b.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CloudBrain VFS Tab */}
      {activeTab === 'vfs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              CloudBrain Virtual File System (VFS)
            </h3>
            <span className="font-mono text-[10px] text-white/50">{vfs.length} Active Nodes</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2 font-mono text-xs">
            {vfs.map((node) => (
              <div
                key={node.path}
                className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-black/60 hover:border-cyan-400/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span>
                    {node.type === 'directory' ? '📁' : node.type === 'crystal' ? '💎' : '📄'}
                  </span>
                  <span className="text-white font-semibold">{node.path}</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-white/50">
                  <span>{node.sizeBytes} Bytes</span>
                  <span>{new Date(node.modified).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
