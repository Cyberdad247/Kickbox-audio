import fs from 'fs';
const file = 'apps/pwa/src/components/capsule/CapsuleHost.tsx';
let content = fs.readFileSync(file, 'utf8');

// Import ProvenanceLedgerService & LogEntry if needed
if (!content.includes('ProvenanceLedgerService')) {
  content = content.replace(
    "import { RunicConsole } from './RunicConsole';",
    "import { RunicConsole, type LogEntry } from './RunicConsole';\nimport { ProvenanceLedgerService } from '../../lib/provenanceLedger';",
  );
}

// Add state and handler to CapsuleHost
const hookRegex =
  /export function CapsuleHost\(\{ children \}: \{ children\?: React\.ReactNode \}\) \{\n/;
const stateAndHandler = `
  const [isRunicConsoleOpen, setIsRunicConsoleOpen] = React.useState(false);
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
          outcomeText = '[ANYA_Ω] ⚡ Virtual Simulation Terminal instantiated. Hardware telemetry verified. Shared memory backplane mounted.';
          break;
        case '//shield':
          outcomeText = '[SIR_SENTINEL] 🛡️ AgentArmor engaged. Zero-trust sandbox isolation locked.';
          break;
        case '//verify':
          outcomeText = '[SIR_GIDEON] 🧪 Shadow VM crucible triggered. Validating TDD and executing Z3 formal logic proofs... [SAT]';
          break;
        case '//gate':
          outcomeText = '[MERLIN_Ω] ⚖️ Iron Gate invoked. Awaiting sovereign authorization... {👤✅}';
          break;
        case '//sync':
          outcomeText = '[LADY_MNEMOSYNE_Ω] 🌐 Broadcasting CRDT ledger updates across the Worldtree Cloudbrain (NotebookLM)... Synchronized.';
          break;
        case '//seal':
          outcomeText = '⚜️_SOVEREIGN_TRUTH: Master cryptographic transaction sealed. Deployment finalized.';
          outcomeType = 'success';
          break;
        case '//help':
          outcomeText = 'Available Symbolects: //boot, //shield, //verify, //gate, //sync, //seal, //clear';
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
      outcomeText = 'Error: Only Runic Symbolects (prefixed with //) are supported in this terminal.';
      outcomeType = 'error';
    }
    
    addLog(outcomeType, outcomeText);
    ProvenanceLedgerService.record(trimmed, outcomeText);
  };
`;
content = content.replace(hookRegex, hookRegex.source.replace(/\\/g, '') + stateAndHandler);

// Replace <RunicConsole /> with props
content = content.replace(
  /<RunicConsole \/>/g,
  `<RunicConsole 
        isOpen={isRunicConsoleOpen}
        setIsOpen={setIsRunicConsoleOpen}
        history={runicHistory}
        handleExecute={handleRunicExecute}
      />`,
);

fs.writeFileSync(file, content);
console.log('Patched CapsuleHost.tsx');
