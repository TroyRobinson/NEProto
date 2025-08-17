'use client';

import React, { useState } from 'react';
import db from '@/lib/db';
import type { Stat } from '@/types/stat';

export default function StatManagement() {
  const { data } = db.useQuery({ stats: {} });
  const stats: Stat[] = data?.stats || [];
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Array<{ id: string; label: string }>>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSearch(true);
    const resp = await fetch(`/api/census/search?q=${encodeURIComponent(search)}`);
    const json = await resp.json();
    setResults(json.results || []);
    setLoadingSearch(false);
  };

  const addStat = async (r: { id: string; label: string }) => {
    await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: r.label, variable: r.id, geographyType: 'tract' }),
    });
    setSearch('');
    setResults([]);
  };

  const refreshStat = async (id: string) => {
    await fetch(`/api/stats/${id}/refresh`, { method: 'POST' });
  };

  const deleteStat = async (id: string) => {
    await fetch(`/api/stats/${id}`, { method: 'DELETE' });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Stat Management</h1>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search census stats..."
          className="flex-1 border px-3 py-2 rounded"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          {loadingSearch ? 'Searching...' : 'Search'}
        </button>
      </form>

      {results.length > 0 && (
        <div className="border rounded p-2">
          <h2 className="font-semibold mb-2">Results</h2>
          <ul>
            {results.map((r) => (
              <li key={r.id} className="flex justify-between items-center border-b py-1">
                <span className="text-sm">{r.label}</span>
                <button
                  onClick={() => addStat(r)}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-2">Existing Stats</h2>
        <ul>
          {stats.map((s) => (
            <li key={s.id} className="border-b py-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{s.title}</div>
                <div className="text-xs text-gray-500">
                  Last updated: {s.lastUpdated ? new Date(s.lastUpdated).toLocaleString() : 'never'}
                </div>
                <div className="text-xs text-gray-500">Geography: {s.geographyType}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => refreshStat(s.id)}
                  className="px-2 py-1 text-sm bg-green-500 text-white rounded"
                >
                  Refresh
                </button>
                <button
                  onClick={() => deleteStat(s.id)}
                  className="px-2 py-1 text-sm bg-red-500 text-white rounded"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

