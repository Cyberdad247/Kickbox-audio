const fs = require('fs');
const path = require('path');

const serverFile = path.resolve('apps/bifrost/src/server.ts');
let content = fs.readFileSync(serverFile, 'utf8');

// The corrupted block starts with:
// // ── Provenance Ledger Route ──
// and ends right before:
// // ── WebSocket: command intake + heartbeat ──

const fixRegex = /\/\/ ── Provenance Ledger Route ──[\s\S]*?(?=\/\/ ── WebSocket: command intake \+ heartbeat ──)/m;

const newRoute = `// ── Provenance Ledger Route ──
app.post('/api/provenance', express.json(), (req, res) => {
  const { command, outcome, timestamp } = req.body;
  if (!command || !outcome || !timestamp) {
    return res.status(400).json({ error: 'MISSING_DATA' });
  }

  try {
    const fsNode = require('fs');
    const pathNode = require('path');
    const cryptoNode = require('crypto');
    
    // Write directly to the workspace root ledger
    const ledgerPath = pathNode.resolve(__dirname, '../../../PROVENANCE_LEDGER.md');
    
    // Hash the entry payload for immutability check
    const hash = cryptoNode.createHash('sha256').update(\`\${timestamp}-\${command}-\${outcome}\`).digest('hex');
    const shortHash = hash.substring(0, 12);
    
    const entry = \`\\n### Transaction 0x\${shortHash}\\n- **Status:** RECORDED\\n- **Timestamp:** \${timestamp}\\n- **Command:** \\\`\${command}\\\`\\n- **Outcome:** \${outcome.replace(/\\n/g, ' ')}\\n\`;
    
    fsNode.appendFileSync(ledgerPath, entry, 'utf8');
    res.status(200).json({ status: 'RECORDED', hash: shortHash });
  } catch (err) {
    console.error('Failed to append to ledger:', err);
    res.status(500).json({ error: 'WRITE_FAILED' });
  }
});

`;

content = content.replace(fixRegex, newRoute);
fs.writeFileSync(serverFile, content, 'utf8');
console.log('Fixed server.ts');
