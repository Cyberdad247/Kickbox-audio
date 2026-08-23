import fs from 'fs';

const runicFile = 'apps/pwa/src/components/capsule/RunicConsole.tsx';
const runicContent = `'use client';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

export interface LogEntry {
  id: string;
  type: 'input' | 'system' | 'success' | 'error';
  text: string;
  timestamp: string;
}

export interface RunicConsoleProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  history: LogEntry[];
  handleExecute: (cmd: string) => void;
}

export function RunicConsole({ isOpen, setIsOpen, history, handleExecute }: RunicConsoleProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle console with Ctrl+\` or Cmd+\`
      if (e.key === '\`' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsOpen]);

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
        <span className="opacity-50">⌘\`</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 z-[100] flex h-64 w-full flex-col border-t border-gold/20 bg-[#0B0914]/95 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.7)]">
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
`;
fs.writeFileSync(runicFile, runicContent);

const hostFile = 'apps/pwa/src/components/capsule/CapsuleHost.tsx';
let hostContent = fs.readFileSync(hostFile, 'utf8');

if (!hostContent.includes("type LogEntry")) {
  hostContent = hostContent.replace(
    "import { RunicConsole } from './RunicConsole';",
    "import { RunicConsole, type LogEntry } from './RunicConsole';\nimport { ProvenanceLedgerService } from '../../lib/provenanceLedger';"
  );
}

const stateBlock = `  const [isRunicConsoleOpen, setIsRunicConsoleOpen] = React.useState(false);
  const [runicHistory, setRunicHistory] = React.useState<LogEntry[]>([
    {
      id: 'init',
      type: 'system',
      text: 'Camelot-OS Runic Console v1000 initialized. Type //help to view Symbolects.',
      timestamp: new Date().toISOString(),
    },
  ]);

  const handleRunicExecute = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const addLog = (type: LogEntry['type'], text: string) => {
      setRunicHistory((prev) => [
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
        case '//help':
          outcomeText =
            'Available Symbolects: //boot, //shield, //verify, //gate, //sync, //seal, //clear';
          break;
        case '//clear':
          setRunicHistory([]);
          ProvenanceLedgerService.record(trimmed, 'Console history cleared.');
          return;
        default:
          outcomeText = \`Unknown Symbolect: \${trimmed}. Type //help for a list of available commands.\`;
          outcomeType = 'error';
      }
    } else {
      outcomeText =
        'Error: Only Runic Symbolects (prefixed with //) are supported in this terminal.';
      outcomeType = 'error';
    }

    addLog(outcomeType, outcomeText);
    ProvenanceLedgerService.record(trimmed, outcomeText);
  };\n\n`;

if (!hostContent.includes('isRunicConsoleOpen')) {
  hostContent = hostContent.replace(
    /export function CapsuleHost\(\{ children \}: \{ children\?: React\.ReactNode \}\) \{\n/,
    `export function CapsuleHost({ children }: { children?: React.ReactNode }) {\n${stateBlock}`
  );
}

hostContent = hostContent.replace(
  /<RunicConsole \/>/,
  `<RunicConsole
        isOpen={isRunicConsoleOpen}
        setIsOpen={setIsRunicConsoleOpen}
        history={runicHistory}
        handleExecute={handleRunicExecute}
      />`
);

fs.writeFileSync(hostFile, hostContent);
