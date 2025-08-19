'use client';

import { useState, useEffect } from 'react';
import { useMetrics } from './MetricContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CensusChatProps {
  onAddMetric: (metric: { id: string; label: string }) => void | Promise<void>;
}

export default function CensusChat({ onAddMetric }: CensusChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { config, updateConfig } = useMetrics();
  const [zctaInput, setZctaInput] = useState(config.zctas.join(','));

  useEffect(() => {
    setZctaInput(config.zctas.join(','));
  }, [config.zctas]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user' as const, content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const system = `You help users find US Census statistics using the ${config.year} ${config.dataset} dataset for ZCTAs ${config.zctas.join(', ')}`;
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'system', content: system }, ...newMessages],
        config,
      }),
    });
    const data = await res.json();
    setMessages([...newMessages, { role: 'assistant', content: data.message.content }]);
    setLoading(false);

    if (data.toolInvocations) {
      for (const inv of data.toolInvocations) {
        if (inv.name === 'add_metric') {
          await onAddMetric(inv.args);
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-900">
      <div className="p-2 space-y-2">
        <div className="flex gap-2">
          <select
            className="border p-1 text-sm"
            value={config.dataset}
            onChange={(e) => updateConfig({ dataset: e.target.value })}
          >
            <option value="acs/acs5">ACS 5-year</option>
            <option value="acs/acs1">ACS 1-year</option>
          </select>
          <select
            className="border p-1 text-sm"
            value={config.year}
            onChange={(e) => updateConfig({ year: e.target.value })}
          >
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
          </select>
        </div>
        <input
          className="w-full border p-1 text-sm"
          value={zctaInput}
          onChange={(e) => {
            setZctaInput(e.target.value);
            const arr = e.target.value.split(',').map((z) => z.trim()).filter(Boolean);
            updateConfig({ zctas: arr });
          }}
          placeholder="ZCTAs comma separated"
        />
      </div>

      <div className="flex-1 overflow-y-auto mb-2 space-y-2 p-2 rounded bg-gray-100">
        {messages.map((m, idx) => (
          <div key={idx} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={`inline-block px-2 py-1 rounded ${m.role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-900'}`}
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && <div className="text-sm text-gray-500">Thinking...</div>}
      </div>
      <div className="flex">
        <input
          className="flex-1 bg-white border border-gray-300 rounded-l p-2 text-gray-900"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about US Census stats..."
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-r disabled:opacity-50"
          onClick={sendMessage}
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  );
}
