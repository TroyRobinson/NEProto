'use client';

import React, { useEffect, useState } from 'react';
import { fetchZipStats, type ZipStats } from '../../lib/zipStats';

export default function DataPage() {
  const [rows, setRows] = useState<ZipStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="min-h-screen p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Oklahoma City ZIP Data</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">ZIP</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Population</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Business Applications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.zip}>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.zip}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{row.population.toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{Math.round(row.applications).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
