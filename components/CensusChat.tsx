'use client';

import { useState, useEffect } from 'react';
import db from '../lib/db';
import { useConfig } from './ConfigContext';
import ConfigControls from './ConfigControls';
import type { Stat } from '../types/stat';
import { useMetrics } from './MetricContext';

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
  const [mode, setMode] = useState<'user' | 'admin' | 'fast-admin'>('user');
  const { config } = useConfig();
  const { data: statData } = db.useQuery({ stats: {} });
  const { metrics, clearMetrics } = useMetrics();

  const CHAT_STORAGE_KEY = 'censusChatMessages';
  const MODE_STORAGE_KEY = 'censusChatMode';

  useEffect(() => {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
    const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
    if (storedMode === 'user' || storedMode === 'admin' || storedMode === 'fast-admin') {
      setMode(storedMode as 'user' | 'admin' | 'fast-admin');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    clearMetrics();
  };

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
        setMessages([...newMessages, { role: 'assistant', content: data.message.content }]);
        setLoading(false);

        if (data.toolInvocations) {
          for (const inv of data.toolInvocations) {
            if (inv.name === 'add_metric') {
              await onAddMetric(inv.args);
            }
          }
        }
      } else if (mode === 'fast-admin') {
        setLoading(true);
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [userMessage],
            config,
            mode: 'fast-admin',
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
          setLoading(false);
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
            } else {
              setMessages([...newMessages, { role: 'assistant', content: 'No matching stat found.' }]);
            }
          } else {
            setMessages([...newMessages, { role: 'assistant', content: 'No matching stat found.' }]);
          }
        } else {
          const activeStats = stats.filter(s =>
            metrics.some(m => m.id === s.code)
          );
          const res = await fetch('/api/insight', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: newMessages,
              stats: activeStats.map(s => ({
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
      <div className="flex flex-col h-full bg-white text-gray-900">
        <div className="flex justify-end mb-2 gap-2">
          <button
            onClick={clearChat}
            className="px-2 py-1 border rounded text-xs text-gray-600"
            aria-label="Clear chat"
          >
            Clear
          </button>
          <select
            className="border border-gray-300 rounded p-1 text-sm"
            value={mode}
            onChange={e => setMode(e.target.value as 'user' | 'admin' | 'fast-admin')}
          >
            <option value="user">User Mode</option>
            <option value="admin">Admin Mode</option>
            <option value="fast-admin">Fast Admin Mode</option>
          </select>
        </div>
        {mode !== 'user' && <ConfigControls />}
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
            placeholder={
              mode === 'admin'
                ? 'Ask about US Census stats...'
                : mode === 'fast-admin'
                ? 'Quickly add Census variables...'
                : 'Search stored stats...'
            }
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
