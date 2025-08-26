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
  modeUsed?: 'auto' | 'fast' | 'smart';
}

interface CensusChatProps {
  onAddMetric: (metric: { id: string; label: string }) => void | Promise<void>;
  onClose?: () => void;
  onHighlightZips?: (zips: string[]) => void;
}

export default function CensusChat({ onAddMetric, onClose, onHighlightZips }: CensusChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuOpenIdx, setMenuOpenIdx] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<{ dataIdea: string; questionIdea: string } | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const menuContainerRef = useRef<HTMLSpanElement | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const { config } = useConfig();
  const { data: statData } = db.useQuery({ stats: {} });
  const { metrics, clearMetrics, selectedMetric } = useMetrics();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const lastAssistantRef = useRef<HTMLDivElement | null>(null);
  const runIdRef = useRef(0);
  const preTurnSnapshotRef = useRef<{ metrics: { id: string; label: string }[]; selected: string | null } | null>(null);

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

  // Close approach menu on outside click or Escape
  useEffect(() => {
    function handleDocClick(e: MouseEvent) {
      if (!menuContainerRef.current) return;
      if (menuOpenIdx === null) return;
      const target = e.target as Node | null;
      if (target && !menuContainerRef.current.contains(target)) {
        setMenuOpenIdx(null);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && menuOpenIdx !== null) setMenuOpenIdx(null);
    }
    document.addEventListener('mousedown', handleDocClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpenIdx]);

  // Auto position so the top of the chat view aligns with the latest assistant message
  useEffect(() => {
    const container = scrollContainerRef.current;
    const target = lastAssistantRef.current;
    if (!container || !target) return;
    requestAnimationFrame(() => {
      const adjust = 8; // nudge to avoid cutting off top of bubble
      const top = Math.max(0, target.offsetTop - adjust);
      container.scrollTop = top;
    });
  }, [messages]);

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
    setSuggestions(null);
    onHighlightZips?.([]);
  };

  type Mode = 'auto' | 'fast' | 'smart';

  const fetchSuggestions = async (convo: ChatMessage[]) => {
    setSuggestionsLoading(true);
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: convo, config, activeMetrics: metrics }),
      });
      const data = await res.json();
      const di = (data?.dataIdea || '').toString().trim();
      const qi = (data?.questionIdea || '').toString().trim();
      if (di || qi) setSuggestions({ dataIdea: di, questionIdea: qi });
      else setSuggestions(null);
    } catch {
      setSuggestions(null);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const sendMessageWith = async (text: string, mode: Mode = 'auto') => {
    if (!text.trim()) return;
    const userMessage = { role: 'user' as const, content: text };
    const newMessages = [...messages, userMessage];

    // Log the user message as its own log bubble
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: 'User',
          direction: 'request',
          message: { content: userMessage.content },
        }),
      });
    } catch {
      // ignore log errors
    }

    // Proactively notify if the query likely needs advanced reasoning
    const needsAdvanced = /\b(why|how|explain|compare|contrast|insight|analysis|reason|think|thinking|because)\b/i.test(userMessage.content);
    let preDeferNotified = false;
    if (mode === 'smart' || (mode === 'auto' && needsAdvanced)) {
      newMessages.push({
        role: 'assistant',
        content: 'Consulting a more capable model for deeper reasoning.',
        modeUsed: 'smart',
      });
      preDeferNotified = true;
    }

    setMessages(newMessages);
    setInput('');
    setSuggestions(null);

    // Snapshot metrics state before any actions for undo capability
    preTurnSnapshotRef.current = { metrics: [...metrics], selected: selectedMetric };
    setLoading(true);
    const systemPrompt = `You help users find US Census statistics. Limit responses to ${config.region} using ${config.dataset} ${config.year} data for ${config.geography}. Be brief, a few sentences, plain text only.`;
    const stats = (statData?.stats || []) as Stat[];
    const activeStats = stats.filter((s) => metrics.some((m) => m.id === s.code));
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'system', content: systemPrompt }, ...newMessages],
        config,
        stats: activeStats.map((s) => ({
          code: s.code,
          description: s.description,
          data: JSON.parse(s.data),
        })),
        mode,
      }),
    });
    const data = await res.json();
    const responseMessages = [...newMessages];
    if (data.usedFallback && !preDeferNotified) {
      responseMessages.push({
        role: 'assistant',
        content: `Consulting a more capable model because ${data.fallbackReason}.`,
      });
    }
    responseMessages.push({ role: 'assistant', content: data.message.content, modeUsed: (data.modeUsed as 'auto'|'fast'|'smart') || mode });
    setMessages(responseMessages);
    setLoading(false);

    if (onHighlightZips) {
      const zips = Array.from(new Set((data.message.content.match(/\b\d{5}\b/g) || [])));
      onHighlightZips(zips);
    }

    if (data.toolInvocations) {
      for (const inv of data.toolInvocations) {
        if (inv.name === 'add_metric') {
          await onAddMetric(inv.args);
        }
      }
    }
    // Fetch follow-up suggestions unless the assistant asked a question
    const asked = /\?|^\s*(why|how|what|which|who|where|when|do|does|did|can|could|should|would|is|are|will|may|might)\b/i.test(
      (data?.message?.content || '')
    );
    if (!asked) fetchSuggestions(responseMessages);
  };

  const sendMessage = async () => sendMessageWith(input, 'auto');

  const restoreMetricsSnapshot = async (snapshot: { metrics: { id: string; label: string }[]; selected: string | null }) => {
    clearMetrics();
    for (const m of snapshot.metrics) {
      await onAddMetric(m);
    }
    // Re-select if needed
    if (snapshot.selected) {
      const match = snapshot.metrics.find((mm) => mm.id === snapshot.selected);
      if (match) await onAddMetric(match);
    }
  };

  const rerunWithMode = async (mode: Mode) => {
    const lastUserIdx = [...messages].map((m) => m.role).lastIndexOf('user');
    if (lastUserIdx === -1) return;
    const metricsSnapshot = preTurnSnapshotRef.current || { metrics: [...metrics], selected: selectedMetric };

    // Trim messages to last user
    const truncated = messages.slice(0, lastUserIdx + 1);
    setMessages(truncated);
    setMenuOpenIdx(null);

    setLoading(true);
    setSuggestions(null);
    const systemPrompt = `You help users find US Census statistics. Limit responses to ${config.region} using ${config.dataset} ${config.year} data for ${config.geography}. Be brief, a few sentences, plain text only.`;
    const stats = (statData?.stats || []) as Stat[];
    const activeStats = stats.filter((s) => metricsSnapshot.metrics.some((m) => m.id === s.code));
    const runId = ++runIdRef.current;

    // Undo previous assistant's actions immediately
    await restoreMetricsSnapshot(metricsSnapshot);

    // If forcing smart, show immediate notice
    const pre = [...truncated];
    if (mode === 'smart') {
      pre.push({ role: 'assistant', content: 'Consulting a more capable model for deeper reasoning.', modeUsed: 'smart' });
      setMessages(pre);
    }

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'system', content: systemPrompt }, ...truncated],
        config,
        stats: activeStats.map((s) => ({
          code: s.code,
          description: s.description,
          data: JSON.parse(s.data),
        })),
        mode,
      }),
    });
    if (runId !== runIdRef.current) return; // superseded
    const data = await res.json();

    // Undo metrics/actions from previous assistant by restoring snapshot
    await restoreMetricsSnapshot(metricsSnapshot);

    const responseMessages = mode === 'smart' ? pre : [...truncated];
    if (data.usedFallback && mode === 'auto') {
      responseMessages.push({
        role: 'assistant',
        content: `Consulting a more capable model because ${data.fallbackReason}.`,
      });
    }
    responseMessages.push({ role: 'assistant', content: data.message.content, modeUsed: (data.modeUsed as 'auto'|'fast'|'smart') || mode });
    setMessages(responseMessages);
    setLoading(false);

    if (data.toolInvocations) {
      for (const inv of data.toolInvocations) {
        if (inv.name === 'add_metric') {
          await onAddMetric(inv.args);
        }
      }
    }
    // Fetch suggestions unless the assistant asked a question
    const asked = /\?|^\s*(why|how|what|which|who|where|when|do|does|did|can|could|should|would|is|are|will|may|might)\b/i.test(
      (data?.message?.content || '')
    );
    if (!asked) fetchSuggestions(responseMessages);
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
            <div
              className="text-xs text-gray-500 font-normal leading-tight"
              style={{ marginTop: 2 }}
            >
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

      {/* Default starter ideas when chat is empty - shown above messages */}
      {messages.length === 0 && !loading && !input.trim() && (
        <div className="mb-2 flex flex-col gap-2">
          <button
            className="w-full text-left px-3 py-2 rounded-md bg-indigo-50 text-indigo-800 hover:bg-indigo-100 transition-colors text-sm"
            onClick={() => {
              sendMessageWith('Add median hh income', 'auto');
              setSuggestions(null);
            }}
          >
            Add median hh income
          </button>
          <button
            className="w-full text-left px-3 py-2 rounded-md bg-indigo-50 text-indigo-800 hover:bg-indigo-100 transition-colors text-sm"
            onClick={() => {
              sendMessageWith('Add total population', 'auto');
              setSuggestions(null);
            }}
          >
            Add total population
          </button>
        </div>
      )}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto mb-2 space-y-2 p-2 rounded bg-gray-100"
      >
        {(() => {
          const lastAssistantIdx = [...messages].map((mm) => mm.role).lastIndexOf('assistant');
          return messages.map((m, idx) => {
          const isAssistant = m.role === 'assistant';
          const attachRef = isAssistant && idx === lastAssistantIdx;
          return (
            <div
              key={idx}
              ref={attachRef ? lastAssistantRef : null}
              className={m.role === 'user' ? 'text-right' : 'text-left'}
            >
              <span
                className={`inline-block px-2 py-1 rounded ${isAssistant ? 'bg-gray-200 text-gray-900' : 'bg-blue-100 text-blue-800'}`}
              >
                {m.content}
              </span>
              {isAssistant && (
                <div className="mt-1 flex justify-end">
                  <span
                    ref={menuOpenIdx === idx ? menuContainerRef : null}
                    className="inline-flex items-center text-xs border rounded px-1 py-0.5 bg-white text-gray-700 align-middle relative"
                  >
                    Approach: {m.modeUsed ? (m.modeUsed.charAt(0).toUpperCase() + m.modeUsed.slice(1)) : 'Auto'}
                    <button
                      className="ml-1 text-gray-500 hover:text-gray-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenIdx(menuOpenIdx === idx ? null : idx);
                      }}
                      aria-label="Choose approach"
                    >
                      ▼
                    </button>
                    {menuOpenIdx === idx && (
                      <div className="absolute right-0 bottom-full mb-1 w-32 bg-white border rounded shadow text-left z-10">
                        {([
                          { key: 'auto', label: 'Auto' },
                          { key: 'fast', label: 'Fast' },
                          { key: 'smart', label: 'Smart' },
                        ] as Array<{ key: Mode; label: string }>).map((opt) => (
                          <div
                            key={opt.key}
                            className="px-2 py-1 hover:bg-gray-100 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenIdx(null);
                              rerunWithMode(opt.key);
                            }}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </span>
                </div>
              )}
            </div>
          );
        }); })()}
        {/* Follow-up idea buttons below the last assistant response */}
        {(() => {
          const last = messages[messages.length - 1];
          if (!last || last.role !== 'assistant' || !suggestions) return null;
          const { dataIdea, questionIdea } = suggestions;
          if (!dataIdea && !questionIdea) return null;
          const addText = (idea: string) => {
            const m = idea.match(/^[A-Z]\d{5}_\d{3}E/i);
            if (m) return idea.split(/\s*-\s*/)[0];
            return idea;
          };
          return (
            <div className="mt-2 flex flex-col gap-2">
              {dataIdea ? (
                <button
                  className="w-full text-left px-3 py-2 rounded-md bg-indigo-50 text-indigo-800 hover:bg-indigo-100 transition-colors text-sm"
                  onClick={() => {
                    // Extract inner phrase from "Add data for X?"
                    let phrase = dataIdea;
                    const match = dataIdea.match(/add data for\s+(.+?)\?$/i);
                    if (match) phrase = match[1];
                    const byId = addText(phrase);
                    // Ensure <= 7 words for action query heuristic
                    const limited = byId.split(/\s+/).slice(0, 7).join(' ');
                    sendMessageWith(`add ${limited}`, 'auto');
                    setSuggestions(null);
                  }}
                >
                  {dataIdea}
                </button>
              ) : null}
              {questionIdea ? (
                <button
                  className="w-full text-left px-3 py-2 rounded-md bg-indigo-50 text-indigo-800 hover:bg-indigo-100 transition-colors text-sm"
                  onClick={() => {
                    sendMessageWith(questionIdea, 'auto');
                    setSuggestions(null);
                  }}
                >
                  {questionIdea}
                </button>
              ) : null}
            </div>
          );
        })()}
        {(() => {
          const last = messages[messages.length - 1];
          if (!last || last.role !== 'assistant' || !suggestionsLoading) return null;
          return (
            <div className="mt-2 flex flex-col gap-2">
              <div className="flex-1 px-3 py-2 rounded-md bg-indigo-50 text-indigo-700 text-xs">
                Finding ideas…
              </div>
            </div>
          );
        })()}
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
          onChange={(e) => {
            const v = e.target.value;
            setInput(v);
            if (v && suggestions) setSuggestions(null);
          }}
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
