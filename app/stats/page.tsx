'use client';

import React, { useState } from 'react';
import { id } from '@instantdb/react';
import db from '../../lib/db';
import type { Stat } from '../../types/stat';
import { fetchCensusData, searchCensusVariables } from '../../lib/census';

export default function StatManagement() {
  const { data } = db.useQuery({ stats: {} });
  const stats: Stat[] = data?.stats || [];
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ name: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await searchCensusVariables('acs/acs5/subject', search);
      setResults(res);
    } catch (err) {
      console.error('search error', err);
    } finally {
      setLoading(false);
    }
  };

  const addStat = async (name: string, label: string) => {
    try {
      const data = await fetchCensusData({
        variable: name,
        dataset: 'acs/acs5/subject',
        geography: 'zip%20code%20tabulation%20area'
      });
      const statId = id();
      await db.transact([
        db.tx.stats[statId].update({
          title: label,
          variable: name,
          dataset: 'acs/acs5/subject',
          geography: 'zip code tabulation area',
          data: JSON.stringify(data),
          lastUpdated: Date.now(),
        })
      ]);
      setResults([]);
      setSearch('');
    } catch (err) {
      console.error('add stat error', err);
    }
  };

  const refreshStat = async (stat: Stat) => {
    try {
      const data = await fetchCensusData({
        variable: stat.variable,
        dataset: stat.dataset,
        geography: stat.geography
      });
      await db.transact([
        db.tx.stats[stat.id].update({ data: JSON.stringify(data), lastUpdated: Date.now() })
      ]);
    } catch (err) {
      console.error('refresh error', err);
    }
  };

  const updateCadence = async (stat: Stat, cadence: string) => {
    await db.transact([
      db.tx.stats[stat.id].update({ refreshCadence: cadence })
    ]);
  };

  const deleteStat = async (stat: Stat) => {
    await db.transact([db.tx.stats[stat.id].delete()]);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Stat Management</h1>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          className="border px-3 py-2 flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search US Census stats"
        />
        <button type="submit" className="px-4 py-2 border bg-white">
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>
      {results.length > 0 && (
        <div className="border rounded p-2 space-y-1 max-h-64 overflow-y-auto">
          {results.map((r) => (
            <div key={r.name} className="flex justify-between text-sm">
              <span>{r.label}</span>
              <button
                type="button"
                className="text-blue-600"
                onClick={() => addStat(r.name, r.label)}
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Title</th>
            <th className="text-left py-2">Last Updated</th>
            <th className="text-left py-2">Geography</th>
            <th className="text-left py-2">Refresh</th>
            <th className="text-left py-2">Cadence</th>
            <th className="text-left py-2">Delete</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="py-2">{s.title}</td>
              <td className="py-2">{new Date(s.lastUpdated).toLocaleDateString()}</td>
              <td className="py-2">{s.geography}</td>
              <td className="py-2">
                <button
                  type="button"
                  className="text-blue-600"
                  onClick={() => refreshStat(s)}
                >
                  Refresh
                </button>
              </td>
              <td className="py-2">
                <select
                  className="border px-1 py-1"
                  value={s.refreshCadence || 'manual'}
                  onChange={(e) => updateCadence(s, e.target.value)}
                >
                  <option value="manual">Manual</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </td>
              <td className="py-2">
                <button
                  type="button"
                  className="text-red-600"
                  onClick={() => deleteStat(s)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

