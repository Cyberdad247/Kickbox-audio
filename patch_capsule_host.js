const fs = require('fs');

const file = 'apps/pwa/src/components/capsule/CapsuleHost.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove import { RunicConsole, type LogEntry } from './RunicConsole';
// and replace it with import { RunicConsole } from './RunicConsole';
content = content.replace(
  "import { RunicConsole, type LogEntry } from './RunicConsole';",
  "import { RunicConsole } from './RunicConsole';"
);

// Remove the state and handleRunicExecute from CapsuleHost
const regexToRemove = /  const \[isRunicConsoleOpen, setIsRunicConsoleOpen\] = React\.useState\(false\);\n  const \[runicHistory, setRunicHistory\] = React\.useState<LogEntry\[\]>\(\[\s\S]*?ProvenanceLedgerService\.record\(trimmed, outcomeText\);\n  };\n/m;

content = content.replace(regexToRemove, '');

// Change how RunicConsole is rendered
const regexToReplaceRender = /<RunicConsole\s+isOpen=\{isRunicConsoleOpen\}\s+setIsOpen=\{setIsRunicConsoleOpen\}\s+history=\{runicHistory\}\s+handleExecute=\{handleRunicExecute\}\s+\/>/m;

content = content.replace(regexToReplaceRender, '<RunicConsole />');

fs.writeFileSync(file, content);
console.log('Patched CapsuleHost.tsx');
