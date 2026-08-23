'use client';

import { type CrystalData, hashString } from './compression';

export interface LedgerBlock {
  index: number;
  prevHash: string;
  currentHash: string;
  merkleRoot: string;
  data: string;
  author: string;
  timestamp: string;
  signature: string;
}

export interface VfsEntry {
  path: string;
  type: 'file' | 'directory' | 'crystal';
  sizeBytes: number;
  modified: string;
  crystalRef?: string;
  content?: string;
}

export class CloudBrain {
  private ledger: LedgerBlock[] = [];
  private crystals: Map<string, CrystalData> = new Map();
  private vfs: Map<string, VfsEntry> = new Map();

  constructor() {
    this.initGenesis();
  }

  private initGenesis() {
    const genesisData = 'GENESIS_BLOCK_CAMELOT_OS_LATTICE_V1000';
    const genesisHash = hashString('0x0000000000000000' + genesisData);
    const genesisBlock: LedgerBlock = {
      index: 0,
      prevHash: '0x0000000000000000',
      currentHash: genesisHash,
      merkleRoot: hashString('ROOT_' + genesisHash),
      data: genesisData,
      author: 'MERLIN_Ω_GENESIS',
      timestamp: '2026-08-20T00:00:00.000Z',
      signature: 'SIG_GENESIS_HSM_PROVENANCE',
    };
    this.ledger.push(genesisBlock);

    // Seed VFS
    this.vfs.set('/crystals', {
      path: '/crystals',
      type: 'directory',
      sizeBytes: 0,
      modified: new Date().toISOString(),
    });
    this.vfs.set('/contracts', {
      path: '/contracts',
      type: 'directory',
      sizeBytes: 0,
      modified: new Date().toISOString(),
    });
    this.vfs.set('/ledger.db', {
      path: '/ledger.db',
      type: 'file',
      sizeBytes: 4096,
      modified: new Date().toISOString(),
      content: 'SQLite Provenance Database (WAL-2 Mode)',
    });
  }

  public recordLedger(data: string, author: string): LedgerBlock {
    const prevBlock = this.ledger[this.ledger.length - 1];
    const prevHash = prevBlock.currentHash;
    const currentHash = hashString(prevHash + data + Date.now());
    const merkleRoot = hashString(currentHash + '_MERKLE_' + this.ledger.length);

    const block: LedgerBlock = {
      index: this.ledger.length,
      prevHash,
      currentHash,
      merkleRoot,
      data,
      author,
      timestamp: new Date().toISOString(),
      signature: `SIG_${currentHash.slice(2, 10)}_HSM_ED25519`,
    };

    this.ledger.push(block);
    return block;
  }

  public storeCrystal(crystal: CrystalData): void {
    this.crystals.set(crystal.id, crystal);
    this.vfs.set(`/crystals/${crystal.id}.toon`, {
      path: `/crystals/${crystal.id}.toon`,
      type: 'crystal',
      sizeBytes: crystal.compressedLength,
      modified: crystal.timestamp,
      crystalRef: crystal.id,
      content: crystal.symbollectText,
    });
    this.recordLedger(`STORE_CRYSTAL: ${crystal.id} [${crystal.topic}]`, crystal.metadata.knight);
  }

  public getCrystal(id: string): CrystalData | undefined {
    return this.crystals.get(id);
  }

  public getAllCrystals(): CrystalData[] {
    return Array.from(this.crystals.values()).reverse();
  }

  public getLedger(): LedgerBlock[] {
    return [...this.ledger].reverse();
  }

  public getVfsList(): VfsEntry[] {
    return Array.from(this.vfs.values());
  }

  public verifyLedgerIntegrity(): { valid: boolean; brokenAt?: number } {
    for (let i = 1; i < this.ledger.length; i++) {
      if (this.ledger[i].prevHash !== this.ledger[i - 1].currentHash) {
        return { valid: false, brokenAt: i };
      }
    }
    return { valid: true };
  }
}

export const cloudBrainInstance = new CloudBrain();
