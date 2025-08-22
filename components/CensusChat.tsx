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
  const [mode, setMode] = useState<'user' | 'admin' | 'fast-admin'>('user');
  const { config } = useConfig();
  const { data: statData } = db.useQuery({ stats: {} });
  const { metrics, clearMetrics } = useMetrics();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

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
      setMode(storedMode);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Auto scroll to bottom when messages update or loading state changes
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    // Use rAF to ensure DOM is painted before measuring
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, loading]);

  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode]);

  // Auto-resize input area based on content
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

      if (mode === 'admin' || mode === 'fast-admin') {
        setLoading(true);
        const systemPrompt = `You help users find US Census statistics. Limit responses to ${config.region} using ${config.dataset} ${config.year} data for ${config.geography}.`;
        const body: Record<string, unknown> = {
          messages: [{ role: 'system', content: systemPrompt }, ...newMessages],
          config,
        };
        if (mode === 'fast-admin') body.mode = 'fast-admin';
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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
            <div
              className="relative"
              style={{ display: 'inline-block' }}
            >
              <select
                className="border transition-colors pr-8"
                style={{
                  paddingTop: 'var(--spacing-2)',
                  paddingBottom: 'var(--spacing-2)',
                  paddingLeft: 'var(--spacing-4)',
                  paddingRight: 'var(--spacing-10)', // extra right padding for chevron
                  borderRadius: 'var(--radius-field)', // 8px
                  backgroundColor: 'var(--color-base-100)',
                  color: 'var(--color-base-content)',
                  borderColor: 'var(--color-base-300)',
                  fontSize: 'var(--font-size-sm)', // 14px
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                }}
                value={mode}
                onChange={e => setMode(e.target.value as 'user' | 'admin' | 'fast-admin')}
              >
                <option value="user">User Mode</option>
                <option value="admin">Admin Mode</option>
                <option value="fast-admin">Fast Admin Mode</option>
              </select>
              {/* Down chevron icon, with right padding */}
              <span
                className="pointer-events-none absolute inset-y-0 right-0 flex items-center"
                style={{ paddingRight: 'var(--spacing-3)' }}
              >
                <svg
                  className="w-2 h-2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
            <button
              onClick={clearChat}
              className="px-2 py-1 border rounded text-xs text-gray-600"
              aria-label="Clear chat"
            >
              Clear
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
        {mode !== 'user' && <ConfigControls />}
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
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE 10+
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={mode !== 'user' ? 'Ask about US Census stats... (Shift+Enter for newline)' : 'Search stored stats...'}
          />
          {/* Hide scrollbar for Webkit browsers */}
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
            onMouseOver={e => (e.currentTarget.style.backgroundColor = '#3539e0')}
            onMouseOut={e => (e.currentTarget.style.backgroundColor = 'var(--color-accent)')}
          >
            Send
          </button>
        </div>
      </div>
    );
  }
