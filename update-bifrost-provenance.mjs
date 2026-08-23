const fs = require('fs');
const path = require('path');

const serverFile = path.resolve('apps/bifrost/src/server.ts');
let content = fs.readFileSync(serverFile, 'utf8');

const oldRoute = `// ── Provenance Ledger Route ──
app.post('/api/provenance', express.json(), (req, res) => {
  const { command, outcome, timestamp } = req.body;
  if (!command || !outcome || !timestamp) {
    return res.status(400).json({ error: 'MISSING_DATA' });
  }

  try {
    const fsNode = require('fs');
    const pathNode = require('path');
    const ledgerPath = pathNode.resolve(process.cwd(), '../pwa/src/assets/PROVENANCE_LEDGER.md');
    // Create directory if it doesn't exist
    const dir = pathNode.dirname(ledgerPath);
    if (!fsNode.existsSync(dir)) {
      fsNode.mkdirSync(dir, { recursive: true });
    }
    const entry = \`## [\${timestamp}] Executed: \\\`\${command}\\\`\\n**Outcome:** \${outcome}\\n\`;
    fsNode.appendFileSync(ledgerPath, entry, 'utf8');
    res.status(200).json({ status: 'RECORDED' });
  } catch (err) {
    console.error('Failed to append to ledger:', err);
    res.status(500).json({ error: 'WRITE_FAILED' });
  }
});`;

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
    
    const ledgerPath = pathNode.resolve(__dirname, '../../../PROVENANCE_LEDGER.md');
    
    // Hash the entry payload for immutability check
    const hash = cryptoNode.createHash('sha256').update(\`\${timestamp}-\${command}-\${outcome}\`).digest('hex');
    const shortHash = hash.substring(0, 12);
    
    const entry = \`\\n### Transaction 0x\${shortHash}\\n- **Status:** EXECUTED\\n- **Timestamp:** \${timestamp}\\n- **Command:** \\\`\${command}\\\`\\n- **Outcome:** \${outcome}\\n\`;
    
    fsNode.appendFileSync(ledgerPath, entry, 'utf8');
    res.status(200).json({ status: 'RECORDED', hash: shortHash });
  } catch (err) {
    console.error('Failed to append to ledger:', err);
    res.status(500).json({ error: 'WRITE_FAILED' });
  }
});`;

if (content.includes("const ledgerPath = pathNode.resolve(process.cwd(), '../pwa/src/assets/PROVENANCE_LEDGER.md');")) {
  content = content.replace(oldRoute, newRoute);
  fs.writeFileSync(serverFile, content, 'utf8');
  console.log('Updated server.ts successfully');
} else {
  console.log('Could not find the old route structure in server.ts');
}
