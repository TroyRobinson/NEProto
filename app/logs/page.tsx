'use client';

import TopNav from '../../components/TopNav';
import { useLogs } from '../../components/LogContext';

export default function LogsPage() {
  const { logs } = useLogs();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <TopNav linkHref="/" linkText="Map" />
      <main className="flex-1 overflow-y-auto p-4 space-y-2">
        {logs.length === 0 && (
          <p className="text-gray-500">No logs yet.</p>
        )}
        {logs.map((log) => (
          <div
            key={log.id}
            className={log.direction === 'request' ? 'text-right' : 'text-left'}
          >
            <div
              className={`inline-block px-3 py-2 rounded-lg text-sm max-w-full ${
                log.direction === 'request'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              <div className="font-semibold mb-1">
                {log.service} {log.direction}
              </div>
              <pre className="whitespace-pre-wrap break-words">
                {typeof log.body === 'string'
                  ? log.body
                  : JSON.stringify(log.body, null, 2)}
              </pre>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

