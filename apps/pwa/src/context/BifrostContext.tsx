'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Mirrors the Bifrost gateway's unified state payload.
export interface SovereignState {
  portfolioValuation: number;
  transactionsCount: number;
  lastCommand: string | null;
  // Remote MCP answer (vMAX //ROUTE); null for pure-local commands.
  lastResponse: string | null;
  // vMAX telemetry: lane that served the last utterance + server route time.
  lastLane: string | null;
  lastLatencyMs: number | null;
  lastRezeroed: boolean;
  updatedAt: string;
}

// HITL guardrail — financial/destructive intents render a Plan Card for approval
// before anything executes (KOA execution rule #1).
export interface PendingPlan {
  raw: string;
  action: string;
  detail: string;
  amount?: number;
  risk: 'low' | 'medium' | 'high';
}

function buildPlan(raw: string): PendingPlan | null {
  const t = raw.trim().toLowerCase();
  const tx = t.match(/^add\s+transaction\s+\$?([\d,]+(?:\.\d+)?)/);
  if (tx) {
    const amount = Number(tx[1].replace(/,/g, ''));
    return {
      raw,
      action: 'Add Transaction',
      detail: `Post a balanced ledger entry of $${amount.toLocaleString('en-US')} to Vault_Ω.`,
      amount,
      risk: amount >= 25000 ? 'high' : 'medium',
    };
  }
  if (/^order\s+/.test(t)) {
    return {
      raw,
      action: 'Place Order',
      detail: `Place order: "${raw.replace(/^order\s+/i, '')}".`,
      risk: 'medium',
    };
  }
  if (/^(pay|wire|transfer|refund)\s+/.test(t)) {
    return {
      raw,
      action: 'Move Funds',
      detail: `Financial movement requested: "${raw}".`,
      risk: 'high',
    };
  }
  return null; // queries / reminders / dispatches pass through directly
}

interface BifrostContextValue {
  connected: boolean;
  state: SovereignState | null;
  sendVoiceCommand: (payload: string) => void;
  pendingPlan: PendingPlan | null;
  approvePlan: () => void;
  rejectPlan: () => void;
  reconnect: () => void;
}

const BifrostContext = createContext<BifrostContextValue | null>(null);

const BIFROST_URL = process.env.NEXT_PUBLIC_BIFROST_URL ?? 'ws://localhost:3001';

export function BifrostProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<SovereignState | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  // Bumping this tears down the current socket (if any) and opens a fresh one
  // immediately, bypassing the 2s auto-retry backoff — the manual "sync with
  // Bifrost bridge" action.
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const reconnect = useCallback(() => setReconnectNonce((n) => n + 1), []);

  useEffect(() => {
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      const ws = new WebSocket(BIFROST_URL);
      wsRef.current = ws;

      ws.onopen = () => setConnected(true);
      ws.onclose = () => {
        setConnected(false);
        if (!closed) reconnectTimer = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'STATE_UPDATE') setState(msg.payload as SovereignState);
        } catch {
          // ignore malformed frame
        }
      };
    };

    connect();
    return () => {
      closed = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [reconnectNonce]);

  const rawSend = useCallback((payload: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'VOICE_COMMAND', payload }));
    }
  }, []);

  // Gate financial/destructive intents behind a Plan Card; everything else sends.
  const sendVoiceCommand = useCallback(
    (payload: string) => {
      const plan = buildPlan(payload);
      if (plan) {
        setPendingPlan(plan);
        return;
      }
      rawSend(payload);
    },
    [rawSend],
  );

  const approvePlan = useCallback(() => {
    setPendingPlan((plan) => {
      if (plan) rawSend(plan.raw);
      return null;
    });
  }, [rawSend]);

  const rejectPlan = useCallback(() => setPendingPlan(null), []);

  return (
    <BifrostContext.Provider
      value={{ connected, state, sendVoiceCommand, pendingPlan, approvePlan, rejectPlan, reconnect }}
    >
      {children}
    </BifrostContext.Provider>
  );
}

export function useBifrost(): BifrostContextValue {
  const ctx = useContext(BifrostContext);
  if (!ctx) throw new Error('useBifrost must be used within a BifrostProvider');
  return ctx;
}
