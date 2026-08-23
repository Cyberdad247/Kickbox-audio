'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { StreamingTelemetrySnapshot } from '../lib/streamingTelemetry';

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

export interface VoiceDispatchResult {
  ok: boolean;
  status: 'sent' | 'pending_approval' | 'disconnected';
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
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastAttemptTime: number | null;
  state: SovereignState | null;
  streamingTelemetry: StreamingTelemetrySnapshot | null;
  sendVoiceCommand: (payload: string) => VoiceDispatchResult;
  reconnectNow: () => void;
  reconnect: () => void;
  pendingPlan: PendingPlan | null;
  approvePlan: () => void;
  rejectPlan: () => void;
  dispatchError: string | null;
}

const BifrostContext = createContext<BifrostContextValue | null>(null);

const getWsUrl = () => {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/bifrost-ws`;
  }
  return 'ws://localhost:3001';
};

const BIFROST_URL = process.env.NEXT_PUBLIC_BIFROST_URL ?? getWsUrl();

export function BifrostProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastAttemptTime, setLastAttemptTime] = useState<number | null>(null);
  const [state, setState] = useState<SovereignState | null>(null);
  const [streamingTelemetry, setStreamingTelemetry] = useState<StreamingTelemetrySnapshot | null>(
    null,
  );
  const [pendingPlan, setPendingPlan] = useState<PendingPlan | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const closedRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reconnectNonce, setReconnectNonce] = useState(0);

  const reconnect = useCallback(() => setReconnectNonce((n) => n + 1), []);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    setIsReconnecting(true);
    setLastAttemptTime(Date.now());
    setReconnectAttempts((prev) => prev + 1);

    try {
      const ws = new WebSocket(BIFROST_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setIsReconnecting(false);
        setReconnectAttempts(0);
        setDispatchError(null);
      };

      ws.onclose = () => {
        setConnected(false);
        if (!closedRef.current) {
          setIsReconnecting(true);
          reconnectTimerRef.current = setTimeout(connect, 3000);
        } else {
          setIsReconnecting(false);
        }
      };

      ws.onerror = () => {
        setConnected(false);
        setDispatchError('Bifrost mesh unreachable. Retrying...');
        ws.close();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'STATE_UPDATE') setState(msg.payload as SovereignState);
          if (msg.type === 'STREAMING_TELEMETRY') {
            setStreamingTelemetry(msg.payload as StreamingTelemetrySnapshot);
          }
        } catch {
          // ignore malformed frame
        }
      };
    } catch {
      setIsReconnecting(false);
    }
  }, []);

  useEffect(() => {
    closedRef.current = false;
    connect();

    return () => {
      closedRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect, reconnectNonce]);

  const reconnectNow = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
    }
    connect();
  }, [connect]);

  const rawSend = useCallback((payload: string): VoiceDispatchResult => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      setDispatchError(null);
      ws.send(JSON.stringify({ type: 'VOICE_COMMAND', payload }));
      return { ok: true, status: 'sent' };
    }
    setDispatchError('Bifrost bridge offline. Sync Lakisha before dispatch.');
    return { ok: false, status: 'disconnected' };
  }, []);

  // Gate financial/destructive intents behind a Plan Card; everything else sends.
  const sendVoiceCommand = useCallback(
    (payload: string): VoiceDispatchResult => {
      const plan = buildPlan(payload);
      if (plan) {
        setDispatchError(null);
        setPendingPlan(plan);
        return { ok: true, status: 'pending_approval' };
      }
      return rawSend(payload);
    },
    [rawSend],
  );

  const approvePlan = useCallback(() => {
    setPendingPlan((plan) => {
      if (!plan) return null;
      const result = rawSend(plan.raw);
      return result.ok ? null : plan;
    });
  }, [rawSend]);

  const rejectPlan = useCallback(() => setPendingPlan(null), []);

  return (
    <BifrostContext.Provider
      value={{
        connected,
        isReconnecting,
        reconnectAttempts,
        lastAttemptTime,
        state,
        streamingTelemetry,
        sendVoiceCommand,
        reconnectNow,
        reconnect,
        pendingPlan,
        approvePlan,
        rejectPlan,
        dispatchError,
      }}
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

