export interface LogEntry {
  id: number;
  timestamp: number;
  service: string;
  direction: 'request' | 'response';
  message: unknown;
  summary: string;
  last?: string;
}

const logs: LogEntry[] = [];
let nextId = 1;

function summarize(entry: Omit<LogEntry, 'id' | 'timestamp' | 'summary' | 'last'>): string {
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
      };
      if (direction === 'request' && msg.model) {
        return `OpenRouter call to ${msg.model}`;
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
