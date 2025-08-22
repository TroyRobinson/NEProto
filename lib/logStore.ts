export interface LogEntry {
  id: number;
  timestamp: number;
  service: string;
  direction: 'request' | 'response';
  message: unknown;
  summary: string;
}

const logs: LogEntry[] = [];
let nextId = 1;

function summarize(entry: Omit<LogEntry, 'id' | 'timestamp' | 'summary'>): string {
  const { service, direction, message } = entry;
  if (service === 'US Census') {
    if (direction === 'request') {
      const msg = message as {
        type?: string;
        query?: string;
        variable?: string;
        endpoint?: string;
      };
      if (msg.type === 'search') return `search ${msg.query}`;
      if (msg.type === 'metric') return `metric ${msg.variable}`;
      if (msg.endpoint) return `load ${msg.endpoint}`;
    } else if (direction === 'response') {
      if (Array.isArray(message)) return `results ${message.length}`;
      const msg = message as { type?: string; variable?: string };
      if (msg.type === 'metric') return `metric ${msg.variable}`;
    }
  } else if (service === 'OpenRouter') {
    const msg = message as { model?: string };
    if (direction === 'request') return `model ${msg.model}`;
    if (direction === 'response') return msg.model || 'response';
  }
  return `${service} ${direction}`;
}

export function addLog(entry: Omit<LogEntry, 'id' | 'timestamp' | 'summary'>) {
  logs.push({
    id: nextId++,
    timestamp: Date.now(),
    summary: summarize(entry),
    ...entry,
  });
}

export function getLogs() {
  return logs;
}

export function clearLogs() {
  logs.length = 0;
  nextId = 1;
}
