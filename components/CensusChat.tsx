'use client';

import { useState, useEffect, useRef } from 'react';
import { useConfig } from './ConfigContext';
import ConfigControls from './ConfigControls';
import { useMetrics } from './MetricContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CensusChatProps {
  onAddMetric: (metric: { id: string; label: string }) => void | Promise<void>;
  onClose?: () => void;
}

export default function CensusChat({ onAddMetric, onClose }: CensusChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { config } = useConfig();
  const { metrics, clearMetrics } = useMetrics();
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

  // Auto scroll to bottom when messages update or loading state changes
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    // Use rAF to ensure DOM is painted before measuring
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, loading]);

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

  const isFastQuery = (text: string) => {
    const trimmed = text.trim();
    if (/^[A-Za-z0-9_]+(?:\s*,\s*[A-Za-z0-9_]+)*$/.test(trimmed)) return true;
    if (/[.!?]/.test(trimmed)) return false;
    const tokens = trimmed.split(/\s+/);
    if (tokens.length >= 2 && tokens.length <= 8) {
      const first = tokens[0].toLowerCase();
      if (['add', 'map', 'show'].includes(first)) return true;
    }
    return false;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { role: 'user' as const, content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    setLoading(true);
    const fast = isFastQuery(userMessage.content);
    const currentStats = metrics.map((m) => `${m.id}: ${m.label}`).join('\n') || 'none';
    const systemPrompt = `You help users find US Census statistics. Limit responses to ${config.region} using ${config.dataset} ${config.year} data for ${config.geography}. Current stats:\n${currentStats}`;
    const body: Record<string, unknown> = {
      messages: [{ role: 'system', content: systemPrompt }, ...newMessages],
      config,
    };
    if (fast) body.mode = 'fast-admin';
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
        <ConfigControls />
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
            placeholder="Ask about US Census stats... (Shift+Enter for newline)"
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
