'use client';

import React, { useEffect, useState } from 'react';
import { fetchCensusVariables, type CensusVariable } from '../../../lib/census';

export default function SearchCensusStatsPage() {
  const [vars, setVars] = useState<CensusVariable[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCensusVariables()
      .then((v) => setVars(v))
      .catch(() => setError('Failed to load census variables'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = query
    ? vars.filter(
        (v) =>
          v.name.toLowerCase().includes(query.toLowerCase()) ||
          v.label.toLowerCase().includes(query.toLowerCase()) ||
          v.concept.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen p-4 bg-gray-100 text-black">
      <h1 className="text-2xl font-bold mb-4">Search Census Stats</h1>
      <input
        type="text"
        placeholder="Search by name or description..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full max-w-xl px-4 py-2 mb-4 border rounded"
      />
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && query && filtered.length === 0 && (
        <div>No results found.</div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-black">Name</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-black">Label</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-black">Concept</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((v) => (
                <tr key={v.name}>
                  <td className="px-4 py-2 text-sm text-black">{v.name}</td>
                  <td className="px-4 py-2 text-sm text-black">{v.label}</td>
                  <td className="px-4 py-2 text-sm text-black">{v.concept}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
