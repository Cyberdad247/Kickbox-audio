'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// Mirrors the Bifrost gateway's unified state payload.
export interface SovereignState {
  portfolioValuation: number;
  transactionsCount: number;
  lastCommand: string | null;
  // Remote MCP answer (vMAX //ROUTE); null for pure-local commands.
  lastResponse: string | null;
  updatedAt: string;
}

interface BifrostContextValue {
  connected: boolean;
  state: SovereignState | null;
  sendVoiceCommand: (payload: string) => void;
}

const BifrostContext = createContext<BifrostContextValue | null>(null);

const BIFROST_URL = process.env.NEXT_PUBLIC_BIFROST_URL ?? 'ws://localhost:3001';

export function BifrostProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<SovereignState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

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
  }, []);

  const sendVoiceCommand = useCallback((payload: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'VOICE_COMMAND', payload }));
    }
  }, []);

  return (
    <BifrostContext.Provider value={{ connected, state, sendVoiceCommand }}>
      {children}
    </BifrostContext.Provider>
  );
}

export function useBifrost(): BifrostContextValue {
  const ctx = useContext(BifrostContext);
  if (!ctx) throw new Error('useBifrost must be used within a BifrostProvider');
  return ctx;
}
