'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import db from '../../lib/db';

export default function StatManagement() {
  const { data } = db.useQuery({ stats: {} });
  const stats = data?.stats || [];
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  async function search() {
    const res = await fetch(`/api/census/search?q=${encodeURIComponent(query)}`);
    const json = await res.json();
    setResults(json);
  }

  async function addStat(v: any) {
    await fetch('/api/stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: v.label, censusVar: v.name, geography: 'tract' })
    });
    setResults([]);
    setQuery('');
  }

  async function refresh(id: string) {
    await fetch(`/api/stats/${id}`, { method: 'POST' });
  }

  async function remove(id: string) {
    await fetch(`/api/stats/${id}`, { method: 'DELETE' });
  }

  async function updateCadence(id: string, days: number) {
    await db.transact([db.tx.stats[id].update({ refreshCadenceDays: days })]);
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Stat Management</h1>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border px-3 py-1 rounded flex-1"
          placeholder="Search US Census stats"
        />
        <button onClick={search} className="px-4 py-1 bg-blue-600 text-white rounded">Search</button>
      </div>
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <div key={r.name} className="flex justify-between items-center border p-2 rounded">
              <span className="text-sm">{r.label}</span>
              <button onClick={() => addStat(r)} className="text-blue-600 text-sm">Add</button>
            </div>
          ))}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Title</th>
            <th className="py-2">Last Updated</th>
            <th className="py-2">Geography</th>
            <th className="py-2">Cadence (days)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s: any) => (
            <tr key={s.id} className="border-b">
              <td className="py-2">{s.title}</td>
              <td className="py-2">{s.lastUpdated ? new Date(s.lastUpdated).toLocaleDateString() : '-'}</td>
              <td className="py-2">{s.geography}</td>
              <td className="py-2">
                <input
                  type="number"
                  defaultValue={s.refreshCadenceDays}
                  className="border px-2 py-1 w-20"
                  onBlur={(e) => updateCadence(s.id, Number(e.target.value))}
                />
              </td>
              <td className="py-2 flex gap-2">
                <button onClick={() => refresh(s.id)} className="text-blue-600">Refresh</button>
                <button onClick={() => remove(s.id)} className="text-red-600">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
