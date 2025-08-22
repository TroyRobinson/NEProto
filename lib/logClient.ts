export interface LogEntry {
  service: string;
  direction: 'request' | 'response';
  message: unknown;
}

export async function log(entry: LogEntry) {
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch {
    // ignore logging errors on client
  }
}
