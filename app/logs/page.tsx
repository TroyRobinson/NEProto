'use client';

import { useEffect, useState } from 'react';
import TopNav from '../../components/TopNav';

interface LogEntry {
  id: number;
  timestamp: number;
  service: string;
  direction: 'request' | 'response';
  message: unknown;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    async function fetchLogs() {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setLogs(data.logs);
    }
    fetchLogs();
    const id = setInterval(fetchLogs, 1000);
    return () => clearInterval(id);
  }, []);

  async function clear() {
    await fetch('/api/logs', { method: 'DELETE' });
    setLogs([]);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <TopNav linkHref="/" linkText="Map" />
      <main className="relative flex-1 overflow-y-auto p-4 space-y-2">
        <button
          onClick={clear}
          className="absolute top-2 right-4 text-sm text-red-600 underline"
        >
          Clear logs
        </button>
        {logs.map((log) => (
          <div key={log.id} className={`flex ${log.direction === 'request' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-xl px-3 py-2 rounded ${
                log.direction === 'request'
                  ? 'bg-gray-200 text-gray-900'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              <div className="text-xs text-gray-500 mb-1">
                {log.service} {log.direction} {new Date(log.timestamp).toLocaleTimeString()}
              </div>
              <pre className="whitespace-pre-wrap text-xs">
                {JSON.stringify(log.message, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
