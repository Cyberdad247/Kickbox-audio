import fs from 'fs';
const file = 'apps/pwa/src/components/capsule/RunicConsole.tsx';
let content = fs.readFileSync(file, 'utf8');

// Export LogEntry
content = content.replace('interface LogEntry', 'export interface LogEntry');

// Change component definition
content = content.replace(
  'export function RunicConsole() {',
  `export interface RunicConsoleProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  history: LogEntry[];
  handleExecute: (cmd: string) => void;
}

export function RunicConsole({ isOpen, setIsOpen, history, handleExecute }: RunicConsoleProps) {`,
);

// Remove local state
content = content.replace(/  const \[isOpen, setIsOpen\] = useState\(false\);\n/g, '');
content = content.replace(
  /  const \[history, setHistory\] = useState<LogEntry\[\]>\([\s\S]*?\n  \]\);\n/g,
  '',
);

// Remove local handleExecute and addLog
const regex =
  /  const addLog = \([\s\S]*?ProvenanceLedgerService\.record\(trimmed, outcomeText\);\n  \};\n/m;
content = content.replace(regex, '');

fs.writeFileSync(file, content);
console.log('Patched RunicConsole.tsx');
