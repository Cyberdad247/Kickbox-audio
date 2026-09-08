'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ProvenanceLedgerService } from '../../lib/provenanceLedger';
import { cinematicAudio } from '../../lib/cinematicAudio';

export interface LogEntry {
  id: string;
  type: 'input' | 'system' | 'success' | 'error';
  text: string;
  timestamp: string;
}

export function RunicConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [freqOffset, setFreqOffset] = useState(0);
  const [pan, setPan] = useState(0);
  const [history, setHistory] = useState<LogEntry[]>(() => {
    try {
      const stored = localStorage.getItem('camelot_runic_history');
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: 'init',
        type: 'system',
        text: 'Camelot-OS Runic Console v1000 initialized. Type //help to view Symbolects.',
        timestamp: new Date().toISOString(),
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('camelot_runic_history', JSON.stringify(history));
    } catch {}
  }, [history]);
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

  const handleMuteToggle = () => {
    const newMuted = !isAudioMuted;
    setIsAudioMuted(newMuted);
    cinematicAudio.setMuted(newMuted);
  };

  const handleFreqChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setFreqOffset(val);
    cinematicAudio.setFrequencyOffset(val);
  };

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setPan(val);
    cinematicAudio.setPan(val);
  };

  const handleAudioReset = () => {
    setIsAudioMuted(false);
    cinematicAudio.setMuted(false);
    setFreqOffset(0);
    cinematicAudio.setFrequencyOffset(0);
    setPan(0);
    cinematicAudio.setPan(0);
  };

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
      const parts = trimmed.split(' ');
      const symbolect = parts[0].toLowerCase();
      const args = parts.slice(1).join(' ');

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
        case '//bypass':
          outcomeText =
            '[ARCH-SOVEREIGN] 🔓 Cinematic sequence bypassed. Direct UI access granted.';
          outcomeType = 'success';
          window.dispatchEvent(new CustomEvent('camelot:navigate-tab', { detail: 'dashboard' }));
          break;
        case '//node':
          outcomeText = args 
            ? `[CPU NODE] 💻 Connecting to Node '${args}'... Access granted. Bypassing cinematic lock and routing to Kernel Terminal.`
            : `[CPU NODE] 💻 Error: Please specify a node identifier.`;
          outcomeType = args ? 'success' : 'error';
          if (args) {
            window.dispatchEvent(new CustomEvent('camelot:navigate-tab', { detail: 'kernel' }));
          }
          break;
        case '//knight':
          outcomeText = args
            ? `[KNIGHT] ⚔️ Establishing telepathic link with Knight '${args}'... Connection stable.`
            : `[KNIGHT] ⚔️ Error: Please specify a Knight designation.`;
          outcomeType = args ? 'success' : 'error';
          break;
        case '//cartridge':
          outcomeText = args
            ? `[CARTRIDGE] 📼 Mounting Cartridge '${args}' into execution bay... Boot sector ready.`
            : `[CARTRIDGE] 📼 Error: Please specify a Cartridge ID.`;
          outcomeType = args ? 'success' : 'error';
          break;
        case '//pill':
          outcomeText = args
            ? `[PILL] 💊 Ingesting sub-routine Pill '${args}'... Execution stream altered.`
            : `[PILL] 💊 Error: Please specify a Pill signature.`;
          outcomeType = args ? 'success' : 'error';
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
        case '//help':
          outcomeText =
            'Available Symbolects:\n' +
            'Core: //boot, //shield, //verify, //gate, //sync, //seal, //clear\n' +
            'Node Management: //bypass, //node [id], //knight [id], //cartridge [id], //pill [id], //list_knights, //sync_cartridges, //audit_pills\n' +
            'Topology: //grand_lattice, //vps_hub, //voice_orb, //ravenry, //graph_engine\n' +
            'Execution: //go_live, //dispatch, //forge';
          break;
        case '//list_knights':
          outcomeText =
            '[KNIGHT_ROSTER] ⚔️ Active Knights: Sir Boris (UI/UX), Sir Codex (WASM32), Sir Helio (Context), Sir Octavian (Actuation).';
          outcomeType = 'success';
          break;
        case '//sync_cartridges':
          outcomeText =
            '[CARTRIDGE_SYNC] 📼 Synchronizing hardware cartridges with Sovereign topology... Matrix alignment optimal.';
          outcomeType = 'success';
          break;
        case '//audit_pills':
          outcomeText =
            '[PILL_AUDIT] 💊 Auditing injected sub-routines... All execution streams verified. Zero rogue injections detected.';
          outcomeType = 'success';
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
      <div className="flex h-10 items-center justify-between border-b border-white/10 bg-black/40 px-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-gold animate-pulse"></span>
          <span className="font-display text-[10px] uppercase tracking-[0.2em] text-gold hidden sm:inline">
            Runic Console [L7 Ethereal Gate]
          </span>
        </div>
        
        {/* Audio Master Controls */}
        <div className="flex items-center gap-4 border-l border-white/10 pl-4 ml-auto mr-4">
          <button 
            onClick={handleMuteToggle}
            className={`font-mono text-[10px] uppercase tracking-widest transition-colors ${isAudioMuted ? 'text-red-400' : 'text-[#00F0FF]'}`}
          >
            {isAudioMuted ? 'HUM: Muted' : 'HUM: Active'}
          </button>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] text-white/50">Freq Offset</span>
            <input 
              type="range" 
              min="-20" 
              max="20" 
              step="1" 
              value={freqOffset} 
              onChange={handleFreqChange}
              className="w-16 accent-[#00F0FF]"
            />
            <span className="font-mono text-[9px] text-[#00F0FF] w-6 text-right">
              {freqOffset > 0 ? '+' : ''}{freqOffset}
            </span>
          </div>
          
          <div className="flex items-center gap-2 border-l border-white/10 pl-4 ml-2">
            <span className="font-mono text-[9px] text-white/50">L/R Pan</span>
            <input 
              type="range" 
              min="-1" 
              max="1" 
              step="0.1" 
              value={pan} 
              onChange={handlePanChange}
              className="w-16 accent-[#00F0FF]"
            />
            <span className="font-mono text-[9px] text-[#00F0FF] w-6 text-right">
              {pan === 0 ? 'C' : pan < 0 ? `L${Math.abs(Math.round(pan * 10))}` : `R${Math.round(pan * 10)}`}
            </span>
          </div>

          <button 
            onClick={handleAudioReset}
            className="font-mono text-[9px] uppercase text-white/40 hover:text-white transition-colors ml-1"
          >
            [RST]
          </button>
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
            <div className="flex-1 break-words whitespace-pre-wrap">
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
