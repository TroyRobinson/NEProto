'use client';

import { useState } from 'react';
import db from '../lib/db';
import { useConfig } from './ConfigContext';
import ConfigControls from './ConfigControls';
import type { Stat } from '../types/stat';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CensusChatProps {
  onAddMetric: (metric: { id: string; label: string }) => void | Promise<void>;
  onLoadStat: (stat: Stat) => void | Promise<void>;
}

export default function CensusChat({ onAddMetric, onLoadStat }: CensusChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'user' | 'admin'>('user');
  const { config } = useConfig();
  const { data: statData } = db.useQuery({ stats: {} });

    const sendMessage = async () => {
      if (!input.trim()) return;
      const userMessage = { role: 'user' as const, content: input };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInput('');

      if (mode === 'admin') {
        setLoading(true);
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
        let added = false;
        if (data.toolInvocations) {
          for (const inv of data.toolInvocations) {
            if (inv.name === 'add_metric') {
              await onAddMetric(inv.args);
              added = true;
            }
          }
        }
        setLoading(false);
        if (added) {
          setMessages([...newMessages, { role: 'assistant', content: 'Added to map!' }]);
          setMode('user');
        } else {
          setMessages([...newMessages, { role: 'assistant', content: data.message.content }]);
        }
      } else {
        setLoading(true);
        const stats = (statData?.stats || []) as Stat[];
        const isAction = /\b(add|show|map)\b/i.test(userMessage.content);
        if (isAction) {
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [userMessage],
              mode: 'user',
              stats: stats.map(s => ({ code: s.code, description: s.description })),
            }),
          });
          const data = await res.json();
          type ToolInvocation = { name: string; args: Record<string, unknown> };
          const inv = (data.toolInvocations as ToolInvocation[] | undefined)?.find(
            (i) => i.name === 'select_stat'
          );
          if (inv && typeof inv.args.code === 'string') {
            const code = inv.args.code as string;
            const stat = stats.find(s => s.code === code);
            if (stat) {
              await onLoadStat(stat);
              setMessages([...newMessages, { role: 'assistant', content: 'Added to map!' }]);
              setLoading(false);
            } else {
              const fallbackMsg = { role: 'assistant', content: 'No matching stat found in our database. Now searching the US Census ...' } as const;
              setMessages([...newMessages, fallbackMsg]);
              const systemPrompt = `You help users find US Census statistics. Limit responses to ${config.region} using ${config.dataset} ${config.year} data for ${config.geography}.`;
              const adminRes = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  messages: [{ role: 'system', content: systemPrompt }, userMessage],
                  config,
                }),
              });
              const adminData = await adminRes.json();
              let added = false;
              if (adminData.toolInvocations) {
                for (const a of adminData.toolInvocations) {
                  if (a.name === 'add_metric') {
                    await onAddMetric(a.args);
                    added = true;
                  }
                }
              }
              if (added) {
                setMessages([...newMessages, fallbackMsg, { role: 'assistant', content: 'Added to map!' }]);
                setMode('user');
              } else {
                setMessages([...newMessages, fallbackMsg, { role: 'assistant', content: adminData.message.content }]);
                setMode('admin');
              }
              setLoading(false);
            }
          } else {
            const fallbackMsg = { role: 'assistant', content: 'No matching stat found in our database. Now searching the US Census ...' } as const;
            setMessages([...newMessages, fallbackMsg]);
            const systemPrompt = `You help users find US Census statistics. Limit responses to ${config.region} using ${config.dataset} ${config.year} data for ${config.geography}.`;
            const adminRes = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                messages: [{ role: 'system', content: systemPrompt }, userMessage],
                config,
              }),
            });
            const adminData = await adminRes.json();
            let added = false;
            if (adminData.toolInvocations) {
              for (const a of adminData.toolInvocations) {
                if (a.name === 'add_metric') {
                  await onAddMetric(a.args);
                  added = true;
                }
              }
            }
            if (added) {
              setMessages([...newMessages, fallbackMsg, { role: 'assistant', content: 'Added to map!' }]);
              setMode('user');
            } else {
              setMessages([...newMessages, fallbackMsg, { role: 'assistant', content: adminData.message.content }]);
              setMode('admin');
            }
            setLoading(false);
          }
        } else {
          const res = await fetch('/api/insight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: newMessages,
              stats: stats.map(s => ({
                code: s.code,
                description: s.description,
                data: JSON.parse(s.data),
              })),
            }),
          });
          const data = await res.json();
          setLoading(false);
          setMessages([...newMessages, { role: 'assistant', content: data.message.content }]);
        }
      }
    };

    return (
      <div className="flex flex-col h-full bg-white text-gray-900 min-w-[480px]">
        <div className="flex justify-end mb-2">
          <select
            className="border border-gray-300 rounded p-1 text-sm"
            value={mode}
            onChange={e => setMode(e.target.value as 'user' | 'admin')}
          >
            <option value="user">User Mode</option>
            <option value="admin">Admin Mode</option>
          </select>
        </div>
        {mode === 'admin' && <ConfigControls />}
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
            placeholder={mode === 'admin' ? 'Ask about US Census stats...' : 'Search stored stats...'}
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
