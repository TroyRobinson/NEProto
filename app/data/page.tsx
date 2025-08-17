'use client';

import React, { useEffect, useState } from 'react';
import { fetchZipStats, type ZipStats } from '../../lib/zipStats';

export default function DataPage() {
  const [rows, setRows] = useState<ZipStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<'population' | 'applications'>('population');

  useEffect(() => {
    async function load() {
      try {
        const { stats } = await fetchZipStats();
        setRows(stats);
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen p-4 bg-gray-100 text-black">
      <h1 className="text-2xl font-bold mb-4 text-black">Oklahoma City ZIP Data</h1>
      <div className="mb-4">
        <label className="mr-2">Metric:</label>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as 'population' | 'applications')}
          className="border px-1 py-0.5"
        >
          <option value="population">Population</option>
          <option value="applications">Business Applications</option>
        </select>
      </div>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-black">ZIP</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-black">
                  {metric === 'population' ? 'Population' : 'Business Applications'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.zip}>
                  <td className="px-4 py-2 text-sm text-black">{row.zip}</td>
                  <td className="px-4 py-2 text-sm text-black">
                    {metric === 'population'
                      ? row.population.toLocaleString()
                      : Math.round(row.applications).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
