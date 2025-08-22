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

function truncate(str: string, n = 60) {
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
}

function summarize(entry: Omit<LogEntry, 'id' | 'timestamp' | 'summary'>): string {
  const { service, direction, message } = entry as {
    service: string;
    direction: 'request' | 'response';
    message: Record<string, unknown>;
  };

  try {
    if (service === 'US Census') {
      const msg = message as { type?: string; query?: string; variable?: string };
      if (msg.type === 'search' && msg.query) {
        return `Census search "${msg.query}"`;
      }
      if (msg.type === 'metric' && msg.variable) {
        return `Census metric ${msg.variable}`;
      }
    } else if (service === 'OpenRouter') {
      const msg = message as {
        model?: string;
        choices?: Array<{ finish_reason?: string }>;
        last?: string;
      };
      if (direction === 'request' && msg.model) {
        const last = msg.last ? `: "${truncate(msg.last)}"` : '';
        return `OpenRouter call to ${msg.model}${last}`;
      }
      const finish = msg.choices?.[0]?.finish_reason;
      return `OpenRouter response${finish ? ` (${finish})` : ''}`;
    }
  } catch {
    /* ignore */
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
