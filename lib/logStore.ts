export interface LogEntry {
  id: number;
  timestamp: number;
  service: string;
  direction: 'request' | 'response';
  message: unknown;
}

const logs: LogEntry[] = [];
let nextId = 1;

export function addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
  logs.push({ id: nextId++, timestamp: Date.now(), ...entry });
}

export function getLogs() {
  return logs;
}

export function clearLogs() {
  logs.length = 0;
  nextId = 1;
}
