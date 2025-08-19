'use client';

import { useState } from 'react';
import { useConfig } from './ConfigContext';
import ConfigControls from './ConfigControls';
import db from '../lib/db';
import { getVariableInfo } from '../lib/censusTools';
import { fetchZctaMetric, featuresFromStatValues, type ZctaFeature } from '../lib/census';
import { saveStat } from '../lib/stats';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface StatValue { zcta: string; value: number | null }
interface Stat { id: string; title: string; description: string; variable: string; dataset: string; year: number; values: StatValue[] }

interface CensusChatProps {
  onAddMetric: (metric: { id: string; label: string; features?: ZctaFeature[] }) => void | Promise<void>;
}

export default function CensusChat({ onAddMetric }: CensusChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'user' | 'admin'>('user');
  const { config } = useConfig();

  const sendMessage = async () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: 'user' as const, content: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    if (mode === 'admin') {
      const systemPrompt = `You help users find US Census statistics. Limit responses to ${config.region} using ${config.dataset} ${config.year} data for ${config.geography}.`;
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'system', content: systemPrompt }, ...newMessages],
          config,
        }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: data.message.content }]);
      setLoading(false);

      if (data.toolInvocations) {
        for (const inv of data.toolInvocations) {
          if (inv.name === 'add_metric') {
            const info = await getVariableInfo(inv.args.id, config.year, config.dataset);
            const varId = inv.args.id.includes('_') ? inv.args.id : inv.args.id + '_001E';
            const features = await fetchZctaMetric(varId, { year: config.year, dataset: config.dataset });
            await saveStat({
              variable: inv.args.id,
              title: inv.args.label,
              description: info?.label || inv.args.label,
              category: info?.concept || '',
              dataset: config.dataset,
              year: config.year,
              features,
            });
            await onAddMetric({ id: inv.args.id, label: inv.args.label, features });
          }
        }
      }
    } else {
      const result = await db.query({ stats: { values: {} } });
      const stats: Stat[] = result.stats || [];
      const q = input.toLowerCase();
      const matches = stats.filter((s) =>
        s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
      );
      if (matches.length) {
        const stat = matches[0];
        const features = await featuresFromStatValues(
          stat.values.map((v) => ({ zcta: v.zcta, value: v.value ?? null }))
        );
        await onAddMetric({ id: stat.variable, label: stat.title, features });
        setMessages([...newMessages, { role: 'assistant', content: stat.description }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: 'No stats found.' }]);
      }
      setLoading(false);
    }
  };

    return (
      <div className="flex flex-col h-full bg-white text-gray-900">
        <div className="flex justify-center gap-2 mb-1 text-sm">
          <button
            className={`px-2 py-1 border rounded ${mode === 'user' ? 'bg-blue-500 text-white' : ''}`}
            onClick={() => setMode('user')}
          >
            User Mode
          </button>
          <button
            className={`px-2 py-1 border rounded ${mode === 'admin' ? 'bg-blue-500 text-white' : ''}`}
            onClick={() => setMode('admin')}
          >
            Admin Mode
          </button>
        </div>
        <ConfigControls />
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
          placeholder="Ask about stats..."
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
