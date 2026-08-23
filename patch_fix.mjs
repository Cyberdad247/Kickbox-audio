import fs from 'fs';
const file = 'apps/pwa/src/components/capsule/CapsuleHost.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(
  /<RunicConsole[\s\S]*?handleExecute=\{handleRunicExecute\}\s*\/>/m,
  '<RunicConsole />'
);
fs.writeFileSync(file, content);
console.log('Fixed CapsuleHost.tsx');
