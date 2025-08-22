'use client';

import { useEffect, useState } from 'react';
import NavBar from '../../components/NavBar';

interface LogEntry {
  id: number;
  timestamp: number;
  summary: string;
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

  const clearLogs = async () => {
    await fetch('/api/logs', { method: 'DELETE' });
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <NavBar />
      <main className="flex-1 overflow-y-auto p-4 space-y-2">
        <div className="flex justify-end mb-2">
          <button
            onClick={clearLogs}
            className="px-3 py-1 rounded text-sm"
            style={{ backgroundColor: 'var(--color-error)', color: 'var(--color-error-content)' }}
          >
            Clear logs
          </button>
        </div>
        {logs.map((log) => (
          <div key={log.id} className="flex justify-center">
            <div
              className={`max-w-xl px-3 py-2 rounded ${
                log.direction === 'request'
                  ? 'bg-gray-200 text-gray-900 mr-8'
                  : 'bg-blue-100 text-blue-800 ml-8'
              }`}
            >
              <div className="text-xs font-medium mb-1">{log.summary}</div>
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
