import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ActivityCategory =
  | 'voice'
  | 'macro'
  | 'auth'
  | 'cartridge'
  | 'knight'
  | 'system'
  | 'config'
  | 'telemetry'
  | 'security'
  | 'general';

export type ActivitySeverity = 'info' | 'success' | 'warn' | 'error';

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  category?: ActivityCategory;
  actor?: string;
  severity?: ActivitySeverity;
  metadata?: Record<string, unknown>;
}

export interface LogActivityOptions {
  category?: ActivityCategory;
  actor?: string;
  severity?: ActivitySeverity;
  metadata?: Record<string, unknown>;
}

interface ActivityLogContextType {
  logs: ActivityLogEntry[];
  logActivity: (
    action: string,
    details: string,
    options?: LogActivityOptions,
  ) => void;
  deleteLog: (id: string) => void;
  clearLogs: () => void;
  exportLogs: () => string;
}

const ActivityLogContext = createContext<ActivityLogContextType | null>(null);

export function ActivityLogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('koa.activity_log');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setLogs(parsed);
        }
      }
    } catch (err) {
      console.warn('Failed to load activity logs', err);
    }
  }, []);

  const logActivity = useCallback(
    (action: string, details: string, options?: LogActivityOptions) => {
      // Inferred category from action string if not provided
      let inferredCategory: ActivityCategory = options?.category || 'general';
      const actionUpper = action.toUpperCase();
      if (!options?.category) {
        if (actionUpper.includes('VOICE') || actionUpper.includes('SPEECH') || actionUpper.includes('MIC')) {
          inferredCategory = 'voice';
        } else if (actionUpper.includes('MACRO') || actionUpper.includes('ROUTINE')) {
          inferredCategory = 'macro';
        } else if (actionUpper.includes('CARTRIDGE') || actionUpper.includes('PILL')) {
          inferredCategory = 'cartridge';
        } else if (actionUpper.includes('KNIGHT') || actionUpper.includes('TENANT')) {
          inferredCategory = 'knight';
        } else if (actionUpper.includes('AUTH') || actionUpper.includes('SECURITY') || actionUpper.includes('CLEARANCE')) {
          inferredCategory = 'security';
        } else if (actionUpper.includes('CONFIG') || actionUpper.includes('SETTING')) {
          inferredCategory = 'config';
        } else if (actionUpper.includes('TELEMETRY') || actionUpper.includes('BIFROST') || actionUpper.includes('SYNC')) {
          inferredCategory = 'telemetry';
        } else if (actionUpper.includes('SYSTEM') || actionUpper.includes('PURGE')) {
          inferredCategory = 'system';
        }
      }

      // Inferred severity
      let inferredSeverity: ActivitySeverity = options?.severity || 'info';
      if (!options?.severity) {
        if (actionUpper.includes('FAIL') || actionUpper.includes('ERROR') || actionUpper.includes('CRASH')) {
          inferredSeverity = 'error';
        } else if (actionUpper.includes('WARN') || actionUpper.includes('PURGE') || actionUpper.includes('DISPUTE')) {
          inferredSeverity = 'warn';
        } else if (
          actionUpper.includes('SUCCESS') ||
          actionUpper.includes('CONNECTED') ||
          actionUpper.includes('MOUNTED') ||
          actionUpper.includes('RESOLVED') ||
          actionUpper.includes('EXPORTED')
        ) {
          inferredSeverity = 'success';
        }
      }

      const newEntry: ActivityLogEntry = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        action,
        details,
        category: inferredCategory,
        actor: options?.actor || 'Arthurian System',
        severity: inferredSeverity,
        metadata: options?.metadata,
      };

      setLogs((prev) => {
        const updated = [newEntry, ...prev].slice(0, 150); // Keep last 150
        try {
          localStorage.setItem('koa.activity_log', JSON.stringify(updated));
        } catch (err) {
          console.warn('Failed to save activity logs', err);
        }
        return updated;
      });
    },
    [],
  );

  const deleteLog = useCallback((id: string) => {
    setLogs((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem('koa.activity_log', JSON.stringify(updated));
      } catch (err) {}
      return updated;
    });
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    try {
      localStorage.removeItem('koa.activity_log');
    } catch (err) {}
  }, []);

  const exportLogs = useCallback(() => {
    return JSON.stringify(logs, null, 2);
  }, [logs]);

  return (
    <ActivityLogContext.Provider
      value={{ logs, logActivity, deleteLog, clearLogs, exportLogs }}
    >
      {children}
    </ActivityLogContext.Provider>
  );
}

export function useActivityLog() {
  const context = useContext(ActivityLogContext);
  if (!context) {
    throw new Error('useActivityLog must be used within an ActivityLogProvider');
  }
  return context;
}
