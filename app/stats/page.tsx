'use client';

import React, { useState } from 'react';
import db from '../../lib/db';
import type { Stat } from '../../types/stat';

interface CensusSearchResult {
  name: string;
  label: string;
}

export default function StatsPage() {
  const { data } = db.useQuery({ stats: {} });
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<CensusSearchResult[]>([]);

  const handleSearch = async () => {
    const res = await fetch(`/api/census/search?q=${encodeURIComponent(search)}`);
    const json = (await res.json()) as CensusSearchResult[];
    setResults(json);
  };

  const handleAdd = async (name: string, label: string) => {
    const id = await db.transact([
      db.tx.stats.insert({ title: label, variable: name, geography: 'tract', lastUpdated: 0 })
    ]);
    await fetch('/api/stats/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
  };

  const stats = data?.stats || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Stat Management</h1>
      <div>
        <div className="flex mb-2 gap-2">
          <input
            className="border px-2 py-1 flex-1 rounded"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Census stats"
          />
          <button onClick={handleSearch} className="px-3 py-1 border rounded bg-white">Search</button>
        </div>
        {results.length > 0 && (
          <ul className="mb-6 max-h-48 overflow-y-auto">
            {results.map((r) => (
              <li key={r.name} className="flex justify-between items-center py-1 text-sm">
                <span>{r.label}</span>
                <button onClick={() => handleAdd(r.name, r.label)} className="text-blue-600">Add</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-2">Existing Stats</h2>
        <ul className="space-y-2">
          {stats.map((stat: Stat) => (
            <li key={stat.id} className="border p-2 rounded flex justify-between items-center">
              <div>
                <div className="font-medium">{stat.title}</div>
                <div className="text-xs text-gray-500">
                  Updated {stat.lastUpdated ? new Date(stat.lastUpdated).toLocaleString() : 'never'} - {stat.geography}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetch('/api/stats/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: stat.id })
                  })}
                  className="text-blue-600 text-sm"
                >
                  Refresh
                </button>
                <select
                  value={stat.refreshCadence || 'manual'}
                  onChange={(e) => db.transact([db.tx.stats[stat.id].update({ refreshCadence: e.target.value })])}
                  className="text-sm border rounded px-1 py-0.5"
                >
                  <option value="manual">manual</option>
                  <option value="monthly">monthly</option>
                  <option value="yearly">yearly</option>
                </select>
                <button
                  onClick={() => db.transact([db.tx.stats[stat.id].delete()])}
                  className="text-red-600 text-sm"
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
