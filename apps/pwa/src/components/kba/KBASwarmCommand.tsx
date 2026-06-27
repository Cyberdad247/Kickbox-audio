'use client';

import { useState } from 'react';

type Status =
  | 'AWAITING_DIRECTIVE'
  | 'REQUESTING_BIFROST_SIGNATURE'
  | 'DISPATCHING_SIGNED_PAYLOAD'
  | 'COMMAND_EXECUTED_SUCCESSFULLY'
  | 'BIFROST_REJECTED_PAYLOAD'
  | 'BIFROST_UPLINK_FAILED';

interface SignedAction {
  payload: string;
  signature: string;
  timestamp: number;
  expiresAt: number;
}

interface KbaAction {
  id: string;
  label: string;
  /** `gold` keeps the high-emphasis plate-1500 styling; default is plate. */
  emphasis?: 'gold';
}

// KBA Cartridge v1001 — full verb coverage. Indexed by the same KbaDomain
// enum that nlp.ts + state.ts + server.ts (Zod) align on. ActionId discriminator
// must match `/^KBA_(SYNC|AUDIT|REROUTE|REZERO|HEAL|NANO|SCAN|FORGE)_[A-Z0-9]{2,16}$/`.
const KBA_ACTIONS: KbaAction[] = [
  { id: 'KBA_SYNC_001', label: 'Sync KBA Ledgers', emphasis: 'gold' },
  { id: 'KBA_AUDIT_002', label: 'Run Fiscal Audit' },
  { id: 'KBA_REROUTE_003', label: 'Reroute Uplink' },
  { id: 'KBA_REZERO_004', label: 'Rezero Systems' },
  { id: 'KBA_HEAL_005', label: 'Heal Cluster' },
  { id: 'KBA_NANO_006', label: 'Nano Deployment' },
  { id: 'KBA_SCAN_007', label: 'Scan Perimeter' },
  { id: 'KBA_FORGE_008', label: 'Forge Signatures' },
];

export function KBASwarmCommand() {
  const [status, setStatus] = useState<Status>('AWAITING_DIRECTIVE');
  const [lastActionId, setLastActionId] = useState<string | null>(null);

  const executeSecureCommand = async (actionId: string): Promise<void> => {
    setLastActionId(actionId);
    setStatus('REQUESTING_BIFROST_SIGNATURE');
    try {
      const issueRes = await fetch('/api/bifrost/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });

      if (!issueRes.ok) throw new Error(`Issue failed: ${issueRes.status}`);
      const signed = (await issueRes.json()) as SignedAction;

      setStatus('DISPATCHING_SIGNED_PAYLOAD');
      const execRes = await fetch('/api/bifrost/hitl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-action': actionId,
          'x-webhook-signature': signed.signature,
          'x-webhook-timestamp': String(signed.timestamp),
          'x-webhook-expires-at': String(signed.expiresAt),
        },
        body: JSON.stringify({ payload: signed.payload }),
      });

      setStatus(
        execRes.ok ? 'COMMAND_EXECUTED_SUCCESSFULLY' : 'BIFROST_REJECTED_PAYLOAD',
      );
    } catch (err) {
      console.error('[KBA_NODE_ERR]', err);
      setStatus('BIFROST_UPLINK_FAILED');
    }
  };

  return (
    <div className="w-full bg-plate-900 border border-gold/20 rounded-none p-6 font-sans shadow-gold">
      <div className="flex justify-between items-center mb-4 border-b border-gold/10 pb-2">
        <h2 className="text-gold font-serif text-xl tracking-widest uppercase">
          KBA Services Node
        </h2>
        <span className="text-xs text-violet-light bg-violet/10 px-2 py-1 rounded-none border border-violet/30 uppercase tracking-wider">
          {status.replace(/_/g, ' ')}
          {lastActionId ? ` · ${lastActionId}` : ''}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap gap-4">
        {KBA_ACTIONS.map((action) => {
          const isGold = action.emphasis === 'gold';
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => executeSecureCommand(action.id)}
              className={
                isGold
                  ? 'px-6 py-2 bg-gold/10 text-gold border border-gold/50 hover:bg-gold/20 rounded-none transition-colors text-sm font-bold uppercase tracking-widest'
                  : 'px-6 py-2 bg-plate-950 text-plate-400 border border-plate-700 hover:text-gold hover:border-gold/50 rounded-none transition-colors text-sm font-bold uppercase tracking-widest'
              }
            >
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
