'use client';

import { createContext, useContext, useState } from 'react';
import type { LogMessage } from '../types/log';

interface LogEntry extends LogMessage {
  id: string;
  timestamp: number;
}

interface LogContextValue {
  logs: LogEntry[];
  addLog: (entry: LogMessage) => void;
  addLogs: (entries: LogMessage[]) => void;
  clearLogs: () => void;
}

const LogContext = createContext<LogContextValue | undefined>(undefined);

export function LogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (entry: LogMessage) => {
    setLogs(prev => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, timestamp: Date.now(), ...entry },
    ]);
  };

  const addLogs = (entries: LogMessage[]) => {
    setLogs(prev => [
      ...prev,
      ...entries.map(e => ({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        ...e,
      })),
    ]);
  };

  const clearLogs = () => setLogs([]);

  return (
    <LogContext.Provider value={{ logs, addLog, addLogs, clearLogs }}>
      {children}
    </LogContext.Provider>
  );
}

export function useLogs() {
  const ctx = useContext(LogContext);
  if (!ctx) {
    throw new Error('useLogs must be used within LogProvider');
  }
  return ctx;
}

