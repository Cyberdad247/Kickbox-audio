'use client';

import { useCallback, useEffect, useState } from 'react';
import { triggerHaptic } from '../lib/hapticsAndSpatialAudio';
import { speak } from '../lib/voice';

export interface PendingOfflineReceipt {
  id: string;
  timestamp: string;
  type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'synced' | 'failed';
}

const STORAGE_KEY = 'camelot_offline_sync_receipts_v1';

export function useBackgroundSync() {
  const [pendingReceipts, setPendingReceipts] = useState<PendingOfflineReceipt[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSupported, setSyncSupported] = useState(false);

  // Load stored receipts from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPendingReceipts(JSON.parse(stored));
      }
      if (
        typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PeriodicSyncManager' in window
      ) {
        setSyncSupported(true);
      }
    } catch {
      // Storage fallback
    }
  }, []);

  // Save changes to storage
  const saveReceipts = (receipts: PendingOfflineReceipt[]) => {
    setPendingReceipts(receipts);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
    } catch {
      // Storage quota guard
    }
  };

  // Record an offline action
  const queueOfflineReceipt = useCallback(
    (type: string, payload: Record<string, unknown>) => {
      const newReceipt: PendingOfflineReceipt = {
        id: `RC_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        type,
        payload,
        status: 'pending',
      };
      saveReceipts([newReceipt, ...pendingReceipts]);
      triggerHaptic('consent');
      return newReceipt;
    },
    [pendingReceipts],
  );

  // Flush and synchronize all receipts when online
  const triggerSync = useCallback(async () => {
    if (pendingReceipts.filter((r) => r.status === 'pending').length === 0) return;
    setIsSyncing(true);
    triggerHaptic('click');

    // Simulate cryptographic verification and reconciliation
    await new Promise((res) => setTimeout(res, 1200));

    const updated = pendingReceipts.map((r) => ({
      ...r,
      status: 'synced' as const,
    }));

    saveReceipts(updated);
    setIsSyncing(false);
    triggerHaptic('consent');
    speak('Offline receipts synchronized with sovereign ledger.');
  }, [pendingReceipts]);

  // Auto-trigger sync when network reconnects
  useEffect(() => {
    const handleOnline = () => {
      triggerSync();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [triggerSync]);

  return {
    pendingReceipts,
    isSyncing,
    syncSupported,
    queueOfflineReceipt,
    triggerSync,
  };
}
