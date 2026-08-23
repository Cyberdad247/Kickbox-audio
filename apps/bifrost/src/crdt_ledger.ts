// CAMELOT-OS: Drift-Adaptive CRDT Ledger (Lady Mnemosyne)
import crypto from 'crypto';

export interface CRDTOperation {
  id: string;
  timestamp: number;
  node: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  key: string;
  value: any;
  vectorId?: string;
}

export class DriftAdaptiveCRDT {
  private state: Map<string, any> = new Map();
  private vectorIndex: Map<string, number[]> = new Map();
  private ledger: CRDTOperation[] = [];
  private nodeId: string = crypto.randomUUID();

  public applyOperation(op: CRDTOperation) {
    this.ledger.push(op);
    this.ledger.sort((a, b) => a.timestamp - b.timestamp);
    
    // Naive Last-Writer-Wins (LWW) evaluation
    const latestOps = new Map<string, CRDTOperation>();
    for (const entry of this.ledger) {
      latestOps.set(entry.key, entry);
    }
    
    // Rebuild state
    this.state.clear();
    for (const [key, entry] of latestOps.entries()) {
      if (entry.type !== 'DELETE') {
        this.state.set(key, entry.value);
      }
    }
  }

  public ingestMemory(key: string, value: any, vectorEmbeddings?: number[]) {
    const op: CRDTOperation = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      node: this.nodeId,
      type: 'INSERT',
      key,
      value,
      vectorId: vectorEmbeddings ? key : undefined
    };
    if (vectorEmbeddings) {
      this.vectorIndex.set(key, vectorEmbeddings);
    }
    this.applyOperation(op);
    return op;
  }
  
  public getSnapshot() {
    return Object.fromEntries(this.state);
  }
}
