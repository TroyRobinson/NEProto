'use client';

import { useState, useEffect, useRef } from 'react';
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
  onClose?: () => void;
}

export default function CensusChat({ onAddMetric, onLoadStat, onClose }: CensusChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { config } = useConfig();
  const { data: statData } = db.useQuery({ stats: {} });
  const { clearMetrics } = useMetrics();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const CHAT_STORAGE_KEY = 'censusChatMessages';

  useEffect(() => {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, loading]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

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

    setLoading(true);
    const systemPrompt = `You help users find US Census statistics. Limit responses to ${config.region} using ${config.dataset} ${config.year} data for ${config.geography}. Be brief, a few sentences, plain text only.`;
    const stats = (statData?.stats || []) as Stat[];
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'system', content: systemPrompt }, ...newMessages],
        config,
        stats: stats.map((s) => ({
          code: s.code,
          description: s.description,
          data: JSON.parse(s.data),
        })),
      }),
    });
    const data = await res.json();
    setMessages([...newMessages, { role: 'assistant', content: data.message.content }]);
    setLoading(false);

    if (data.toolInvocations) {
      for (const inv of data.toolInvocations) {
        if (inv.name === 'add_metric') {
          await onAddMetric(inv.args);
        } else if (inv.name === 'load_stat' && typeof inv.args.code === 'string') {
          const stat = stats.find((s) => s.code === inv.args.code);
          if (stat) {
            await onLoadStat(stat);
          }
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-900">
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2 items-center">
          <span
            className="font-semibold text-lg text-gray-800"
            style={{ minWidth: '6.5rem' }}
          >
            Ask Anything
            <div className="text-xs text-gray-500 font-normal leading-tight" style={{ marginTop: 2 }}>
              add map data &amp; chat
            </div>
          </span>
          <button
            onClick={clearChat}
            className="px-2 py-1 border rounded text-xs text-gray-600"
            aria-label="Clear chat"
          >
            Clear
          </button>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="text-xs text-blue-600 underline"
          >
            {showSettings ? 'Hide settings' : 'Show settings'}
          </button>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {showSettings && <ConfigControls />}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto mb-2 space-y-2 p-2 rounded bg-gray-100"
      >
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
        <textarea
          ref={inputRef}
          className="flex-1 border border-[--color-base-300] bg-[--color-base-100] text-[--color-base-content] rounded-l-[var(--radius-field)] py-2 px-3 leading-normal no-scrollbar"
          rows={1}
          style={{
            resize: 'none',
            overflowY: 'auto',
            maxHeight: '40vh',
            height: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={'Ask about US Census stats... (Shift+Enter for newline)'}
        />
        <style jsx>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <button
          className="px-4 py-2 rounded-r-[var(--radius-field)] disabled:opacity-50 transition-colors"
          style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-content)' }}
          onClick={sendMessage}
          disabled={loading}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#3539e0')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
        >
          Send
        </button>
      </div>
    </div>
  );
}

