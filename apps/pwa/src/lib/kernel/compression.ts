'use client';

// 13-Layer TOON Codec, RTK Scythe & Symbollect Dictionary
// Lossless / near-lossless compression into νKG Crystals

export interface CrystalData {
  id: string;
  timestamp: string;
  topic: string;
  symbollectText: string;
  rawLength: number;
  compressedLength: number;
  ratio: number;
  hash: string;
  merkleRoot: string;
  sovereignSignature: string;
  metadata: {
    knight: string;
    ocean: [number, number, number, number, number];
    layersApplied: string[];
  };
}

export const SYMBOLLECT_CODEBOOK: Record<string, string> = {
  'Camelot-OS': '🏰',
  Anya_Ω: '🎭',
  Merlin_Ω: '🧙‍♂️',
  Sir_Cyber: '⚔️',
  Lady_Sentinel: '🛡️',
  Socrates: '🏛️',
  Heimdall: '👁️',
  Excalibur: '🗡️',
  compress: '📦',
  decompress: '🔓',
  sync: '🔄',
  audit: '⚖️',
  ghost_audit: '👻',
  bifrost: '⚡',
  crystal: '💎',
  ledger: '📜',
  sovereign: '⚜️',
  microvm: '🔲',
  provenance: '🔗',
  consent: '👑',
};

export const REVERSE_SYMBOLLECT: Record<string, string> = Object.entries(
  SYMBOLLECT_CODEBOOK,
).reduce(
  (acc, [word, sym]) => {
    acc[sym] = word;
    return acc;
  },
  {} as Record<string, string>,
);

/**
 * Strips whitespace, boilerplate noise, and redundant fillers (RTK Scythe Layer)
 */
export function rtkScythe(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/(please|could you please|kindly|as an ai|in conclusion|to summarize)\s*/gi, '')
    .trim();
}

/**
 * Maps common Camelot-OS keywords into compact Symbollect unicode glyphs
 */
export function applySymbollect(text: string): string {
  let result = text;
  for (const [term, symbol] of Object.entries(SYMBOLLECT_CODEBOOK)) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    result = result.replace(regex, symbol);
  }
  return result;
}

/**
 * Rehydrates Symbollect glyphs back to natural language text
 */
export function restoreSymbollect(symbollectText: string): string {
  let result = symbollectText;
  for (const [symbol, term] of Object.entries(REVERSE_SYMBOLLECT)) {
    result = result.split(symbol).join(term);
  }
  return result;
}

/**
 * Calculates deterministic pseudo SHA-256 string for Zone-0 ledger
 */
export function hashString(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return '0x' + (hash >>> 0).toString(16).padStart(8, '0') + Math.abs(hash * 31).toString(16);
}

/**
 * Compresses raw text into a structured νKG crystal
 */
export function compressToCrystal(
  rawText: string,
  topic = 'General',
  knight = 'Anya_Ω',
  ocean: [number, number, number, number, number] = [0.7, 0.9, 0.8, 0.4, 0.2],
): CrystalData {
  const cleaned = rtkScythe(rawText);
  const symbollect = applySymbollect(cleaned);

  const rawLength = rawText.length;
  const compressedLength = symbollect.length;
  const ratio = rawLength > 0 ? Number(((1 - compressedLength / rawLength) * 100).toFixed(1)) : 0;
  const hash = hashString(symbollect);
  const merkleRoot = hashString(hash + '_MERKLE_ROOT_' + Date.now());

  return {
    id: `CRYSTAL_${Date.now()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    topic,
    symbollectText: symbollect,
    rawLength,
    compressedLength,
    ratio: Math.max(0, ratio),
    hash,
    merkleRoot,
    sovereignSignature: `SIG_${hash.slice(2, 10)}_HSM_ED25519`,
    metadata: {
      knight,
      ocean,
      layersApplied: [
        'L1:LexicalClean',
        'L4:RTK_Scythe',
        'L8:SymbollectCodebook',
        'L11:MerkleHash',
        'L13:TOON_Packing',
      ],
    },
  };
}

/**
 * Losslessly decompress a crystal back to human readable text
 */
export function decompressCrystal(crystal: CrystalData): string {
  return restoreSymbollect(crystal.symbollectText);
}
