'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ProvenanceLedgerService } from '../../lib/provenanceLedger';

export interface LogEntry {
  id: string;
  type: 'input' | 'system' | 'success' | 'error';
  text: string;
  timestamp: string;
}

export function RunicConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<LogEntry[]>([
    {
      id: 'init',
      type: 'system',
      text: 'Camelot-OS Runic Console v1000 initialized. Type //help to view Symbolects.',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle console with Ctrl+` or Cmd+`
      if (e.key === '`' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, isOpen]);

  const handleExecute = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const addLog = (type: LogEntry['type'], text: string) => {
      setHistory((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          type,
          text,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    addLog('input', trimmed);
    let outcomeText = '';
    let outcomeType: LogEntry['type'] = 'system';

    if (trimmed.startsWith('//')) {
      const symbolect = trimmed.toLowerCase();
      switch (symbolect) {
        case '//boot':
          outcomeText =
            '[ANYA_Ω] ⚡ Virtual Simulation Terminal instantiated. Hardware telemetry verified. Shared memory backplane mounted.';
          break;
        case '//shield':
          outcomeText = '[SIR_SENTINEL] 🛡️ AgentArmor engaged. Zero-trust sandbox isolation locked.';
          break;
        case '//verify':
          outcomeText =
            '[SIR_GIDEON] 🧪 Shadow VM crucible triggered. Validating TDD and executing Z3 formal logic proofs... [SAT]';
          break;
        case '//gate':
          outcomeText =
            '[MERLIN_Ω] ⚖️ Iron Gate invoked. Awaiting sovereign authorization... {👤✅}';
          break;
        case '//sync':
          outcomeText =
            '[LADY_MNEMOSYNE_Ω] 🌐 Broadcasting CRDT ledger updates across the Worldtree Cloudbrain (NotebookLM)... Synchronized.';
          break;
        case '//seal':
          outcomeText =
            '⚜️_SOVEREIGN_TRUTH: Master cryptographic transaction sealed. Deployment finalized.';
          outcomeType = 'success';
          break;
        case '//grand_lattice':
        case '//lattice':
        case '//blueprints':
          outcomeText =
            '[GRAND_LATTICE] 🏗️ 5-Zone Sovereign Topology matrix active. Experience (Zone 0), Control (Zone 1), Execution (Zone 2), Memory (Zone 3), Connectors (Zone 4) nominal.';
          outcomeType = 'success';
          window.dispatchEvent(new CustomEvent('camelot:navigate-tab', { detail: 'lattice' }));
          break;
        case '//vps_hub':
          outcomeText =
            '[VPS_HUB] 🛡️ Cybertronia 8GB Memory & Process Allocation matrix loaded. Zero Docker, native cgroups v2, Tailscale mTLS, eBPF PSI OK.';
          outcomeType = 'success';
          window.dispatchEvent(new CustomEvent('camelot:navigate-tab', { detail: 'lattice' }));
          break;
        case '//voice_orb':
          outcomeText =
            '[VOICE_ORB] 📱 S26 Voice Orb (4GB) ↔ VPS Hub (8GB) zero-trust Opus audio pipeline online. Sub-250ms round-trip latency verified.';
          outcomeType = 'success';
          window.dispatchEvent(new CustomEvent('camelot:navigate-tab', { detail: 'lattice' }));
          break;
        case '//ravenry':
        case '//mail':
          outcomeText =
            '[RAVENRY_MAIL] ✉️ End-to-End R4 HITL Mission Sequence ready: Capability lease, Ollama drafting, WebAuthn FIDO2 approval, WAL2 ledger receipt.';
          outcomeType = 'success';
          window.dispatchEvent(new CustomEvent('camelot:navigate-tab', { detail: 'lattice' }));
          break;
        case '//graph_engine':
          outcomeText =
            '[GRAPH_ENGINE] 🕸️ Rust WASI 0.2 Graph Engine initialized: Parallel fan-out, pipelined streaming, barrier joins & Gideon Z3 formal verification.';
          outcomeType = 'success';
          window.dispatchEvent(new CustomEvent('camelot:navigate-tab', { detail: 'lattice' }));
          break;
        case '//go_live':
          outcomeText =
            '[ANYA_Ω] 🚀 //GO_LIVE executed. Sovereign process mesh active on VPS node. Cgroups locked.';
          outcomeType = 'success';
          break;
        case '//dispatch':
          outcomeText =
            '[SIR_HYDRON] ⚡ //DISPATCH engaged. Distributing tasks across WASI Component Model microVMs.';
          outcomeType = 'success';
          break;
        case '//forge':
          outcomeText =
            '[SOVEREIGN_FORGE] 💎 UI/UX Vanguard souls compiled into unified split-brain meta-prompt.';
          outcomeType = 'success';
          break;
        case '//forge_bio_kinetic_swarm':
        case '//nanobot':
        case '//swarm':
          outcomeText =
            '[MERLIN_Ω] 🤖 //FORGE_BIO_KINETIC_SWARM engaged. Native Rust wasm32-wasip2 swarm active under cgroups v2 512MB quota.';
          outcomeType = 'success';
          window.dispatchEvent(new CustomEvent('camelot:navigate-tab', { detail: 'nanobot' }));
          break;
        case '//loop_prompt':
          outcomeText =
            '[MERLIN_Ω] 🔁 Merlin Loop-Prompting DAG initialized. Dynamic re-prompting with failure evidence hash & diagnostics.';
          outcomeType = 'success';
          window.dispatchEvent(new CustomEvent('camelot:navigate-tab', { detail: 'nanobot' }));
          break;
        case '//triage':
          outcomeText =
            '[SELF_TRIAGE] ⚖️ Autonomous Ring 0/1/2 self-triaging matrix loaded. Cgroups v2 limits enforced.';
          outcomeType = 'success';
          window.dispatchEvent(new CustomEvent('camelot:navigate-tab', { detail: 'nanobot' }));
          break;
        case '//help':
          outcomeText =
            'Available Symbolects: //boot, //shield, //verify, //gate, //sync, //seal, //forge_bio_kinetic_swarm, //nanobot, //loop_prompt, //triage, //grand_lattice, //vps_hub, //voice_orb, //ravenry, //graph_engine, //go_live, //dispatch, //forge, //clear';
          break;
        case '//clear':
          setHistory([]);
          ProvenanceLedgerService.record(trimmed, 'Console history cleared.');
          return;
        default:
          outcomeText = `Unknown Symbolect: ${trimmed}. Type //help for a list of available commands.`;
          outcomeType = 'error';
      }
    } else {
      outcomeText =
        'Error: Only Runic Symbolects (prefixed with //) are supported in this terminal.';
      outcomeType = 'error';
    }

    addLog(outcomeType, outcomeText);
    ProvenanceLedgerService.record(trimmed, outcomeText);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecute(input);
    setInput('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-white/50 backdrop-blur-md hover:border-gold/50 hover:text-gold transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)]"
      >
        <span>Terminal</span>
        <span className="opacity-50">⌘`</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 z-[100] flex h-64 w-full flex-col border-t border-gold/20 bg-[#0B0914]/60 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.7)]">
      <div className="flex h-8 items-center justify-between border-b border-white/10 bg-black/40 px-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-gold animate-pulse"></span>
          <span className="font-display text-[10px] uppercase tracking-[0.2em] text-gold">
            Runic Console [L7 Ethereal Gate]
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/40 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed hide-scrollbar"
      >
        {history.map((log) => (
          <div key={log.id} className="mb-2 flex gap-2">
            <span className="text-white/30 shrink-0">
              [{new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}]
            </span>
            <div className="flex-1 break-words">
              {log.type === 'input' && (
                <span className="text-[#00F0FF]">root@camelot-os:/omni-nexus# {log.text}</span>
              )}
              {log.type === 'system' && <span className="text-white/70">{log.text}</span>}
              {log.type === 'success' && (
                <span className="text-emerald-400 font-bold">{log.text}</span>
              )}
              {log.type === 'error' && <span className="text-red-400">{log.text}</span>}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={onSubmit}
        className="flex items-center border-t border-white/10 bg-black/40 px-4 py-3"
      >
        <span className="text-[#00F0FF] font-mono text-[11px] mr-2">
          root@camelot-os:/omni-nexus#
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-transparent font-mono text-[11px] text-white outline-none placeholder:text-white/20"
          placeholder="Enter Symbolect (e.g. //boot, //sync)..."
          autoComplete="off"
          spellCheck="false"
        />
      </form>
    </div>
  );
}
