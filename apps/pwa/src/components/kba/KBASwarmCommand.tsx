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

export function KBASwarmCommand() {
  const [status, setStatus] = useState<Status>('AWAITING_DIRECTIVE');

  const executeSecureCommand = async (actionId: string): Promise<void> => {
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

      setStatus(execRes.ok ? 'COMMAND_EXECUTED_SUCCESSFULLY' : 'BIFROST_REJECTED_PAYLOAD');
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
        </span>
      </div>

      <div className="mt-6 flex gap-4">
        <button
          type="button"
          onClick={() => executeSecureCommand('KBA_SYNC_001')}
          className="px-6 py-2 bg-gold/10 text-gold border border-gold/50 hover:bg-gold/20 rounded-none transition-colors text-sm font-bold uppercase tracking-widest"
        >
          Sync KBA Ledgers
        </button>
        <button
          type="button"
          onClick={() => executeSecureCommand('KBA_AUDIT_002')}
          className="px-6 py-2 bg-plate-950 text-plate-400 border border-plate-700 hover:text-gold hover:border-gold/50 rounded-none transition-colors text-sm font-bold uppercase tracking-widest"
        >
          Run Fiscal Audit
        </button>
      </div>
    </div>
  );
}
