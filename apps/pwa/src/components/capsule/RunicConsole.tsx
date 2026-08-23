'use client';
import React, { useState, useEffect, useRef } from 'react';

interface LogEntry {
  id: string;
  type: 'input' | 'system' | 'success' | 'error';
  text: string;
  timestamp: string;
}

export function RunicConsole() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<LogEntry[]>([
    {
      id: 'init',
      type: 'system',
      text: 'Camelot-OS Runic Console v1000 initialized. Type //help to view Symbolects.',
      timestamp: new Date().toISOString(),
    }
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle console with Ctrl+` or Cmd+`
      if (e.key === '`' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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

  const addLog = (type: LogEntry['type'], text: string) => {
    setHistory((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(7), type, text, timestamp: new Date().toISOString() },
    ]);
  };

  const handleExecute = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    addLog('input', trimmed);

    if (trimmed.startsWith('//')) {
      const symbolect = trimmed.toLowerCase();
      switch (symbolect) {
        case '//boot':
          addLog('system', '[ANYA_Ω] ⚡ Virtual Simulation Terminal instantiated. Hardware telemetry verified. Shared memory backplane mounted.');
          break;
        case '//shield':
          addLog('system', '[SIR_SENTINEL] 🛡️ AgentArmor engaged. Zero-trust sandbox isolation locked.');
          break;
        case '//verify':
          addLog('system', '[SIR_GIDEON] 🧪 Shadow VM crucible triggered. Validating TDD and executing Z3 formal logic proofs... [SAT]');
          break;
        case '//gate':
          addLog('system', '[MERLIN_Ω] ⚖️ Iron Gate invoked. Awaiting sovereign authorization... {👤✅}');
          break;
        case '//sync':
          addLog('system', '[LADY_MNEMOSYNE_Ω] 🌐 Broadcasting CRDT ledger updates across the Worldtree Cloudbrain (NotebookLM)... Synchronized.');
          break;
        case '//seal':
          addLog('success', '⚜️_SOVEREIGN_TRUTH: Master cryptographic transaction sealed. Deployment finalized.');
          break;
        case '//help':
          addLog('system', 'Available Symbolects: //boot, //shield, //verify, //gate, //sync, //seal, //clear');
          break;
        case '//clear':
          setHistory([]);
          break;
        default:
          addLog('error', `Unknown Symbolect: ${trimmed}. Type //help for a list of available commands.`);
      }
    } else {
      addLog('error', 'Error: Only Runic Symbolects (prefixed with //) are supported in this terminal.');
    }
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
    <div className="fixed bottom-0 left-0 z-[100] flex h-64 w-full flex-col border-t border-gold/20 bg-[#0B0914]/95 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.7)]">
      <div className="flex h-8 items-center justify-between border-b border-white/10 bg-black/40 px-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-gold animate-pulse"></span>
          <span className="font-display text-[10px] uppercase tracking-[0.2em] text-gold">Runic Console [L7 Ethereal Gate]</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white transition-colors">✕</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-[11px] leading-relaxed hide-scrollbar">
        {history.map((log) => (
          <div key={log.id} className="mb-2 flex gap-2">
            <span className="text-white/30 shrink-0">
              [{new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}]
            </span>
            <div className="flex-1 break-words">
              {log.type === 'input' && <span className="text-[#00F0FF]">root@camelot-os:/omni-nexus# {log.text}</span>}
              {log.type === 'system' && <span className="text-white/70">{log.text}</span>}
              {log.type === 'success' && <span className="text-emerald-400 font-bold">{log.text}</span>}
              {log.type === 'error' && <span className="text-red-400">{log.text}</span>}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex items-center border-t border-white/10 bg-black/40 px-4 py-3">
        <span className="text-[#00F0FF] font-mono text-[11px] mr-2">root@camelot-os:/omni-nexus#</span>
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
