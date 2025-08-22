export interface LogEntry {
  id: number;
  timestamp: number;
  summary: string;
  service: string;
  direction: 'request' | 'response';
  message: unknown;
}

const logs: LogEntry[] = [];
let nextId = 1;

function summarize(
  service: string,
  direction: 'request' | 'response',
  message: unknown
): string {
  const msg = message as Record<string, unknown>;
  if (service === 'US Census') {
    if (direction === 'request') {
      if (msg?.type === 'search' && typeof msg?.query === 'string') {
        return `US Census search "${msg.query}"`;
      }
      if (msg?.type === 'metric' && typeof msg?.variable === 'string') {
        return `US Census metric ${msg.variable}`;
      }
      return 'US Census request';
    }
    if (Array.isArray(message)) {
      return `US Census search results (${message.length})`;
    }
    if (msg?.type === 'metric' && typeof msg?.variable === 'string') {
      return `US Census metric result ${msg.variable}`;
    }
    return 'US Census response';
  }
  if (service === 'OpenRouter') {
    if (direction === 'request') {
      const model = typeof msg?.model === 'string' ? msg.model : 'request';
      return `OpenRouter ${model}`;
    }
    return 'OpenRouter response';
  }
  return `${service} ${direction}`;
}

export function addLog(entry: Omit<LogEntry, 'id' | 'timestamp' | 'summary'>) {
  const summary = summarize(entry.service, entry.direction, entry.message);
  logs.push({ id: nextId++, timestamp: Date.now(), summary, ...entry });
}

export function getLogs() {
  return logs;
}

export function clearLogs() {
  logs.length = 0;
  nextId = 1;
}
